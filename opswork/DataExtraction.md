# DataExtraction.md - Excel to AffiliateCC.md Workflow

## Purpose
Extract competitor data from RumiAI Excel reports and enrich AffiliateCC.md with YAML-style content.

---

## Source Files

### Excel Location
```
/home/jorge/rumiaifinal/data/clients/statesidegrowers/competitors/{handle}/top_contrastive/reports/competitor/{handle}_analysis_data.xlsx
```

### Target File
```
/home/jorge/Loyalty/opswork/AffiliateCC.md
```

---

## Extraction Rules

### Row Ranges (Excel)
| Section | Rows | Description |
|---------|------|-------------|
| Content Strategy | 8-19 | PAGE_2_CONTENT_STRATEGY, bucket distributions |
| Performance Buckets | 21-40 | Top 3 performing duration buckets, avg views, engagement, sweet spot |
| Posting & Content | 42-186 | Posting frequency, speech stats, CTAs, hashtags, affiliates (stop before BUCKET_*_NAME) |

### Columns
- Column A: Field name
- Column B: Value

### Skip Rules
- Skip rows where both Column A and Column B are empty/NaN
- Skip rows where Column A is empty but Column B has value (orphan values)

---

## Handle-to-Brand Mapping

Reference: AffiliateCC.md `## Checklist` section (lines 25-32)

| Handle | Brand |
|--------|-------|
| @realkalimuscle | Goli Nutrition |
| @shopbyjake | Micro Ingredients |
| @ayunonutricion | Micro Ingredients |
| @yainafashion | Physician's Choice |
| @daisycabral_ | Bella All Natural |
| @bomboncito127 | Snap Supplements |

---

## Output Format

### Section Header (H1)
```markdown
# {handle} - {Brand}
```

### Subsections (H2)
```markdown
## Content Strategy (Rows 8-19)
FIELD_NAME: value
FIELD_NAME: value

## Performance Buckets (Rows 21-40)
FIELD_NAME: value
FIELD_NAME: value

## Posting & Content (Rows 42-186)
FIELD_NAME: value
...
TOTAL_UNIQUE_MENTIONS: value
```

### Example Output
```markdown
# daisycabral - Bella All Natural

## Content Strategy (Rows 8-19)
PAGE_2_CONTENT_STRATEGY:
BUCKET_0_3S_PCT: 1
BUCKET_3_9S_PCT: 4
BUCKET_9_13S_PCT: 5
BUCKET_13_18S_PCT: 8
BUCKET_18_33S_PCT: 17
BUCKET_33_60S_PCT: 45
BUCKET_60_90S_PCT: 16
BUCKET_90_120S_PCT: 4
PRIMARY_FOCUS_BUCKET: 33-60s

## Posting & Content (Rows 42-186)
POSTING_FREQUENCY: 7.8
...
AFFILIATE_5_COUNT: 1
TOTAL_UNIQUE_MENTIONS: 11
```

---

## Workflow

### User Command
```
Enrich AffiliateCC.md with {handle} following DataExtraction.md
```

### LLM Steps
1. Read this file (DataExtraction.md) for instructions
2. Look up brand name from `## Checklist` in AffiliateCC.md
3. Locate Excel file (try `top_contrastive`, fallback to `top_top`)
4. Extract rows 8-19 (Content Strategy)
5. Extract rows 21-40 (Performance Buckets)
6. Extract rows 42-186 (Posting & Content, stop before BUCKET_*_NAME)
7. Format as YAML-style (FIELD: value)
8. Skip empty rows
9. **PRE-CHECK**: Confirm last extracted field is `TOTAL_UNIQUE_MENTIONS` before proceeding
10. Append to AffiliateCC.md as new H1 section
11. **POST-CHECK**: Verify handle ends with `TOTAL_UNIQUE_MENTIONS` in file

---

## Verification Check

### PRE-INSERTION (before appending to AffiliateCC.md)
Confirm extracted data ends with `TOTAL_UNIQUE_MENTIONS`. If not, extraction is incomplete.

### POST-INSERTION
```bash
grep -c ":" AffiliateCC.md  # Should increase by ~141-154 fields per handle
```

Expected last field for each handle:
- `TOTAL_UNIQUE_MENTIONS`

Field count varies (141-154) because handles have different numbers of hashtags/CTAs.

---

## Notes
- Handle in folder name may differ from @ handle (e.g., `daisycabral` folder for `@daisycabral_`)
- If brand not found in Checklist, use "Unknown Brand" as placeholder
- Process one handle at a time (user sends handles individually)
- **Path variants**: Try `top_contrastive` first, fallback to `top_top` if not found
