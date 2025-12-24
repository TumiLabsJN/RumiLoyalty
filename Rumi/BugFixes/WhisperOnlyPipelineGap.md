# Whisper-Only Pipeline + Transcript Analysis Report - Gap Documentation

**ID:** GAP-001
**Type:** Feature Gap
**Created:** 2025-12-24
**Status:** Analysis Complete | Implementation Ready
**Priority:** High
**Related Tasks:** Lightweight content analysis for rapid competitor insights
**Linked Issues:** None

---

## 1. Project Context

RumiAI is an ML-powered TikTok content analysis platform that discovers viral videos, processes them through 9 ML services (YOLO, Whisper, MediaPipe, OCR, Scene Detection, Audio Energy, FEAT emotion detection, DeepFace, MediaPipe Face), trains predictive models, and generates actionable reports for brands and creators. The full pipeline takes 60-80 seconds per video due to heavy ML processing. This gap addresses the need for a lightweight "transcript-only" flow that bypasses expensive ML services (FEAT alone is 43% of processing time) while still generating valuable content intelligence reports from Whisper transcripts and LLM classification.

**Tech Stack:** Python 3.12, pandas, openpyxl, qrcode, whisper.cpp, Claude API (Anthropic), Apify API
**Architecture Pattern:** CLI Orchestrator (`rumiai_ml_batch.py`) → Stage Processors → JSON outputs → Excel Report Generators

---

## 2. Gap/Enhancement Summary

**What's missing:** A lightweight pipeline flow that runs ONLY Whisper transcription + LLM content analysis (Stages 1, 2, 2.5.1, 2.6, 2.7) and generates a focused transcript-based report, bypassing the 8 other ML services and Stages 3-7 (ML training). Additionally, there is no extraction script that outputs ONLY the transcript-derived content intelligence (rows 50-132 of the current Excel reports).

**What should exist:**
1. An environment variable (`WHISPER_ONLY=true`) or CLI flag (`--whisper-only`) to run only Whisper during Stage 2
2. A new lightweight extraction script (`extract_transcript_analysis.py`) that outputs ONLY content categories, engagement drivers, hooks, CTAs, pain points, content tactics, and keywords derived from transcript/LLM analysis

**Why it matters:** The current pipeline takes ~80 seconds per video and requires GPU resources for FEAT emotion detection. For rapid competitor analysis or high-volume screening, clients need a 15-20x faster option (~3-5s per video) that still provides actionable content intelligence without ML training overhead.

---

## 3. Discovery Evidence

### Source Documents Analyzed

| Document | Section/Area | Finding |
|----------|--------------|---------|
| **PRODUCTION_FLOW.md** | Pipeline Architecture (Stage 2) | Stage 2 runs 9 ML services sequentially; FEAT alone is 43% of processing time (~30-40s per video) |
| **PRODUCTION_FLOW.md** | Stage Dependencies | Stages 2.6/2.7 (LLM content analysis) only require Whisper output, not other ML services |
| **STAGE_1_IMPL.md** | Video Discovery Output Schema | `selected_videos.json` contains video metadata, captions, hashtags - independent of ML processing |
| **STAGE_2_IMPL.md** | ML Service Architecture | `VideoAnalyzer.analyze_video()` calls 9 services in sequence; services are modular with individual `_run_*` methods |
| **STAGE_2_IMPL.md** | Whisper Output Path | Whisper outputs to `speech_transcriptions/{video_id}_whisper.json` - separate from `temporal_windows_updated.json` |
| **STAGE_2.6_2.7_IMPL.md** | Content Discovery Input Requirements | Stage 2.6 needs only `selection_manifest.json` + Whisper transcripts; does NOT need `temporal_windows_updated.json` |
| **STAGE_2.6_2.7_IMPL.md** | Content Classification Dependencies | Stage 2.7 reads transcripts + captions + taxonomy; no ML features required |
| **STAGE_8_IMPL.md** | Report 3 Excel Structure (Section 7.5) | Rows 50-132 contain transcript-derived content: categories, drivers, hooks, CTAs, pain points, tactics, keywords |
| **STAGE_8_IMPL.md** | `aggregate_content_classifications()` | Shared function reads `{video_id}_content.json` from Stage 2.7 - source of all transcript intelligence |
| **extract_competitor_data.py** | Lines 167-250 | `aggregate_content_classifications()` function aggregates Stage 2.7 outputs using Counter objects |
| **rumiai_v2/processors/video_analyzer.py** | `analyze_video()` method | ML services called via individual methods: `_run_yolo`, `_run_whisper`, `_run_mediapipe`, etc. - modular design enables selective execution |
| **ml_pipeline/stage2_5_organize/file_organizer.py** | `execute_file_moves()` | Stage 2.5 handles missing `temporal_windows_updated.json` gracefully - logs warning, continues |
| **yainafashion_analysis_data.xlsx** | Rows 50-132 | Confirmed transcript-derived content: CONTENT_CATEGORY, ENGAGEMENT_DRIVER, HOOK_STRATEGY, CTA_STRATEGY, PAIN_POINT, CONTENT_TACTIC, KEYWORD fields |

### Key Evidence

**Evidence 1:** Stage 2.6/2.7 dependencies are transcript-only
- Source: STAGE_2.6_2.7_IMPL.md, Section "File Dependencies"
- Quote: "Stage 2.6 needs: `selection_manifest.json` + Whisper transcripts. Stage 2.7 needs: Taxonomy + transcripts + captions. **Neither requires `temporal_windows_updated.json` or ML features**"
- Implication: Confirms that content analysis pipeline can run independently of ML processing

**Evidence 2:** ML services are modular and can be selectively disabled
- Source: rumiai_v2/processors/video_analyzer.py, `analyze_video()` method
- Finding: Services called via dictionary: `{'yolo': self._run_yolo, 'whisper': self._run_whisper, ...}` - can filter to only Whisper
- Implication: Adding `WHISPER_ONLY` env var requires ~10 lines of code

**Evidence 3:** Stage 2.5 gracefully handles missing temporal_windows files
- Source: ml_pipeline/stage2_5_organize/file_organizer.py, lines 287-294
- Code: `if not source_exists and not target_exists: logger.warning(...); missing_count += 1; continue`
- Implication: Whisper-only flow won't crash Stage 2.5 - just logs warnings

**Evidence 4:** Excel rows 50-132 are entirely from Stage 2.7 aggregation
- Source: yainafashion_analysis_data.xlsx analysis + STAGE_8_IMPL.md Section 7.5
- Finding: All fields (CONTENT_CATEGORY, HOOK_STRATEGY, CTA_STRATEGY, PAIN_POINT, ENGAGEMENT_DRIVER, CONTENT_TACTIC, KEYWORD) come from `aggregate_content_classifications()` which reads Stage 2.7 `{video_id}_content.json` files
- Implication: A new extraction script can output ONLY these fields

---

## 4. Business Justification

**Business Need:** Enable rapid competitor content analysis (15-20x faster) for high-volume screening and time-sensitive client requests.

**User Stories:**
1. As a brand strategist, I need to analyze 10 competitors' content strategies in under 1 hour so that I can prepare market intelligence reports for same-day client meetings
2. As an operations manager, I need a lightweight analysis option that doesn't require GPU resources so that I can run analyses on standard infrastructure
3. As a content creator, I need transcript-only insights (hooks, CTAs, pain points) without waiting for full ML processing so that I can quickly adapt my content strategy

**Impact if NOT implemented:**
- Competitor analysis takes 80s × 120 videos × 10 competitors = 26+ hours per market study
- GPU costs for FEAT emotion detection limit scaling
- Clients wait 24-48 hours for reports that could be delivered same-day
- Cannot offer "quick insights" tier at lower price point

---

## 5. Current State Analysis

### What Currently Exists

**File:** `rumiai_v2/processors/video_analyzer.py`
```python
# Current implementation - runs ALL 9 ML services
def analyze_video(self, video_path: str, video_id: str) -> dict:
    """Run full ML analysis pipeline on a video."""

    # All services run unconditionally
    analyses = {
        'yolo': self._run_yolo,
        'whisper': self._run_whisper,
        'mediapipe': self._run_mediapipe,
        'ocr': self._run_ocr,
        'scene_detection': self._run_scene_detection,
        'audio_energy': self._run_audio_energy,
        'emotion_detection': self._run_emotion_detection,  # FEAT - 43% of time
        'deepface_gender': self._run_deepface_gender,
        'mediapipe_face': self._run_mediapipe_face
    }

    results = {}
    for name, func in analyses.items():
        results[name] = func(video_path, video_id)

    return results
```

**File:** `extract_competitor_data.py` (lines 167-250)
```python
# Existing aggregation function - can be reused
def aggregate_content_classifications(bucket_name, base_path, performer_type="top"):
    """
    Aggregate Stage 2.7 content classifications for a specific bucket.
    Returns dict with Counters for each classification field.
    """
    content_dir = os.path.join(base_path, 'content_analysis', 'validated', f'bucket_{bucket_name}')

    # Initialize counters
    content_categories = Counter()
    hook_strategies = Counter()
    closing_strategies = Counter()
    pain_points = Counter()
    keywords = Counter()
    engagement_drivers = Counter()
    content_tactics = Counter()
    caption_cta_types = Counter()

    # Aggregate from all videos in this bucket
    for filename in os.listdir(content_dir):
        if not filename.endswith('_content.json'):
            continue
        # ... aggregation logic
```

**Current Capability:**
- System CAN run full 9-service ML pipeline (~60-80s per video)
- System CAN generate comprehensive Excel reports with all 239 rows
- System CAN aggregate Stage 2.7 content classifications

**Current Gaps (What the system CANNOT do today):**
- CANNOT run Whisper-only without other ML services
- CANNOT generate transcript-only focused reports
- CANNOT bypass Stages 3-7 cleanly for rapid analysis
- CANNOT offer tiered analysis speeds

### Current Data Flow (Full Pipeline)

```
Stage 1: Video Discovery (30-60s)
    ↓
Stage 2: ML Processing (60-80s per video) ← BOTTLENECK: 9 ML services
    ├── YOLO (~8s)
    ├── Whisper (~3-5s) ← ONLY THIS NEEDED
    ├── MediaPipe (~12s)
    ├── OCR (~5s)
    ├── Scene Detection (~2s)
    ├── Audio Energy (~3s)
    ├── FEAT emotion (~30-40s) ← BIGGEST BOTTLENECK (43%)
    ├── DeepFace (~5s)
    └── MediaPipe Face (~3s)
    ↓
Stage 2.5: File Organization
    ↓
Stage 2.5.1: Transcript Validation
    ↓
Stage 2.6: Content Discovery (LLM) ← ONLY NEEDS WHISPER
    ↓
Stage 2.7: Content Classification (LLM) ← ONLY NEEDS WHISPER + CAPTIONS
    ↓
Stages 3-7: ML Training, Feature Aggregation, etc. ← SKIP FOR TRANSCRIPT-ONLY
    ↓
Stage 8: Report Generation ← OUTPUTS ALL 239 ROWS
```

---

## 6. Proposed Solution - SPECIFICATION FOR NEW CODE

#### Approach

Implement a two-part solution: (1) Add `WHISPER_ONLY` environment variable to `video_analyzer.py` that limits Stage 2 to only Whisper transcription, and (2) Create new `extract_transcript_analysis.py` script that outputs ONLY transcript-derived content intelligence (equivalent to rows 50-132 of current reports).

### New Code to Create

**⚠️ NOTE: The following code is a SPECIFICATION. It will be CREATED during implementation.**

#### Part 1: Whisper-Only Mode in VideoAnalyzer

**New File/Function:** `rumiai_v2/processors/video_analyzer.py` (MODIFY)
```python
# SPECIFICATION - TO BE IMPLEMENTED
# Add at top of analyze_video() method:

def analyze_video(self, video_path: str, video_id: str) -> dict:
    """Run ML analysis pipeline on a video."""

    # NEW: Check for Whisper-only mode
    whisper_only = os.getenv('WHISPER_ONLY', 'false').lower() == 'true'

    if whisper_only:
        # Whisper-only mode: Skip all other ML services
        analyses = {
            'whisper': self._run_whisper
        }
        logger.info(f"WHISPER_ONLY mode enabled - skipping 8 other ML services")
    else:
        # Full pipeline (existing behavior)
        analyses = {
            'yolo': self._run_yolo,
            'whisper': self._run_whisper,
            'mediapipe': self._run_mediapipe,
            'ocr': self._run_ocr,
            'scene_detection': self._run_scene_detection,
            'audio_energy': self._run_audio_energy,
            'emotion_detection': self._run_emotion_detection,
            'deepface_gender': self._run_deepface_gender,
            'mediapipe_face': self._run_mediapipe_face
        }

    results = {}
    for name, func in analyses.items():
        results[name] = func(video_path, video_id)

    return results
```

**Explanation:** This minimal change (~10 lines) enables Whisper-only mode via environment variable, preserving all existing behavior when `WHISPER_ONLY` is not set.

---

#### Part 2: New Transcript Analysis Extraction Script

**New File:** `/home/jorge/rumiaifinal/extract_transcript_analysis.py`
```python
#!/usr/bin/env python3
# SPECIFICATION - TO BE IMPLEMENTED
"""
extract_transcript_analysis.py - Lightweight Transcript-Only Report

Generates focused content intelligence from Stage 2.7 transcript analysis only.
Outputs: Content categories, engagement drivers, hooks, CTAs, pain points, keywords.

Usage:
    python extract_transcript_analysis.py --client acme --target @creator --mode top --strategy contrastive

    # For competitor analysis:
    python extract_transcript_analysis.py --client acme --target @competitor --mode top --strategy contrastive --type competitor

    # For hashtag analysis:
    python extract_transcript_analysis.py --client acme --target nutrition --mode top --strategy contrastive --type hashtag
"""

import argparse
import json
import os
import pandas as pd
from collections import Counter
from typing import Dict, List, Optional, Tuple

# =============================
# CONSTANTS
# =============================

BASE_DATA_PATH = "/home/jorge/rumiaifinal/data/clients"


# =============================
# HELPER FUNCTIONS (from extract_competitor_data.py)
# =============================

def normalize_classification_key(value: str) -> str:
    """Normalize classification values to snake_case for consistent aggregation."""
    if not value:
        return value
    return value.strip().lower().replace(' ', '_')


def aggregate_content_classifications(bucket_name: str, base_path: str, performer_type: str = "top") -> Optional[Dict]:
    """
    Aggregate Stage 2.7 content classifications for a specific bucket.

    Args:
        bucket_name: Duration bucket (e.g., "18-33s")
        base_path: Path to analysis directory
        performer_type: "top" or "bottom"

    Returns:
        Dict with Counters for each classification field, or None if directory not found
    """
    content_dir = os.path.join(base_path, 'content_analysis', 'validated', f'bucket_{bucket_name}')

    if not os.path.exists(content_dir):
        print(f"Warning: Content directory not found: {content_dir}")
        return None

    # Initialize counters
    content_categories = Counter()
    hook_strategies = Counter()
    closing_strategies = Counter()
    pain_points = Counter()
    keywords = Counter()
    engagement_drivers = Counter()
    content_tactics = Counter()
    caption_cta_types = Counter()

    files_processed = 0

    for filename in os.listdir(content_dir):
        if not filename.endswith('_content.json'):
            continue

        filepath = os.path.join(content_dir, filename)
        with open(filepath, 'r') as f:
            data = json.load(f)

        # Filter by performer_type if field exists
        if 'performer_type' in data and data['performer_type'] != performer_type:
            continue

        files_processed += 1

        # Aggregate single-value fields
        if data.get('content_category'):
            key = normalize_classification_key(data['content_category'])
            content_categories[key] += 1

        if data.get('hook_strategy'):
            key = normalize_classification_key(data['hook_strategy'])
            hook_strategies[key] += 1

        if data.get('closing_strategy'):
            key = normalize_classification_key(data['closing_strategy'])
            closing_strategies[key] += 1

        # Aggregate list fields
        for pain_point in data.get('pain_points', []):
            if pain_point:
                key = normalize_classification_key(pain_point)
                pain_points[key] += 1

        for keyword in data.get('keywords', []):
            if keyword:
                key = normalize_classification_key(keyword)
                keywords[key] += 1

        for driver in data.get('engagement_drivers', []):
            if driver:
                key = normalize_classification_key(driver)
                engagement_drivers[key] += 1

        for tactic in data.get('content_tactics', []):
            if tactic:
                key = normalize_classification_key(tactic)
                content_tactics[key] += 1

        # Caption CTA type
        caption_cta = data.get('caption_analysis', {}).get('cta_type')
        if caption_cta:
            key = normalize_classification_key(caption_cta)
            caption_cta_types[key] += 1

    print(f"  Processed {files_processed} content files from bucket {bucket_name}")

    return {
        'content_category': content_categories,
        'hook_strategy': hook_strategies,
        'closing_strategy': closing_strategies,
        'pain_points': pain_points,
        'keywords': keywords,
        'engagement_drivers': engagement_drivers,
        'content_tactics': content_tactics,
        'caption_cta_type': caption_cta_types,
        'files_processed': files_processed
    }


def load_taxonomy_descriptions(taxonomy_path: str) -> Dict[str, Dict[str, str]]:
    """
    Load human-readable descriptions from curated taxonomy file.

    Args:
        taxonomy_path: Path to {target}_taxonomy.json

    Returns:
        Dict mapping category type to {name: description}
    """
    if not os.path.exists(taxonomy_path):
        print(f"Warning: Taxonomy file not found: {taxonomy_path}")
        return {}

    with open(taxonomy_path, 'r') as f:
        taxonomy = json.load(f)

    descriptions = {
        'content_categories': {},
        'hook_strategies': {},
        'engagement_drivers': {},
        'closing_strategies': {}
    }

    for category in taxonomy.get('content_categories', []):
        name = normalize_classification_key(category.get('name', ''))
        definition = category.get('definition', '')
        if name and definition:
            descriptions['content_categories'][name] = definition

    for hook in taxonomy.get('hook_strategies', []):
        name = normalize_classification_key(hook.get('name', ''))
        definition = hook.get('definition', '')
        if name and definition:
            descriptions['hook_strategies'][name] = definition

    for driver in taxonomy.get('engagement_drivers', []):
        name = normalize_classification_key(driver.get('name', ''))
        definition = driver.get('definition', '')
        if name and definition:
            descriptions['engagement_drivers'][name] = definition

    for cta in taxonomy.get('closing_strategies', []):
        name = normalize_classification_key(cta.get('name', ''))
        definition = cta.get('definition', '')
        if name and definition:
            descriptions['closing_strategies'][name] = definition

    return descriptions


def format_title(snake_case: str) -> str:
    """Convert snake_case to Title Case for display."""
    if not snake_case:
        return ""
    return snake_case.replace('_', ' ').title()


# =============================
# MAIN EXTRACTION LOGIC
# =============================

def extract_transcript_analysis(
    client_id: str,
    target: str,
    mode: str,
    strategy: str,
    analysis_type: str = "competitor"
) -> pd.DataFrame:
    """
    Extract transcript-based content intelligence from Stage 2.7 outputs.

    Args:
        client_id: Client identifier
        target: Target handle (e.g., "@creator") or hashtag
        mode: "top" or "recent"
        strategy: "contrastive" or "top"
        analysis_type: "competitor" or "hashtag"

    Returns:
        DataFrame with two columns: Field Name, Value
    """

    # Build paths based on analysis type
    target_clean = target.replace('@', '')

    if analysis_type == "competitor":
        base_path = f"{BASE_DATA_PATH}/{client_id}/competitors/{target_clean}/{mode}_{strategy}"
        taxonomy_path = f"{base_path}/content_taxonomies/{target_clean}_taxonomy.json"
    else:  # hashtag
        base_path = f"{BASE_DATA_PATH}/{client_id}/hashtags/{target_clean}/{mode}_{strategy}"
        taxonomy_path = f"{base_path}/content_taxonomies/{target_clean}_taxonomy.json"

    # Validate paths exist
    if not os.path.exists(base_path):
        raise FileNotFoundError(f"Analysis directory not found: {base_path}")

    winner_analysis_path = f"{base_path}/winner_analysis.json"
    if not os.path.exists(winner_analysis_path):
        raise FileNotFoundError(f"winner_analysis.json not found: {winner_analysis_path}")

    # Load winner analysis to get top 3 buckets
    with open(winner_analysis_path, 'r') as f:
        winner_data = json.load(f)

    top_3_buckets = winner_data.get('top_3_buckets', [])

    if not top_3_buckets:
        raise ValueError("No top_3_buckets found in winner_analysis.json")

    print(f"Analyzing top 3 buckets: {top_3_buckets}")

    # Load taxonomy descriptions (optional - graceful degradation if missing)
    descriptions = load_taxonomy_descriptions(taxonomy_path)

    # Aggregate content across all top 3 buckets
    combined = {
        'content_category': Counter(),
        'hook_strategy': Counter(),
        'closing_strategy': Counter(),
        'pain_points': Counter(),
        'keywords': Counter(),
        'engagement_drivers': Counter(),
        'content_tactics': Counter(),
        'caption_cta_type': Counter()
    }

    total_files = 0

    for bucket in top_3_buckets:
        aggregated = aggregate_content_classifications(bucket, base_path, performer_type="top")

        if aggregated:
            for field in combined.keys():
                combined[field] += aggregated.get(field, Counter())
            total_files += aggregated.get('files_processed', 0)

    print(f"Total content files processed: {total_files}")

    # Build Excel data (two-column format)
    tab_data = []

    # Header
    tab_data.append(['TRANSCRIPT_ANALYSIS_REPORT', f'@{target_clean}'])
    tab_data.append(['TOTAL_VIDEOS_CLASSIFIED', total_files])
    tab_data.append(['BUCKETS_ANALYZED', ', '.join(top_3_buckets)])
    tab_data.append(['', ''])

    # Section: What They Create (Content Categories)
    tab_data.append(['SECTION_WHAT_CREATES', f'WHAT @{target_clean.upper()} CREATES:'])
    tab_data.append(['', ''])

    top_categories = combined['content_category'].most_common(5)
    total_category_count = sum(combined['content_category'].values())

    for i, (category, count) in enumerate(top_categories, 1):
        pct = round((count / total_category_count) * 100) if total_category_count > 0 else 0
        desc = descriptions.get('content_categories', {}).get(category, 'No description available')

        tab_data.append([f'CONTENT_CATEGORY_{i}', format_title(category)])
        tab_data.append([f'CONTENT_CATEGORY_{i}_PCT', pct])
        tab_data.append([f'CONTENT_CATEGORY_{i}_DESC', desc])

    tab_data.append(['', ''])

    # Section: Engagement Drivers
    top_drivers = combined['engagement_drivers'].most_common(4)
    total_driver_count = sum(combined['engagement_drivers'].values())

    for i, (driver, count) in enumerate(top_drivers, 1):
        pct = round((count / total_driver_count) * 100) if total_driver_count > 0 else 0
        tab_data.append([f'ENGAGEMENT_DRIVER_{i}', format_title(driver)])
        tab_data.append([f'ENGAGEMENT_DRIVER_{i}_PCT', pct])

    tab_data.append(['', ''])

    # Section: How They Execute (Hooks, CTAs, Tactics)
    tab_data.append(['SECTION_HOW_EXECUTES', f'HOW @{target_clean.upper()} EXECUTES:'])
    tab_data.append(['', ''])

    # Hook Strategies
    top_hooks = combined['hook_strategy'].most_common(4)
    total_hook_count = sum(combined['hook_strategy'].values())

    for i, (hook, count) in enumerate(top_hooks, 1):
        pct = round((count / total_hook_count) * 100) if total_hook_count > 0 else 0
        desc = descriptions.get('hook_strategies', {}).get(hook, 'No description available')

        tab_data.append([f'HOOK_STRATEGY_{i}', format_title(hook)])
        tab_data.append([f'HOOK_STRATEGY_{i}_PCT', pct])
        tab_data.append([f'HOOK_STRATEGY_{i}_DESC', desc])

    tab_data.append(['', ''])

    # CTA Strategies (Closing)
    top_ctas = combined['closing_strategy'].most_common(4)
    total_cta_count = sum(combined['closing_strategy'].values())

    for i, (cta, count) in enumerate(top_ctas, 1):
        pct = round((count / total_cta_count) * 100) if total_cta_count > 0 else 0
        tab_data.append([f'CTA_STRATEGY_{i}', format_title(cta)])
        tab_data.append([f'CTA_STRATEGY_{i}_PCT', pct])

    tab_data.append(['', ''])

    # Pain Points
    top_pain_points = combined['pain_points'].most_common(5)
    total_pain_count = sum(combined['pain_points'].values())

    for i, (pain, count) in enumerate(top_pain_points, 1):
        pct = round((count / total_pain_count) * 100) if total_pain_count > 0 else 0
        tab_data.append([f'PAIN_POINT_{i}', format_title(pain)])
        tab_data.append([f'PAIN_POINT_{i}_PCT', pct])

    tab_data.append(['', ''])

    # Content Tactics
    top_tactics = combined['content_tactics'].most_common(4)
    total_tactic_count = sum(combined['content_tactics'].values())

    for i, (tactic, count) in enumerate(top_tactics, 1):
        pct = round((count / total_tactic_count) * 100) if total_tactic_count > 0 else 0
        tab_data.append([f'CONTENT_TACTIC_{i}', format_title(tactic)])
        tab_data.append([f'CONTENT_TACTIC_{i}_PCT', pct])

    tab_data.append(['', ''])

    # Caption CTA Strategies
    top_caption_ctas = combined['caption_cta_type'].most_common(4)
    total_caption_cta_count = sum(combined['caption_cta_type'].values())

    for i, (cta, count) in enumerate(top_caption_ctas, 1):
        pct = round((count / total_caption_cta_count) * 100) if total_caption_cta_count > 0 else 0
        tab_data.append([f'CAPTION_CTA_STRATEGY_{i}', format_title(cta)])
        tab_data.append([f'CAPTION_CTA_STRATEGY_{i}_PCT', pct])

    tab_data.append(['', ''])

    # Keywords
    top_keywords = combined['keywords'].most_common(5)

    for i, (keyword, count) in enumerate(top_keywords, 1):
        tab_data.append([f'KEYWORD_{i}', keyword])

    # Create DataFrame
    df = pd.DataFrame(tab_data, columns=['Field Name', 'Value'])

    return df


# =============================
# CLI ENTRY POINT
# =============================

def main():
    parser = argparse.ArgumentParser(
        description='Extract transcript-based content intelligence from Stage 2.7 outputs'
    )
    parser.add_argument('--client', required=True, help='Client ID')
    parser.add_argument('--target', required=True, help='Target handle (@creator) or hashtag name')
    parser.add_argument('--mode', required=True, choices=['top', 'recent'], help='Analysis mode')
    parser.add_argument('--strategy', required=True, choices=['contrastive', 'top'], help='Selection strategy')
    parser.add_argument('--type', default='competitor', choices=['competitor', 'hashtag'], help='Analysis type')
    parser.add_argument('--output', help='Output filename (default: {target}_transcript_analysis.xlsx)')

    args = parser.parse_args()

    # Validate target format
    target_clean = args.target.replace('@', '')

    print(f"Extracting transcript analysis for @{target_clean}...")
    print(f"  Client: {args.client}")
    print(f"  Mode: {args.mode}")
    print(f"  Strategy: {args.strategy}")
    print(f"  Type: {args.type}")

    try:
        df = extract_transcript_analysis(
            client_id=args.client,
            target=args.target,
            mode=args.mode,
            strategy=args.strategy,
            analysis_type=args.type
        )

        # Determine output path
        if args.output:
            output_path = args.output
        else:
            output_path = f"{target_clean}_transcript_analysis.xlsx"

        # Write Excel file
        df.to_excel(output_path, index=False, sheet_name='Transcript Analysis')

        print(f"\nReport generated: {output_path}")
        print(f"Total rows: {len(df)}")

    except FileNotFoundError as e:
        print(f"ERROR: {e}")
        print("\nEnsure Stage 2.7 content classification has completed for this target.")
        exit(1)
    except Exception as e:
        print(f"ERROR: {e}")
        exit(1)


if __name__ == '__main__':
    main()
```

**Explanation:** This new script extracts ONLY transcript-derived content intelligence (equivalent to rows 50-132 of current reports). It reuses the proven `aggregate_content_classifications()` logic from `extract_competitor_data.py` and outputs a focused ~80-row Excel file.

---

### New Types/Interfaces

```python
# SPECIFICATION - TO BE IMPLEMENTED
# No new types required - uses existing Counter and Dict types from collections
# Output is standard pandas DataFrame with columns: ['Field Name', 'Value']
```

---

## 7. Integration Points

### Files to Modify

| File | Action | Changes |
|------|--------|---------|
| `rumiai_v2/processors/video_analyzer.py` | MODIFY | Add `WHISPER_ONLY` env var check (~10 lines at start of `analyze_video()`) |
| `extract_transcript_analysis.py` | CREATE | New 350-line script for transcript-only report extraction |

### Dependency Graph

```
video_analyzer.py (MODIFY)
├── imports from: os (new - for getenv)
├── existing imports: unchanged
└── changes: if/else block in analyze_video()

extract_transcript_analysis.py (CREATE)
├── imports from: argparse, json, os, pandas, collections.Counter
├── copies logic from: extract_competitor_data.py (aggregate_content_classifications)
└── exports: CLI tool (no module exports)

Usage Flow:
┌───────────────────────────────────────────────────────────────┐
│ WHISPER-ONLY PIPELINE                                         │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│ WHISPER_ONLY=true python rumiai_ml_batch.py \                │
│   --client test --target @creator --analysis-type competitor  │
│                                                               │
│     ↓ (runs Stage 1, Stage 2 WHISPER-ONLY, Stage 2.5-2.7)    │
│                                                               │
│ python extract_transcript_analysis.py \                       │
│   --client test --target @creator --mode top --strategy contrastive │
│                                                               │
│     ↓ (outputs {creator}_transcript_analysis.xlsx)            │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

---

## 8. Data Flow After Implementation

```
┌─────────────────────────────────────────────────────────────────────────┐
│ NEW: WHISPER-ONLY FLOW                                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Stage 1: Video Discovery (30-60s)                                      │
│     └── Scrape TikTok → Select videos → Download                        │
│                                                                         │
│  Stage 2: WHISPER-ONLY Processing (~3-5s per video)                     │
│     └── WHISPER_ONLY=true                                               │
│     └── Run ONLY Whisper.cpp transcription                              │
│     └── Output: {video_id}_whisper.json                                 │
│     └── SKIP: YOLO, MediaPipe, OCR, Scene, Audio, FEAT, DeepFace       │
│                                                                         │
│  Stage 2.5: File Organization                                           │
│     └── Move whisper files (gracefully skips missing temporal_windows)  │
│                                                                         │
│  Stage 2.5.1: Transcript Validation                                     │
│     └── Filter music/noise transcripts → transcript_validation_cache    │
│                                                                         │
│  Stage 2.6: Content Discovery (LLM)                                     │
│     └── Claude Sonnet discovers 7 taxonomy categories                   │
│     └── Manual curation (~15 min) → {target}_taxonomy.json              │
│                                                                         │
│  Stage 2.7: Content Classification (LLM)                                │
│     └── Claude Haiku classifies videos using taxonomy                   │
│     └── Output: {video_id}_content.json (15 fields per video)          │
│                                                                         │
│  SKIP: Stages 3-7 (no ML features to aggregate/train)                   │
│                                                                         │
│  Stage 8-LITE: extract_transcript_analysis.py                           │
│     └── Aggregate content classifications                               │
│     └── Output: {target}_transcript_analysis.xlsx (~80 rows)           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

Speed Comparison:
┌──────────────────┬────────────────┬─────────────────┐
│ Stage            │ Full Pipeline  │ Whisper-Only    │
├──────────────────┼────────────────┼─────────────────┤
│ Stage 2 per video│ 60-80s         │ 3-5s            │
│ Stages 3-7       │ ~30 min        │ SKIPPED         │
│ Stage 8 report   │ ~15s           │ ~3s             │
├──────────────────┼────────────────┼─────────────────┤
│ TOTAL (100 videos)│ ~2.5 hours    │ ~15 minutes     │
└──────────────────┴────────────────┴─────────────────┘
```

---

## 9. Database/Schema Requirements

#### Tables Used

| Table | Columns | Usage |
|-------|---------|-------|
| N/A | N/A | This feature uses JSON file storage, not database |

#### Schema Changes Required?
- [x] No - existing schema supports this feature (file-based storage only)

#### Multi-Tenant Considerations

| Query | client_id Filter Required | Verified |
|-------|---------------------------|----------|
| File path construction | Yes - `{client_id}` in path | [x] Verified |
| Content aggregation | Yes - scoped to client directory | [x] Verified |

All paths are scoped by `client_id`:
```
/data/clients/{client_id}/competitors/{target}/{mode}_{strategy}/
```

---

## 10. API Contract Changes

#### New/Modified Endpoints

| Endpoint | Change Type | Before | After |
|----------|-------------|--------|-------|
| N/A | N/A | N/A | CLI tools only - no REST API changes |

#### Breaking Changes?
- [x] No - additive changes only

The `WHISPER_ONLY` env var defaults to `false`, preserving existing behavior. The new extraction script is entirely additive.

---

## 11. Performance Considerations

#### Expected Load

| Metric | Full Pipeline | Whisper-Only | Acceptable? |
|--------|--------------|--------------|-------------|
| Stage 2 per video | 60-80s | 3-5s | Yes (15-20x improvement) |
| Records processed | 120 videos | 120 videos | Yes |
| Query complexity | O(n) | O(n) | Yes |
| Frequency | Per analysis run | Per analysis run | Yes |
| Memory usage | ~500MB (FEAT) | ~100MB | Yes |

#### Optimization Needed?
- [x] No - acceptable for MVP

The primary optimization IS this feature - reducing Stage 2 processing from 60-80s to 3-5s per video.

---

## 12. Alternative Solutions Considered

### Option A: CLI Flag `--whisper-only` on orchestrator
- **Description:** Add `--whisper-only` flag to `rumiai_ml_batch.py` that propagates to VideoAnalyzer
- **Pros:** Explicit user intent, discoverable via `--help`
- **Cons:** Requires modifying orchestrator, argparse changes, 15-20% higher implementation risk
- **Verdict:** ❌ Rejected - environment variable is simpler and safer

### Option B: Environment Variable `WHISPER_ONLY=true` (Selected)
- **Description:** Check env var in `video_analyzer.py`, default to full pipeline
- **Pros:** ~10 lines of code, zero production risk (default=false), works with existing CLI
- **Cons:** Less discoverable than CLI flag
- **Verdict:** ✅ Selected - minimal change, maximum safety

### Option C: New Orchestrator Script `rumiai_whisper_only.py`
- **Description:** Completely separate orchestrator for Whisper-only flow
- **Pros:** Zero risk to existing code
- **Cons:** Code duplication, maintenance burden, doesn't reuse proven Stage logic
- **Verdict:** ❌ Rejected - too much duplication

---

## 13. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Env var accidentally set in production | Low | Medium | Default is `false`; only activates when explicitly set |
| Stage 2.5 fails on missing temporal_windows | Low | Low | Already verified: Stage 2.5 logs warning and continues |
| Stage 2.6/2.7 fails without other ML data | Low | Low | Verified: only needs Whisper transcripts |
| New extraction script has bugs | Medium | Low | Reuses proven `aggregate_content_classifications()` logic |

---

## 14. Testing Strategy

#### Unit Tests

**File:** `tests/test_whisper_only_mode.py`
```python
# SPECIFICATION - TO BE IMPLEMENTED
import os
import pytest

def test_whisper_only_env_var_disabled():
    """When WHISPER_ONLY not set, all services run."""
    os.environ.pop('WHISPER_ONLY', None)
    # Mock VideoAnalyzer and verify all 9 services called
    assert True  # Placeholder

def test_whisper_only_env_var_enabled():
    """When WHISPER_ONLY=true, only Whisper runs."""
    os.environ['WHISPER_ONLY'] = 'true'
    # Mock VideoAnalyzer and verify only whisper called
    assert True  # Placeholder

def test_whisper_only_case_insensitive():
    """WHISPER_ONLY should be case-insensitive."""
    os.environ['WHISPER_ONLY'] = 'TRUE'
    # Verify works
    os.environ['WHISPER_ONLY'] = 'True'
    # Verify works
    assert True  # Placeholder
```

#### Integration Tests

```python
# SPECIFICATION - TO BE IMPLEMENTED
def test_extract_transcript_analysis_end_to_end():
    """Test full extraction from existing Stage 2.7 outputs."""
    # Use existing yainafashion data
    result = extract_transcript_analysis(
        client_id='statesidegrowers',
        target='@yainafashion',
        mode='top',
        strategy='contrastive',
        analysis_type='competitor'
    )

    assert len(result) > 50  # Should have ~80 rows
    assert 'CONTENT_CATEGORY_1' in result['Field Name'].values
    assert 'HOOK_STRATEGY_1' in result['Field Name'].values
```

#### Manual Verification Steps

1. [ ] Set `WHISPER_ONLY=true` and run Stage 2 on a test video
2. [ ] Verify only `{video_id}_whisper.json` created (no temporal_windows)
3. [ ] Verify Stage 2.5 completes with warnings (not errors)
4. [ ] Run full Whisper-only flow through Stage 2.7
5. [ ] Run `extract_transcript_analysis.py` on existing yainafashion data
6. [ ] Compare output to rows 50-132 of existing `yainafashion_analysis_data.xlsx`

---

## 15. Implementation Checklist

### Pre-Implementation
- [x] Read and understand all source documents referenced
- [x] Verify existing code matches "Current State" section
- [ ] Confirm no conflicting changes in progress

### Implementation Steps
- [ ] **Step 1:** Modify VideoAnalyzer for Whisper-only mode
  - File: `rumiai_v2/processors/video_analyzer.py`
  - Action: MODIFY - Add `WHISPER_ONLY` env var check (~10 lines)

- [ ] **Step 2:** Create new extraction script
  - File: `extract_transcript_analysis.py`
  - Action: CREATE - New ~350-line script

- [ ] **Step 3:** Test Whisper-only mode
  - Action: Run `WHISPER_ONLY=true python rumiai_ml_batch.py ...` on test data
  - Verify: Only Whisper output created

- [ ] **Step 4:** Test extraction script
  - Action: Run `python extract_transcript_analysis.py --client statesidegrowers --target @yainafashion --mode top --strategy contrastive`
  - Verify: Excel output matches expected rows

### Post-Implementation
- [ ] Run type checker (`mypy` if configured)
- [ ] Run existing tests
- [ ] Run build
- [ ] Manual verification (all steps above)
- [ ] Update documentation

---

## 16. Definition of Done

- [ ] `WHISPER_ONLY` env var implemented in `video_analyzer.py`
- [ ] `extract_transcript_analysis.py` created and functional
- [ ] Whisper-only flow tested end-to-end
- [ ] New extraction script tested on existing data
- [ ] Output Excel matches expected structure (~80 rows)
- [ ] No regressions in existing full pipeline (default behavior)
- [ ] Type checker passes (if applicable)
- [ ] Build completes
- [ ] Manual verification completed
- [ ] This document status updated to "Implemented"

---

## 17. Source Documents Reference

| Document | Relevant Sections | Purpose |
|----------|-------------------|---------|
| PRODUCTION_FLOW.md | Pipeline Architecture, Stage Dependencies | Understanding 8-stage pipeline flow |
| STAGE_1_IMPL.md | Video Discovery Output Schema | Understanding `selected_videos.json` structure |
| STAGE_2_IMPL.md | ML Service Architecture, Whisper Output Path | Understanding modular service design |
| STAGE_2.6_2.7_IMPL.md | Content Discovery/Classification Dependencies | Confirming transcript-only requirements |
| STAGE_8_IMPL.md | Report 3 Excel Structure (Section 7.5), `aggregate_content_classifications()` | Understanding report format and aggregation logic |
| extract_competitor_data.py | Lines 167-250 | Source for `aggregate_content_classifications()` function |
| video_analyzer.py | `analyze_video()` method | Where to add Whisper-only check |
| file_organizer.py | `execute_file_moves()` | Graceful handling of missing files |
| yainafashion_analysis_data.xlsx | Rows 50-132 | Reference output format |

---

**Document Version:** 1.0
**Last Updated:** 2025-12-24
**Author:** Claude Code
**Status:** Analysis Complete | Implementation Ready

---

# Implementation Readiness Checklist

Before marking complete, verified:

- [x] **Type clearly identified** as Feature Gap (not Bug)
- [x] **Section 6 header** includes "SPECIFICATION FOR NEW CODE" note
- [x] **All new code blocks** marked as "TO BE IMPLEMENTED"
- [x] Project context explains the system to an outsider
- [x] Current state shows what EXISTS (not what's broken)
- [x] Proposed solution is complete specification for new code
- [x] Multi-tenant (client_id) filtering addressed
- [x] API contract changes documented (N/A - CLI only)
- [x] Performance considerations addressed
- [x] External auditor could implement from this document alone
