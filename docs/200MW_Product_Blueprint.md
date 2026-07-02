# 200 MAGIC WORDS — PRODUCT BLUEPRINT
## The Million-Dollar Feature Architecture
### For the Claude Project knowledge base — informs the build spec

---

# PART 1 — THE STRATEGIC FOUNDATION

## Why kids' edtech products hit $100M+ (Lexia $792M, Epic $500M, BrainPOP $875M)

Every successful product in this category wins by building **three interlocking loops**, not one:

| Loop | Who | What drives it | What it produces |
|------|-----|---------------|------------------|
| **Child Loop** | Ages 4–8 | Daily habit: play → progress → celebration → return | Engagement data + genuine learning |
| **Parent Loop** | The buyer | Visible proof of progress → emotional payoff → pride | Revenue + word-of-mouth |
| **Educator Loop** | Distribution | Free classroom value → school adoption → district contracts | Scale + credibility + home conversions |

Most indie apps build only the Child Loop and die. Duolingo's genius was the Child Loop mechanics; Lexia's $792M exit was the Educator Loop; Epic's growth was the Parent Loop (share moments). **200 Magic Words builds all three, with AI as the connective tissue** — and has something none of them have: Dr. Marion Blank's MLC pedagogy as the scientific spine.

## The unfair advantages to protect at all costs
1. **The 200-word curriculum** — finite, complete, mastery-based. Duolingo is endless (exhausting); ours has a *summit*. "My child knows all 200 words" is a completable, braggable achievement.
2. **Content + function word pairing** — Dr. Blank's insight that no competitor implements. Function words are where struggling readers break; we teach them in context from day one.
3. **Nova the Comet Spark** — an ownable character in an ownable world (Candy Galaxy). Light-being = unique reward mechanics (trails, glows, auras).
4. **Errorless learning scaffolding** — the MLC principle that mistakes are prevented, not punished. This directly shapes our mechanics (NO hearts/lives system).

---

# PART 2 — THE CHILD EXPERIENCE (Loop 1)

## 2.1 Onboarding: "The Placement Adventure"
Never call it a test. The child's first 5 minutes is a **story**: Nova has lost her star-map and needs the child's help finding which stars are already lit. Each "help Nova" moment is an adaptive placement item (word recognition → sentence context → optional oral reading). Output: child lands in the exact right unit, parent gets a baseline report, and the child's first experience was *rescuing a character*, not being assessed.

**UI:** fullscreen immersive, zero chrome, Nova center stage, one interaction per screen, voiceover narration throughout (pre-readers can't read instructions — EVERYTHING speaks).

## 2.2 The Core Learning Loop (per word)
Follows MLC's four interaction types, wrapped in the 10 activity types:

| # | Activity | MLC Function | Duration |
|---|----------|--------------|----------|
| 1 | Magic Video | Introduce in context | 45 sec |
| 2 | Tap & Hear | Sound-symbol connection | 30 sec |
| 3 | Word Hunt | Recognition in scene | 60 sec |
| 4 | Fill the Story | Context completion | 45 sec |
| 5 | Word Builder | Morphology (+ing, +ed) | 60 sec |
| 6 | Draw It | Semantic encoding | 90 sec |
| 7 | Word Song | Auditory memory | 20 sec |
| 8 | Match & Sort | Discrimination | 60 sec |
| 9 | Story Time | Connected text | 90 sec |
| 10 | Quiz Boss | Unit mastery gate | 2 min |

A daily session = **Today's Quest** = 5 of these, AI-selected, ~5 minutes total. Short by design: the session should END while the child still wants more (Sesame Street principle — leave them wanting).

## 2.3 The Reward Economy ("Sparks")
- **Sparks (💎)** earned ONLY through learning actions. Never purchasable. Ever.
- Sparks buy **Nova customizations**: trail colors (rainbow, ice, fire, galaxy swirl), glow auras, sparkle patterns, and "flight tricks" (loop-de-loop celebration moves)
- **Word-Stars (⭐)**: each mastered word permanently lights a star in the child's constellation. The constellation is the trophy room — 200 stars = the completed galaxy
- **Trophies**: unit boss defeats, streak milestones, speed achievements — displayed on the Trophy Shelf

## 2.4 The Star Keeper Mechanic (spaced repetition disguised as care)
This is the killer retention mechanic nobody else has: **mastered stars slowly dim over time** (SM-2 spaced repetition intervals). Nova alerts the child: *"Oh no — your 'jump' star is getting sleepy! Can you wake it up?"* A 30-second review re-lights it to full brightness.

Why this is brilliant: it converts the *chore* of review into a *care ritual* (like Tamagotchi). The child isn't drilling flashcards — they're keeping their galaxy alive. Reviews happen exactly on the forgetting curve, which is when they're most pedagogically valuable.

## 2.5 Streaks — the kind-hearted version
- Daily streak with flame counter, celebrated at 3/7/14/30/50/100 days with full-screen Nova celebrations
- **Streak Shield**: EARNED (complete a full week) not bought. Protects one missed day automatically. Removes the anxiety that makes Duolingo streaks feel toxic for adults — unacceptable for 5-year-olds
- Weekend grace: streaks pause Sat/Sun by parent toggle (family schedules are real)

## 2.6 Nova as Growth Mirror
Nova's brightness is tied to the child's total mastery. At 0 words Nova is a small dim spark; at 200 words Nova is a radiant blazing comet. **The child literally powers Nova by learning.** Unit completions trigger visible Nova "level ups" (bigger glow, new idle animations). This makes the relationship reciprocal — Nova helps the child learn, the child makes Nova shine.

## 2.7 Celebration Architecture (the moments that make kids scream with joy)
Rank-ordered investment priority — these ARE the product feel:
1. **Correct answer**: instant particle burst + sound + Nova reaction (0.6s, never blocks flow)
2. **Word mastered**: star ignition sequence — the word flies up into the constellation and ignites (2s)
3. **Quest complete**: Nova loop-de-loop + sparks rain + tally (3s)
4. **Unit boss defeated**: full-screen takeover — trophy forge animation, confetti, fanfare (5s, skippable)
5. **Streak milestone**: Nova brings "friends" (background sprites) to celebrate (4s)
6. Wrong answer: NO red X, NO buzzer. Nova gently: "Hmm, let's look again!" + the correct answer glows softly (errorless learning — the child is redirected, never punished)

---

# PART 3 — THE AI ENGAGEMENT SYSTEM (the retention brain)

Six AI systems, each mapped to a retention problem:

## 3.1 The Story Engine ⭐ (the killer feature)
**AI-generated personalized decodable stories starring THE CHILD** — using ONLY words they've mastered plus the current target word. "Emma and her dog run to the big park." Their name, their pet, their interests (collected via onboarding + Nova conversations), their known vocabulary.

- New personalized story every Friday = **appointment content** ("Story Day!")
- Stories are readable BY the child (that's the point — 100% decodable for them specifically)
- Parents get the story too — the child reads it aloud to them (home literacy moment + proof of progress)
- Technical: Claude generates against a hard vocabulary constraint list; template-scaffolded; human-reviewed sentence patterns; pre-moderated themes only
- This feature alone justifies the subscription. No competitor can do it without the mastery-tracking foundation we have.

## 3.2 The Memory Layer
Nova remembers: child's interests, pet names, favorite color, birthday. References them in encouragements ("You love dinosaurs — 'big' is a DINOSAUR word!"). Personalization compounds over time — switching apps means losing the friend who knows you. Stored as structured profile fields (COPPA: parent-consented, minimal, deletable).

## 3.3 The Difficulty Governor
Target: 75–85% success rate (the "flow channel"). Below 75% → easier activity types, more scaffolding, re-introduce prerequisites. Above 85% → introduce next word early, harder activity variants. Implements MLC errorless learning as an algorithm. Runs per-session, invisible.

## 3.4 The Frustration Detector
Signals: answer latency spikes, rapid random tapping, error clustering, session abandonment mid-activity. Response: switch activity type (drawing/song after two struggles), shorten the quest, Nova empathy moment. Goal: never let a child end a session feeling defeated.

## 3.5 The Re-engagement Brain
Lapse day 1: push notification, Nova-voiced ("Your 'run' star misses you!"). Day 3: personalized — references their specific constellation. Day 7: parent email with a one-tap "2-minute session" link + a story cliffhanger ("Emma's new story is waiting — it has a rocket in it 🚀"). All copy AI-personalized from actual progress data. Frequency-capped, parent-controllable.

## 3.6 Parent & Teacher AI Writers
- **Weekly Parent Digest**: plain-language insight ("Emma mastered 6 words this week. She's strongest with action words; 'they' and 'with' need practice. Try the dinner cards below.")
- **Dinner Table Cards**: 3 AI-generated conversation prompts using this week's words — extends learning into family life with zero screens. Deeply aligned with Dr. Blank's language-through-conversation philosophy. Printable.
- **Teacher Copilot**: generates small-group plans from class mastery data ("These 4 students all struggle with function words in Unit 7 — here's a 10-minute group activity"), at-risk narratives, and parent-conference talking points.

## AI Safety Rules (non-negotiable)
- NO open-ended chat between child and AI. Ever. All Nova "conversation" is constrained templates + generated slots from moderated lists
- All generated child content passes vocabulary + theme constraints; stories use pre-approved narrative skeletons
- COPPA: no child PII to AI providers; profile fields parent-consented; full deletion on request
- Parents can view every AI-generated artifact their child received

---

# PART 4 — THE PARENT PORTAL (Loop 2 — the buyer)

Design principle: **the parent visit is 30 seconds, weekly.** Every screen answers "is this working?" instantly.

## 4.1 Dashboard (landing)
- **This Week hero**: words mastered, streak, minutes — three numbers, huge type
- **AI Insight card**: the weekly digest, one paragraph
- **Magic Moments feed** (below) — the emotional core

## 4.2 Magic Moments ⭐ (the viral engine)
An auto-generated feed of shareable proof: audio clips of the child reading a story aloud, their Draw It artwork, star-ignition replays, milestone certificates. Each moment has a one-tap share (beautiful branded frame: "Emma just read her 50th Magic Word! ✨").

This is the Parent Loop flywheel: proof → pride → share → new parents see it → sign up. Epic and Prodigy grew on exactly this. Every share is an ad written by a proud parent.

## 4.3 The full parent feature set
- **Mastery Map**: all 200 words as a heat-mapped constellation (tap any word → history, audio of child saying it)
- **Multi-child profiles** (Family plan: 4) with a switcher
- **Time controls**: daily session limits, bedtime lockout, weekend rules — parents TRUST apps that offer limits; it signals we're not engagement-farming their kid
- **Dinner Table Cards** (weekly, printable)
- **Printable Practice Packs**: AI-built worksheets from the child's specific weak words
- **Milestone Certificates**: designed to be fridge-worthy; print + share
- **Grown-Up Gate** on the child app: hold-3-seconds + simple math (COPPA/App Store standard)
- **Benchmark framing**: progress shown vs "typical path," always growth-framed, never alarming
- **Dr. Marion's Corner**: 60-second parenting-for-literacy reads and videos — builds authority, deepens trust, differentiates on pedagogy
- Subscription management, referral center

---

# PART 5 — THE EDUCATOR PORTAL (Loop 3 — distribution)

Design principle: **teachers get triage, not data.** The dashboard answers "who needs me today?" in 10 seconds.

## 5.1 Teacher features
- **Class roster** with per-student: current unit, mastery %, streak, trend arrow, at-risk flag
- **At-risk detection** (AI): declining mastery trend, disengagement patterns — flagged BEFORE it shows in classroom behavior, with a suggested intervention
- **Assignment Builder**: assign units/words to class, group, or individual; assignments appear in the child's Today's Quest
- **Live Classroom Mode**: projector + student devices, synchronized word games (the Kahoot mechanic) — this feature alone drives teacher word-of-mouth
- **Class Challenges**: collective goals ("Class earns 500 stars → unlocks the class story episode") — cooperative, not competitive
- **Standards Reporting**: Common Core RF.K–RF.2 alignment, printable for admin
- **Teacher Copilot** (AI): small-group plans, parent-conference notes
- **Printable centers**: offline activities from the same curriculum
- **SSO**: Clever + ClassLink (non-negotiable for school adoption)

## 5.2 THE conversion playbook (school → home revenue)
This is the Lexia/Prodigy model and it's the whole Educator Loop's economic purpose:
1. Teacher gets Classroom tier (cheap or free trial) → 25 kids use it at school
2. Teacher sends home **parent access codes** (one tap, built into the portal)
3. Parent downloads app, sees their child's SCHOOL progress → immediate investment
4. Home usage limited on school license → **Family upgrade prompt at the moment of highest intent**
5. Every classroom = 25 warm parent leads. CAC ≈ $0.

## 5.3 Admin/District tier (Phase 4)
Multi-school dashboard, license management, roster sync, aggregate analytics by grade, xAPI/Caliper export to district data warehouses, PD module, custom branding.

---

# PART 6 — INVITES & VIRAL LOOPS (the growth machine)

| Loop | Mechanic | Why it works |
|------|----------|-------------|
| **Parent → Parent** | Magic Moments shares + referral (give a month, get a month) | Pride is the strongest share motivation that exists |
| **Child → Child** | **Star Buddies**: invite a friend (via parents), see each other's constellations, co-op weekly goal ("together, light 20 stars"). NO chat, NO messaging — progress visibility only (COPPA-safe) | Kids evangelize to friends; parents approve because it's cooperative and safe |
| **Teacher → Parent** | Access codes home (the conversion playbook above) | Zero-CAC warm leads at scale |
| **Teacher → Teacher** | Shareable class-results one-pager + free Classroom trial referral | Teachers' lounges are the best edtech marketing channel ever |
| **Grandparent → Family** ⭐ | **Cheer Squad**: read-only invite for grandparents/relatives. They see Magic Moments, get milestone notifications, can send back sticker reactions ("Grandma sent you a star! 🌟"). AND they can gift subscriptions | Nobody in the category does this. Grandparents are the #1 buyers of children's gift subscriptions, and the emotional payload (hearing your grandkid read) is enormous |

Gift subscriptions get first-class treatment: beautiful gift flow, printable gift certificate, holiday campaigns.

---

# PART 7 — UI/UX ARCHITECTURE

## 7.1 Child App (mobile-first, the Candy Galaxy world)
**Navigation: 4 tabs, bottom pill nav** (from Mockup D)
- 🏠 **Home** — hero card, Today's Quest, quick-resume
- 🎮 **Play** — the active lesson flow (fullscreen, chrome-free during activities)
- 🌌 **Galaxy** — the scroll-driven path + constellation (the trophy room)
- 🧑‍🤝‍🧑 **Grown-Ups** — gated (hold + math), routes to parent portal

**Non-negotiable child-UX rules:**
- **Audio-first**: every interactive element speaks on tap; no reading required to navigate (they can't read yet — that's the point of the app)
- **64px minimum touch targets** (small motor skills), one-thumb reachable primary actions
- **One decision per screen** during activities; zero dead ends; back is always safe
- **3-tap maximum** from open → learning
- **Interruption-proof**: mid-activity state persists through app switches, calls, tablet handoffs
- **Motion discipline**: springy micro-animations (200–400ms) for feedback; celebrations are the ONLY long animations; `prefers-reduced-motion` respected
- **Accessibility**: OpenDyslexic toggle, high-contrast mode, switch-access compatible, captions on all video, WCAG 2.1 AA contrast even in candy palette

## 7.2 Parent Portal
Separate authenticated surface (web + in-app behind the gate). Calm design language — same brand family, dialed-down saturation, more whitespace (parents need to feel the *credible education company*, not the candy). Dashboard-first, 30-second visit optimized, PDF-export everywhere.

## 7.3 Teacher Portal
**Web-first** (teachers live on laptops/Chromebooks). Dense-but-scannable: roster table with visual trend sparklines, triage flags on top, bulk actions. Print stylesheets for everything (schools still print).

## 7.4 Design System (locked from Mockup D)
- **Palette**: Sky `#5B4BD6` → Night `#2B2080` gradient world; Sun `#FFC531`; Mint `#3EE0B8`; Bubble `#FF6FA5`; Tangerine `#FF8A4C`; Cloud white cards; Ink `#2A2160`
- **Type**: Baloo 2 (display, 600–800) + Quicksand (body, 500–700)
- **Signature elements**: chunky 3D-shadow buttons (`0 8px 0 rgba(0,0,0,.16)`) that physically depress; tilted cloud cards; scroll-driven golden path; Nova riding the path; parallax blobs + starfield
- **Component library**: Pill, ChunkyButton, CloudCard, WordNode, PathSVG, NovaSprite, SparkCounter, TrophyCard, WordBubble, QuestTile, CelebrationOverlay

## 7.5 Tech Architecture (v2 — fixing v1's lessons)
- **Componentized from day 1** (no 1,500-line App.jsx): `/components`, `/screens`, `/hooks`, `/lib`
- **Design tokens file** (`tokens.js`) — one file restyles the app
- **All 200 words seeded in Supabase** (words table: word, type, unit, order, emoji, audio_url, image_url) — adding content never touches code
- **State**: Zustand (light, simple); TanStack Query for server state
- **Animation**: Motion (Framer Motion) + canvas-confetti + Lottie for celebrations
- **Audio**: Web Speech API v1 → ElevenLabs pre-generated MP3s in Cloudflare R2 v2
- **AI**: existing Vercel serverless proxy pattern, extended with the six AI systems
- **Assets**: Higgsfield renders (Nova poses, backgrounds), Kenney CC0 (particles, SFX, badges), LottieFiles (celebrations)

---

# PART 8 — MONETIZATION (final)

| Tier | Price | Contents |
|------|-------|----------|
| **Free** | $0 | Units 1–5, 1 profile, core activities, parent lite dashboard |
| **Family** | $9.99/mo · $79/yr | All 30 units, 4 profiles, Story Engine, Magic Moments, Dinner Cards, printables, Cheer Squad |
| **Classroom** | $4.99/student/yr | Teacher portal, assignments, Live Mode, SSO, parent codes |
| **School/District** | Custom | Admin portal, analytics, SIS export, PD, branding |
| **Gift** | $79/yr | Gift flow + certificate (grandparent channel) |

**Trust rules (the brand IS trust):** no ads ever, no consumable purchases, no pay-to-win, Sparks never purchasable, upgrade prompts shown to GROWN-UPS only (never dark-pattern a child), free tier genuinely useful forever.

**The upgrade moment**: triggered when a child masters 20+ words (peak parent-belief moment) — shown in the parent portal, framed as "Emma is thriving — unlock her full galaxy."

---

# PART 9 — WHAT WE DELIBERATELY DO NOT BUILD

Million-dollar products are defined by their "no" list:
- ❌ Open-ended AI chat with children (safety, scope, trust)
- ❌ Social feeds, comments, or child-to-child messaging (COPPA nightmare, zero learning value)
- ❌ Hearts/lives/punishment mechanics (violates errorless learning)
- ❌ Purchasable currency or loot-box mechanics (destroys parent trust permanently)
- ❌ A 3D world / metaverse (scope death; the 2.5D scroll galaxy IS the world)
- ❌ Every-subject expansion before literacy is won (200 Magic Numbers waits until Year 2)
- ❌ User-generated content (moderation cost, brand risk)

---

# PART 10 — PHASED BUILD ROADMAP

## Phase 1 — The Child Loop (Weeks 1–4) → validates fun
Candy Galaxy shell (Mockup D as home), scroll path + Nova travel, 5 core activity types, Sparks + streaks + Star Keeper v1 (fixed intervals), celebration architecture, all 200 words in Supabase, auth + profiles, Web Speech audio, parent lite (mastery map + time controls)

## Phase 2 — The Parent Loop (Weeks 5–8) → validates revenue
Story Engine v1, remaining 5 activity types, full parent portal + Magic Moments, weekly AI digest + Dinner Cards, Stripe + Family tier + gift flow, referral loop, ElevenLabs audio, speech scoring v1

## Phase 3 — The Educator Loop (Months 3–4) → validates distribution
Teacher portal + roster + assignments, at-risk AI, Live Classroom Mode, parent access codes (the conversion playbook), Star Buddies, Cheer Squad, class challenges

## Phase 4 — The Institution Layer (Months 5–6) → validates scale
Clever/ClassLink SSO, admin/district portal, standards reporting, xAPI export, PD module

**North-star metrics per phase**: P1 = D7 child retention ≥ 40% · P2 = free→paid ≥ 5%, ≥1 Magic Moment shared per family/month · P3 = ≥30% of classroom parents activate home codes · P4 = first district contract

---

*Blueprint v1.0 — feeds directly into the technical build spec. All features trace to one of the three loops; anything that doesn't is cut.*
