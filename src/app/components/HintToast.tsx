"use client";

import { useState } from "react";

interface HintToastProps {
  hintId: string;
  content: string;
  type: string;
  level: string;
  score: number;
  scoreBreakdown: Record<string, number>;
  onAction: (action: string) => void;
}

export default function HintToast({
  hintId,
  content,
  type,
  level,
  score,
  scoreBreakdown,
  onAction,
}: HintToastProps) {
  const [showDetails, setShowDetails] = useState(false);

  const borderColor =
    level === "interruptive"
      ? "border-amber-500"
      : "border-blue-400";

  return (
    <div
      className={`border-l-4 ${borderColor} bg-white dark:bg-neutral-900 rounded-r-lg shadow-lg p-4 max-w-md`}
    >
      <div className="flex justify-between items-start gap-3">
        <p className="text-sm text-foreground flex-1">{content}</p>
        <button
          onClick={() => onAction("dismissed")}
          className="text-neutral-400 hover:text-neutral-600 text-xs flex-shrink-0"
        >
          Dismiss
        </button>
      </div>

      <div className="mt-3 flex gap-2 flex-wrap">
        <button
          onClick={() => onAction("clicked")}
          className="text-xs px-3 py-1 rounded bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
        >
          Open note
        </button>
        <button
          onClick={() => onAction("snoozed")}
          className="text-xs px-3 py-1 rounded bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
        >
          Snooze
        </button>
        <button
          onClick={() => onAction("marked_solved")}
          className="text-xs px-3 py-1 rounded bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
        >
          Mark solved
        </button>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs px-3 py-1 rounded text-neutral-500 hover:text-foreground transition-colors ml-auto"
        >
          {showDetails ? "Hide" : "Why?"}
        </button>
      </div>

      {showDetails && (
        <div className="mt-3 p-2 bg-neutral-50 dark:bg-neutral-800 rounded text-xs font-mono space-y-1">
          <div>Type: {type} | Level: {level} | Score: {score.toFixed(3)}</div>
          {Object.entries(scoreBreakdown).map(([key, val]) => (
            <div key={key} className="text-neutral-500">
              {key}: {(val as number).toFixed(3)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
