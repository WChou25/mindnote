import { NextRequest, NextResponse } from "next/server";
import { retrieveMemories } from "@/retrieval/pipeline";
import { generateHint } from "@/hinting/pipeline";
import { log } from "@/observability/logger";
import type { HintRequest } from "@/core/types";

export async function POST(request: NextRequest) {
  try {
    const body: HintRequest = await request.json();

    if (!body.context) {
      return NextResponse.json(
        { error: "context is required" },
        { status: 400 }
      );
    }

    const userId = "default-user";
    const query = body.current_note_content ?? JSON.stringify(body.context);

    // Retrieve candidates
    const { candidates } = await retrieveMemories(userId, query, body.context);

    // Generate hint
    const decision = await generateHint(userId, candidates, body.context);

    return NextResponse.json({
      hint: decision.hint,
      reason: decision.reason,
    });
  } catch (err) {
    log("api.hint.error", { error: String(err) }, "error");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
