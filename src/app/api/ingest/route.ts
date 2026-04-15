import { NextRequest, NextResponse } from "next/server";
import { ingestNote } from "@/ingestion/pipeline";
import { log } from "@/observability/logger";
import type { IngestRequest } from "@/core/types";

export async function POST(request: NextRequest) {
  try {
    const body: IngestRequest = await request.json();

    if (!body.content || typeof body.content !== "string") {
      return NextResponse.json(
        { error: "content is required and must be a string" },
        { status: 400 }
      );
    }

    // TODO: replace with real auth
    const userId = "default-user";
    const source = body.source ?? "web";

    const result = await ingestNote(userId, body.content, source);

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    log("api.ingest.error", { error: String(err) }, "error");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
