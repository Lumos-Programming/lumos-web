"use client";

import { useState } from "react";
import { SerializableTalk } from "@/lib/mini-lt/firebase";
import { LTCard } from "@/components/mini-lt/LTCard";
import { SubmitForm } from "@/components/mini-lt/SubmitForm";

interface ManageTalksProps {
  weekId: string;
  myTalks: SerializableTalk[];
  onAction: (data: {
    title: string;
    description: string;
    duration: number;
    id?: string;
  }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function ManageTalks({
  weekId,
  myTalks,
  onAction,
  onDelete,
}: ManageTalksProps) {
  const [editingTalk, setEditingTalk] = useState<SerializableTalk | null>(null);
  const hasRegistered = myTalks.length >= 1;

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <span className="text-2xl">🎯</span>
          <span>あなたの発表</span>
          <span className="text-lg text-muted-foreground font-normal">
            ({weekId})
          </span>
        </h2>
        {myTalks.length === 0 ? (
          <div className="text-center py-12 bg-gradient-card rounded-xl border-2 border-dashed border-purple-200">
            <div className="text-5xl mb-3">📭</div>
            <p className="text-muted-foreground">
              この週の登録はまだありません
            </p>
            <p className="text-sm text-purple-600 mt-2">
              下のフォームから登録できます ↓
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {myTalks.map((talk) => (
              <LTCard
                key={talk.id}
                talk={talk}
                isOwner={true}
                onEdit={(t) => {
                  setEditingTalk(t);
                  window.scrollTo({
                    top: document.body.scrollHeight,
                    behavior: "smooth",
                  });
                }}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* 編集中または未登録の場合のみフォームを表示 */}
      {editingTalk || !hasRegistered ? (
        <SubmitForm
          weekId={weekId}
          onSubmit={async (data) => {
            await onAction(data);
            setEditingTalk(null);
          }}
          editingTalk={editingTalk}
          onCancelEdit={() => setEditingTalk(null)}
        />
      ) : (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8 text-center border-2 border-blue-200">
          <div className="text-4xl mb-3">✅</div>
          <p className="font-bold text-gray-800 mb-2">
            この週の発表を登録済みです
          </p>
          <p className="text-sm text-gray-600">
            週に1件まで発表を登録できます。
            <br />
            編集する場合は、上のカードの「編集」ボタンをクリックしてください。
          </p>
        </div>
      )}
    </div>
  );
}
