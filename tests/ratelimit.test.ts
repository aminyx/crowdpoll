import { beforeEach, describe, expect, it } from "vitest";
import { RULES, allow, resetRateLimiter } from "@/lib/ratelimit";

describe("rate limiter", () => {
  beforeEach(() => resetRateLimiter());

  it("allows up to capacity, then denies", () => {
    const capacity = RULES["question:create"].perMinute + RULES["question:create"].burst;
    const t0 = 1_000_000;
    for (let i = 0; i < capacity; i++) {
      expect(allow("question:create", "s1", t0)).toBe(true);
    }
    expect(allow("question:create", "s1", t0)).toBe(false);
  });

  it("refills over time at the sustained rate", () => {
    const capacity = RULES["poll:vote"].perMinute + RULES["poll:vote"].burst;
    const t0 = 0;
    for (let i = 0; i < capacity; i++) {
      allow("poll:vote", "s1", t0);
    }
    expect(allow("poll:vote", "s1", t0)).toBe(false);
    // One minute later a full sustained-rate worth of tokens is back.
    const t1 = 60_000;
    for (let i = 0; i < RULES["poll:vote"].perMinute; i++) {
      expect(allow("poll:vote", "s1", t1)).toBe(true);
    }
    expect(allow("poll:vote", "s1", t1)).toBe(false);
  });

  it("keys are independent per session and per action", () => {
    const t0 = 0;
    const capacity = RULES["question:create"].perMinute + RULES["question:create"].burst;
    for (let i = 0; i < capacity; i++) {
      allow("question:create", "s1", t0);
    }
    expect(allow("question:create", "s1", t0)).toBe(false);
    expect(allow("question:create", "s2", t0)).toBe(true);
    expect(allow("question:vote", "s1", t0)).toBe(true);
  });
});
