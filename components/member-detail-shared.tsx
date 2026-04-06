import Image from "next/image";
import { Cake } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { Member } from "@/types/member";
import {
  getRingColorClass,
  getMemberTypeBadgeClass,
  getMemberTypeBadgeLabel,
  getTileDisplay,
} from "@/types/member";
import { SnsChipsSection } from "@/components/sns-chips";
import { formatBirthDate } from "@/lib/date";

// --- BioSection ---

export function BioSection({ bio, clamp }: { bio?: string; clamp?: boolean }) {
  if (bio) {
    return (
      <div className="overflow-hidden">
        <div
          className={`prose prose-sm dark:prose-invert max-w-none text-foreground prose-table:table-fixed prose-td:break-words prose-pre:whitespace-pre-wrap prose-pre:break-words prose-code:break-all ${clamp ? "line-clamp-3 text-xs text-gray-600 dark:text-gray-400 overflow-hidden" : "overflow-x-auto"}`}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{bio}</ReactMarkdown>
        </div>
      </div>
    );
  }
  return (
    <div
      className={`rounded-lg bg-gray-100 dark:bg-gray-800 ${clamp ? "py-8" : "py-10"} flex items-center justify-center`}
    >
      <p
        className={`${clamp ? "text-xs" : "text-sm"} text-gray-400 dark:text-gray-500`}
      >
        プロフィール文は登録されていません
      </p>
    </div>
  );
}

// --- InterestsSection ---

export function InterestsSection({
  interests,
  centered,
}: {
  interests?: string[];
  centered?: boolean;
}) {
  if (!interests || interests.length === 0) return null;
  return (
    <div>
      <h4 className="font-bold text-sm text-muted-foreground mb-2">興味分野</h4>
      <div
        className={`flex flex-wrap gap-2 ${centered ? "justify-center sm:justify-start" : ""}`}
      >
        {interests.map((tag, index) => (
          <span
            key={index}
            className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 text-xs px-2 py-1 rounded-full"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

// --- MemberDetailContent ---

export function MemberDetailContent({ member }: { member: Member }) {
  const { main, sub } = getTileDisplay(member);
  const faceImage = member.publicImage;
  const ringColor = getRingColorClass(member.ringColor);
  return (
    <>
      {/* 上部: 画像 + 名前・属性・興味・SNS */}
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
        {/* 画像コンテナ */}
        <div className="shrink-0 self-center sm:self-start">
          <div className="relative w-fit">
            <div
              className={`w-28 h-28 sm:w-32 sm:h-32 relative rounded-lg overflow-hidden ring-2 ${ringColor}`}
            >
              <Image
                src={faceImage || "/assets/lumos_logo-full.png"}
                alt={`${member.name}の写真`}
                fill
                className="object-cover"
              />
            </div>
            {member.snsAvatar && (
              <div className="absolute -bottom-1.5 -right-1.5 w-9 h-9 rounded-full ring-2 ring-white dark:ring-gray-900 overflow-hidden">
                <Image
                  src={member.snsAvatar}
                  alt=""
                  fill
                  className="object-cover"
                />
              </div>
            )}
          </div>
        </div>

        {/* 右側: 名前 + 属性 + 興味 + SNS */}
        <div className="min-w-0 text-center sm:text-left">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-2xl text-foreground">
              {main}
            </DialogTitle>
            <DialogDescription className="text-accent-foreground font-medium">
              {sub && <span className="mr-2">{sub}</span>}
              {member.memberType && (
                <span
                  className={`inline-block text-xs font-medium px-1.5 py-0.5 rounded-full mr-2 ${getMemberTypeBadgeClass(member.memberType)}`}
                >
                  {getMemberTypeBadgeLabel(member.memberType, member.year)}
                </span>
              )}
              {member.role} |{" "}
              {member.memberType === "卒業生" && member.currentOrg
                ? member.currentOrg
                : member.department}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-3 space-y-3">
            {member.birthDate && (
              <p className="text-sm text-muted-foreground flex items-center justify-center sm:justify-start gap-1.5">
                <Cake className="w-4 h-4 text-gray-400" />
                {formatBirthDate(member.birthDate)}
              </p>
            )}
            <InterestsSection interests={member.interests} centered />
            <SnsChipsSection social={member.social} centered />
          </div>
        </div>
      </div>

      {/* 下部: Bio（全幅、区切り線付き） */}
      {member.bio && (
        <div className="border-t pt-4 mt-4">
          <BioSection bio={member.bio} />
        </div>
      )}
    </>
  );
}
