import Image from "next/image";
import {
  getRingColorClass,
  getMemberTypeBadgeClass,
  getMemberTypeBadgeLabel,
} from "@/types/member";

export interface MemberTileProps {
  main: string;
  sub?: string;
  department: string;
  primaryAvatar: string;
  secondaryAvatar?: string;
  ringColor?: string;
  memberType?: string;
  year?: string;
  currentOrg?: string;
  topInterests?: string[];
  avatarSize?: "sm" | "md";
  preview?: boolean;
  onClick?: () => void;
}

export function MemberTile({
  main,
  sub,
  department,
  primaryAvatar,
  secondaryAvatar,
  ringColor,
  memberType,
  year,
  currentOrg,
  topInterests,
  avatarSize = "sm",
  preview = false,
  onClick,
}: MemberTileProps) {
  const ringClass = getRingColorClass(ringColor);
  const sizeClass =
    avatarSize === "md" ? "w-20 h-20 sm:w-24 sm:h-24" : "w-16 h-16";
  const dept = memberType === "卒業生" && currentOrg ? currentOrg : department;

  const content = (
    <>
      <div className="relative flex-shrink-0">
        <div
          className={`${sizeClass} relative rounded-full overflow-hidden ring-2 ${ringClass} transition-all duration-300 ${!preview ? "group-hover:ring-4 group-hover:shadow-lg group-hover:scale-105" : ""}`}
        >
          <Image
            src={primaryAvatar}
            alt={`${main}の写真`}
            fill
            className="object-cover"
          />
        </div>
        {secondaryAvatar && (
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full ring-2 ring-white dark:ring-gray-900 overflow-hidden">
            <Image src={secondaryAvatar} alt="" fill className="object-cover" />
          </div>
        )}
      </div>
      <p
        className={`mt-2 text-sm ${avatarSize === "md" ? "font-bold" : "font-semibold"} text-foreground leading-tight truncate w-full ${preview ? "text-center" : ""}`}
      >
        {main}
      </p>
      {sub && (
        <p
          className={`text-xs text-muted-foreground truncate w-full ${preview ? "text-center" : ""}`}
        >
          {sub}
        </p>
      )}
      {memberType && (
        <span
          className={`mt-1 inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full ${getMemberTypeBadgeClass(memberType)}`}
        >
          {getMemberTypeBadgeLabel(memberType, year)}
        </span>
      )}
      <p
        className={`text-xs text-muted-foreground truncate w-full ${preview ? "text-center" : ""}`}
      >
        {dept}
      </p>
      {topInterests && topInterests.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1 justify-center">
          {topInterests.map((tag) => (
            <span
              key={tag}
              className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 text-[10px] px-1.5 py-0.5 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </>
  );

  if (preview) {
    return (
      <div className="flex flex-col items-center rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/60 p-4">
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-center text-center w-full rounded-xl p-3 hover:bg-card hover:shadow-lg hover:shadow-purple-200/30 dark:hover:shadow-purple-900/20 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer active:scale-[0.97]"
    >
      {content}
    </button>
  );
}
