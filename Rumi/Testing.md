# Testing System for Next.js Pages

**Target:** Next.js 14.2.18 + React 18.3.1 + App Router
**Pattern:** `/app/[page]/page.tsx`

---

## Implementation Checklist

1. Add imports to target page
2. Add state management (top of component)
3. Add debug panel toggle button
4. Add collapsible debug panel
5. Create test scenarios object
6. Wire scenarios to existing mock data

---

## Code Template

### 1. Imports (add to existing imports)
```tsx
import { useState } from "react"
import * as React from "react"
```

### 2. State Management (top of component function)
```tsx
export default function YourPage() {
  const [activeScenario, setActiveScenario] = useState("scenario-1")
  const [debugPanelOpen, setDebugPanelOpen] = useState(false)

  // ... rest of component
}
```

### 3. Scenarios Object Structure
```tsx
const scenarios = {
  "scenario-1": {
    name: "Scenario Name",
    // Page-specific data structure
    // Mirror existing mock data structure
  },
  "scenario-2": {
    name: "Another Scenario",
    // ...
  },
}

// Get current data
const currentScenario = scenarios[activeScenario as keyof typeof scenarios]
// Extract data from currentScenario and use in component
```

### 4. Debug UI (before return statement, replace existing return)
```tsx
return (
  <>
    {/* Toggle Button - Always Visible */}
    <button
      onClick={() => setDebugPanelOpen(!debugPanelOpen)}
      className="fixed top-4 right-4 z-50 bg-purple-600 hover:bg-purple-700 text-white rounded-full p-3 shadow-2xl border-2 border-white"
      aria-label="Toggle test scenarios"
    >
      🧪
    </button>

    {/* Collapsible Panel */}
    {debugPanelOpen && (
      <div className="fixed top-16 right-4 z-50 bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl border-2 border-purple-500 p-4 w-64 max-h-[70vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            🧪 Test Scenarios
            <span className="text-xs text-slate-500">({Object.keys(scenarios).length})</span>
          </h3>
          <button
            onClick={() => setDebugPanelOpen(false)}
            className="text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <div className="space-y-1.5">
          {Object.entries(scenarios).map(([key, scenario]) => (
            <Button
              key={key}
              onClick={() => setActiveScenario(key)}
              variant={activeScenario === key ? "default" : "outline"}
              size="sm"
              className={cn(
                "w-full justify-start text-xs h-auto py-2 px-3",
                activeScenario === key && "bg-purple-600 hover:bg-purple-700"
              )}
            >
              <span className="font-semibold truncate w-full">
                {scenario.name}
              </span>
            </Button>
          ))}
        </div>

        <div className="mt-3 pt-3 border-t border-slate-200">
          <p className="text-xs text-slate-600">
            <span className="font-semibold">Active:</span> {currentScenario.name}
          </p>
        </div>
      </div>
    )}

    {/* Original page content */}
    <YourPageLayout>
      {/* ... existing JSX */}
    </YourPageLayout>
  </>
)
```

---

## Scenario Design Pattern

**Each scenario must include:**
- `name`: Display name for button
- All data fields used in the page (mirror existing mock data structure)

**Example for a page with user data:**
```tsx
const scenarios = {
  "scenario-1": {
    name: "New User",
    userName: "John",
    userTier: "Bronze",
    items: [/* array of data */],
  },
  "scenario-2": {
    name: "Power User",
    userName: "Sarah",
    userTier: "Platinum",
    items: [/* different data */],
  },
}

// Extract and use
const { userName, userTier, items } = currentScenario
```

---

## Testing Workflow

1. **Start dev server:** `npm run dev`
2. **Navigate to page:** `http://localhost:3000/[page]`
3. **Enable mobile view:** F12 → Ctrl+Shift+M → iPhone 14 Pro (390x844)
4. **Click 🧪 button** (top-right)
5. **Click scenario buttons** to test different states

---

## File Locations

- **Pages:** `/app/[page]/page.tsx`
- **Components:** `/components/ui/button.tsx` (needed for Button component)
- **Utils:** `/lib/utils.ts` (needed for `cn()` function)

---

## Common Patterns by Page Type

### Dashboard/Home Pages
Test: Different user tiers, progress states, metric variations

### List Pages (Missions/Rewards/Tiers)
Test: Empty states, full lists, filtered views, different item statuses

### History Pages
Test: No history, few items, many items, different time ranges

### Form Pages
Test: Empty form, pre-filled, validation states, error states

---

## Notes
- Panel closed by default (better UX)
- Purple color = test mode indicator
- Max width 264px (mobile friendly)
- Scrollable if >10 scenarios
- Always z-50 (stays on top)
