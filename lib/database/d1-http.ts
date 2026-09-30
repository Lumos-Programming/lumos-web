import type { D1Client, D1Result, D1Statement } from "./d1";

/** Cloud Run and migration CLI transport. Workers use the DB binding directly. */
export class D1HttpClient implements D1Client {
  private readonly endpoint: string;
  constructor(
    accountId: string,
    databaseId: string,
    private readonly apiToken: string,
  ) {
    if (!accountId || !databaseId || !apiToken)
      throw new Error(
        "D1 HTTP access requires CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID and CLOUDFLARE_API_TOKEN",
      );
    this.endpoint = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/d1/database/${encodeURIComponent(databaseId)}/query`;
  }
  prepare(sql: string): D1Statement {
    return new HttpStatement(this, sql, []);
  }
  async batch(statements: D1Statement[]): Promise<D1Result[]> {
    if (!statements.length) return [];
    const batch = statements.map((statement) => {
      if (!(statement instanceof HttpStatement) || statement.client !== this)
        throw new Error("D1 statement belongs to a different client");
      return { sql: statement.sql, params: statement.params };
    });
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ batch }),
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    const body = (await response.json()) as {
      success?: boolean;
      result?: D1Result[];
      errors?: { message?: string }[];
    };
    if (!response.ok || !body.success || !body.result) {
      // Keep SQL values and credentials out of errors. The adapter needs only
      // the named optimistic-concurrency guard to distinguish a retry.
      const messages = (body.errors ?? [])
        .map((error) => error.message ?? "")
        .join(" ");
      if (messages.includes("migration_revision_matches"))
        throw new Error("migration_revision_matches");
      throw new Error(`D1 HTTP request failed (${response.status})`);
    }
    if (body.result.length !== statements.length)
      throw new Error("D1 returned an incomplete batch result");
    return body.result;
  }
}

class HttpStatement implements D1Statement {
  constructor(
    readonly client: D1HttpClient,
    readonly sql: string,
    readonly params: unknown[],
  ) {}
  bind(...params: unknown[]): D1Statement {
    return new HttpStatement(this.client, this.sql, params);
  }
  async all(): Promise<D1Result> {
    return (await this.client.batch([this]))[0];
  }
}
