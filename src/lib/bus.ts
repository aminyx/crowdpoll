/**
 * In-process realtime bus for SSE fan-out.
 *
 * The database stays the source of truth; the bus only signals "something
 * changed for event X" and clients refetch. Single-instance by design —
 * swapping `broadcast`/`subscribe` for Redis pub/sub is the documented path
 * to multi-instance deployments (see README trade-offs).
 */

export type Signal =
  | "questions"
  | "polls"
  | "event"
  | "ping";

type Listener = (signal: Signal) => void;

// Survive Next.js dev-mode module reloads by hanging state off globalThis.
const globalBus = globalThis as unknown as {
  __crowdpollBus?: Map<string, Set<Listener>>;
};

const channels = (globalBus.__crowdpollBus ??= new Map<string, Set<Listener>>());

export function subscribe(eventId: string, listener: Listener): () => void {
  let set = channels.get(eventId);
  if (!set) {
    set = new Set();
    channels.set(eventId, set);
  }
  set.add(listener);
  return () => {
    set.delete(listener);
    if (set.size === 0) channels.delete(eventId);
  };
}

export function broadcast(eventId: string, signal: Signal): void {
  const set = channels.get(eventId);
  if (!set) return;
  for (const listener of set) {
    try {
      listener(signal);
    } catch {
      // A broken listener must not break the others.
    }
  }
}

export function listenerCount(eventId: string): number {
  return channels.get(eventId)?.size ?? 0;
}
