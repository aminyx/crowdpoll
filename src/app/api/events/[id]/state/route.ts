import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { getOrCreateAudienceId } from "@/lib/audience";
import { auth } from "@/lib/auth";
import { eventById, eventState } from "@/lib/queries";

export const dynamic = "force-dynamic";

/** Event state for the current viewer (presenter sees hidden content). */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const event = await eventById(id).catch(() => null);
  if (!event) {
    return NextResponse.json({ error: "event not found" }, { status: 404 });
  }

  const session = await auth.api.getSession({ headers: await headers() });
  const isOwner = session?.user.id === event.ownerId;
  const audienceId = await getOrCreateAudienceId();

  const state = await eventState(id, audienceId, isOwner);
  return NextResponse.json(state);
}
