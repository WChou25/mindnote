import type { Note, HintType } from "@/core/types";

/**
 * Choose the appropriate hint type based on the note's state.
 */
export function chooseHintType(note: Note): HintType {
  if (note.metadata.status.state === "resolved") {
    return "archive_prompt";
  }
  if (note.metadata.actionability.has_next_step) {
    return "next_step_reminder";
  }
  if (note.relationships.some((r) => r.type === "helps_resolve")) {
    return "resolution_reminder";
  }
  return "recall_reminder";
}

/**
 * Generate concise, evidence-based hint copy.
 * Short, non-invasive, easy to dismiss.
 */
export function composeHintContent(note: Note, hintType: HintType): string {
  const preview = note.content.length > 80
    ? note.content.slice(0, 80) + "..."
    : note.content;

  switch (hintType) {
    case "recall_reminder":
      return `Earlier note: "${preview}" — Relevant?`;

    case "next_step_reminder": {
      const step = note.metadata.actionability.suggested_next_step;
      return step
        ? `Reminder: ${step} — from note: "${preview}"`
        : `You have an open action item: "${preview}"`;
    }

    case "resolution_reminder": {
      const helpers = note.relationships
        .filter((r) => r.type === "helps_resolve")
        .length;
      return `${helpers} related note${helpers > 1 ? "s" : ""} may help resolve: "${preview}"`;
    }

    case "archive_prompt":
      return `This note appears resolved: "${preview}" — Archive it?`;
  }
}
