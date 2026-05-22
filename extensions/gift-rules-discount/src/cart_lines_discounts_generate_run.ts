/**
 * Cart lines discount function.
 *
 * For each cart line tagged as a gifthatch gift (via the `_gh_rule_id` line
 * attribute), apply a 100% product discount when the rest of the cart meets the
 * threshold stored in `_gh_threshold_cents`. The threshold is in the smallest
 * currency unit (cents/pence) of the shop's primary currency.
 *
 * Storefront JS adds the gift line. This function is the backstop that
 * guarantees the gift is free at checkout, even if the customer skips the cart
 * page or tampers with the request.
 */

type Money = {
  amount: string;
  currencyCode: string;
};

type LineAttribute = { value: string | null } | null;

type CartLine = {
  id: string;
  quantity: number;
  cost: { subtotalAmount: Money };
  ruleIdAttr?: LineAttribute;
  thresholdAttr?: LineAttribute;
};

type RunInput = {
  cart: {
    cost: { subtotalAmount: Money };
    lines: CartLine[];
  };
  discount: { discountClasses: string[] };
  presentmentCurrencyRate: string;
};

type ProductDiscountCandidate = {
  message?: string;
  targets: Array<{ cartLine: { id: string } }>;
  value: { percentage: { value: string } };
};

type ProductDiscountsAddOperation = {
  productDiscountsAdd: {
    candidates: ProductDiscountCandidate[];
    selectionStrategy: "FIRST" | "ALL";
  };
};

export type FunctionRunResult = {
  operations: ProductDiscountsAddOperation[];
};

const NO_DISCOUNT: FunctionRunResult = { operations: [] };

const PRODUCT_DISCOUNT_CLASS = "PRODUCT";

export function cartLinesDiscountsGenerateRun(
  input: RunInput,
): FunctionRunResult {
  if (!input.discount.discountClasses.includes(PRODUCT_DISCOUNT_CLASS)) {
    return NO_DISCOUNT;
  }

  const giftLines = input.cart.lines.filter(isGiftLine);
  if (giftLines.length === 0) return NO_DISCOUNT;

  const nonGiftSubtotalCents = sumNonGiftSubtotalInCents(input.cart.lines);
  const rate = parsePresentmentRate(input.presentmentCurrencyRate);

  const candidates: ProductDiscountCandidate[] = [];

  for (const line of giftLines) {
    const threshold = parseThreshold(line.thresholdAttr?.value);
    if (threshold === null) continue;

    const thresholdInPresentment = Math.round(threshold * rate);
    if (nonGiftSubtotalCents < thresholdInPresentment) continue;

    candidates.push({
      message: "Free gift",
      targets: [{ cartLine: { id: line.id } }],
      value: { percentage: { value: "100" } },
    });
  }

  if (candidates.length === 0) return NO_DISCOUNT;

  return {
    operations: [
      {
        productDiscountsAdd: {
          candidates,
          selectionStrategy: "ALL",
        },
      },
    ],
  };
}

function isGiftLine(line: CartLine): boolean {
  return Boolean(line.ruleIdAttr?.value);
}

function sumNonGiftSubtotalInCents(lines: CartLine[]): number {
  let total = 0;
  for (const line of lines) {
    if (isGiftLine(line)) continue;
    total += amountToCents(line.cost.subtotalAmount.amount);
  }
  return total;
}

function amountToCents(amount: string): number {
  const parsed = Number(amount);
  if (Number.isNaN(parsed)) return 0;
  return Math.round(parsed * 100);
}

function parseThreshold(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const parsed = Number(raw);
  if (Number.isNaN(parsed) || parsed <= 0) return null;
  return Math.round(parsed);
}

function parsePresentmentRate(raw: string): number {
  const parsed = Number(raw);
  if (Number.isNaN(parsed) || parsed <= 0) return 1;
  return parsed;
}

export default cartLinesDiscountsGenerateRun;
