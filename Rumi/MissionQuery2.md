# MissionQuery2: getHistory() RPC Refactor

**Purpose:** Refactor `missionRepository.getHistory()` from 2 queries to 1 RPC
**Current:** 2 database round-trips
**Target:** 1 RPC call

---

## Current Implementation

**File:** `appcode/lib/repositories/missionRepository.ts` lines 606-724

**Query 1 (lines 613-647):**
```typescript
const { data: history } = await supabase
  .from('redemptions')
  .select(`
    id, status, claimed_at, fulfilled_at, concluded_at, rejected_at, mission_progress_id,
    mission_progress!inner (
      id, completed_at, status,
      missions!inner (
        id, mission_type, display_name,
        rewards!inner (id, type, name, description, value_data, reward_source)
      )
    )
  `)
  .eq('user_id', userId)
  .eq('client_id', clientId)
  .in('status', ['concluded', 'rejected'])
  .is('deleted_at', null)
  .not('mission_progress_id', 'is', null)
  .order('concluded_at', { ascending: false, nullsFirst: false });
```

**Query 2 (lines 662-672):**
```typescript
const { data: raffleParticipations } = await supabase
  .from('raffle_participations')
  .select(`mission_progress_id, is_winner, participated_at, winner_selected_at`)
  .eq('user_id', userId)
  .eq('client_id', clientId)
  .in('mission_progress_id', missionProgressIds);
```

**Why 2 queries:** `raffle_participations` joins to `mission_progress` (sibling relationship), not expressible in Supabase nested select.

---

## RPC Function

**Add to:** `supabase/migrations/20251203_single_query_rpc_functions.sql`

```sql
-- ============================================================================
-- FUNCTION 3: get_mission_history
-- ============================================================================
-- Purpose: Single query for mission history (concluded/rejected redemptions)
-- Called from: missionRepository.getHistory()
-- Returns: Flat rows that TypeScript maps to MissionHistoryData[]

CREATE OR REPLACE FUNCTION get_mission_history(
  p_user_id UUID,
  p_client_id UUID
)
RETURNS TABLE (
  -- Redemption columns
  redemption_id UUID,
  redemption_status VARCHAR(50),
  redemption_claimed_at TIMESTAMP,
  redemption_fulfilled_at TIMESTAMP,
  redemption_concluded_at TIMESTAMP,
  redemption_rejected_at TIMESTAMP,
  -- Mission columns
  mission_id UUID,
  mission_type VARCHAR(50),
  mission_display_name VARCHAR(255),
  -- Reward columns
  reward_id UUID,
  reward_type VARCHAR(100),
  reward_name VARCHAR(255),
  reward_description TEXT,
  reward_value_data JSONB,
  reward_source VARCHAR(50),
  -- Progress columns
  progress_completed_at TIMESTAMP,
  -- Raffle columns
  raffle_is_winner BOOLEAN,
  raffle_participated_at TIMESTAMP,
  raffle_winner_selected_at TIMESTAMP
) AS $$
  SELECT
    red.id,
    red.status,
    red.claimed_at,
    red.fulfilled_at,
    red.concluded_at,
    red.rejected_at,
    m.id,
    m.mission_type,
    m.display_name,
    r.id,
    r.type,
    r.name,
    r.description,
    r.value_data,
    r.reward_source,
    mp.completed_at,
    rp.is_winner,
    rp.participated_at,
    rp.winner_selected_at
  FROM redemptions red
  INNER JOIN mission_progress mp ON red.mission_progress_id = mp.id
  INNER JOIN missions m ON mp.mission_id = m.id
  INNER JOIN rewards r ON m.reward_id = r.id
  LEFT JOIN raffle_participations rp ON mp.id = rp.mission_progress_id
    AND rp.user_id = p_user_id
  WHERE red.user_id = p_user_id
    AND red.client_id = p_client_id
    AND red.status IN ('concluded', 'rejected')
    AND red.deleted_at IS NULL
    AND red.mission_progress_id IS NOT NULL
  ORDER BY COALESCE(red.concluded_at, red.rejected_at) DESC;
$$ LANGUAGE sql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_mission_history(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_mission_history(UUID, UUID) TO service_role;
```

---

## TypeScript Type

**Add to:** `appcode/lib/types/rpc.ts`

```typescript
export interface GetMissionHistoryRow {
  redemption_id: string;
  redemption_status: string;
  redemption_claimed_at: string | null;
  redemption_fulfilled_at: string | null;
  redemption_concluded_at: string | null;
  redemption_rejected_at: string | null;
  mission_id: string;
  mission_type: string;
  mission_display_name: string;
  reward_id: string;
  reward_type: string;
  reward_name: string | null;
  reward_description: string | null;
  reward_value_data: Record<string, unknown> | null;
  reward_source: string | null;
  progress_completed_at: string | null;
  raffle_is_winner: boolean | null;
  raffle_participated_at: string | null;
  raffle_winner_selected_at: string | null;
}
```

---

## Repository Refactor

**Replace lines 606-724 with:**

```typescript
async getHistory(
  userId: string,
  clientId: string
): Promise<MissionHistoryData[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('get_mission_history', {
    p_user_id: userId,
    p_client_id: clientId,
  });

  if (error) {
    console.error('[MissionRepository] Error fetching history:', error);
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  return (data as GetMissionHistoryRow[]).map((row) => ({
    mission: {
      id: row.mission_id,
      type: row.mission_type,
      displayName: row.mission_display_name,
    },
    reward: {
      id: row.reward_id,
      type: row.reward_type,
      name: row.reward_name,
      description: row.reward_description,
      valueData: row.reward_value_data,
      rewardSource: row.reward_source ?? 'mission',
    },
    progress: {
      completedAt: row.progress_completed_at,
    },
    redemption: {
      status: row.redemption_status,
      claimedAt: row.redemption_claimed_at,
      fulfilledAt: row.redemption_fulfilled_at,
      concludedAt: row.redemption_concluded_at,
      rejectedAt: row.redemption_rejected_at,
    },
    raffleParticipation: row.raffle_participated_at
      ? {
          isWinner: row.raffle_is_winner,
          participatedAt: row.raffle_participated_at,
          winnerSelectedAt: row.raffle_winner_selected_at,
        }
      : null,
  }));
},
```

---

## Execution Steps

1. Run SQL in Supabase Dashboard (or append to migration file)
2. Regenerate types: `SUPABASE_ACCESS_TOKEN=... npx supabase gen types typescript --project-id vyvkvlhzzglfklrwzcby > lib/types/database.ts`
3. Fix database.ts line 1 if needed (remove workdir message)
4. Add `GetMissionHistoryRow` to `rpc.ts`
5. Add import to missionRepository.ts: `import type { GetMissionHistoryRow } from '@/lib/types/rpc';`
6. Replace `getHistory()` function body
7. Run tests: `npm test -- --testPathPatterns=history`

---

## Tests

**Existing File:** `tests/integration/missions/history-completeness.test.ts`
**Count:** 6 tests (database-level, don't call repository directly)

---

## New Test: Repository-Level Coverage

**Add to:** `tests/integration/missions/history-completeness.test.ts`

```typescript
import { missionRepository } from '@/lib/repositories/missionRepository';

describe('missionRepository.getHistory() direct call', () => {
  it('should return concluded missions via RPC', async () => {
    // Create mission
    const { mission } = await createTestMission({
      clientId: testClient.id,
      rewardId: testReward.id,
      title: 'RPC History Test Mission',
      targetValue: 100,
      tierEligibility: 'all',
    });

    // Create completed progress
    const { progress } = await createTestMissionProgress({
      userId: testUser.id,
      missionId: mission.id,
      clientId: testClient.id,
      currentValue: 100,
      status: 'completed',
      completedAt: new Date(),
    });

    // Create concluded redemption
    const { redemption } = await createTestRedemption({
      userId: testUser.id,
      rewardId: testReward.id,
      clientId: testClient.id,
      tierAtClaim: testTier.tierId,
      missionProgressId: progress.id,
      status: 'concluded',
      claimedAt: new Date(),
      concludedAt: new Date(),
    });

    // Call repository directly (tests RPC)
    const history = await missionRepository.getHistory(testUser.id, testClient.id);

    // Assertions
    expect(history).toHaveLength(1);
    expect(history[0].mission.id).toBe(mission.id);
    expect(history[0].redemption.status).toBe('concluded');
    expect(history[0].redemption.concludedAt).not.toBeNull();
  });

  it('should return rejected raffle missions with raffle participation data', async () => {
    // Create raffle mission
    const { mission } = await createTestMission({
      clientId: testClient.id,
      rewardId: testReward.id,
      title: 'RPC History Raffle Test',
      missionType: 'raffle',
      targetValue: 1,
      tierEligibility: 'all',
      activated: true,
    });

    // Create progress
    const { progress } = await createTestMissionProgress({
      userId: testUser.id,
      missionId: mission.id,
      clientId: testClient.id,
      currentValue: 1,
      status: 'completed',
      completedAt: new Date(),
    });

    // Create rejected redemption (raffle loser)
    const { redemption } = await createTestRedemption({
      userId: testUser.id,
      rewardId: testReward.id,
      clientId: testClient.id,
      tierAtClaim: testTier.tierId,
      missionProgressId: progress.id,
      status: 'rejected',
      claimedAt: new Date(),
      rejectedAt: new Date(),
    });

    // Create raffle participation (loser)
    const supabase = getTestSupabase();
    await supabase.from('raffle_participations').insert({
      user_id: testUser.id,
      mission_id: mission.id,
      mission_progress_id: progress.id,
      client_id: testClient.id,
      is_winner: false,
      participated_at: new Date().toISOString(),
      winner_selected_at: new Date().toISOString(),
    });

    // Call repository directly (tests RPC with LEFT JOIN raffle_participations)
    const history = await missionRepository.getHistory(testUser.id, testClient.id);

    // Assertions
    expect(history).toHaveLength(1);
    expect(history[0].mission.id).toBe(mission.id);
    expect(history[0].redemption.status).toBe('rejected');
    expect(history[0].raffleParticipation).not.toBeNull();
    expect(history[0].raffleParticipation?.isWinner).toBe(false);
  });

  it('should enforce multi-tenant isolation', async () => {
    // Create mission for testClient
    const { mission } = await createTestMission({
      clientId: testClient.id,
      rewardId: testReward.id,
      title: 'Tenant Isolation Test',
      targetValue: 100,
      tierEligibility: 'all',
    });

    const { progress } = await createTestMissionProgress({
      userId: testUser.id,
      missionId: mission.id,
      clientId: testClient.id,
      currentValue: 100,
      status: 'completed',
      completedAt: new Date(),
    });

    await createTestRedemption({
      userId: testUser.id,
      rewardId: testReward.id,
      clientId: testClient.id,
      tierAtClaim: testTier.tierId,
      missionProgressId: progress.id,
      status: 'concluded',
      claimedAt: new Date(),
      concludedAt: new Date(),
    });

    // Create different client
    const { client: otherClient } = await createTestClient({ name: 'Other Client' });

    // Query with wrong client_id should return empty
    const history = await missionRepository.getHistory(testUser.id, otherClient.id);

    expect(history).toHaveLength(0);

    // Cleanup other client
    await cleanupTestData(otherClient.id);
  });
});
```

**Purpose:** These tests call `missionRepository.getHistory()` directly, which:
1. Tests the RPC function end-to-end
2. Verifies TypeScript mapping from RPC rows to `MissionHistoryData`
3. Validates multi-tenant isolation via `p_client_id` parameter
4. Confirms LEFT JOIN to `raffle_participations` works correctly
