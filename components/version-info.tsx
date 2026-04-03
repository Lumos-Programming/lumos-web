import versionData from '@/lib/version.json'

export function VersionInfo() {
  const { commitSha, buildDate } = versionData

  const formattedDate = new Date(buildDate).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tokyo',
  })

  return (
    <div className="text-xs text-muted-foreground/60 text-center space-y-0.5">
      <div>
        Version: <span className="font-mono">{commitSha}</span>
      </div>
      <div>Built: {formattedDate}</div>
    </div>
  )
}
