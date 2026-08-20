import { describe, expect, it } from "vitest";
import {
  CODE_LENGTH,
  generateJoinCode,
  isValidJoinCode,
  normalizeJoinCode,
} from "@/lib/codes";

describe("generateJoinCode", () => {
  it("produces valid codes", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateJoinCode();
      expect(code).toHaveLength(CODE_LENGTH);
      expect(isValidJoinCode(code)).toBe(true);
    }
  });

  it("never contains ambiguous glyphs", () => {
    for (let i = 0; i < 200; i++) {
      expect(generateJoinCode()).not.toMatch(/[01OIL]/);
    }
  });

  it("is deterministic given a seeded random source", () => {
    const fake = (max: number) => 7 % max;
    expect(generateJoinCode(fake)).toBe(generateJoinCode(fake));
  });
});

describe("normalizeJoinCode", () => {
  it("uppercases and strips separators", () => {
    expect(normalizeJoinCode("ab-c 12x")).toBe("ABC2X");
  });

  it("drops ambiguous characters entirely", () => {
    expect(normalizeJoinCode("A0O1ILB2")).toBe("AB2");
  });

  it("caps at code length", () => {
    expect(normalizeJoinCode("ABCDEFGHJK")).toHaveLength(CODE_LENGTH);
  });
});

describe("isValidJoinCode", () => {
  it("accepts generated codes and rejects junk", () => {
    expect(isValidJoinCode(generateJoinCode())).toBe(true);
    expect(isValidJoinCode("")).toBe(false);
    expect(isValidJoinCode("abc12")).toBe(false);
    expect(isValidJoinCode("AAAAA0")).toBe(false); // 0 not in alphabet
    expect(isValidJoinCode("AAAAAAA")).toBe(false); // too long
  });
});
