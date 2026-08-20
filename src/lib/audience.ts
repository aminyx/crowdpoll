/**
 * Anonymous audience identity.
 *
 * Audience members never create accounts: a random session id in an
 * httpOnly cookie identifies them for vote deduplication. This is honest
 * best-effort dedup — clearing cookies grants a new identity — which is the
 * standard trade-off for frictionless audience joining (documented in the
 * README security notes).
 */

import { cookies } from "next/headers";

const COOKIE = "cp_audience";

export async function getOrCreateAudienceId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(COOKIE)?.value;
  if (existing && /^[a-f0-9]{32}$/.test(existing)) {
    return existing;
  }
  const id = crypto
    .getRandomValues(new Uint8Array(16))
    .reduce((s, b) => s + b.toString(16).padStart(2, "0"), "");
  store.set(COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return id;
}

export async function getAudienceId(): Promise<string | null> {
  const store = await cookies();
  const v = store.get(COOKIE)?.value;
  return v && /^[a-f0-9]{32}$/.test(v) ? v : null;
}
