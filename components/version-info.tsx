let versionData: { commitSha: string; buildDate: string } = {
  commitSha: "dev",
  buildDate: new Date().toISOString(),
};
try {
  versionData = require("@/lib/version.json");
} catch {
  // version.json is generated at Docker build time; use fallback for local dev
}

export function VersionInfo() {
  const { commitSha, buildDate } = versionData;

  const formattedDate = new Date(buildDate).toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
  });

  return (
    <div className="text-xs text-muted-foreground/60 text-center space-y-0.5">
      <div>
        Version: <span className="font-mono">{commitSha}</span>
      </div>
      <div>Built: {formattedDate}</div>
    </div>
  );
}
