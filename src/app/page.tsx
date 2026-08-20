import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { JoinForm } from "@/components/join-form";

export default async function Landing() {
  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col px-6">
      <header className="flex items-center justify-between py-6">
        <span className="font-mono text-sm tracking-widest text-fog">
          crowd<span className="text-pulse">poll</span>
        </span>
        <nav className="flex items-center gap-3 text-sm">
          {session ? (
            <Link
              href="/dashboard"
              className="rounded-md border border-edge bg-panel px-4 py-2 text-snow transition-colors hover:border-pulse/50"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/sign-in" className="px-3 py-2 text-fog transition-colors hover:text-snow">
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="rounded-md bg-pulse-deep px-4 py-2 font-medium text-ink transition-opacity hover:opacity-90"
              >
                Host an event
              </Link>
            </>
          )}
        </nav>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center pb-24 text-center">
        <p className="rise mb-6 rounded-full border border-edge bg-panel px-4 py-1.5 text-xs tracking-wide text-fog">
          live Q&amp;A · polls · zero friction
        </p>
        <h1 className="rise max-w-2xl text-balance text-4xl font-semibold leading-tight sm:text-6xl">
          Your audience has questions.
          <span className="text-pulse"> Hear all of them.</span>
        </h1>
        <p className="rise mt-6 max-w-xl text-pretty text-fog">
          Run live Q&amp;A and polls for talks, streams and meetings. The room
          joins with a six-letter code — no accounts, no app — and the best
          questions rise to the top in real time.
        </p>

        <div className="rise mt-10 w-full max-w-sm">
          <JoinForm />
        </div>

        <div className="rise mt-16 grid w-full max-w-3xl grid-cols-1 gap-4 text-left sm:grid-cols-3">
          {[
            ["Ask & upvote", "Questions ranked by the room, not by who shouts loudest."],
            ["Instant polls", "Open a poll mid-talk; bars move as votes land."],
            ["Presenter control", "Moderate, mark answered, lock questions — live."],
          ].map(([title, body]) => (
            <div key={title} className="rounded-lg border border-edge bg-panel p-4">
              <h3 className="text-sm font-medium">{title}</h3>
              <p className="mt-1 text-sm text-fog">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-edge py-6 text-center text-xs text-fog">
        <a
          href="https://github.com/aminyx/crowdpoll"
          className="transition-colors hover:text-snow"
        >
          Open source on GitHub
        </a>
      </footer>
    </main>
  );
}
