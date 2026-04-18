import Link from "next/link";
import type { ComponentType, ReactNode, SVGProps } from "react";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";

type Tone = "error" | "success" | "info";

const TONE_CLASSES: Record<
  Tone,
  { accent: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }
> = {
  error: { accent: "text-rose-300", Icon: AlertTriangle },
  success: { accent: "text-emerald-300", Icon: CheckCircle2 },
  info: { accent: "text-sky-300", Icon: Info },
};

export type StatusCardAction = {
  label: string;
  hint?: string;
};

export default function OptoutStatusCard({
  tone,
  title,
  description,
  actions,
  extra,
  homeLink = true,
}: {
  tone: Tone;
  title: string;
  description: string;
  /** ユーザーに案内する追加アクション（テキストのみ） */
  actions?: StatusCardAction[];
  /** ボタンなど任意の JSX */
  extra?: ReactNode;
  /** 「トップへ戻る」リンクを表示するか */
  homeLink?: boolean;
}) {
  const { accent, Icon } = TONE_CLASSES[tone];
  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-[#e8eaf6] shadow-xl backdrop-blur-sm">
        <Icon aria-hidden className={`h-10 w-10 ${accent}`} />
        <h1 className="mt-4 text-2xl font-bold">{title}</h1>
        <p className="mt-4 text-sm leading-relaxed text-[#c8cae0]">
          {description}
        </p>
        {actions && actions.length > 0 && (
          <ul className="mt-4 space-y-2 text-sm text-[#c8cae0]">
            {actions.map((a, i) => (
              <li key={i}>
                <p className="font-semibold text-white">{a.label}</p>
                {a.hint && (
                  <p className="mt-1 text-xs text-[#8b8fa8]">{a.hint}</p>
                )}
              </li>
            ))}
          </ul>
        )}
        {extra && <div className="mt-6">{extra}</div>}
        {homeLink && (
          <div className="mt-8">
            <Link
              href="/"
              className="inline-flex items-center rounded-md border border-white/20 bg-white/5 px-4 py-2 text-sm text-white transition-colors hover:bg-white/10"
            >
              トップへ戻る
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
