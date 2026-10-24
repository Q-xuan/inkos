import { describe, expect, it } from "vitest";
import { bookPanelBounds, shellMode } from "./shell-layout";

describe("shellMode", () => {
  it("keeps navigation docked from tablet landscape upward", () => {
    expect(shellMode(1024)).toBe("dock");
    expect(shellMode(1280)).toBe("dock");
    expect(shellMode(1440)).toBe("dock");
  });

  it("draws navigation as a drawer at 768 and any width below 1024", () => {
    expect(shellMode(767)).toBe("drawer");
    expect(shellMode(768)).toBe("drawer");
    expect(shellMode(1023)).toBe("drawer");
  });
});

describe("bookPanelBounds", () => {
  it("preserves the wide-screen 40% panel clamped to 280–700", () => {
    expect(bookPanelBounds(1280)).toEqual({ min: 280, max: 700, initial: 512 });
    expect(bookPanelBounds(1600)).toEqual({ min: 280, max: 700, initial: 640 });
    expect(bookPanelBounds(2000).initial).toBe(700);
  });

  it("leaves at least a 420px chat column beside the docked nav below 1280", () => {
    for (const width of [1024, 1100, 1200]) {
      const bounds = bookPanelBounds(width);
      expect(bounds.min).toBeLessThanOrEqual(bounds.initial);
      expect(bounds.initial).toBeLessThanOrEqual(bounds.max);
      expect(width - 260 - bounds.max).toBeGreaterThanOrEqual(420);
    }
  });
});
