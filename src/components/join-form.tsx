"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CODE_LENGTH, normalizeJoinCode } from "@/lib/codes";

export function JoinForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function join(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== CODE_LENGTH) {
      setError(`codes are ${CODE_LENGTH} characters`);
      return;
    }
    setChecking(true);
    setError(null);
    const res = await fetch(`/api/join/${code}`);
    setChecking(false);
    if (res.ok) {
      router.push(`/e/${code}`);
    } else {
      setError("no event with that code");
    }
  }

  return (
    <form onSubmit={join} className="flex gap-2">
      <label htmlFor="join-code" className="sr-only">
        Event code
      </label>
      <input
        id="join-code"
        value={code}
        onChange={(e) => {
          setCode(normalizeJoinCode(e.target.value));
          setError(null);
        }}
        placeholder="ABC123"
        autoComplete="off"
        spellCheck={false}
        className="w-full rounded-md border border-edge bg-panel px-4 py-3 text-center font-mono text-lg uppercase tracking-[0.4em] text-snow placeholder:text-fog/40 focus:border-pulse/60 focus:outline-none"
      />
      <button
        type="submit"
        disabled={checking}
        className="shrink-0 rounded-md bg-pulse-deep px-5 font-medium text-ink transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {checking ? "…" : "Join"}
      </button>
      {error && (
        <p role="alert" className="absolute mt-14 text-sm text-rose">
          {error}
        </p>
      )}
    </form>
  );
}
