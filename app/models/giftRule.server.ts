import prisma from "../db.server";

export type GiftRuleInput = {
  name: string;
  thresholdCents: number;
  currencyCode: string;
  giftVariantId: string;
  giftProductId: string;
  giftTitle: string;
  bannerText?: string;
  active?: boolean;
};

export function listGiftRules(shop: string) {
  return prisma.giftRule.findMany({
    where: { shop },
    orderBy: [{ active: "desc" }, { createdAt: "desc" }],
  });
}

export function getGiftRule(shop: string, id: string) {
  return prisma.giftRule.findFirst({ where: { shop, id } });
}

export function createGiftRule(shop: string, input: GiftRuleInput) {
  return prisma.giftRule.create({
    data: {
      shop,
      name: input.name,
      thresholdCents: input.thresholdCents,
      currencyCode: input.currencyCode,
      giftVariantId: input.giftVariantId,
      giftProductId: input.giftProductId,
      giftTitle: input.giftTitle,
      bannerText: input.bannerText ?? "🎁 Free gift unlocked",
      active: input.active ?? true,
    },
  });
}

export function updateGiftRule(
  shop: string,
  id: string,
  input: Partial<GiftRuleInput>,
) {
  return prisma.giftRule.updateMany({
    where: { shop, id },
    data: input,
  });
}

export function archiveGiftRule(shop: string, id: string) {
  return prisma.giftRule.updateMany({
    where: { shop, id },
    data: { active: false },
  });
}

export function deleteGiftRule(shop: string, id: string) {
  return prisma.giftRule.deleteMany({ where: { shop, id } });
}

export type ValidationErrors = Partial<Record<keyof GiftRuleInput, string>>;

export function validateGiftRuleInput(input: Partial<GiftRuleInput>): ValidationErrors {
  const errors: ValidationErrors = {};
  if (!input.name || input.name.trim().length === 0) {
    errors.name = "Give the rule a name so you can find it later";
  }
  if (
    input.thresholdCents === undefined ||
    Number.isNaN(input.thresholdCents) ||
    input.thresholdCents <= 0
  ) {
    errors.thresholdCents = "Threshold must be greater than 0";
  }
  if (!input.giftVariantId) {
    errors.giftVariantId = "Pick a gift product";
  }
  return errors;
}
