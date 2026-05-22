import { describe, expect, it } from "vitest";
import { validateGiftRuleInput } from "./giftRule.server";

describe("validateGiftRuleInput", () => {
  const valid = {
    name: "Spend £50 → Tote",
    thresholdCents: 5000,
    currencyCode: "GBP",
    giftVariantId: "gid://shopify/ProductVariant/123",
    giftProductId: "gid://shopify/Product/456",
    giftTitle: "Tote Bag",
  };

  it("returns no errors for a complete input", () => {
    expect(validateGiftRuleInput(valid)).toEqual({});
  });

  it("requires a name", () => {
    const errors = validateGiftRuleInput({ ...valid, name: "  " });
    expect(errors.name).toBeDefined();
  });

  it("requires a positive threshold", () => {
    expect(validateGiftRuleInput({ ...valid, thresholdCents: 0 }).thresholdCents).toBeDefined();
    expect(validateGiftRuleInput({ ...valid, thresholdCents: -1 }).thresholdCents).toBeDefined();
    expect(
      validateGiftRuleInput({ ...valid, thresholdCents: Number.NaN }).thresholdCents,
    ).toBeDefined();
  });

  it("requires a gift variant", () => {
    const errors = validateGiftRuleInput({ ...valid, giftVariantId: "" });
    expect(errors.giftVariantId).toBeDefined();
  });
});
