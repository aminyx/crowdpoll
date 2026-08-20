import { NextRequest } from "next/server";
import { eventById } from "@/lib/queries";
import { subscribe, type Signal } from "@/lib/bus";

export const dynamic = "force-dynamic";

/**
 * Server-Sent Events stream for one event. Emits signal names; clients
 * refetch state on signal. Heartbeats keep proxies from closing the socket.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const event = await eventById(id).catch(() => null);
  if (!event) {
    return new Response("event not found", { status: 404 });
  }

  const encoder = new TextEncoder();
  let cleanup = () => {};

  const stream = new ReadableStream({
    start(controller) {
      const send = (signal: Signal) => {
        try {
          controller.enqueue(encoder.encode(`data: ${signal}\n\n`));
        } catch {
          cleanup();
        }
      };
      const unsubscribe = subscribe(id, send);
      const heartbeat = setInterval(() => send("ping"), 25_000);
      send("ping");

      cleanup = () => {
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // already closed
        }
      };
      req.signal.addEventListener("abort", cleanup);
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
