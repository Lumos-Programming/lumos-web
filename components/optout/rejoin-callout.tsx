import { Sparkles } from "lucide-react";

export default function RejoinCallout() {
  return (
    <div className="rounded-lg border border-amber-300/30 bg-amber-300/[0.08] p-4 text-sm">
      <div className="flex items-center gap-2">
        <Sparkles
          aria-hidden
          className="h-5 w-5 flex-shrink-0 text-amber-300"
        />
        <p className="font-semibold text-amber-200">
          再加入も是非ご検討ください
        </p>
      </div>
      <p className="mt-2 leading-relaxed text-[#f1e8c7]">
        <span className="font-medium text-white">
          Lumosは一年中入会を受け付けています。
        </span>
        <br />
        再加入をご希望の場合は、ポータルサイトにログインして再加入申請お願いします。
      </p>
    </div>
  );
}
