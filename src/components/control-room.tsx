"use client";

import Link from "next/link";
import QRCode from "qrcode";
import { useEffect, useState, useTransition } from "react";
import {
  createPoll,
  setPollStatus,
  setQuestionStatus,
  setQuestionsLocked,
} from "@/lib/actions";
import type { EventState } from "@/lib/queries";
import { PollBadge, PollDisplay } from "@/components/poll-view";
import { useEventStream } from "@/components/use-event-stream";

export function ControlRoom({ initial }: { initial: EventState }) {
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

  return (
    <main className="mx-auto min-h-dvh max-w-6xl px-6 pb-16">
      <header className="flex flex-wrap items-center justify-between gap-4 py-6">
        <div>
          <Link href="/dashboard" className="text-sm text-fog transition-colors hover:text-snow">
            ← All events
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">{state.title}</h1>
        </div>
        <span
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs ${
            live ? "bg-pulse/10 text-pulse" : "bg-panel-2 text-fog"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${live ? "live-dot bg-pulse" : "bg-fog"}`} />
          {live ? "realtime connected" : "reconnecting"}
        </span>
      </header>

      {error && (
        <p role="alert" className="mb-4 rounded-md border border-rose/30 bg-rose/10 px-4 py-2 text-sm text-rose">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        {/* Questions column */}
        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-medium uppercase tracking-wider text-fog">
              Questions · {state.questions.length}
            </h2>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(() =>
                  setQuestionsLocked({ eventId: state.id, locked: !state.questionsLocked }),
                )
              }
              className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
                state.questionsLocked
                  ? "border-amber/40 bg-amber/10 text-amber"
                  : "border-edge bg-panel text-fog hover:text-snow"
              }`}
            >
              {state.questionsLocked ? "Questions locked — unlock" : "Lock new questions"}
            </button>
          </div>

          <ul className="mt-3 flex flex-col gap-2">
            {state.questions.map((q) => (
              <li
                key={q.id}
                className={`flex items-start gap-3 rounded-lg border p-3.5 ${
                  q.status === "hidden"
                    ? "border-edge bg-panel/40 opacity-60"
                    : q.status === "answered"
                      ? "border-pulse/25 bg-pulse/5"
                      : "border-edge bg-panel"
                }`}
              >
                <span className="flex min-w-11 flex-col items-center rounded-md bg-panel-2 px-2 py-1.5 text-fog">
                  <span aria-hidden>▲</span>
                  <span className="text-sm font-medium text-snow">{q.votes}</span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-relaxed">{q.body}</p>
                  <p className="mt-1 text-xs text-fog">{q.authorName || "anonymous"}</p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  {q.status !== "answered" && (
                    <ModButton
                      label="Answered"
                      disabled={pending}
                      onClick={() =>
                        run(() =>
                          setQuestionStatus({
                            eventId: state.id,
                            questionId: q.id,
                            status: "answered",
                          }),
                        )
                      }
                    />
                  )}
                  {q.status !== "hidden" ? (
                    <ModButton
                      label="Hide"
                      disabled={pending}
                      onClick={() =>
                        run(() =>
                          setQuestionStatus({
                            eventId: state.id,
                            questionId: q.id,
                            status: "hidden",
                          }),
                        )
                      }
                    />
                  ) : (
                    <ModButton
                      label="Restore"
                      disabled={pending}
                      onClick={() =>
                        run(() =>
                          setQuestionStatus({
                            eventId: state.id,
                            questionId: q.id,
                            status: "visible",
                          }),
                        )
                      }
                    />
                  )}
                </div>
              </li>
            ))}
            {state.questions.length === 0 && (
              <li className="rounded-lg border border-dashed border-edge p-10 text-center text-sm text-fog">
                Waiting for the first question — share the join code.
              </li>
            )}
          </ul>
        </section>

        {/* Side column: join info + polls */}
        <aside className="flex flex-col gap-6">
          <JoinCard code={state.code} />
          <section>
            <h2 className="text-xs font-medium uppercase tracking-wider text-fog">Polls</h2>
            <NewPollForm
              disabled={pending}
              onCreate={(question, options) =>
                run(() => createPoll({ eventId: state.id, question, options }))
              }
            />
            <div className="mt-3 flex flex-col gap-3">
              {state.polls.map((poll) => (
                <div key={poll.id} className="rounded-lg border border-edge bg-panel p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{poll.question}</p>
                    <PollBadge status={poll.status} />
                  </div>
                  <div className="mt-2 flex gap-2">
                    {poll.status !== "open" ? (
                      <ModButton
                        label={poll.status === "draft" ? "Open poll" : "Reopen"}
                        accent
                        disabled={pending}
                        onClick={() =>
                          run(() =>
                            setPollStatus({ eventId: state.id, pollId: poll.id, status: "open" }),
                          )
                        }
                      />
                    ) : (
                      <ModButton
                        label="Close poll"
                        disabled={pending}
                        onClick={() =>
                          run(() =>
                            setPollStatus({ eventId: state.id, pollId: poll.id, status: "closed" }),
                          )
                        }
                      />
                    )}
                  </div>
                  {poll.status !== "draft" && (
                    <div className="mt-3">
                      <PollDisplay poll={poll} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}

function ModButton({
  label,
  onClick,
  disabled,
  accent,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-md border px-2.5 py-1.5 text-xs transition-colors disabled:opacity-50 ${
        accent
          ? "border-pulse/50 bg-pulse/10 text-pulse hover:bg-pulse/20"
          : "border-edge bg-panel-2 text-fog hover:text-snow"
      }`}
    >
      {label}
    </button>
  );
}

function JoinCard({ code }: { code: string }) {
  const [join, setJoin] = useState<{ qr: string | null; origin: string } | null>(null);

  useEffect(() => {
    const url = `${window.location.origin}/e/${code}`;
    const origin = window.location.origin.replace(/^https?:\/\//, "");
    QRCode.toDataURL(url, {
      margin: 1,
      width: 240,
      color: { dark: "#0b0e14", light: "#e8ebf1" },
    })
      .then((qr) => setJoin({ qr, origin }))
      .catch(() => setJoin({ qr: null, origin }));
  }, [code]);

  const origin = join?.origin ?? "";
  const qr = join?.qr ?? null;

  return (
    <div className="rounded-lg border border-edge bg-panel p-4 text-center">
      <p className="text-xs uppercase tracking-wider text-fog">Join at</p>
      <p className="mt-1 font-mono text-sm">
        {origin}/e/<span className="text-pulse">{code}</span>
      </p>
      <p className="mt-3 font-mono text-3xl font-semibold tracking-[0.3em] text-pulse">
        {code}
      </p>
      {qr && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={qr}
          alt={`QR code to join event ${code}`}
          className="mx-auto mt-4 rounded-md"
          width={160}
          height={160}
        />
      )}
    </div>
  );
}

function NewPollForm({
  disabled,
  onCreate,
}: {
  disabled: boolean;
  onCreate: (question: string, options: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 w-full rounded-md border border-dashed border-edge px-4 py-2.5 text-sm text-fog transition-colors hover:border-pulse/40 hover:text-snow"
      >
        + New poll
      </button>
    );
  }

  const valid =
    question.trim().length >= 3 && options.filter((o) => o.trim()).length >= 2;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        onCreate(
          question.trim(),
          options.map((o) => o.trim()).filter(Boolean),
        );
        setQuestion("");
        setOptions(["", ""]);
        setOpen(false);
      }}
      className="mt-3 flex flex-col gap-2 rounded-lg border border-edge bg-panel p-3"
    >
      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Poll question"
        maxLength={200}
        className="rounded-md border border-edge bg-panel-2 px-3 py-2 text-sm text-snow placeholder:text-fog/50 focus:border-pulse/60 focus:outline-none"
      />
      {options.map((option, i) => (
        <input
          key={i}
          value={option}
          onChange={(e) =>
            setOptions(options.map((o, j) => (j === i ? e.target.value : o)))
          }
          placeholder={`Option ${i + 1}`}
          maxLength={80}
          className="rounded-md border border-edge bg-panel-2 px-3 py-2 text-sm text-snow placeholder:text-fog/50 focus:border-pulse/60 focus:outline-none"
        />
      ))}
      <div className="flex justify-between gap-2">
        <button
          type="button"
          disabled={options.length >= 8}
          onClick={() => setOptions([...options, ""])}
          className="text-xs text-fog transition-colors hover:text-snow disabled:opacity-40"
        >
          + option
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md px-3 py-1.5 text-xs text-fog hover:text-snow"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={disabled || !valid}
            className="rounded-md bg-pulse-deep px-3 py-1.5 text-xs font-medium text-ink disabled:opacity-40"
          >
            Create draft
          </button>
        </div>
      </div>
    </form>
  );
}
