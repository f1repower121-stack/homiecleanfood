// Shared loyalty logic — must match admin LoyaltyTab config

// Removed rewards - now only points for discount

export const DEFAULT_LOYALTY = {
  min_redeem_points: 100,
  points_to_baht: 1,
  max_redeem_pct: 30,
  points_per_baht: 0.1,
  multiplier_homie: 1.0,
  multiplier_clean_eater: 1.5,
  multiplier_protein_king: 2.0,
  tier_clean_eater: 200,
  tier_protein_king: 500,
} as const

export type LoyaltyConfig = typeof DEFAULT_LOYALTY & Record<string, unknown>

export function getTierFromPoints(pts: number, cfg: LoyaltyConfig): string {
  if (pts >= (cfg.tier_protein_king ?? 500)) return 'Protein King'
  if (pts >= (cfg.tier_clean_eater ?? 200)) return 'Clean Eater'
  return 'Homie'
}

export function calcPointsEarned(amount: number, cfg: LoyaltyConfig, tier: string): number {
  const ptsPerBaht = cfg.points_per_baht ?? 0.1
  const mult =
    tier === 'Protein King'
      ? (cfg.multiplier_protein_king ?? 2)
      : tier === 'Clean Eater'
        ? (cfg.multiplier_clean_eater ?? 1.5)
        : (cfg.multiplier_homie ?? 1)
  return Math.floor(amount * ptsPerBaht * mult)
}
