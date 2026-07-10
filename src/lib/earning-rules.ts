import type { EarningRules } from "@/lib/gamification-admin";

/** Example sale used in live calculators (admin preview + agent help). */
export const EXAMPLE_SALE = {
  total: 500,
  life: 300,
  health: 200,
  addon: 0,
  pointsPremium: 500,
};

export function estimateSaleXp(
  rules: EarningRules,
  ex = EXAMPLE_SALE,
): number {
  const xp =
    ex.total * rules.xp_total_premium_mult +
    ex.life * rules.xp_life_bonus_mult +
    ex.health * rules.xp_health_bonus_mult +
    ex.addon * rules.xp_addon_bonus_mult +
    rules.xp_per_sale_base;
  return Math.max(0, Math.round(xp));
}

export function estimateSalePoints(
  rules: EarningRules,
  premium = EXAMPLE_SALE.pointsPremium,
): number {
  return Math.max(
    rules.points_per_sale_min,
    rules.points_per_sale_base +
      Math.floor(premium / 100) * rules.points_per_100_premium,
  );
}

export function formatXpRuleLine(rules: EarningRules): string[] {
  return [
    `$1 of deal premium → ${rules.xp_total_premium_mult} XP`,
    `+${rules.xp_life_bonus_mult} XP per $1 life premium (line items)`,
    `+${rules.xp_health_bonus_mult} XP per $1 health premium`,
    `+${rules.xp_addon_bonus_mult} XP per $1 add-on premium`,
    `+${rules.xp_per_sale_base} XP flat per sale logged`,
  ];
}

export function formatPointsRuleLine(rules: EarningRules): string[] {
  return [
    `${rules.points_per_sale_base} points base per sale`,
    `+${rules.points_per_100_premium} point per $100 premium`,
    `Minimum ${rules.points_per_sale_min} points per sale`,
  ];
}
