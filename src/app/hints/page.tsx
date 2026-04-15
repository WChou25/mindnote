"use client";

import { useState } from "react";
import Nav from "../components/Nav";
import HintToast from "../components/HintToast";

interface HintData {
  id: string;
  note_id: string;
  type: string;
  level: string;
  content: string;
  score: number;
  score_breakdown: Record<string, number>;
}

export default function HintsPage() {
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState<HintData | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchHint() {
    setLoading(true);
    setError(null);
    setHint(null);
    setReason(null);

    try {
      const res = await fetch("/api/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: { trigger: "manual_check" },
          current_note_content: context || undefined,
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setHint(data.hint);
      setReason(data.reason);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(action: string) {
    if (!hint) return;
    try {
      await fetch("/api/hint-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hint_id: hint.id, action }),
      });
    } catch {
      // Best-effort
    }
    setHint(null);
  }

  return (
    <div className="flex flex-col h-full">
      <Nav />
      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-8">
        <h1 className="text-lg font-semibold mb-6">Check for hints</h1>

        <div className="space-y-4">
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Optional: describe what you're working on to get context-relevant hints..."
            rows={3}
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400 resize-y"
          />
          <button
            onClick={fetchHint}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? "Checking..." : "Check for hints"}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {reason && !hint && (
          <div className="mt-4 p-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm text-neutral-600 dark:text-neutral-400">
            No hint triggered. Reason: {reason}
          </div>
        )}

        {hint && (
          <div className="mt-6">
            <HintToast
              hintId={hint.id}
              content={hint.content}
              type={hint.type}
              level={hint.level}
              score={hint.score}
              scoreBreakdown={hint.score_breakdown}
              onAction={handleAction}
            />
          </div>
        )}
      </main>
    </div>
  );
}
