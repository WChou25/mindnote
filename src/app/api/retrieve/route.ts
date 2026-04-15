import { NextRequest, NextResponse } from "next/server";
import { retrieveMemories } from "@/retrieval/pipeline";
import { log } from "@/observability/logger";
import type { RetrieveRequest } from "@/core/types";

export async function POST(request: NextRequest) {
  try {
    const body: RetrieveRequest = await request.json();

    if (!body.query && !body.context) {
      return NextResponse.json(
        { error: "query or context is required" },
        { status: 400 }
      );
    }

    const userId = "default-user";
    const query = body.query ?? JSON.stringify(body.context);
    const limit = body.limit ?? 20;

    const result = await retrieveMemories(userId, query, body.context ?? {}, limit);

    return NextResponse.json(result);
  } catch (err) {
    log("api.retrieve.error", { error: String(err) }, "error");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
