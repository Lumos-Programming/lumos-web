/**
 * Normalize a LinkedIn profile URL from various input formats.
 *
 * Supported inputs:
 *  - Full URL: https://www.linkedin.com/in/username
 *  - Without www: https://linkedin.com/in/username
 *  - HTTP: http://linkedin.com/in/username
 *  - Trailing slash: https://www.linkedin.com/in/username/
 *  - Query params: https://www.linkedin.com/in/username?locale=ja_JP&trk=...
 *  - Fragment: https://www.linkedin.com/in/username#section
 *  - No protocol: linkedin.com/in/username, www.linkedin.com/in/username
 *  - Path only: /in/username
 *  - Username only: username
 *
 * @returns Normalized URL `https://www.linkedin.com/in/{username}` or `null` if invalid.
 */
export function normalizeLinkedInUrl(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  let raw = trimmed

  // Username-only: no "linkedin.com" and no slashes
  if (!raw.includes("linkedin.com") && !raw.includes("/")) {
    raw = `https://www.linkedin.com/in/${raw}`
  }
  // Path-only like "/in/username"
  else if (raw.startsWith("/in/")) {
    raw = `https://www.linkedin.com${raw}`
  }
  // Missing protocol
  else if (!raw.startsWith("http://") && !raw.startsWith("https://")) {
    raw = `https://${raw}`
  }

  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }

  // Validate hostname
  const hostname = url.hostname.toLowerCase()
  if (hostname !== "linkedin.com" && hostname !== "www.linkedin.com") {
    return null
  }

  // Extract username from pathname
  const match = url.pathname.match(/^\/in\/([A-Za-z0-9\-_%]+)\/?$/)
  if (!match) return null

  const username = match[1]
  return `https://www.linkedin.com/in/${username}`
}
