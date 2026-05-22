import { describe, expect, it } from "vitest";
import { formatMoney, parseMoneyInput } from "./money";

describe("formatMoney", () => {
  it("formats GBP with 2 decimal places", () => {
    expect(formatMoney(5000, "GBP", "en-GB")).toMatch(/£50\.00/);
  });

  it("formats JPY without decimals (zero-decimal currency)", () => {
    expect(formatMoney(5000, "JPY", "en-US")).toMatch(/5,000/);
  });

  it("falls back gracefully on unsupported currency codes", () => {
    expect(formatMoney(1234, "ZZZ")).toContain("ZZZ");
  });
});

describe("parseMoneyInput", () => {
  it("returns cents for a normal decimal input", () => {
    expect(parseMoneyInput("49.99", "GBP")).toBe(4999);
  });

  it("strips currency symbols and whitespace", () => {
    expect(parseMoneyInput("  £49.99 ", "GBP")).toBe(4999);
  });

  it("treats comma as decimal separator", () => {
    expect(parseMoneyInput("49,99", "EUR")).toBe(4999);
  });

  it("returns whole units for zero-decimal currencies", () => {
    expect(parseMoneyInput("5000", "JPY")).toBe(5000);
  });

  it("returns null for blank input", () => {
    expect(parseMoneyInput("", "GBP")).toBeNull();
  });

  it("returns null for non-numeric input", () => {
    expect(parseMoneyInput("abc", "GBP")).toBeNull();
  });
});
