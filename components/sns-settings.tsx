"use client"

import {useState} from "react"
import {useRouter} from "next/navigation"
import { Check } from "lucide-react"
import { normalizeLinkedInUrl } from "@/lib/linkedin"

interface Props {
  discordUsername: string
  github: string
  githubId: string
  x: string
  xId: string
  line: string
  lineId: string
  linkedin: string
  successMessage?: string
  errorMessage?: string
}

function DiscordIcon({className}: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  )
}

function GitHubIcon({className}: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
    </svg>
  )
}

function XIcon({className}: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  )
}

function LineIcon({className}: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
    </svg>
  )
}

function LinkedInIcon({className}: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  )
}

interface ProviderCardProps {
  name: string
  connectedUser: string
  onConnect: () => void
  onDisconnect: () => void
  isConnected: boolean
  connectButton: React.ReactNode
  icon: React.ReactNode
  brandColor: string
  reconnectOnly?: boolean
  prefixAt?: boolean
}

function ProviderCard({
  name,
  connectedUser,
  onConnect,
  onDisconnect,
  isConnected,
  connectButton,
  icon,
  brandColor,
  reconnectOnly = false,
  prefixAt = true,
}: ProviderCardProps) {
  const [disconnecting, setDisconnecting] = useState(false)

  const handleDisconnect = async () => {
    if (!confirm(`${name}の連携を解除しますか？`)) return
    setDisconnecting(true)
    await onDisconnect()
    setDisconnecting(false)
  }

  return (
    <div className="flex items-center justify-between gap-2 p-4 border rounded-xl bg-card hover:shadow-md transition-all duration-200">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-10 h-10 ${brandColor} rounded-xl flex items-center justify-center text-white shrink-0`}>
          {icon}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm">{name}</p>
            {isConnected && (
              <span className="flex items-center justify-center w-4 h-4 rounded-full bg-green-500 animate-in zoom-in-50 duration-300">
                <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
              </span>
            )}
          </div>
          {isConnected ? (
            <p className="text-xs text-muted-foreground truncate">{prefixAt ? `@${connectedUser}` : connectedUser}</p>
          ) : (
            <p className="text-xs text-muted-foreground/60">未連携</p>
          )}
        </div>
      </div>
      <div className="shrink-0">
        {isConnected ? (
          reconnectOnly ? (
            <button onClick={onConnect} className="text-xs text-muted-foreground hover:text-foreground border border-border hover:border-foreground/30 rounded-lg px-3 py-1.5 transition-all duration-200">
              再連携
            </button>
          ) : (
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="text-xs text-red-500 hover:text-red-600 border border-red-200 dark:border-red-900 hover:border-red-400 dark:hover:border-red-700 rounded-lg px-3 py-1.5 transition-all duration-200 disabled:opacity-50"
            >
              {disconnecting ? "解除中..." : "連携解除"}
            </button>
          )
        ) : (
          <button onClick={onConnect} className="flex items-center">
            {connectButton}
          </button>
        )}
      </div>
    </div>
  )
}

function LinkedInCard({ url, onSaved, onDeleted }: { url: string; onSaved: (url: string) => void; onDeleted: () => void }) {
  const [editing, setEditing] = useState(false)
  const [inputValue, setInputValue] = useState(url)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState("")

  const isSet = !!url
  const displayUrl = url.replace(/^https?:\/\/(www\.)?/, "")

  const handleBlur = () => {
    if (!inputValue.trim()) {
      setError("")
      return
    }
    const normalized = normalizeLinkedInUrl(inputValue)
    if (normalized) {
      setInputValue(normalized)
      setError("")
    } else {
      setError("LinkedInのプロフィールURLを入力してください（例: https://linkedin.com/in/username）")
    }
  }

  const handleSave = async () => {
    const normalized = normalizeLinkedInUrl(inputValue)
    if (!normalized) {
      setError("LinkedInのプロフィールURLを入力してください（例: https://linkedin.com/in/username）")
      return
    }
    setSaving(true)
    const res = await fetch("/api/settings/sns", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ linkedin: normalized }),
    })
    setSaving(false)
    if (res.ok) {
      onSaved(normalized)
      setEditing(false)
      setError("")
    } else {
      alert("保存に失敗しました。")
    }
  }

  const handleDelete = async () => {
    if (!confirm("LinkedInのURLを削除しますか？")) return
    setDeleting(true)
    const res = await fetch("/api/settings/sns", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "linkedin" }),
    })
    setDeleting(false)
    if (res.ok) {
      setInputValue("")
      onDeleted()
    } else {
      alert("削除に失敗しました。")
    }
  }

  return (
    <div className="p-4 border rounded-xl bg-card hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-[#0A66C2] rounded-xl flex items-center justify-center text-white shrink-0">
            <LinkedInIcon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-sm">LinkedIn</p>
              {isSet && !editing && (
                <span className="flex items-center justify-center w-4 h-4 rounded-full bg-green-500 animate-in zoom-in-50 duration-300">
                  <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                </span>
              )}
            </div>
            {isSet && !editing ? (
              <p className="text-xs text-muted-foreground">linkedin.com/in/<wbr /><span className="inline-block float-right">{displayUrl.replace(/^linkedin\.com\/in\//, "")}</span></p>
            ) : !editing ? (
              <p className="text-xs text-muted-foreground/60">未設定</p>
            ) : null}
          </div>
        </div>
        {!editing && (
          <div className="shrink-0">
            {isSet ? (
              <button
                onClick={() => { setInputValue(url); setEditing(true) }}
                className="text-xs text-muted-foreground hover:text-foreground border border-border hover:border-foreground/30 rounded-lg px-3 py-1.5 transition-all duration-200"
              >
                編集
              </button>
            ) : (
              <button
                onClick={() => { setInputValue(""); setEditing(true) }}
                className="flex items-center gap-2 bg-[#0A66C2] hover:bg-[#004182] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                <LinkedInIcon className="w-4 h-4" />
                URLを入力
              </button>
            )}
          </div>
        )}
      </div>
      {editing && (
        <div className="mt-3 space-y-2 animate-in fade-in-50 slide-in-from-top-1 duration-200">
          <input
            type="url"
            value={inputValue}
            onChange={(e) => { setInputValue(e.target.value); setError("") }}
            onBlur={handleBlur}
            placeholder="https://linkedin.com/in/username"
            className={`w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 ${error ? "border-red-500 focus:ring-red-500" : "border-border focus:ring-[#0A66C2]/50 focus:border-[#0A66C2]"}`}
            autoFocus
          />
          {error && (
            <p className="text-xs text-red-500">{error}</p>
          )}
          <p className="text-xs text-muted-foreground">
            <a href="https://www.linkedin.com/in/me" target="_blank" rel="noopener noreferrer" className="text-[#0A66C2] hover:underline">こちら</a>
            で表示されるページのURLを入力してください
          </p>
          <div className="flex justify-between">
            {isSet ? (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-xs text-red-500 hover:text-red-600 border border-red-200 dark:border-red-900 hover:border-red-400 dark:hover:border-red-700 rounded-lg px-3 py-1.5 transition-all duration-200 disabled:opacity-50"
              >
                {deleting ? "削除中..." : "削除"}
              </button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <button
                onClick={() => { setInputValue(url); setEditing(false) }}
                className="text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-1.5 transition-all duration-200"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="text-xs bg-[#0A66C2] hover:bg-[#004182] text-white rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
              >
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SnsSettings({
  discordUsername,
  github: initialGithub,
  githubId: initialGithubId,
  x: initialX,
  xId: initialXId,
  line: initialLine,
  lineId: initialLineId,
  linkedin: initialLinkedin,
  successMessage,
  errorMessage,
}: Props) {
  const router = useRouter()
  const [github, setGithub] = useState(initialGithub)
  const [githubId, setGithubId] = useState(initialGithubId)
  const [x, setX] = useState(initialX)
  const [xId, setXId] = useState(initialXId)
  const [line, setLine] = useState(initialLine)
  const [lineId, setLineId] = useState(initialLineId)
  const [linkedinUrl, setLinkedinUrl] = useState(initialLinkedin)

  const disconnect = async (provider: "github" | "x" | "line") => {
    const res = await fetch("/api/settings/sns", {
      method: "DELETE",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({provider}),
    })
    if (res.ok) {
      if (provider === "github") { setGithub(""); setGithubId("") }
      if (provider === "x") { setX(""); setXId("") }
      if (provider === "line") { setLine(""); setLineId("") }
      router.refresh()
    } else {
      alert("解除に失敗しました。")
    }
  }

  return (
    <div className="space-y-3">
      {successMessage && (
        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl text-green-700 dark:text-green-400 text-sm animate-in fade-in-80 slide-in-from-top-2 duration-300">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-green-500 shrink-0">
            <Check className="w-3 h-3 text-white" strokeWidth={3} />
          </span>
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm animate-in fade-in-80 slide-in-from-top-2 duration-300">
          {errorMessage}
        </div>
      )}

      {/* Discord */}
      <div className="flex items-center justify-between gap-2 p-4 border rounded-xl bg-card hover:shadow-md transition-all duration-200">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-[#5865F2] rounded-xl flex items-center justify-center text-white shrink-0">
            <DiscordIcon className="w-5 h-5"/>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-sm">Discord</p>
              <span className="flex items-center justify-center w-4 h-4 rounded-full bg-green-500">
                <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
              </span>
            </div>
            <p className="text-xs text-muted-foreground truncate">@{discordUsername}</p>
          </div>
        </div>
        <div>
          <span className="text-xs text-muted-foreground/60 border border-border rounded-lg px-3 py-1.5 cursor-not-allowed">
            連携済み
          </span>
        </div>
      </div>

      {/* LINE */}
      <ProviderCard
        name="LINE"
        connectedUser={line}
        isConnected={!!lineId}
        reconnectOnly
        onConnect={() => { window.location.href = "/api/auth/link/line" }}
        onDisconnect={() => disconnect("line")}
        brandColor="bg-[#06C755]"
        icon={<LineIcon className="w-5 h-5"/>}
        connectButton={
          <span className="flex items-center gap-2 bg-[#06C755] hover:bg-[#05a848] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            <LineIcon className="w-4 h-4"/>
            LINEで連携
          </span>
        }
      />

      {/* GitHub */}
      <ProviderCard
        name="GitHub"
        connectedUser={github}
        isConnected={!!githubId}
        onConnect={() => { window.location.href = "/api/auth/link/github" }}
        onDisconnect={() => disconnect("github")}
        brandColor="bg-[#24292f] dark:bg-[#333]"
        icon={<GitHubIcon className="w-5 h-5"/>}
        connectButton={
          <span className="flex items-center gap-2 bg-[#24292f] hover:bg-[#1a1e23] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            <GitHubIcon className="w-4 h-4"/>
            GitHubで連携
          </span>
        }
      />

      {/* X */}
      <ProviderCard
        name="X"
        connectedUser={x}
        isConnected={!!xId}
        onConnect={() => { window.location.href = "/api/auth/link/x" }}
        onDisconnect={() => disconnect("x")}
        brandColor="bg-black dark:bg-[#1a1a1a]"
        icon={<XIcon className="w-5 h-5"/>}
        connectButton={
          <span className="flex items-center gap-2 bg-black hover:bg-gray-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            <XIcon className="w-4 h-4"/>
            Xで連携
          </span>
        }
      />

      {/* LinkedIn */}
      <LinkedInCard
        url={linkedinUrl}
        onSaved={(url) => { setLinkedinUrl(url); router.refresh() }}
        onDeleted={() => { setLinkedinUrl(""); router.refresh() }}
      />
    </div>
  )
}
