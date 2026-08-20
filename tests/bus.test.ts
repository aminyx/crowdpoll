import { describe, expect, it, vi } from "vitest";
import { broadcast, listenerCount, subscribe } from "@/lib/bus";

describe("event bus", () => {
  it("delivers signals to subscribers of the same event only", () => {
    const a = vi.fn();
    const b = vi.fn();
    const offA = subscribe("event-a", a);
    const offB = subscribe("event-b", b);

    broadcast("event-a", "questions");
    expect(a).toHaveBeenCalledWith("questions");
    expect(b).not.toHaveBeenCalled();

    offA();
    offB();
  });

  it("unsubscribe stops delivery and cleans the channel", () => {
    const fn = vi.fn();
    const off = subscribe("event-x", fn);
    expect(listenerCount("event-x")).toBe(1);
    off();
    expect(listenerCount("event-x")).toBe(0);
    broadcast("event-x", "polls");
    expect(fn).not.toHaveBeenCalled();
  });

  it("a throwing listener does not break the others", () => {
    const bad = vi.fn(() => {
      throw new Error("boom");
    });
    const good = vi.fn();
    const off1 = subscribe("event-y", bad);
    const off2 = subscribe("event-y", good);
    broadcast("event-y", "event");
    expect(good).toHaveBeenCalled();
    off1();
    off2();
  });
});
