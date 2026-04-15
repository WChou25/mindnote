import type {
  ExtractionResult,
  FeatureExtractor,
  NoteMetadata,
  Entity,
  Persona,
  Urgency,
  Actionability,
  Status,
} from "@/core/types";

// ──────────────────────────────────────────────
// Heuristic-based feature extraction (Phase 1)
// Each method can be swapped for a classifier or LLM later.
// ──────────────────────────────────────────────

const URGENCY_CUES = [
  "asap", "urgent", "deadline", "before", "by tomorrow", "by friday",
  "by monday", "time-sensitive", "hurry", "immediately", "right away",
  "can't wait", "overdue", "due", "expiring", "last chance",
];

const ACTION_PHRASES = [
  "need to", "should", "must", "have to", "going to", "plan to",
  "will", "want to", "call", "email", "contact", "schedule",
  "book", "fix", "buy", "order", "submit", "send", "follow up",
];

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const RELATIVE_TIME = ["today", "tomorrow", "tonight", "next week", "this week", "yesterday"];

const TOPIC_KEYWORDS: Record<string, string[]> = {
  home_maintenance: ["plumber", "electrician", "roof", "pipe", "leak", "repair", "fix", "sink", "faucet", "toilet", "hvac"],
  finance: ["bank", "money", "pay", "invoice", "budget", "cost", "price", "quote", "dollar", "$"],
  health: ["doctor", "appointment", "medication", "prescription", "symptom", "hospital", "dentist"],
  work: ["meeting", "project", "deadline", "client", "presentation", "report", "review", "standup"],
  travel: ["flight", "hotel", "booking", "trip", "airport", "passport", "visa"],
  shopping: ["buy", "order", "store", "delivery", "package", "return"],
  social: ["party", "dinner", "guests", "birthday", "wedding", "visit"],
};

export class HeuristicExtractor implements FeatureExtractor {
  async extract(clean: string, raw: string): Promise<ExtractionResult> {
    const lower = clean.toLowerCase();
    const trace: Record<string, unknown> = {};

    const topics = this.extractTopics(lower);
    trace.topics = { method: "keyword_match", matches: topics };

    const entities = this.extractEntities(clean);
    trace.entities = { method: "pattern_match", count: entities.length };

    const personas = this.extractPersonas(entities, clean);
    trace.personas = { method: "entity_role_heuristic", count: personas.length };

    const urgency = this.extractUrgency(lower);
    trace.urgency = { method: "cue_match", score: urgency.score };

    const actionability = this.extractActionability(lower);
    trace.actionability = { method: "phrase_match", has_next_step: actionability.has_next_step };

    const status = this.extractStatus(lower, actionability);
    trace.status = { method: "heuristic", state: status.state };

    const time_refs = this.extractTimeRefs(lower);
    trace.time_refs = { method: "regex_days", count: time_refs.length };

    const metadata: NoteMetadata = {
      topics,
      entities,
      personas,
      project: null, // determined later via embedding similarity
      status,
      emotion: null,  // deferred to classifier in Phase 2
      urgency,
      actionability,
      time_refs,
    };

    return { metadata, trace };
  }

  private extractTopics(lower: string): string[] {
    const found: string[] = [];
    for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
      if (keywords.some((kw) => lower.includes(kw))) {
        found.push(topic);
      }
    }
    return found.length > 0 ? found : ["general"];
  }

  private extractEntities(text: string): Entity[] {
    const entities: Entity[] = [];

    // Capitalized words that aren't sentence starters (simple NER)
    const words = text.split(/\s+/);
    for (let i = 1; i < words.length; i++) {
      const w = words[i].replace(/[^a-zA-Z]/g, "");
      if (w.length > 1 && w[0] === w[0].toUpperCase() && w[0] !== w[0].toLowerCase()) {
        entities.push({ type: "person", value: w });
      }
    }

    // Dollar amounts
    const moneyMatches = text.match(/\$[\d,]+(?:\.\d{2})?/g);
    if (moneyMatches) {
      for (const m of moneyMatches) {
        entities.push({ type: "object", value: m });
      }
    }

    // Deduplicate by value
    const seen = new Set<string>();
    return entities.filter((e) => {
      if (seen.has(e.value)) return false;
      seen.add(e.value);
      return true;
    });
  }

  private extractPersonas(entities: Entity[], text: string): Persona[] {
    const personas: Persona[] = [];
    const lower = text.toLowerCase();

    // Look for "Name the role" or "Name said" patterns
    const rolePatterns = [
      /(\w+)\s+(?:the\s+)?(\w+(?:\s+\w+)?)\s+said/gi,
      /(\w+)\s+(?:the\s+)?(\w+)\s+(?:quoted|mentioned|called|emailed)/gi,
    ];

    for (const pattern of rolePatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const name = match[1];
        const role = match[2].toLowerCase();
        if (entities.some((e) => e.value === name)) {
          personas.push({ name, role });
        }
      }
    }

    // Also check for "Name, [role]" pattern
    for (const entity of entities.filter((e) => e.type === "person")) {
      const nameIdx = lower.indexOf(entity.value.toLowerCase());
      if (nameIdx >= 0) {
        // Check surrounding context for role clues
        const surrounding = lower.slice(Math.max(0, nameIdx - 20), nameIdx + entity.value.length + 30);
        const roleWords = ["plumber", "electrician", "doctor", "lawyer", "contractor", "manager", "boss"];
        for (const role of roleWords) {
          if (surrounding.includes(role) && !personas.some((p) => p.name === entity.value)) {
            personas.push({ name: entity.value, role });
          }
        }
      }
    }

    return personas;
  }

  private extractUrgency(lower: string): Urgency {
    const matchedCues = URGENCY_CUES.filter((cue) => lower.includes(cue));
    if (matchedCues.length === 0) {
      return { score: 0.1, reason: "no urgency signals detected" };
    }
    const score = Math.min(1, 0.3 + matchedCues.length * 0.2);
    return { score, reason: `urgency cues: ${matchedCues.join(", ")}` };
  }

  private extractActionability(lower: string): Actionability {
    const matchedPhrases = ACTION_PHRASES.filter((p) => lower.includes(p));
    if (matchedPhrases.length === 0) {
      return { has_next_step: false, suggested_next_step: null };
    }
    // Use the first matching action phrase as a rough next-step
    return {
      has_next_step: true,
      suggested_next_step: matchedPhrases[0],
    };
  }

  private extractStatus(lower: string, actionability: Actionability): Status {
    if (lower.includes("done") || lower.includes("resolved") || lower.includes("fixed") || lower.includes("completed")) {
      return { state: "resolved", confidence: 0.7 };
    }
    if (actionability.has_next_step) {
      return { state: "unsolved", confidence: 0.8 };
    }
    return { state: "reference", confidence: 0.6 };
  }

  private extractTimeRefs(lower: string): string[] {
    const refs: string[] = [];
    for (const day of DAYS) {
      if (lower.includes(day)) refs.push(day);
    }
    for (const rel of RELATIVE_TIME) {
      if (lower.includes(rel)) refs.push(rel);
    }
    // Date patterns like "March 5" or "3/5"
    const datePatches = lower.match(/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2}/g);
    if (datePatches) refs.push(...datePatches);
    return refs;
  }
}
