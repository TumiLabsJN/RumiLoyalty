## 7. UI/UX CHANGES

### Admin Panel Changes

#### 1. Client Creation Form ✅ **DECIDED: Immutable Setting**

**Location:** `/admin/clients/new/page.tsx`

**Decision:** VIP metric is set once during client creation and CANNOT be changed (no migration tooling)

**New field:**
```tsx
<FormField name="vip_metric">
  <FormLabel>VIP Progression Metric</FormLabel>
  <FormDescription>
    This setting determines how creators advance through VIP tiers.
    <strong>Cannot be changed after client creation.</strong>
  </FormDescription>

  <RadioGroup defaultValue="sales">
    <RadioGroupItem value="sales">
      <strong>Sales Value ($)</strong>
      <p>Tier progress based on total revenue generated</p>
      <p className="text-muted-foreground">
        Example: "Reach $2,000 in sales for Gold tier"
      </p>
    </RadioGroupItem>

    <RadioGroupItem value="units">
      <strong>Units Sold (#)</strong>
      <p>Tier progress based on volume of transactions</p>
      <p className="text-muted-foreground">
        Example: "Sell 200 units for Gold tier"
      </p>
    </RadioGroupItem>
  </RadioGroup>
</FormField>
```

**Confirmation modal (if units selected):**
```tsx
<AlertDialog>
  <AlertDialogContent>
    <AlertDialogTitle>⚠️ Confirm VIP Metric Selection</AlertDialogTitle>
    <AlertDialogDescription>
      You selected <strong>Units Sold</strong> as the VIP progression metric.

      This means:
      • Tier thresholds will be in units (e.g., "200 units for Gold")
      • Sales missions will track units sold (e.g., "Sell 50 units")
      • Checkpoint resets will reset unit counts monthly

      <strong>This setting is permanent and cannot be changed after creation.</strong>
    </AlertDialogDescription>
    <AlertDialogAction onClick={createClient}>
      I Understand, Create Client
    </AlertDialogAction>
    <AlertDialogCancel>Cancel</AlertDialogCancel>
  </AlertDialogContent>
</AlertDialog>
```

---

#### 2. Tier Creation Form ✅ **DECIDED: Tier 1 = 0 Units, Helper Text Guidance**

**Location:** `/admin/tiers/new/page.tsx`

**Decisions:**
- **Tier 1 Threshold:** Bronze tier is 0 units in units mode (same as $0 in sales mode). All creators start at Bronze tier immediately upon signup.
- **Threshold Guidance:** Show helper text with example thresholds for units mode (e.g., "Typical ranges: Bronze 0, Silver 50-100, Gold 200-500, Platinum 1000+"). No auto-calculation required, admins maintain full control.

**Dynamic field based on client metric:**
```tsx
function TierForm({ client }) {
  const isUnitsMode = client.vip_metric === 'units';

  return (
    <Form>
      <FormField name="name">
        <FormLabel>Tier Name</FormLabel>
        <Input placeholder="Gold" />
      </FormField>

      {isUnitsMode ? (
        <FormField name="units_threshold">
          <FormLabel>Units Threshold</FormLabel>
          <FormDescription>
            Number of units creators must sell to reach this tier
          </FormDescription>
          <Input type="number" placeholder="200" />
          <span className="text-muted-foreground">units</span>
          <p className="text-sm text-muted-foreground mt-2">
            💡 Typical ranges: Bronze 0, Silver 50-100, Gold 200-500, Platinum 1000+
          </p>
        </FormField>
      ) : (
        <FormField name="sales_threshold">
          <FormLabel>Sales Threshold</FormLabel>
          <FormDescription>
            Revenue creators must generate to reach this tier
          </FormDescription>
          <Input type="number" step="0.01" placeholder="2000.00" />
          <span className="text-muted-foreground">USD</span>
        </FormField>
      )}

      <FormField name="color">
        <FormLabel>Tier Color</FormLabel>
        <ColorPicker />
      </FormField>
    </Form>
  );
}
```

---

#### 3. Mission Creation Form ✅ **DECIDED: Soft Target Validation**

**Location:** `/admin/missions/new/page.tsx`

**Decision:** Show soft warning if mission target is unreasonably low/high compared to tier thresholds. Admin can dismiss and save anyway.

**Dynamic target field with validation:**
```tsx
function MissionForm({ client, tiers }) {
  const [missionType, setMissionType] = useState('sales');
  const [targetValue, setTargetValue] = useState('');
  const [showWarning, setShowWarning] = useState(false);
  const isUnitsMode = client.vip_metric === 'units';

  // Validate target against tier thresholds
  const validateTarget = (value) => {
    if (missionType !== 'sales' || !value) return;

    const target = parseFloat(value);
    const thresholds = tiers.map(t =>
      isUnitsMode ? t.units_threshold : t.sales_threshold
    ).filter(Boolean);

    const maxThreshold = Math.max(...thresholds);

    // Warn if target is < 10% of highest tier threshold
    if (target < maxThreshold * 0.1) {
      setShowWarning(true);
    } else {
      setShowWarning(false);
    }
  };

  return (
    <Form>
      <FormField name="mission_type">
        <FormLabel>Mission Type</FormLabel>
        <Select value={missionType} onValueChange={setMissionType}>
          <SelectItem value="sales">
            {isUnitsMode ? 'Units Sold' : 'Sales Revenue'}
          </SelectItem>
          <SelectItem value="videos">Video Posts</SelectItem>
          <SelectItem value="likes">Total Likes</SelectItem>
          <SelectItem value="views">Total Views</SelectItem>
        </Select>
      </FormField>

      {missionType === 'sales' && (
        <FormField name="target_value">
          <FormLabel>Target</FormLabel>
          <FormDescription>
            {isUnitsMode
              ? 'Number of units to sell'
              : 'Sales revenue to generate'
            }
          </FormDescription>
          <Input
            type="number"
            placeholder={isUnitsMode ? '50' : '500.00'}
            step={isUnitsMode ? '1' : '0.01'}
            value={targetValue}
            onChange={(e) => {
              setTargetValue(e.target.value);
              validateTarget(e.target.value);
            }}
          />
          <span className="text-muted-foreground">
            {isUnitsMode ? 'units' : 'USD'}
          </span>

          {showWarning && (
            <Alert variant="warning" className="mt-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Low Target Warning</AlertTitle>
              <AlertDescription>
                This target ({targetValue} {isUnitsMode ? 'units' : 'USD'}) is much lower
                than your tier thresholds. Creators may complete this mission immediately.
              </AlertDescription>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowWarning(false)}
              >
                Dismiss
              </Button>
            </Alert>
          )}
        </FormField>
      )}

      {/* Other fields... */}
    </Form>
  );
}
```

---

### Creator UI Changes

#### 0. First-Time Login Banner ✅ **DECIDED: One-Time Tooltip**

**Location:** `/app/home/page.tsx` or `/app/layout.tsx`

**Decision:** Show one-time dismissible banner on first login for units-mode clients only.

**Implementation:**
```tsx
function OnboardingBanner({ client, user }) {
  const [dismissed, setDismissed] = useState(false);
  const isUnitsMode = client.vip_metric === 'units';
  const isFirstLogin = !user.onboarding_dismissed; // Track in user preferences

  if (!isUnitsMode || !isFirstLogin || dismissed) return null;

  return (
    <Alert className="mb-4">
      <InfoIcon className="h-4 w-4" />
      <AlertTitle>Welcome to {client.name}'s Loyalty Program!</AlertTitle>
      <AlertDescription>
        Your progress is tracked by <strong>units sold</strong>, not sales revenue.
        You'll advance through tiers based on the number of products you sell.
      </AlertDescription>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setDismissed(true);
          // API call to mark onboarding_dismissed = true
        }}
      >
        Got it
      </Button>
    </Alert>
  );
}
```

**Database Change:**
```sql
ALTER TABLE users ADD COLUMN onboarding_dismissed BOOLEAN DEFAULT FALSE;
```

---

#### 1. Home Page - Progress Card

**Location:** `/app/home/page.tsx`

**Current display (sales mode):**
```tsx
<Card>
  <CardHeader>
    <CardTitle>Your Progress to {nextTier.name}</CardTitle>
  </CardHeader>
  <CardContent>
    <Progress value={(currentSales / nextTierThreshold) * 100} />
    <p className="text-2xl font-bold">
      {formatCurrency(currentSales)} / {formatCurrency(nextTierThreshold)}
    </p>
    <p className="text-muted-foreground">
      {daysUntilCheckpoint} days left until checkpoint
    </p>
  </CardContent>
</Card>
```

**New display (metric-aware):**
```tsx
function ProgressCard({ user, client, nextTier }) {
  const isUnitsMode = client.vip_metric === 'units';

  const currentValue = isUnitsMode
    ? user.metrics.checkpoint_units_sold
    : user.metrics.checkpoint_sales;

  const threshold = isUnitsMode
    ? nextTier.units_threshold
    : nextTier.sales_threshold;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Progress to {nextTier.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <Progress value={(currentValue / threshold) * 100} />

        {isUnitsMode ? (
          <>
            <p className="text-2xl font-bold">
              {currentValue} / {threshold} units
            </p>
            <p className="text-sm text-muted-foreground">
              This month's sales: {formatCurrency(user.metrics.checkpoint_sales)}
            </p>
          </>
        ) : (
          <p className="text-2xl font-bold">
            {formatCurrency(currentValue)} / {formatCurrency(threshold)}
          </p>
        )}

        <p className="text-muted-foreground">
          {daysUntilCheckpoint} days left until checkpoint
        </p>
      </CardContent>
    </Card>
  );
}
```

**Key changes:**
- Show units + dollar context in units mode
- Show only dollars in sales mode
- Same UI structure, different values

---

#### 2. Mission Cards

**Location:** `/app/missions/page.tsx`

**Dynamic mission display:**
```tsx
function MissionCard({ mission, user, client }) {
  const isUnitsMode = client.vip_metric === 'units';
  const isSalesMission = mission.mission_type === 'sales';

  // Get progress value based on mission type and client metric
  const progress = isSalesMission && isUnitsMode
    ? user.metrics.checkpoint_units_sold
    : isSalesMission
    ? user.metrics.checkpoint_sales
    : getMissionProgress(mission, user); // videos/likes/views

  return (
    <Card>
      <CardHeader>
        <CardTitle>{mission.display_name}</CardTitle>
        <CardDescription>
          {generateMissionDescription(mission, client)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Progress value={(progress / mission.target_value) * 100} />

        {isSalesMission && isUnitsMode ? (
          <p>{progress} / {mission.target_value} units</p>
        ) : isSalesMission ? (
          <p>{formatCurrency(progress)} / {formatCurrency(mission.target_value)}</p>
        ) : (
          <p>{progress} / {mission.target_value}</p>
        )}
      </CardContent>
      <CardFooter>
        <Button disabled={progress < mission.target_value}>
          Claim {mission.reward.name}
        </Button>
      </CardFooter>
    </Card>
  );
}

function generateMissionDescription(mission, client) {
  if (mission.mission_type === 'sales') {
    const isUnitsMode = client.vip_metric === 'units';
    return isUnitsMode
      ? `Sell ${mission.target_value} units to unlock reward`
      : `Reach ${formatCurrency(mission.target_value)} in sales to unlock reward`;
  }

  // Other mission types unchanged
  return mission.description;
}
```

---

#### 3. Tier Info Cards

**Location:** `/app/tiers/page.tsx`

**No changes needed!** ✅

**Why:** Tier benefits are always dollar-based (commissions, gift cards, ads), so display remains the same regardless of progression metric.

```tsx
<Card>
  <CardHeader>
    <CardTitle>Gold Tier</CardTitle>
    <CardDescription>
      {client.vip_metric === 'units'
        ? `Sell ${tier.units_threshold} units to unlock`
        : `Reach ${formatCurrency(tier.sales_threshold)} to unlock`
      }
    </CardDescription>
  </CardHeader>
  <CardContent>
    <h4>Benefits:</h4>
    <ul>
      <li>5% Commission Boost on all sales revenue</li>
      <li>$100 Spark Ads Credit</li>
      <li>Priority Support</li>
    </ul>
  </CardContent>
</Card>
```

**Note:** Threshold display changes, but benefits are always dollar-based.

---
