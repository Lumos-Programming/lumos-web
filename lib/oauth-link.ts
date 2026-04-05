import { createHash, randomBytes } from "crypto";

export type OAuthLinkProvider = "github" | "x" | "line";

interface ProviderConfig {
  authUrl: string;
  tokenUrl: string;
  userUrl: string;
  clientIdEnv: string;
  clientSecretEnv: string;
  scope: string;
  pkce?: boolean;
}

export const PROVIDER_CONFIGS: Record<OAuthLinkProvider, ProviderConfig> = {
  github: {
    authUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    userUrl: "https://api.github.com/user",
    clientIdEnv: "AUTH_GITHUB_ID",
    clientSecretEnv: "AUTH_GITHUB_SECRET",
    scope: "read:user",
  },
  x: {
    authUrl: "https://x.com/i/oauth2/authorize",
    tokenUrl: "https://api.x.com/2/oauth2/token",
    userUrl:
      "https://api.x.com/2/users/me?user.fields=username,profile_image_url",
    clientIdEnv: "AUTH_X_ID",
    clientSecretEnv: "AUTH_X_SECRET",
    scope: "users.read tweet.read",
    pkce: true,
  },
  line: {
    authUrl: "https://access.line.me/oauth2/v2.1/authorize",
    tokenUrl: "https://api.line.me/oauth2/v2.1/token",
    userUrl: "https://api.line.me/v2/profile",
    clientIdEnv: "AUTH_LINE_ID",
    clientSecretEnv: "AUTH_LINE_SECRET",
    scope: "profile",
  },
};

export function generateState(): string {
  return randomBytes(32).toString("hex");
}

export function generateCodeVerifier(): string {
  return randomBytes(32).toString("base64url");
}

export function generateCodeChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function getCallbackUrl(
  provider: OAuthLinkProvider,
  baseUrl: string,
): string {
  return `${baseUrl}/api/auth/link/${provider}/callback`;
}

export async function exchangeCodeForToken(
  provider: OAuthLinkProvider,
  code: string,
  redirectUri: string,
  codeVerifier?: string,
): Promise<string> {
  const config = PROVIDER_CONFIGS[provider];
  const clientId = process.env[config.clientIdEnv];
  const clientSecret = process.env[config.clientSecretEnv];

  if (!clientId || !clientSecret) {
    throw new Error(`Missing env vars for ${provider}`);
  }

  const params: Record<string, string> = {
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
  };
  if (codeVerifier) params.code_verifier = codeVerifier;

  let res: Response;
  if (provider === "x") {
    // X requires Basic auth and form-encoded body
    const body = new URLSearchParams(params);
    res = await fetch(config.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: body.toString(),
    });
  } else {
    const body = new URLSearchParams({
      ...params,
      client_secret: clientSecret,
    });
    res = await fetch(config.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: body.toString(),
    });
  }

  const data = await res.json();
  if (!data.access_token)
    throw new Error(`No access_token: ${JSON.stringify(data)}`);
  return data.access_token;
}

export interface OAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
}

export async function exchangeCodeForTokenFull(
  provider: OAuthLinkProvider,
  code: string,
  redirectUri: string,
  codeVerifier?: string,
): Promise<OAuthTokenResponse> {
  const config = PROVIDER_CONFIGS[provider];
  const clientId = process.env[config.clientIdEnv];
  const clientSecret = process.env[config.clientSecretEnv];

  if (!clientId || !clientSecret) {
    throw new Error(`Missing env vars for ${provider}`);
  }

  const params: Record<string, string> = {
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
  };
  if (codeVerifier) params.code_verifier = codeVerifier;

  let res: Response;
  if (provider === "x") {
    const body = new URLSearchParams(params);
    res = await fetch(config.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: body.toString(),
    });
  } else {
    const body = new URLSearchParams({
      ...params,
      client_secret: clientSecret,
    });
    res = await fetch(config.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: body.toString(),
    });
  }

  const data = await res.json();
  if (!data.access_token)
    throw new Error(`No access_token: ${JSON.stringify(data)}`);
  return data as OAuthTokenResponse;
}

export async function fetchProviderUser(
  provider: OAuthLinkProvider,
  accessToken: string,
): Promise<{ id: string; username: string; avatar?: string }> {
  const config = PROVIDER_CONFIGS[provider];
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
  };
  const res = await fetch(config.userUrl, { headers });
  const data = await res.json();

  if (!res.ok) {
    console.error(
      `fetchProviderUser(${provider}) failed:`,
      JSON.stringify(data),
    );
    throw new Error(`Provider API error: ${res.status}`);
  }

  if (provider === "github") {
    return {
      id: String(data.id),
      username: data.login,
      avatar: data.avatar_url,
    };
  }
  if (provider === "x") {
    const user = data.data;
    if (!user) {
      console.error("X API unexpected response:", JSON.stringify(data));
      throw new Error("X API returned no user data");
    }
    return {
      id: user.id,
      username: user.username,
      avatar: user.profile_image_url,
    };
  }
  if (provider === "line") {
    return {
      id: data.userId,
      username: data.displayName,
      avatar: data.pictureUrl,
    };
  }
  throw new Error(`Unknown provider: ${provider}`);
}
