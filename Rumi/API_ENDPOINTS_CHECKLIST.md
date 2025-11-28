# API Endpoints Checklist

**Task 0.1.5 Output - API_CONTRACTS.md Analysis**
**Created:** 2025-11-28
**Total Endpoints:** 23

---

## Authentication Endpoints (9 endpoints)

| # | Method | Endpoint | Purpose | Line | Status |
|---|--------|----------|---------|------|--------|
| 1 | POST | `/api/auth/check-handle` | Validate TikTok handle, determine routing | 36 | [ ] |
| 2 | POST | `/api/auth/signup` | Create user account, send OTP | 191 | [ ] |
| 3 | POST | `/api/auth/verify-otp` | Verify 6-digit OTP code | 444 | [ ] |
| 4 | POST | `/api/auth/resend-otp` | Resend OTP (rate limited) | 725 | [ ] |
| 5 | POST | `/api/auth/login` | Password authentication | 948 | [ ] |
| 6 | GET | `/api/auth/user-status` | Check login status, determine routing | 1143 | [ ] |
| 7 | GET | `/api/auth/onboarding-info` | Get welcome page data | 1306 | [ ] |
| 8 | POST | `/api/auth/forgot-password` | Request password reset email | 1464 | [ ] |
| 9 | POST | `/api/auth/reset-password` | Reset password with token | 1623 | [ ] |

---

## Dashboard Endpoints (2 endpoints)

| # | Method | Endpoint | Purpose | Line | Status |
|---|--------|----------|---------|------|--------|
| 10 | GET | `/api/dashboard/featured-mission` | Get highest priority active mission | 1775 | [ ] |
| 11 | GET | `/api/dashboard` | Get full dashboard data | 2063 | [ ] |

---

## Missions Endpoints (4 endpoints)

| # | Method | Endpoint | Purpose | Line | Status |
|---|--------|----------|---------|------|--------|
| 12 | GET | `/api/missions` | List all missions for user's tier | 2955 | [ ] |
| 13 | POST | `/api/missions/:id/claim` | Claim mission reward | 3711 | [ ] |
| 14 | POST | `/api/missions/:id/participate` | Participate in raffle mission | 3782 | [ ] |
| 15 | GET | `/api/missions/history` | Get completed missions history | 3831 | [ ] |

---

## Rewards Endpoints (5 endpoints)

| # | Method | Endpoint | Purpose | Line | Status |
|---|--------|----------|---------|------|--------|
| 16 | GET | `/api/rewards` | List VIP tier rewards | 4060 | [ ] |
| 17 | POST | `/api/rewards/:id/claim` | Claim VIP tier reward | 4836 | [ ] |
| 18 | GET | `/api/user/payment-info` | Get saved payment info | 5287 | [ ] |
| 19 | POST | `/api/rewards/:id/payment-info` | Submit commission boost payment info | 5331 | [ ] |
| 20 | GET | `/api/rewards/history` | Get claimed rewards history | 5454 | [ ] |

---

## Tiers Endpoints (1 endpoint)

| # | Method | Endpoint | Purpose | Line | Status |
|---|--------|----------|---------|------|--------|
| 21 | GET | `/api/tiers` | Get tier progress and benefits | 5605 | [ ] |

---

## Internal/System Endpoints (2 endpoints)

| # | Method | Endpoint | Purpose | Line | Status |
|---|--------|----------|---------|------|--------|
| 22 | GET | `/api/internal/client-config` | Get client branding/configuration | 6192 | [ ] |
| 23 | - | Daily Cron Job | Sync Cruva data, update metrics | N/A | [ ] |

---

## Endpoints by Page

### Login Flow
1. `/login/start` → POST `/api/auth/check-handle`
2. `/login/signup` → POST `/api/auth/signup`
3. `/login/otp` → POST `/api/auth/verify-otp`, POST `/api/auth/resend-otp`
4. `/login/loading` → GET `/api/auth/user-status`
5. `/login/welcomeunr` → GET `/api/auth/onboarding-info`
6. `/login/wb` → POST `/api/auth/login`
7. `/login/forgotpw` → POST `/api/auth/forgot-password`
8. `/login/resetpw` → POST `/api/auth/reset-password`

### Main App
1. `/home` → GET `/api/dashboard`, GET `/api/dashboard/featured-mission`
2. `/missions` → GET `/api/missions`, POST `/api/missions/:id/claim`, POST `/api/missions/:id/participate`
3. `/missions/history` → GET `/api/missions/history`
4. `/rewards` → GET `/api/rewards`, POST `/api/rewards/:id/claim`
5. `/rewards/history` → GET `/api/rewards/history`
6. `/tiers` → GET `/api/tiers`

### System
- GET `/api/internal/client-config` (all pages - branding)
- Daily Cron (background)

---

## Endpoint Summary by HTTP Method

| Method | Count | Endpoints |
|--------|-------|-----------|
| GET | 10 | check-handle routing, user-status, onboarding-info, dashboard, featured-mission, missions, missions/history, rewards, rewards/history, tiers, payment-info, client-config |
| POST | 12 | check-handle, signup, verify-otp, resend-otp, login, forgot-password, reset-password, missions/claim, missions/participate, rewards/claim, payment-info |

---

## Key Implementation Notes

### Authentication Security
- Rate limiting on all auth endpoints
- OTP: 6-digit, bcrypt hashed, 5-min expiry, max 3 attempts
- Password reset: 15-min expiry, one-time use
- JWT expiry: 60 days (5184000 seconds)

### Multitenancy
- ALL endpoints filter by `client_id` (derived from authenticated user)
- Never expose cross-tenant data

### Response Transformations
- Database `snake_case` → API `camelCase`
- Encrypted fields decrypted in repository layer
- Duration stored as minutes, displayed as days where appropriate

---

**END OF CHECKLIST**
