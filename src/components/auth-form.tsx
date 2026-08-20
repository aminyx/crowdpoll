"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn, signUp } from "@/lib/auth-client";

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result =
      mode === "sign-up"
        ? await signUp.email({ name, email, password })
        : await signIn.email({ email, password });
    setBusy(false);
    if (result.error) {
      setError(result.error.message ?? "something went wrong");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6">
      <Link href="/" className="mb-8 text-center font-mono text-sm tracking-widest text-fog">
        crowd<span className="text-pulse">poll</span>
      </Link>
      <h1 className="text-center text-xl font-semibold">
        {mode === "sign-up" ? "Create your host account" : "Welcome back"}
      </h1>
      <form onSubmit={submit} className="mt-8 flex flex-col gap-3">
        {mode === "sign-up" && (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            autoComplete="name"
            required
            minLength={2}
            className="rounded-md border border-edge bg-panel px-4 py-3 text-snow placeholder:text-fog/50 focus:border-pulse/60 focus:outline-none"
          />
        )}
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          type="email"
          autoComplete="email"
          required
          className="rounded-md border border-edge bg-panel px-4 py-3 text-snow placeholder:text-fog/50 focus:border-pulse/60 focus:outline-none"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password (10+ characters)"
          type="password"
          autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
          required
          minLength={10}
          className="rounded-md border border-edge bg-panel px-4 py-3 text-snow placeholder:text-fog/50 focus:border-pulse/60 focus:outline-none"
        />
        {error && (
          <p role="alert" className="text-sm text-rose">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="mt-2 rounded-md bg-pulse-deep px-4 py-3 font-medium text-ink transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "…" : mode === "sign-up" ? "Create account" : "Sign in"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-fog">
        {mode === "sign-up" ? (
          <>
            Already hosting?{" "}
            <Link href="/sign-in" className="text-pulse hover:underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link href="/sign-up" className="text-pulse hover:underline">
              Create an account
            </Link>
          </>
        )}
      </p>
    </main>
  );
}
