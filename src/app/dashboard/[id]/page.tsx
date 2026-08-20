import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getAudienceId } from "@/lib/audience";
import { auth } from "@/lib/auth";
import { eventById, eventState } from "@/lib/queries";
import { ControlRoom } from "@/components/control-room";

export const metadata: Metadata = { title: "Control room" };

export default async function ControlRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const event = await eventById(id).catch(() => null);
  if (!event || event.ownerId !== session.user.id) notFound();

  const audienceId = (await getAudienceId()) ?? "presenter";
  const initial = await eventState(id, audienceId, true);
  if (!initial) notFound();

  return <ControlRoom initial={initial} />;
}
