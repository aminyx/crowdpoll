"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createEvent } from "@/lib/actions";

export function CreateEventForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createEvent({ title });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setTitle("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="mt-6 flex gap-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="New event title — e.g. Q3 all-hands"
        minLength={3}
        maxLength={120}
        required
        className="w-full rounded-md border border-edge bg-panel px-4 py-2.5 text-snow placeholder:text-fog/50 focus:border-pulse/60 focus:outline-none"
      />
      <button
        type="submit"
        disabled={pending}
        className="shrink-0 rounded-md bg-pulse-deep px-4 font-medium text-ink transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "…" : "Create"}
      </button>
      {error && (
        <p role="alert" className="absolute mt-12 text-sm text-rose">
          {error}
        </p>
      )}
    </form>
  );
}
