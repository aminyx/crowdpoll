import { NextResponse } from "next/server";
import { isValidJoinCode } from "@/lib/codes";
import { eventByCode } from "@/lib/queries";

export const dynamic = "force-dynamic";

/** Existence check for the landing-page join form. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  if (!isValidJoinCode(code)) {
    return NextResponse.json({ error: "invalid code" }, { status: 400 });
  }
  const event = await eventByCode(code);
  if (!event) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
