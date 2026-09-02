"use client";

import { ChatBubbleLeftEllipsisIcon } from "@heroicons/react/24/outline";

interface AiStudyBarProps {
  onAskAI?: () => void;
  onPhotoDoubt?: () => void;
}

export function AiStudyBar({ onAskAI, onPhotoDoubt }: AiStudyBarProps) {
  return (
    <div className="mb-6">
      <div className="rounded-xl overflow-hidden bg-card border border-card-border shadow-sm">
        <div className="flex items-center gap-3 px-6 py-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <ChatBubbleLeftEllipsisIcon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Ask Padhai Buddy</h3>
            <p className="text-foreground/60 text-sm">Type your question or upload a photo</p>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-card-border">
          <div className="flex gap-2">
            <button
              onClick={onAskAI}
              className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 transition-all"
              disabled={!onAskAI}
            >
              Text Question
            </button>
            <button
              onClick={onPhotoDoubt}
              className="px-4 py-2.5 rounded-lg text-sm font-medium text-foreground/60 hover:bg-foreground/5 transition-all border border-card-border"
              disabled={!onPhotoDoubt}
            >
              Photo Doubt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}