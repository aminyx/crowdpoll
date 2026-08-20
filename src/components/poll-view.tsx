"use client";

import type { PollView } from "@/lib/queries";

/**
 * Poll rendering shared by audience and presenter: voting buttons while the
 * poll is open and the viewer has not voted; animated result bars otherwise.
 */
export function PollDisplay({
  poll,
  onVote,
  disabled,
}: {
  poll: PollView;
  onVote?: (optionId: string) => void;
  disabled?: boolean;
}) {
  const canVote = poll.status === "open" && poll.myVote === null && onVote;

  return (
    <div className="rounded-lg border border-edge bg-panel p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-medium">{poll.question}</h3>
        <PollBadge status={poll.status} />
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {poll.options.map((option) => {
          const share =
            poll.totalVotes === 0 ? 0 : Math.round((option.votes / poll.totalVotes) * 100);
          const mine = poll.myVote === option.id;

          if (canVote) {
            return (
              <button
                key={option.id}
                type="button"
                disabled={disabled}
                onClick={() => onVote(option.id)}
                className="rounded-md border border-edge bg-panel-2 px-4 py-2.5 text-left transition-colors hover:border-pulse/60 hover:text-pulse disabled:opacity-50"
              >
                {option.label}
              </button>
            );
          }

          return (
            <div key={option.id} className="relative overflow-hidden rounded-md border border-edge bg-panel-2">
              <div
                className={`bar-fill absolute inset-y-0 left-0 ${mine ? "bg-pulse/25" : "bg-edge/60"}`}
                style={{ width: `${share}%` }}
              />
              <div className="relative flex items-center justify-between px-4 py-2.5 text-sm">
                <span className={mine ? "font-medium text-pulse" : ""}>
                  {option.label}
                  {mine && " · your vote"}
                </span>
                <span className="font-mono text-fog">
                  {share}% · {option.votes}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-fog">
        {poll.totalVotes} vote{poll.totalVotes === 1 ? "" : "s"}
        {poll.status === "open" && poll.myVote === null && " · pick one — first choice is final"}
      </p>
    </div>
  );
}

export function PollBadge({ status }: { status: "draft" | "open" | "closed" }) {
  if (status === "open") {
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-pulse/10 px-2.5 py-1 text-xs font-medium text-pulse">
        <span className="live-dot h-1.5 w-1.5 rounded-full bg-pulse" />
        live
      </span>
    );
  }
  return (
    <span className="rounded-full bg-panel-2 px-2.5 py-1 text-xs text-fog">
      {status}
    </span>
  );
}
