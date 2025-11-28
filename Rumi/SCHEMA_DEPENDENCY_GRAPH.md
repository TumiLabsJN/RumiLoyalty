# Schema Dependency Graph

**Task 0.1.2 Output - SchemaFinalv2.md Analysis**
**Created:** 2025-11-28

---

## Table Foreign Key Relationships (Visual Graph)

```
clients (ROOT - Multi-tenant config)
│
├── users (FK: client_id)
│   │
│   ├── videos (FK: user_id, client_id)
│   │
│   ├── sales_adjustments (FK: user_id, client_id, adjusted_by→users)
│   │
│   ├── tier_checkpoints (FK: user_id, client_id)
│   │
│   ├── handle_changes (FK: user_id, resolved_by→users)
│   │
│   ├── otp_codes (FK: user_id)
│   │
│   ├── password_reset_tokens (FK: user_id)
│   │
│   ├── mission_progress (FK: user_id, mission_id, client_id)
│   │   └── raffle_participations (FK: mission_progress_id, user_id, mission_id, redemption_id, client_id)
│   │
│   └── redemptions (FK: user_id, reward_id, mission_progress_id, client_id, fulfilled_by→users)
│       │
│       ├── commission_boost_redemptions (FK: redemption_id, client_id, payout_sent_by→users)
│       │   └── commission_boost_state_history (FK: boost_redemption_id, client_id, transitioned_by→users)
│       │
│       └── physical_gift_redemptions (FK: redemption_id, client_id)
│
├── tiers (FK: client_id)
│
├── missions (FK: client_id, reward_id)
│   │
│   ├── mission_progress (FK: mission_id)
│   │
│   └── raffle_participations (FK: mission_id)
│
├── rewards (FK: client_id)
│   │
│   ├── missions (FK: reward_id)
│   │
│   └── redemptions (FK: reward_id)
│
└── sync_logs (FK: client_id, triggered_by→users)
```

---

## Detailed FK Relationships by Table

### Root Table (No Dependencies)

| Table | Primary Key | Notes |
|-------|-------------|-------|
| **clients** | id (UUID) | Root table for multi-tenancy. All tenant-scoped tables reference this. |

---

### Level 1 Tables (Depend only on clients)

| Table | Primary Key | Foreign Keys | UNIQUE Constraints |
|-------|-------------|--------------|-------------------|
| **users** | id (UUID) | `client_id → clients(id)` | `(client_id, tiktok_handle)` |
| **tiers** | id (UUID) | `client_id → clients(id)` | `(client_id, tier_order)`, `(client_id, tier_id)` |
| **rewards** | id (UUID) | `client_id → clients(id)` | - |

---

### Level 2 Tables (Depend on Level 1 tables)

| Table | Primary Key | Foreign Keys | UNIQUE Constraints |
|-------|-------------|--------------|-------------------|
| **videos** | id (UUID) | `user_id → users(id)`, `client_id → clients(id)` | `video_url` |
| **otp_codes** | id (UUID) | `user_id → users(id) ON DELETE CASCADE` | `session_id` |
| **password_reset_tokens** | id (UUID) | `user_id → users(id) ON DELETE CASCADE` | - |
| **sales_adjustments** | id (UUID) | `user_id → users(id)`, `client_id → clients(id)`, `adjusted_by → users(id)` | - |
| **tier_checkpoints** | id (UUID) | `user_id → users(id)`, `client_id → clients(id)` | - |
| **handle_changes** | id (UUID) | `user_id → users(id)`, `resolved_by → users(id)` | - |
| **sync_logs** | id (UUID) | `client_id → clients(id)`, `triggered_by → users(id)` | - |
| **missions** | id (UUID) | `client_id → clients(id)`, `reward_id → rewards(id)` | `(client_id, tier_eligibility, mission_type, display_order)` |

---

### Level 3 Tables (Depend on Level 2 tables)

| Table | Primary Key | Foreign Keys | UNIQUE Constraints |
|-------|-------------|--------------|-------------------|
| **mission_progress** | id (UUID) | `user_id → users(id) ON DELETE CASCADE`, `mission_id → missions(id) ON DELETE CASCADE`, `client_id → clients(id)` | `(user_id, mission_id, checkpoint_start)` |
| **redemptions** | id (UUID) | `user_id → users(id) ON DELETE CASCADE`, `reward_id → rewards(id) ON DELETE CASCADE`, `mission_progress_id → mission_progress(id) ON DELETE CASCADE`, `client_id → clients(id) ON DELETE CASCADE`, `fulfilled_by → users(id)` | `(user_id, reward_id, tier_at_claim, claimed_at)`, `(user_id, mission_progress_id)` |

---

### Level 4 Tables (Sub-state tables for rewards)

| Table | Primary Key | Foreign Keys | UNIQUE Constraints | Cardinality |
|-------|-------------|--------------|-------------------|-------------|
| **commission_boost_redemptions** | id (UUID) | `redemption_id → redemptions(id) ON DELETE CASCADE`, `client_id → clients(id)`, `(redemption_id, client_id) → redemptions(id, client_id)`, `payout_sent_by → users(id)` | `redemption_id` | ONE-TO-ONE |
| **physical_gift_redemptions** | id (UUID) | `redemption_id → redemptions(id) ON DELETE CASCADE`, `client_id → clients(id)`, `(redemption_id, client_id) → redemptions(id, client_id)` | `redemption_id` | ONE-TO-ONE |
| **raffle_participations** | id (UUID) | `mission_id → missions(id) ON DELETE CASCADE`, `user_id → users(id) ON DELETE CASCADE`, `mission_progress_id → mission_progress(id) ON DELETE CASCADE`, `redemption_id → redemptions(id) ON DELETE CASCADE`, `client_id → clients(id)`, `(redemption_id, client_id) → redemptions(id, client_id)`, `selected_by → users(id)` | `(mission_id, user_id)` | ONE-TO-MANY |

---

### Level 5 Tables (Audit tables)

| Table | Primary Key | Foreign Keys | Notes |
|-------|-------------|--------------|-------|
| **commission_boost_state_history** | id (UUID) | `boost_redemption_id → commission_boost_redemptions(id) ON DELETE CASCADE`, `client_id → clients(id)`, `transitioned_by → users(id)` | Populated by database trigger |

---

## Tables Summary by Domain

### Domain 1: System Configuration
| Table | Purpose |
|-------|---------|
| clients | Multi-tenant config, branding, tier calculation mode, VIP metric |
| tiers | 3-6 tier configuration per client (names, colors, thresholds) |

### Domain 2: User Management
| Table | Purpose |
|-------|---------|
| users | Creator profiles, 16 precomputed fields, payment info |
| otp_codes | Email verification during signup |
| password_reset_tokens | Magic link password reset |
| handle_changes | TikTok handle change tracking |

### Domain 3: Performance Tracking
| Table | Purpose |
|-------|---------|
| videos | Per-video analytics from Cruva CSV |
| sales_adjustments | Manual corrections (offline sales, refunds, bonuses) |
| sync_logs | Data sync operation tracking |

### Domain 4: Tier System
| Table | Purpose |
|-------|---------|
| tier_checkpoints | Audit trail for tier maintenance evaluations |

### Domain 5: Missions
| Table | Purpose |
|-------|---------|
| missions | Mission templates (sales, videos, views, likes, raffle) |
| mission_progress | User progress on missions (current_value, status) |

### Domain 6: Rewards
| Table | Purpose |
|-------|---------|
| rewards | Reward templates (6 types: gift_card, commission_boost, spark_ads, discount, physical_gift, experience) |
| redemptions | 5-state lifecycle (claimable → claimed → fulfilled → concluded | rejected) |

### Domain 7: Reward Sub-States
| Table | Purpose | Cardinality |
|-------|---------|-------------|
| commission_boost_redemptions | 6-state boost lifecycle, payment tracking | ONE-TO-ONE with redemptions |
| commission_boost_state_history | Financial compliance audit trail | ONE-TO-MANY with commission_boost_redemptions |
| physical_gift_redemptions | Size & shipping info for physical gifts | ONE-TO-ONE with redemptions |
| raffle_participations | Raffle entries & winner selection | ONE-TO-MANY with missions (per user) |

---

## State Machines

### redemptions.status (5 states)
```
claimable → claimed → fulfilled → concluded (TERMINAL)
                   ↘ rejected (TERMINAL)
```

### commission_boost_redemptions.boost_status (6 states)
```
scheduled → active → expired → pending_info → pending_payout → paid (TERMINAL)
```

### mission_progress.status (3 states)
```
dormant → active → completed (TERMINAL)
```

---

## Key Indexes

### Performance-Critical Indexes
```sql
-- Dashboard queries
CREATE INDEX idx_users_client ON users(client_id);
CREATE INDEX idx_users_tier ON users(client_id, current_tier);

-- Mission lookups
CREATE INDEX idx_missions_lookup ON missions(client_id, enabled, tier_eligibility, display_order);
CREATE INDEX idx_mission_progress_tenant ON mission_progress(client_id, user_id, status);

-- Reward lookups
CREATE INDEX idx_rewards_lookup ON rewards(client_id, enabled, tier_eligibility, reward_source, display_order);
CREATE INDEX idx_redemptions_tenant ON redemptions(client_id, user_id, status);

-- Admin fulfillment
CREATE INDEX idx_boost_tenant ON commission_boost_redemptions(client_id, boost_status);
CREATE INDEX idx_physical_gift_pending ON physical_gift_redemptions(created_at) WHERE shipped_at IS NULL;
```

---

## Multi-Tenant Isolation Pattern

**Critical Rule:** ALL queries must include `client_id` filter to prevent cross-tenant data access.

### Tables with client_id (Required for all tenant-scoped data)
- users
- tiers
- videos
- sales_adjustments
- tier_checkpoints
- sync_logs
- missions
- mission_progress
- rewards
- redemptions
- commission_boost_redemptions
- commission_boost_state_history
- physical_gift_redemptions
- raffle_participations

### Tables WITHOUT client_id (User-scoped, not tenant-scoped)
- otp_codes (FK to users, inherits tenant via user)
- password_reset_tokens (FK to users, inherits tenant via user)
- handle_changes (FK to users, inherits tenant via user)

---

## RLS Policy Requirements

All tenant-scoped tables should have Row-Level Security (RLS) policies:

```sql
-- Example RLS policy pattern
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_tenant_isolation ON users
  USING (client_id = current_setting('app.current_client_id')::UUID);
```

---

## Database Triggers

### 1. boost_status → redemptions.status Sync
```sql
-- Auto-updates redemptions.status when boost_status changes
scheduled/active/expired/pending_info → claimed
pending_payout → fulfilled
paid → concluded
```

### 2. Commission Boost State History Logger
```sql
-- Logs all boost_status transitions to commission_boost_state_history
CREATE TRIGGER track_boost_transitions
  AFTER UPDATE ON commission_boost_redemptions
  FOR EACH ROW
  EXECUTE FUNCTION log_boost_transition();
```

### 3. State Transition Validation (Pattern 3)
```sql
-- Prevents invalid state transitions
-- Only valid: claimable→claimed, claimed→fulfilled, etc.
-- Invalid transitions raise EXCEPTION
```

---

**END OF SCHEMA DEPENDENCY GRAPH**
