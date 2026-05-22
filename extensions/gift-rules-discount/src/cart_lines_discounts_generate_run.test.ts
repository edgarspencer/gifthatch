import { describe, expect, it } from "vitest";
import { cartLinesDiscountsGenerateRun } from "./cart_lines_discounts_generate_run";

type AnyInput = Parameters<typeof cartLinesDiscountsGenerateRun>[0];

function makeInput(overrides: Partial<AnyInput> = {}): AnyInput {
  return {
    cart: {
      cost: { subtotalAmount: { amount: "0.00", currencyCode: "GBP" } },
      lines: [],
    },
    discount: { discountClasses: ["PRODUCT"] },
    presentmentCurrencyRate: "1.0",
    ...overrides,
  };
}

function regularLine(id: string, amount: string) {
  return {
    id,
    quantity: 1,
    cost: { subtotalAmount: { amount, currencyCode: "GBP" } },
    ruleIdAttr: null,
    thresholdAttr: null,
  };
}

function giftLine(id: string, thresholdCents: number, amount = "0.00") {
  return {
    id,
    quantity: 1,
    cost: { subtotalAmount: { amount, currencyCode: "GBP" } },
    ruleIdAttr: { value: "rule_abc" },
    thresholdAttr: { value: String(thresholdCents) },
  };
}

describe("cartLinesDiscountsGenerateRun", () => {
  it("returns no operations when there are no gift lines", () => {
    const result = cartLinesDiscountsGenerateRun(
      makeInput({
        cart: {
          cost: { subtotalAmount: { amount: "100.00", currencyCode: "GBP" } },
          lines: [regularLine("gid://shopify/CartLine/1", "100.00")],
        },
      }),
    );
    expect(result.operations).toHaveLength(0);
  });

  it("returns no operations when the PRODUCT discount class is not requested", () => {
    const result = cartLinesDiscountsGenerateRun(
      makeInput({
        discount: { discountClasses: ["ORDER"] },
        cart: {
          cost: { subtotalAmount: { amount: "100.00", currencyCode: "GBP" } },
          lines: [
            regularLine("gid://shopify/CartLine/1", "100.00"),
            giftLine("gid://shopify/CartLine/2", 5000),
          ],
        },
      }),
    );
    expect(result.operations).toHaveLength(0);
  });

  it("applies a 100% discount to the gift line when the threshold is met", () => {
    const result = cartLinesDiscountsGenerateRun(
      makeInput({
        cart: {
          cost: { subtotalAmount: { amount: "60.00", currencyCode: "GBP" } },
          lines: [
            regularLine("gid://shopify/CartLine/1", "60.00"),
            giftLine("gid://shopify/CartLine/gift", 5000),
          ],
        },
      }),
    );

    expect(result.operations).toHaveLength(1);
    const op = result.operations[0];
    expect(op.productDiscountsAdd.candidates).toHaveLength(1);
    expect(op.productDiscountsAdd.candidates[0].targets).toEqual([
      { cartLine: { id: "gid://shopify/CartLine/gift" } },
    ]);
    expect(op.productDiscountsAdd.candidates[0].value).toEqual({
      percentage: { value: "100" },
    });
  });

  it("does not discount the gift when the non-gift subtotal is below the threshold", () => {
    const result = cartLinesDiscountsGenerateRun(
      makeInput({
        cart: {
          cost: { subtotalAmount: { amount: "30.00", currencyCode: "GBP" } },
          lines: [
            regularLine("gid://shopify/CartLine/1", "30.00"),
            giftLine("gid://shopify/CartLine/gift", 5000),
          ],
        },
      }),
    );
    expect(result.operations).toHaveLength(0);
  });

  it("excludes the gift line's own value when computing the non-gift subtotal", () => {
    // The gift line itself is priced at £15 (will be zeroed by the discount).
    // The customer has £40 of regular product. Threshold is £50.
    // Threshold should NOT be considered met just because gift + regular >= 50.
    const result = cartLinesDiscountsGenerateRun(
      makeInput({
        cart: {
          cost: { subtotalAmount: { amount: "55.00", currencyCode: "GBP" } },
          lines: [
            regularLine("gid://shopify/CartLine/1", "40.00"),
            giftLine("gid://shopify/CartLine/gift", 5000, "15.00"),
          ],
        },
      }),
    );
    expect(result.operations).toHaveLength(0);
  });

  it("discounts multiple gifts independently when multiple rules unlock", () => {
    const result = cartLinesDiscountsGenerateRun(
      makeInput({
        cart: {
          cost: { subtotalAmount: { amount: "200.00", currencyCode: "GBP" } },
          lines: [
            regularLine("gid://shopify/CartLine/1", "200.00"),
            giftLine("gid://shopify/CartLine/giftA", 5000),
            giftLine("gid://shopify/CartLine/giftB", 15000),
          ],
        },
      }),
    );
    expect(result.operations).toHaveLength(1);
    expect(result.operations[0].productDiscountsAdd.candidates).toHaveLength(2);
  });

  it("skips a gift line whose threshold attribute is missing or malformed", () => {
    const result = cartLinesDiscountsGenerateRun(
      makeInput({
        cart: {
          cost: { subtotalAmount: { amount: "200.00", currencyCode: "GBP" } },
          lines: [
            regularLine("gid://shopify/CartLine/1", "200.00"),
            {
              id: "gid://shopify/CartLine/gift",
              quantity: 1,
              cost: { subtotalAmount: { amount: "0.00", currencyCode: "GBP" } },
              ruleIdAttr: { value: "rule_x" },
              thresholdAttr: { value: "not-a-number" },
            },
          ],
        },
      }),
    );
    expect(result.operations).toHaveLength(0);
  });

  it("applies the presentment currency rate when comparing threshold to subtotal", () => {
    // Shop currency is GBP (threshold in GBP cents).
    // Customer is paying in EUR with a 1.2x rate. £50 threshold → €60 in
    // presentment currency. Subtotal of €70 should unlock.
    const result = cartLinesDiscountsGenerateRun(
      makeInput({
        cart: {
          cost: { subtotalAmount: { amount: "70.00", currencyCode: "EUR" } },
          lines: [
            regularLine("gid://shopify/CartLine/1", "70.00"),
            giftLine("gid://shopify/CartLine/gift", 5000),
          ],
        },
        presentmentCurrencyRate: "1.2",
      }),
    );
    expect(result.operations).toHaveLength(1);
  });

  it("uses 'ALL' selection strategy so every eligible candidate is applied", () => {
    const result = cartLinesDiscountsGenerateRun(
      makeInput({
        cart: {
          cost: { subtotalAmount: { amount: "300.00", currencyCode: "GBP" } },
          lines: [
            regularLine("gid://shopify/CartLine/1", "300.00"),
            giftLine("gid://shopify/CartLine/giftA", 5000),
            giftLine("gid://shopify/CartLine/giftB", 10000),
          ],
        },
      }),
    );
    expect(result.operations[0].productDiscountsAdd.selectionStrategy).toBe(
      "ALL",
    );
  });
});
