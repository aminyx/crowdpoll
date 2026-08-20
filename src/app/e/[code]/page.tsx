import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAudienceId } from "@/lib/audience";
import { isValidJoinCode } from "@/lib/codes";
import { eventByCode, eventState } from "@/lib/queries";
import { AudienceRoom } from "@/components/audience-room";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const event = isValidJoinCode(code) ? await eventByCode(code) : null;
  return { title: event ? event.title : "Event" };
}

export default async function AudiencePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  if (!isValidJoinCode(code)) notFound();

  const event = await eventByCode(code);
  if (!event) notFound();

  // Server Components may only read cookies; the audience cookie is minted
  // by the /state route handler on the client's first fetch.
  const audienceId = (await getAudienceId()) ?? "anonymous";
  const initial = await eventState(event.id, audienceId, false);
  if (!initial) notFound();

  return <AudienceRoom initial={initial} />;
}
