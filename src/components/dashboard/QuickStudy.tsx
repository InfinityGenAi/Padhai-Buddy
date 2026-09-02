"use client";

import Link from "next/link";
import {
  ChatBubbleLeftEllipsisIcon,
  PhotoIcon,
  BookOpenIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";

interface QuickStudyAction {
  key: string;
  href: string;
  label: string;
  desc: string;
}

export function QuickStudy({ actions }: { actions: QuickStudyAction[] }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => (
          <Link key={action.key} href={action.href}>
            <div
              className="rounded-xl p-4 flex items-center gap-3"
              style={{ transition: "background-color 0.2s ease, transform 0.2s ease" }}
            >
              <div className="w-10 h-10 rounded flex-shrink-0 flex items-center justify-center text-primary">
                {action.label.startsWith("Q") ? (
                  <ChatBubbleLeftEllipsisIcon className="w-5 h-5" />
                ) : action.label.startsWith("P")
                  ? (
                    <BookOpenIcon className="w-5 h-5" />
                  ) : action.label.startsWith("F")
                  ? (
                    <Squares2X2Icon className="w-5 h-5" />
                  ) : action.label.startsWith("Ph")
                  ? (
                    <PhotoIcon className="w-5 h-5" />
                  ) : (
                    <ChatBubbleLeftEllipsisIcon className="w-5 h-5" />
                  )
                }
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{action.label}</p>
                <p className="text-xs text-foreground/60 truncate">{action.desc}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}