import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { eventsForOwner } from "@/lib/queries";
import { CreateEventForm } from "@/components/create-event-form";
import { SignOutButton } from "@/components/sign-out-button";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const list = await eventsForOwner(session.user.id);

  return (
    <main className="mx-auto min-h-dvh max-w-3xl px-6">
      <header className="flex items-center justify-between py-6">
        <Link href="/" className="font-mono text-sm tracking-widest text-fog">
          crowd<span className="text-pulse">poll</span>
        </Link>
        <div className="flex items-center gap-4 text-sm text-fog">
          <span>{session.user.name}</span>
          <SignOutButton />
        </div>
      </header>

      <section className="py-8">
        <div className="flex items-end justify-between">
          <h1 className="text-2xl font-semibold">Your events</h1>
        </div>

        <CreateEventForm />

        {list.length === 0 ? (
          <div className="mt-8 rounded-lg border border-dashed border-edge bg-panel/50 p-10 text-center text-fog">
            <p className="font-medium text-snow">No events yet</p>
            <p className="mt-1 text-sm">
              Create your first event above — you get a join code the room can
              use immediately.
            </p>
          </div>
        ) : (
          <ul className="mt-6 flex flex-col gap-3">
            {list.map((event) => (
              <li key={event.id}>
                <Link
                  href={`/dashboard/${event.id}`}
                  className="group flex items-center justify-between rounded-lg border border-edge bg-panel p-4 transition-colors hover:border-pulse/40"
                >
                  <div>
                    <h2 className="font-medium group-hover:text-pulse">
                      {event.title}
                    </h2>
                    <p className="mt-0.5 text-sm text-fog">
                      {event.questionCount} question
                      {event.questionCount === 1 ? "" : "s"} ·{" "}
                      {event.createdAt.toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                  </div>
                  <span className="rounded bg-panel-2 px-3 py-1.5 font-mono text-sm tracking-[0.25em] text-pulse">
                    {event.code}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
