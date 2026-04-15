"use client";

import { useState } from "react";
import Nav from "./components/Nav";
import HintToast from "./components/HintToast";

interface IngestResult {
  note_id: string;
  metadata: {
    topics: string[];
    entities: { type: string; value: string }[];
    urgency: { score: number; reason: string };
    actionability: { has_next_step: boolean; suggested_next_step: string | null };
    status: { state: string; confidence: number };
    time_refs: string[];
  };
  relationships: { type: string; target_note_id: string; weight: number }[];
  importance_score: number;
}

interface HintData {
  id: string;
  note_id: string;
  type: string;
  level: string;
  content: string;
  score: number;
  score_breakdown: Record<string, number>;
}

export default function CapturePage() {
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IngestResult | null>(null);
  const [hint, setHint] = useState<HintData | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setHint(null);

    try {
      // Ingest the note
      const ingestRes = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: note, source: "web" }),
      });

      if (!ingestRes.ok) throw new Error(await ingestRes.text());
      const ingestData: IngestResult = await ingestRes.json();
      setResult(ingestData);

      // Check for hints in the context of this note
      const hintRes = await fetch("/api/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: { trigger: "note_capture" },
          current_note_content: note,
        }),
      });

      if (hintRes.ok) {
        const hintData = await hintRes.json();
        if (hintData.hint) {
          setHint(hintData.hint);
        }
      }

      setNote("");
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleHintAction(action: string) {
    if (!hint) return;
    try {
      await fetch("/api/hint-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hint_id: hint.id, action }),
      });
    } catch {
      // Best-effort feedback
    }
    setHint(null);
  }

  return (
    <div className="flex flex-col h-full">
      <Nav />
      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-8">
        <h1 className="text-lg font-semibold mb-6">Capture a note</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What's on your mind? e.g., Plumber Dave said the upstairs leak is a $200 fix but he can't come until Friday."
            rows={4}
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400 resize-y"
          />
          <button
            type="submit"
            disabled={loading || !note.trim()}
            className="px-4 py-2 rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? "Storing..." : "Save note"}
          </button>
        </form>

        {error && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-6 space-y-3">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm">
              Note stored. ID: <code className="font-mono text-xs">{result.note_id}</code>
            </div>

            <div className="p-4 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs font-mono space-y-1">
              <div>Topics: {result.metadata.topics.join(", ")}</div>
              <div>Entities: {result.metadata.entities.map((e) => `${e.value} (${e.type})`).join(", ") || "none"}</div>
              <div>Status: {result.metadata.status.state} ({(result.metadata.status.confidence * 100).toFixed(0)}%)</div>
              <div>Urgency: {result.metadata.urgency.score.toFixed(2)} — {result.metadata.urgency.reason}</div>
              <div>Actionable: {result.metadata.actionability.has_next_step ? `Yes -> ${result.metadata.actionability.suggested_next_step}` : "No"}</div>
              <div>Time refs: {result.metadata.time_refs.join(", ") || "none"}</div>
              <div>Relationships: {result.relationships.length}</div>
              <div>Importance: {result.importance_score.toFixed(3)}</div>
            </div>
          </div>
        )}

        {hint && (
          <div className="fixed bottom-6 right-6 z-50">
            <HintToast
              hintId={hint.id}
              content={hint.content}
              type={hint.type}
              level={hint.level}
              score={hint.score}
              scoreBreakdown={hint.score_breakdown}
              onAction={handleHintAction}
            />
          </div>
        )}
      </main>
    </div>
  );
}
