import { NextRequest, NextResponse } from "next/server";
import { updateHintEventAction, upsertUserWeight } from "@/db/queries";
import { log } from "@/observability/logger";
import { FEEDBACK_ACTIONS } from "@/core/constants";
import type { HintFeedbackRequest } from "@/core/types";

const POSITIVE_ACTIONS = new Set(["clicked", "acted_on", "marked_solved"]);
const NEGATIVE_ACTIONS = new Set(["dismissed"]);

export async function POST(request: NextRequest) {
  try {
    const body: HintFeedbackRequest = await request.json();

    if (!body.hint_id || !body.action) {
      return NextResponse.json(
        { error: "hint_id and action are required" },
        { status: 400 }
      );
    }

    if (!FEEDBACK_ACTIONS.includes(body.action as typeof FEEDBACK_ACTIONS[number])) {
      return NextResponse.json(
        { error: `invalid action, must be one of: ${FEEDBACK_ACTIONS.join(", ")}` },
        { status: 400 }
      );
    }

    const userId = "default-user";

    // Update the hint event
    await updateHintEventAction(body.hint_id, body.action);

    // Update user weights based on feedback
    // Positive actions increase weight, negative decrease
    const delta = POSITIVE_ACTIONS.has(body.action) ? 0.1 : NEGATIVE_ACTIONS.has(body.action) ? -0.1 : 0;

    if (delta !== 0) {
      // Use general keys for now — the frontend can pass richer context later
      await upsertUserWeight(userId, "general", "general", "general", delta);
    }

    log("api.hint-feedback", { hint_id: body.hint_id, action: body.action, delta });

    return NextResponse.json({ success: true });
  } catch (err) {
    log("api.hint-feedback.error", { error: String(err) }, "error");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
