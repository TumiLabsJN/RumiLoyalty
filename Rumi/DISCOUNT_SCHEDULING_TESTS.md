# Discount Scheduling Feature - Test Guide

**Feature:** Discount reward scheduling with calendar picker
**Location:** `/app/rewards/page.tsx`
**Component:** `/components/schedule-discount-modal.tsx`

---

## 🚀 Quick Start

### 1. Start Dev Server
```bash
cd /home/jorge/Loyalty/Rumi/App\ Code/V1
npm run dev
```

### 2. Open in Browser
```
http://localhost:3000/rewards
```

### 3. Enable Mobile View
- Press **F12** (DevTools)
- Press **Ctrl+Shift+M** (Mobile view)
- Select **iPhone 14 Pro** (390x844)

### 4. Click 🧪 Button (Top-Right)
This opens the test scenarios panel

---

## 🧪 Test Scenarios

### **Scenario 1: Default - Single Discount (10%)**
**What to test:**
- ✅ Click "Schedule" button on "Deal Boost: 10%" card
- ✅ Calendar modal opens
- ✅ Select tomorrow's date (today is disabled)
- ✅ Click "Morning" section to expand time slots
- ✅ Select "10:00 AM" (or any morning time)
- ✅ Preview shows: "Locked in! [Date] at 10:00 AM EST"
- ✅ Click "Schedule Activation"
- ✅ Loading spinner shows ("Scheduling...")
- ✅ Toast appears: "Discount scheduled for [Date] at 10:00 AM ET"
- ✅ Modal closes

**Expected Behavior:**
- Modal shows: "+10% Deal Boost for 7 Days 🎯"
- Can't select today (same-day disabled)
- Can't select beyond 7 days from now
- Time slots grouped: Morning (9-11:30 AM) and Afternoon (12-6:30 PM)

---

### **Scenario 2: Multiple Discounts (10%, 15%, 20%)**
**What to test:**
- ✅ Three discount cards visible
- ✅ Click "Schedule" on 10% discount → Modal shows "10% for 7 Days"
- ✅ Close modal
- ✅ Click "Schedule" on 15% discount → Modal shows "15% for 14 Days"
- ✅ Close modal
- ✅ Click "Schedule" on 20% discount → Modal shows "20% for 30 Days"

**Expected Behavior:**
- Each discount shows correct percentage
- Each discount shows correct duration_days
- All have "Schedule" button (not "Claim")

---

### **Scenario 3: Discount Limit Reached**
**What to test:**
- ✅ Discount card shows "Limit Reached" badge
- ✅ "Schedule" button is replaced with disabled "Limit Reached" box
- ✅ Card has amber background (bg-amber-50)
- ✅ Can still see discount details but cannot click

**Expected Behavior:**
- used_count: 1/1 (already claimed this month)
- Can't schedule again until next month
- Gift card still claimable (different reward)

---

### **Scenario 4: Locked Discount (Platinum Only)**
**What to test:**
- ✅ User is Silver tier (see header badge)
- ✅ Discount card shows lock icon 🔒
- ✅ Card shows "Platinum" tier requirement
- ✅ Card is grayed out (opacity-60)
- ✅ No "Schedule" button visible
- ✅ Card is preview-only (can't interact)

**Expected Behavior:**
- Locked discount visible (preview_from_tier: tier_2)
- Shows what user will unlock at higher tier
- Gift card ($25) still claimable for Silver tier

---

### **Scenario 5: No Discounts - Other Rewards Only**
**What to test:**
- ✅ No discount cards visible
- ✅ Only shows: Gift Card, Pay Boost, Reach Boost, Gift Drop
- ✅ All buttons say "Claim" (not "Schedule")
- ✅ 🧪 panel shows "No Discounts - Other Rewards Only"

**Expected Behavior:**
- Proves discount detection works correctly
- Other reward types unaffected

---

## 🎯 Calendar Modal Features to Test

### **Date Picker**
- ✅ Today is grayed out (disabled)
- ✅ Tomorrow through +7 days are selectable
- ✅ Dates beyond 7 days are grayed out
- ✅ Selected date highlights in blue

### **Time Picker - Collapsible Sections**
- ✅ Shows 2 sections: 🌅 Morning, ☀️ Afternoon
- ✅ Click section header to expand/collapse
- ✅ Chevron icon rotates when expanded
- ✅ Morning slots: 10:00 AM - 11:30 AM (30-min intervals)
- ✅ Afternoon slots: 12:00 PM - 6:30 PM (30-min intervals)
- ✅ Selected time highlights in blue

### **Timezone Info**
- ✅ Shows "Times shown in Eastern Time (EST)"
- ✅ Blue info box with timezone explanation
- ✅ Timezone abbreviation updates based on date (EST in winter, EDT in summer)

### **Preview Section**
- ✅ Only appears after selecting BOTH date + time
- ✅ Green border with checkmark icon
- ✅ Shows: "Locked in! [Date] at [Time] EST"
- ✅ Shows: "+X% Deal Boost goes live then—prep your TikTok teaser! 🎬"

### **Buttons**
- ✅ Cancel button always enabled
- ✅ "Schedule Activation" button disabled until date + time selected
- ✅ Loading state shows: "Scheduling..." with spinner
- ✅ Can't close modal during loading (disabled)

---

## 🐛 Edge Cases to Test

### **Edge Case 1: Close Modal Without Scheduling**
1. Click "Schedule" button
2. Select date + time
3. Click "Cancel" (or X button)
4. Modal closes without API call
5. Can open modal again with fresh state

### **Edge Case 2: Switch Scenarios Mid-Modal**
1. Open modal (Scenario 1)
2. Select date + time
3. Switch to Scenario 2 via 🧪 panel
4. Modal stays open with same state
5. Close modal manually

### **Edge Case 3: Rapid Clicking**
1. Click "Schedule" button rapidly (double-click)
2. Only one modal should open
3. No duplicate states

### **Edge Case 4: Mobile Scrolling**
1. Open modal on mobile view
2. Scroll within modal
3. Calendar, time picker, and preview all scrollable
4. Fixed buttons stay at bottom

---

## ✅ Success Criteria

**Calendar Modal:**
- [ ] Opens when clicking "Schedule" on discount
- [ ] Shows correct discount % and duration days
- [ ] Date picker: today disabled, tomorrow to +7 days enabled
- [ ] Time picker: collapsible sections with 30-min slots
- [ ] Preview: appears after selecting date + time
- [ ] Timezone: shows EST/EDT correctly
- [ ] Loading: spinner shows during submission
- [ ] Success: toast message appears with scheduled time
- [ ] Close: modal closes after success

**Test Scenarios Panel:**
- [ ] 🧪 button visible in top-right
- [ ] Panel toggles open/closed
- [ ] Shows 5 scenarios
- [ ] Active scenario highlighted in purple
- [ ] Clicking scenario updates page immediately
- [ ] Current scenario name shown at bottom

**UI States:**
- [ ] "Schedule" button only on discount type
- [ ] "Claim" button on all other types
- [ ] "Limit Reached" state for used discounts
- [ ] Locked state with 🔒 icon for tier-restricted
- [ ] Tier badge color matches header

---

## 📊 What's NOT Implemented (Expected)

1. **Backend API** - Currently simulated with setTimeout (line 67)
   - URL: `POST /api/benefits/:id/claim`
   - Body: `{ scheduled_activation_at: ISO8601_timestamp }`

2. **Google Calendar Integration** - Not connected yet
   - No actual calendar event created
   - Just UI simulation

3. **Real-Time Updates** - No WebSocket/polling
   - Success message is client-side only
   - No admin notification

These are expected and documented in the architecture docs.

---

## 🎨 Visual Reference

**Test Panel (Purple):**
```
🧪 Test Scenarios (5)
┌─────────────────────────┐
│ ✓ Scenario 1            │
│   Scenario 2            │
│   Scenario 3            │
│   Scenario 4            │
│   Scenario 5            │
└─────────────────────────┘
Active: Scenario 1
```

**Calendar Modal:**
```
┌─────────────────────────────┐
│ Schedule Boost            X │
│ +10% Deal Boost for 7 Days  │
│                             │
│ Select Date                 │
│ [Calendar: Tomorrow-+7d]    │
│                             │
│ Select Time (EST)           │
│ 🌅 Morning     [Expand ˅]   │
│ ☀️ Afternoon   [Expand ˅]   │
│                             │
│ ✓ Locked in!                │
│ Jan 12 at 2:00 PM EST       │
│                             │
│ [Cancel] [Schedule]         │
└─────────────────────────────┘
```

---

## 🚨 Known Issues / Notes

1. **Duration Days Display:**
   - Frontend shows "for X Days" in modal title
   - Make sure value_data includes duration_days field

2. **Timezone Conversion:**
   - Frontend displays EST (Eastern)
   - Backend should receive UTC timestamp
   - Admin sees Brazil time (UTC-3) in fulfillment queue

3. **Same-Day Scheduling:**
   - Intentionally disabled (minDate = tomorrow)
   - Prevents scheduling conflicts

4. **Original Benefits Array:**
   - Still exists as `benefitsOLD` in code
   - Can be removed once testing is complete
   - Kept for reference during testing

---

## 📝 Next Steps After Testing

1. ✅ Test all 5 scenarios
2. ✅ Verify calendar modal behavior
3. ✅ Check edge cases
4. 🔲 Implement backend API endpoint
5. 🔲 Connect Google Calendar API
6. 🔲 Add admin fulfillment queue
7. 🔲 Remove `benefitsOLD` array
8. 🔲 Remove test scenarios (or keep for future testing)

---

**Last Updated:** 2025-01-11
**Status:** Ready for Testing
