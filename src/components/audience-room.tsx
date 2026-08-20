"use client";

import { useState, useTransition } from "react";
import { askQuestion, toggleQuestionVote, votePoll } from "@/lib/actions";
import type { EventState } from "@/lib/queries";
import { PollDisplay } from "@/components/poll-view";
import { useEventStream } from "@/components/use-event-stream";

export function AudienceRoom({ initial }: { initial: EventState }) {
  const { state, live } = useEventStream(initial.id, initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok && result.error) setError(result.error);
    });
  }

  const openPoll = state.polls.find((p) => p.status === "open");
  const closedPolls = state.polls.filter((p) => p.status === "closed");

  return (
    <main className="mx-auto min-h-dvh max-w-xl px-4 pb-24">
      <header className="sticky top-0 z-10 -mx-4 mb-6 border-b border-edge bg-ink/90 px-4 py-4 backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-xs tracking-widest text-fog">
              crowd<span className="text-pulse">poll</span> ·{" "}
              <span className="tracking-[0.25em]">{state.code}</span>
            </p>
            <h1 className="mt-1 text-lg font-semibold leading-tight">{state.title}</h1>
          </div>
          <span
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ${
              live ? "bg-pulse/10 text-pulse" : "bg-panel-2 text-fog"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${live ? "live-dot bg-pulse" : "bg-fog"}`} />
            {live ? "live" : "reconnecting"}
          </span>
        </div>
      </header>

      {error && (
        <p role="alert" className="mb-4 rounded-md border border-rose/30 bg-rose/10 px-4 py-2 text-sm text-rose">
          {error}
        </p>
      )}

      {openPoll && (
        <section className="rise mb-8">
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-fog">
            Live poll
          </h2>
          <PollDisplay
            poll={openPoll}
            disabled={pending}
            onVote={(optionId) =>
              run(() => votePoll({ eventId: state.id, pollId: openPoll.id, optionId }))
            }
          />
        </section>
      )}

      <section>
        <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-fog">
          Questions
        </h2>
        <AskForm
          locked={state.questionsLocked}
          disabled={pending}
          onAsk={(body, authorName) =>
            run(() => askQuestion({ eventId: state.id, body, authorName }))
          }
        />
        <ul className="mt-4 flex flex-col gap-2">
          {state.questions
            .filter((q) => q.status !== "hidden")
            .map((q) => (
              <li
                key={q.id}
                className={`rise flex items-start gap-3 rounded-lg border p-3.5 ${
                  q.status === "answered"
                    ? "border-pulse/25 bg-pulse/5"
                    : "border-edge bg-panel"
                }`}
              >
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    run(() => toggleQuestionVote({ eventId: state.id, questionId: q.id }))
                  }
                  aria-pressed={q.votedByMe}
                  aria-label={`upvote, ${q.votes} votes`}
                  className={`flex min-w-11 flex-col items-center rounded-md border px-2 py-1.5 transition-colors ${
                    q.votedByMe
                      ? "border-pulse/60 bg-pulse/10 text-pulse"
                      : "border-edge bg-panel-2 text-fog hover:border-pulse/40 hover:text-snow"
                  }`}
                >
                  <span aria-hidden>▲</span>
                  <span className="text-sm font-medium">{q.votes}</span>
                </button>
                <div className="min-w-0">
                  <p className="text-sm leading-relaxed">{q.body}</p>
                  <p className="mt-1 text-xs text-fog">
                    {q.authorName || "anonymous"}
                    {q.mine && " · you"}
                    {q.status === "answered" && (
                      <span className="text-pulse"> · answered</span>
                    )}
                  </p>
                </div>
              </li>
            ))}
          {state.questions.length === 0 && (
            <li className="rounded-lg border border-dashed border-edge p-8 text-center text-sm text-fog">
              No questions yet — yours can be the first.
            </li>
          )}
        </ul>
      </section>

      {closedPolls.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-fog">
            Earlier polls
          </h2>
          <div className="flex flex-col gap-3">
            {closedPolls.map((poll) => (
              <PollDisplay key={poll.id} poll={poll} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function AskForm({
  locked,
  disabled,
  onAsk,
}: {
  locked: boolean;
  disabled: boolean;
  onAsk: (body: string, authorName: string) => void;
}) {
  const [body, setBody] = useState("");
  const [authorName, setAuthorName] = useState("");

  if (locked) {
    return (
      <p className="rounded-md border border-edge bg-panel px-4 py-3 text-sm text-fog">
        The host has closed new questions.
      </p>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (body.trim().length < 3) return;
        onAsk(body.trim(), authorName.trim());
        setBody("");
      }}
      className="flex flex-col gap-2"
    >
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Ask your question…"
        rows={2}
        maxLength={280}
        required
        minLength={3}
        className="resize-none rounded-md border border-edge bg-panel px-4 py-3 text-sm text-snow placeholder:text-fog/50 focus:border-pulse/60 focus:outline-none"
      />
      <div className="flex gap-2">
        <input
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          placeholder="Name (optional)"
          maxLength={40}
          className="w-full rounded-md border border-edge bg-panel px-4 py-2 text-sm text-snow placeholder:text-fog/50 focus:border-pulse/60 focus:outline-none"
        />
        <button
          type="submit"
          disabled={disabled || body.trim().length < 3}
          className="shrink-0 rounded-md bg-pulse-deep px-4 py-2 text-sm font-medium text-ink transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          Ask
        </button>
      </div>
    </form>
  );
}
