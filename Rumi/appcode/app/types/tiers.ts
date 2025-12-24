// /app/types/tiers.ts
// ENH-012: Re-export from canonical source (SSoT)
// Original definitions exist in lib/types/api.ts
export type {
  TiersPageResponse,
  TierCard,
  TierRewardPreview as AggregatedReward, // alias for client naming
} from '@/lib/types/api';
