"use client";

import { useEffect, useRef, useState } from "react";
import type { EventState } from "@/lib/queries";

/**
 * Live event state: initial snapshot from the server, then refetch whenever
 * the SSE stream signals a change. EventSource reconnects automatically;
 * a refetch on every (re)open covers anything missed while disconnected.
 */
export function useEventStream(eventId: string, initial: EventState) {
  const [state, setState] = useState<EventState>(initial);
  const [live, setLive] = useState(false);
  const refetching = useRef(false);

  useEffect(() => {
    let disposed = false;

    async function refetch() {
      if (refetching.current) return;
      refetching.current = true;
      try {
        const res = await fetch(`/api/events/${eventId}/state`, {
          cache: "no-store",
        });
        if (res.ok && !disposed) {
          setState(await res.json());
        }
      } finally {
        refetching.current = false;
      }
    }

    const source = new EventSource(`/api/events/${eventId}/stream`);
    source.onopen = () => {
      setLive(true);
      void refetch();
    };
    source.onerror = () => setLive(false);
    source.onmessage = (message) => {
      if (message.data !== "ping") void refetch();
    };

    return () => {
      disposed = true;
      source.close();
    };
  }, [eventId]);

  return { state, live };
}
