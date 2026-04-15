"use client";

import { useState } from "react";
import Nav from "../components/Nav";

interface NoteDebug {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  importance_features: Record<string, unknown>;
  relationships: { type: string; target_note_id: string; weight: number }[];
  created_at: string;
}

interface RetrievalDebug {
  candidates: {
    note_id: string;
    retrieval_sources: string[];
    semantic_similarity: number;
    project_match: number;
    entity_match: number;
    open_loop: number;
    urgency: number;
    dependency: number;
    context_match: number;
    behavior_prior: number;
  }[];
  notes: NoteDebug[];
}

export default function DebugPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<RetrievalDebug | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedNote, setExpandedNote] = useState<string | null>(null);

  async function runRetrieval() {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const res = await fetch("/api/retrieve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      if (!res.ok) throw new Error(await res.text());
      const data: RetrievalDebug = await res.json();
      setResults(data);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <Nav />
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-8">
        <h1 className="text-lg font-semibold mb-6">Debug: Retrieval Inspector</h1>

        <div className="space-y-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search query to test retrieval..."
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
            onKeyDown={(e) => e.key === "Enter" && runRetrieval()}
          />
          <button
            onClick={runRetrieval}
            disabled={loading || !query.trim()}
            className="px-4 py-2 rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? "Retrieving..." : "Run retrieval"}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {results && (
          <div className="mt-6 space-y-4">
            <div className="text-sm text-neutral-500">
              {results.candidates.length} candidates retrieved, {results.notes.length} notes loaded
            </div>

            {results.candidates.map((candidate, i) => {
              const note = results.notes.find((n) => n.id === candidate.note_id);
              const isExpanded = expandedNote === candidate.note_id;

              return (
                <div
                  key={candidate.note_id}
                  className="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedNote(isExpanded ? null : candidate.note_id)}
                    className="w-full text-left p-4 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-mono text-neutral-400 mr-2">#{i + 1}</span>
                        <span className="text-sm">
                          {note ? (note.content.length > 100 ? note.content.slice(0, 100) + "..." : note.content) : candidate.note_id}
                        </span>
                      </div>
                      <div className="flex gap-2 flex-shrink-0 ml-4">
                        {candidate.retrieval_sources.map((src) => (
                          <span
                            key={src}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                          >
                            {src}
                          </span>
                        ))}
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-neutral-200 dark:border-neutral-800 p-4 bg-neutral-50 dark:bg-neutral-900">
                      <h3 className="text-xs font-semibold text-neutral-500 mb-2">Score Breakdown</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                        <ScoreCell label="Semantic" value={candidate.semantic_similarity} />
                        <ScoreCell label="Project" value={candidate.project_match} />
                        <ScoreCell label="Entity" value={candidate.entity_match} />
                        <ScoreCell label="Open Loop" value={candidate.open_loop} />
                        <ScoreCell label="Urgency" value={candidate.urgency} />
                        <ScoreCell label="Dependency" value={candidate.dependency} />
                        <ScoreCell label="Context" value={candidate.context_match} />
                        <ScoreCell label="Behavior" value={candidate.behavior_prior} />
                      </div>

                      {note && (
                        <>
                          <h3 className="text-xs font-semibold text-neutral-500 mt-4 mb-2">Metadata</h3>
                          <pre className="text-[11px] bg-white dark:bg-neutral-950 p-3 rounded border border-neutral-200 dark:border-neutral-800 overflow-x-auto">
                            {JSON.stringify(note.metadata, null, 2)}
                          </pre>

                          <h3 className="text-xs font-semibold text-neutral-500 mt-4 mb-2">Importance Features</h3>
                          <pre className="text-[11px] bg-white dark:bg-neutral-950 p-3 rounded border border-neutral-200 dark:border-neutral-800 overflow-x-auto">
                            {JSON.stringify(note.importance_features, null, 2)}
                          </pre>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {results.candidates.length === 0 && (
              <div className="text-sm text-neutral-500 text-center py-8">
                No candidates found for this query.
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function ScoreCell({ label, value }: { label: string; value: number }) {
  const barWidth = Math.round(value * 100);
  return (
    <div>
      <div className="text-neutral-500 mb-1">{label}</div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-neutral-600 dark:bg-neutral-400 rounded-full"
            style={{ width: `${barWidth}%` }}
          />
        </div>
        <span className="w-8 text-right">{value.toFixed(2)}</span>
      </div>
    </div>
  );
}
