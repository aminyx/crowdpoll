import "server-only";

import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  events,
  pollOptions,
  pollVotes,
  polls,
  questionVotes,
  questions,
} from "@/db/schema";

export interface QuestionView {
  id: string;
  body: string;
  authorName: string;
  status: "visible" | "answered" | "hidden";
  votes: number;
  votedByMe: boolean;
  mine: boolean;
  createdAt: string;
}

export interface PollOptionView {
  id: string;
  label: string;
  votes: number;
}

export interface PollView {
  id: string;
  question: string;
  status: "draft" | "open" | "closed";
  options: PollOptionView[];
  totalVotes: number;
  myVote: string | null;
}

export interface EventState {
  id: string;
  title: string;
  code: string;
  questionsLocked: boolean;
  questions: QuestionView[];
  polls: PollView[];
}

export async function eventByCode(code: string) {
  return db.query.events.findFirst({ where: eq(events.code, code) });
}

export async function eventById(id: string) {
  return db.query.events.findFirst({ where: eq(events.id, id) });
}

export async function eventsForOwner(ownerId: string) {
  return db
    .select({
      id: events.id,
      title: events.title,
      code: events.code,
      createdAt: events.createdAt,
      questionCount: count(questions.id),
    })
    .from(events)
    .leftJoin(questions, eq(questions.eventId, events.id))
    .where(eq(events.ownerId, ownerId))
    .groupBy(events.id)
    .orderBy(desc(events.createdAt));
}

/**
 * Full event state for one viewer. `includeHidden` is for the presenter's
 * control room; audiences never receive hidden questions or draft polls.
 */
export async function eventState(
  eventId: string,
  audienceId: string,
  includeHidden: boolean,
): Promise<EventState | null> {
  const event = await eventById(eventId);
  if (!event) return null;

  const questionRows = await db
    .select({
      id: questions.id,
      body: questions.body,
      authorName: questions.authorName,
      status: questions.status,
      sessionId: questions.sessionId,
      createdAt: questions.createdAt,
      votes: count(questionVotes.questionId),
      votedByMe: sql<boolean>`bool_or(${questionVotes.sessionId} = ${audienceId})`,
    })
    .from(questions)
    .leftJoin(questionVotes, eq(questionVotes.questionId, questions.id))
    .where(eq(questions.eventId, eventId))
    .groupBy(questions.id)
    .orderBy(desc(count(questionVotes.questionId)), asc(questions.createdAt));

  const pollRows = await db
    .select()
    .from(polls)
    .where(eq(polls.eventId, eventId))
    .orderBy(desc(polls.createdAt));

  const pollViews: PollView[] = [];
  for (const poll of pollRows) {
    if (!includeHidden && poll.status === "draft") continue;
    const options = await db
      .select({
        id: pollOptions.id,
        label: pollOptions.label,
        votes: count(pollVotes.optionId),
      })
      .from(pollOptions)
      .leftJoin(
        pollVotes,
        and(eq(pollVotes.optionId, pollOptions.id), eq(pollVotes.pollId, poll.id)),
      )
      .where(eq(pollOptions.pollId, poll.id))
      .groupBy(pollOptions.id, pollOptions.ord)
      .orderBy(asc(pollOptions.ord));

    const [mine] = await db
      .select({ optionId: pollVotes.optionId })
      .from(pollVotes)
      .where(and(eq(pollVotes.pollId, poll.id), eq(pollVotes.sessionId, audienceId)));

    pollViews.push({
      id: poll.id,
      question: poll.question,
      status: poll.status,
      options,
      totalVotes: options.reduce((s, o) => s + o.votes, 0),
      myVote: mine?.optionId ?? null,
    });
  }

  return {
    id: event.id,
    title: event.title,
    code: event.code,
    questionsLocked: event.questionsLocked,
    questions: questionRows
      .filter((q) => includeHidden || q.status !== "hidden")
      .map((q) => ({
        id: q.id,
        body: q.body,
        authorName: q.authorName,
        status: q.status,
        votes: q.votes,
        votedByMe: q.votedByMe ?? false,
        mine: q.sessionId === audienceId,
        createdAt: q.createdAt.toISOString(),
      })),
    polls: pollViews,
  };
}
