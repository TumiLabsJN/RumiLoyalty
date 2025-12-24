# Affiliate Commerce A/B Testing - Literature Synthesis

## READING PROTOCOL FOR THIS DOCUMENT

### Purpose
This document captures insights from Chinese social commerce research to inform A/B testing methodology for TikTok Shop affiliate commerce in the US.

### How to Read Source PDFs

1. **Read the ENTIRE PDF** — every page, every word, every image
2. **For images/figures/tables**: Describe what you see and extract any data points
3. **For Chinese terms**: Keep original characters for methodology names (e.g., 人货场), provide English explanation
4. **Do not skim** — large PDFs may contain critical insights in appendices, footnotes, or figure captions

### How to Add a Source Entry

For each PDF, write TWO sections:

**Section 1: What This Source Teaches Us**
- Be granular — capture specific mechanisms, numbers, frameworks
- Use bullet points or sub-headers to organize
- Include: frameworks introduced, empirical findings, case study details, methodology used by researchers
- If something surprised you or contradicts prior sources, flag it explicitly

**Section 2: Test Implications**
- Concrete and actionable: "We should test [X] because this source shows [Y]"
- One implication per bullet
- Can reference specific findings from Section 1

### After Adding a Source
Update the **Living Synthesis** section at the bottom:
- Add new mechanisms to the inventory
- Note any contradictions with prior sources
- Revise framework thinking if needed

---

## RECOVERY INSTRUCTIONS (For Mid-Stream Compaction)

If you're a fresh LLM instance picking this up mid-workflow:

### Context
We are processing a large research document broken into 8 chunks. The user will tell you which chunk you're on (e.g., "chunk 4/8").

### Your Task
1. **Read this entire file first** — understand what's already been documented
2. **Check the Living Synthesis** — see accumulated mechanisms and test candidates
3. **Receive the next chunk** from user
4. **Document it as a new Source entry** following the format in "How to Add a Source Entry" above
5. **Update Living Synthesis** after adding the source
6. **After every 3 chunks**, pause for context check before continuing

### State Tracking
- Sources already documented = progress made
- Living Synthesis = accumulated knowledge
- Next source number = count existing sources + 1

### Quick Resume
User says: "We are at chunk X/8, here is chunk Y"
You do: Read chunk → Add as Source [N] → Update Living Synthesis → Confirm completion

---

## Source 1: 社交媒体营销对电子商务品牌推广的影响及策略研究 (The Impact and Strategies of Social Media Marketing on E-Commerce Brand Promotion)
**File:** chinatrends.pdf
**Pages:** 7
**Author:** Wang Qianqian (王倩倩), Yangzhou University
**Published:** April 2025, Hanspub E-Commerce Letters
**Platform Focus:** Xiaohongshu (小红书)
**Read date:** 2025-12-24

### What This Source Teaches Us

#### Core Thesis
Social media marketing has fundamentally shifted e-commerce from "search-based purchasing" (搜索式购买) to "content-driven consumption" (内容驱动消费). The paper proposes a "Content + Social + Technology" (内容 + 社交 + 技术) three-in-one framework.

#### User Behavior Reconstruction
- Traditional model: consumers passive, receiving brand messages
- Social commerce model: consumers actively participate via UGC
- The "种草–拔草" (seeding-harvesting) closed loop: users create content that "plants seeds" of desire, other users "harvest" by purchasing
- Interaction behaviors (comments, likes, saves) strengthen both user-to-user connection AND brand identity
- Brands can monitor which products get mentioned frequently in user notes and adjust strategy in real-time

#### KOL vs KOC Dynamics (Critical for Creator Segmentation)
**KOL (关键意见领袖 - Key Opinion Leaders):**
- Large follower base, strong influence
- Function: brand exposure and image shaping
- Higher reach, but potentially lower trust per impression

**KOC (关键意见消费者 - Key Opinion Consumers):**
- Smaller following but domain expertise
- More relatable to ordinary consumers ("接地气")
- Real experience sharing reduces purchase decision risk
- Word-of-mouth propagation more authentic

**Tiered collaboration model (分层合作模式):**
- Head (头部) KOLs: brand awareness
- Waist (腰部) KOCs: trust and conversion
- Multi-level, multi-dimensional brand information transmission

#### Data-Driven Precision Marketing
- AI algorithms analyze: browsing history, search records, purchase behavior
- "Smart recommendation" (智能推荐) personalizes content and product exposure
- Brands use platform data to:
  - Identify consumer needs and preferences
  - Track market trends and competitive dynamics
  - Evaluate campaign effectiveness via exposure, clicks, conversion rates
  - Adjust strategy based on data feedback

#### Content Ecosystem: UGC + PGC Synergy
- **UGC (User Generated Content):** Travel diaries, food reviews, beauty tutorials, fashion styling — authentic, relatable
- **PGC (Professional Generated Content):** Brand product reviews, expert knowledge sharing — authoritative, trustworthy
- Together they create a diversified content matrix serving different user segments

#### Format Innovation: Short Video + Livestream
- Short video: concise, easy to spread, captures attention quickly
- Livestream: real-time interaction, enhances participation and immersion, drives sales conversion
- Creative livestream activities: product launches, KOL live selling

#### One-Stop Shopping Loop (一站式购物闭环)
- Content pages directly embed purchase links
- Shortens the path from "seeding" to "harvesting"
- Optimizations: simplified payment, fast logistics

#### Challenges Identified
1. **Content homogenization (内容同质化):**
   - Creators copy successful templates to avoid risk and gain quick traffic
   - Platform algorithms over-promote hot topics, creating feedback loops
   - Brand collaboration content becomes standardized, limiting creativity
   - User fatigue from repetitive content

2. **Counterfeit goods and trust crisis:**
   - Complex supply chains (brand direct, third-party merchants)
   - Rapid expansion makes full supply chain monitoring difficult
   - Information asymmetry — consumers can't easily verify authenticity
   - Trust damage is hard to repair

#### Recommended Solutions (from paper)
- Innovation incentive mechanisms: funds for original content, creative contests, traffic rewards
- Diversified algorithm evaluation: include content innovation and user feedback depth, not just engagement
- Supply chain strengthening: supplier qualification review, quality testing standards, compliance checks
- Blockchain traceability for product authenticity
- Transparent product information: detailed descriptions, user reviews, third-party testing reports
- Zero tolerance for counterfeits with public disclosure of violations

### Test Implications

- **We should test KOL vs KOC performance separately** because this source shows they serve different functions (awareness vs conversion) — treating all creators equally in tests conflates two distinct mechanisms

- **We should test creator tier (head/waist/tail) as a primary variable** because the tiered collaboration model suggests different ROI profiles at each level

- **We should test content format (short video vs livestream)** because this source indicates they have different engagement and conversion dynamics

- **We should measure "种草" (seeding) and "拔草" (harvesting) as separate metrics** because the closed loop has two distinct phases — content engagement ≠ purchase conversion

- **We should consider content freshness/originality as a variable** because homogenization causes user fatigue — testing whether novel content formats outperform templated approaches

- **We should flag trust risk on creators** because counterfeit/authenticity concerns can damage brand even if short-term metrics look good

---

# LIVING SYNTHESIS

*Updated after each source. Do not defer to the end.*

## Mechanism Inventory
| Mechanism | Source(s) | Notes |
|-----------|-----------|-------|
| 种草–拔草 (Seeding-Harvesting) loop | Source 1 | Content creates desire → purchase fulfills it. Two-phase funnel. |
| KOL vs KOC differentiation | Source 1 | Different trust/reach profiles. Not interchangeable. |
| Tiered creator collaboration (头部/腰部) | Source 1 | Head for awareness, waist for conversion |
| UGC + PGC synergy | Source 1 | Authenticity + authority together |
| Content homogenization risk | Source 1 | Algorithm + creator incentives cause sameness |
| One-stop shopping loop | Source 1 | Embedded purchase links shorten conversion path |
| 内容 + 社交 + 技术 framework | Source 1 | Content + Social + Technology — operational trinity |

## Contradictions / Tensions
*None yet — first source*

## Framework Evolution
- The 人货场 + Incentives framework is not explicitly used in this source
- This source uses "内容 + 社交 + 技术" (Content + Social + Technology) instead
- These may be complementary lenses:
  - 人货场 = what you're optimizing (person, product, context)
  - 内容+社交+技术 = how you're operating (content creation, social distribution, tech enablement)
- Need to watch if subsequent sources use 人货场 explicitly or propose other frameworks

## Priority Test Candidates
1. **KOL vs KOC conversion rates** — high confidence this matters based on Source 1
2. **Creator tier segmentation** — head/waist/tail performance differences
3. **Content format tests** — short video vs livestream impact on conversion
4. **Content novelty vs template adherence** — does originality outperform copying?

---

*Next source to add: [pending]*
