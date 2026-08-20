"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import {
  events,
  pollOptions,
  pollVotes,
  polls,
  questionVotes,
  questions,
} from "@/db/schema";
import { getAudienceId, getOrCreateAudienceId } from "@/lib/audience";
import { auth } from "@/lib/auth";
import { broadcast } from "@/lib/bus";
import { generateJoinCode } from "@/lib/codes";
import { allow } from "@/lib/ratelimit";

export type ActionResult = { ok: true } | { ok: false; error: string };

const ok: ActionResult = { ok: true };
const fail = (error: string): ActionResult => ({ ok: false, error });

async function requireOwner(eventId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const event = await db.query.events.findFirst({ where: eq(events.id, eventId) });
  if (!event || event.ownerId !== session.user.id) return null;
  return { event, userId: session.user.id };
}

// ---------------------------------------------------------------------------
// Presenter actions
// ---------------------------------------------------------------------------

const createEventSchema = z.object({
  title: z.string().trim().min(3).max(120),
});

export async function createEvent(input: { title: string }): Promise<ActionResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return fail("sign in to create events");
  if (!allow("event:create", session.user.id)) return fail("slow down a little");

  const parsed = createEventSchema.safeParse(input);
  if (!parsed.success) return fail("title must be 3–120 characters");

  // Retry on the (unlikely) join-code collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await db.insert(events).values({
        ownerId: session.user.id,
        title: parsed.data.title,
        code: generateJoinCode(),
      });
      revalidatePath("/dashboard");
      return ok;
    } catch (err) {
      if (attempt === 4) throw err;
    }
  }
  return fail("could not allocate a join code");
}

export async function setQuestionStatus(input: {
  eventId: string;
  questionId: string;
  status: "visible" | "answered" | "hidden";
}): Promise<ActionResult> {
  const ctx = await requireOwner(input.eventId);
  if (!ctx) return fail("not your event");
  const status = z.enum(["visible", "answered", "hidden"]).safeParse(input.status);
  if (!status.success) return fail("bad status");

  const updated = await db
    .update(questions)
    .set({ status: status.data })
    .where(and(eq(questions.id, input.questionId), eq(questions.eventId, input.eventId)))
    .returning({ id: questions.id });
  if (updated.length === 0) return fail("question not found");
  broadcast(input.eventId, "questions");
  return ok;
}

export async function setQuestionsLocked(input: {
  eventId: string;
  locked: boolean;
}): Promise<ActionResult> {
  const ctx = await requireOwner(input.eventId);
  if (!ctx) return fail("not your event");
  await db
    .update(events)
    .set({ questionsLocked: input.locked })
    .where(eq(events.id, input.eventId));
  broadcast(input.eventId, "event");
  return ok;
}

const createPollSchema = z.object({
  eventId: z.uuid(),
  question: z.string().trim().min(3).max(200),
  options: z.array(z.string().trim().min(1).max(80)).min(2).max(8),
});

export async function createPoll(input: {
  eventId: string;
  question: string;
  options: string[];
}): Promise<ActionResult> {
  const ctx = await requireOwner(input.eventId);
  if (!ctx) return fail("not your event");
  const parsed = createPollSchema.safeParse(input);
  if (!parsed.success) return fail("a poll needs a question and 2–8 options");

  await db.transaction(async (tx) => {
    const [poll] = await tx
      .insert(polls)
      .values({ eventId: parsed.data.eventId, question: parsed.data.question })
      .returning({ id: polls.id });
    await tx.insert(pollOptions).values(
      parsed.data.options.map((label, ord) => ({ pollId: poll.id, label, ord })),
    );
  });
  broadcast(input.eventId, "polls");
  return ok;
}

export async function setPollStatus(input: {
  eventId: string;
  pollId: string;
  status: "open" | "closed";
}): Promise<ActionResult> {
  const ctx = await requireOwner(input.eventId);
  if (!ctx) return fail("not your event");

  if (input.status === "open") {
    // Opening a poll closes any other open poll — one live poll at a time
    // keeps the audience view unambiguous.
    await db
      .update(polls)
      .set({ status: "closed" })
      .where(and(eq(polls.eventId, input.eventId), eq(polls.status, "open")));
  }
  const updated = await db
    .update(polls)
    .set({ status: input.status })
    .where(and(eq(polls.id, input.pollId), eq(polls.eventId, input.eventId)))
    .returning({ id: polls.id });
  if (updated.length === 0) return fail("poll not found");
  broadcast(input.eventId, "polls");
  return ok;
}

export async function deleteEvent(input: { eventId: string }): Promise<ActionResult> {
  const ctx = await requireOwner(input.eventId);
  if (!ctx) return fail("not your event");
  await db.delete(events).where(eq(events.id, input.eventId));
  revalidatePath("/dashboard");
  return ok;
}

// ---------------------------------------------------------------------------
// Audience actions (anonymous, rate-limited per session)
// ---------------------------------------------------------------------------

const askSchema = z.object({
  eventId: z.uuid(),
  body: z.string().trim().min(3).max(280),
  authorName: z.string().trim().max(40).optional().default(""),
});

export async function askQuestion(input: {
  eventId: string;
  body: string;
  authorName?: string;
}): Promise<ActionResult> {
  const audienceId = await getOrCreateAudienceId();
  if (!allow("question:create", audienceId)) {
    return fail("you are asking very fast — wait a moment");
  }
  const parsed = askSchema.safeParse(input);
  if (!parsed.success) return fail("questions are 3–280 characters");

  const event = await db.query.events.findFirst({
    where: eq(events.id, parsed.data.eventId),
  });
  if (!event) return fail("event not found");
  if (event.questionsLocked) return fail("questions are closed for this event");

  await db.insert(questions).values({
    eventId: event.id,
    body: parsed.data.body,
    authorName: parsed.data.authorName,
    sessionId: audienceId,
  });
  broadcast(event.id, "questions");
  return ok;
}

export async function toggleQuestionVote(input: {
  eventId: string;
  questionId: string;
}): Promise<ActionResult> {
  const audienceId = await getOrCreateAudienceId();
  if (!allow("question:vote", audienceId)) return fail("too fast");

  const question = await db.query.questions.findFirst({
    where: and(eq(questions.id, input.questionId), eq(questions.eventId, input.eventId)),
  });
  if (!question || question.status === "hidden") return fail("question not found");

  const deleted = await db
    .delete(questionVotes)
    .where(
      and(
        eq(questionVotes.questionId, input.questionId),
        eq(questionVotes.sessionId, audienceId),
      ),
    )
    .returning({ id: questionVotes.questionId });
  if (deleted.length === 0) {
    await db
      .insert(questionVotes)
      .values({ questionId: input.questionId, sessionId: audienceId })
      .onConflictDoNothing();
  }
  broadcast(input.eventId, "questions");
  return ok;
}

export async function votePoll(input: {
  eventId: string;
  pollId: string;
  optionId: string;
}): Promise<ActionResult> {
  const audienceId = await getAudienceId();
  if (!audienceId) return fail("join the event first");
  if (!allow("poll:vote", audienceId)) return fail("too fast");

  const poll = await db.query.polls.findFirst({
    where: and(eq(polls.id, input.pollId), eq(polls.eventId, input.eventId)),
  });
  if (!poll) return fail("poll not found");
  if (poll.status !== "open") return fail("this poll is not open");

  const option = await db.query.pollOptions.findFirst({
    where: and(eq(pollOptions.id, input.optionId), eq(pollOptions.pollId, input.pollId)),
  });
  if (!option) return fail("option not found");

  // First vote wins; changing your vote is deliberately not allowed once the
  // insert lands (PK on poll_id+session_id).
  const inserted = await db
    .insert(pollVotes)
    .values({ pollId: poll.id, optionId: option.id, sessionId: audienceId })
    .onConflictDoNothing()
    .returning({ pollId: pollVotes.pollId });
  if (inserted.length === 0) return fail("you already voted in this poll");

  broadcast(input.eventId, "polls");
  return ok;
}
