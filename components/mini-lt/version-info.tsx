import versionData from "@/lib/version.json";

export function VersionInfo() {
  const { commitSha, buildDate } = versionData;

  // Format the build date in a more readable way
  const formattedDate = new Date(buildDate).toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
  });

  return (
    <div className="text-xs text-muted-foreground text-center py-4 pb-24 md:pb-4">
      <div>
        Version: <span className="font-mono">{commitSha}</span>
      </div>
      <div>Built: {formattedDate}</div>
    </div>
  );
}
