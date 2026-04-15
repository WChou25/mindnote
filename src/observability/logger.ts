type LogLevel = "info" | "warn" | "error" | "debug";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  event: string;
  data: Record<string, unknown>;
}

/**
 * Structured logger for pipeline observability.
 * Every pipeline run should be inspectable.
 *
 * In development, logs go to console as structured JSON.
 * In production, swap this for your preferred sink (Axiom, Datadog, etc.).
 */
export function log(
  event: string,
  data: Record<string, unknown>,
  level: LogLevel = "info"
): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    data,
  };

  if (level === "error") {
    console.error(JSON.stringify(entry));
  } else if (level === "warn") {
    console.warn(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

/**
 * Log a full pipeline trace with a summary.
 */
export function logPipelineTrace(
  pipelineName: string,
  noteId: string,
  stages: Record<string, Record<string, unknown>>
): void {
  log(`${pipelineName}.trace`, {
    note_id: noteId,
    stages: Object.keys(stages),
    ...stages,
  });
}
