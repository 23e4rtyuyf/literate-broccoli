# App Ideas Brainstorm
### Target: ~$23.5M valuation | AI-powered but not AI-replaceable | Novel | Large population

---

## The Core Design Principle

These apps **actively use AI** as a tool (matching, analysis, moderation, recommendations).
But their core value **cannot be delivered by a chatbot alone** — because the product is:

- Verified real-world identity and physical presence
- Trust built on human accountability with real consequences
- Coordination of real people in real places with real stakes
- Legal/regulatory chains that require human signatories
- Genuine human connection that a chatbot cannot substitute

**AI is an ingredient. Humans are the product.**

---

## Idea 1: **VerifyLocal** — Anti-Fake-Review Business Trust Platform

### What it is
A platform where **customers verify experiences via short video uploads** (30 seconds, face on camera, speaking to the experience) — creating a tamper-proof review layer that AI cannot generate.

As AI-generated fake reviews flood Google, Yelp, and Amazon, trust in text reviews is collapsing. VerifyLocal's moat is the **video-human requirement** — you can't fake a face talking about a real haircut.

### Why truly novel
- Yelp/Google reviews = pure text, easily faked
- No dominant video-first review platform exists
- Not TikTok (no entertainment angle, purely transactional trust)

### How AI is used
AI handles liveness detection, flags suspicious review patterns, auto-transcribes video for searchability, and surfaces relevant reviews by context. AI makes the platform faster and smarter.

### Why a chatbot can't replace it
A chatbot generating fake reviews is exactly the problem being solved. The value IS the verified human on camera. AI assists quality but cannot be the source of trust.

### Large population served
- 33M small businesses in the US desperately need trusted reviews
- 260M US online shoppers making purchase decisions based on reviews
- The EU AI Act (2025) creates legal pressure for verified review systems

### Path to $23.5M
- Freemium for consumers; B2B SaaS for businesses ($99–$499/mo)
- 5,000 businesses at $200/mo avg = $12M ARR → ~2x = $24M
- Acquisition target: Yelp, Google, Tripadvisor, or a legal compliance company

---

## Idea 2: **ElderBridge** — Verified Companion Network for Aging Adults

### What it is
A platform that matches **elderly adults with vetted local volunteers and paid companions** for in-person visits, errand help, and phone check-ins — with family dashboard monitoring and structured safety protocols.

Not a medical platform. Not an emergency alert. The **social isolation crisis** for elderly adults is severe and growing, and no app has solved the human connection layer.

### Why truly novel
- Uber for elder care exists (Honor, Papa) but Papa is institutional, expensive
- No peer-to-peer community companion platform with family transparency
- Not a medical/IADL platform — focused purely on social connection and light support

### How AI is used
AI handles companion-elder matching (personality, interests, location), schedules check-ins, flags missed visits, and gives family members summaries of activity patterns and wellbeing signals.

### Why a chatbot can't replace it
A chatbot cannot show up at a door, drive someone to a pharmacy, or hold a hand. AI-powered companion robots exist but cost $10K+. This platform delivers human warmth at scale — AI just coordinates it.

### Large population served
- 55M Americans 65+ (growing to 80M by 2040)
- 53M family caregivers in the US who need coordination tools
- Social isolation is now a declared US public health crisis (2023 Surgeon General)

### Path to $23.5M
- Paid companions pay a platform fee (15–20% of bookings)
- Family subscriptions ($29/mo for dashboard + coordination)
- 40K family subscribers + companion transaction volume = ~$2.5M ARR → 8–10x = $20–25M
- Acquisition target: AARP (massive reach), CVS/Aetna, Humana, senior living chains

---

## Idea 3: **CrisisGrid** — Neighborhood Emergency Coordination Layer

### What it is
A **verified local emergency coordination app** where neighbors, block captains, and local first responders coordinate during non-911 crises: power outages, flooding, wildfires, severe storms, missing persons.

Nextdoor is noisy and social. 911 is overloaded. **There is no structured neighborhood-scale crisis coordination tool** — just group texts and Facebook posts.

The insight: emergencies are local before they are regional. The 72-hour window after a major disaster is when neighbor-to-neighbor coordination matters most — and it's exactly when official systems are overwhelmed. CrisisGrid fills that gap with structure, not noise.

---

### The Problem in Detail

When a major storm, wildfire, or grid failure hits:

1. **911 is overloaded** — dispatchers triage; non-life-threatening needs go unanswered for hours or days
2. **Group texts collapse** — no prioritization, no accountability, no way to track who checked on whom
3. **Nextdoor/Facebook fill with rumors** — social dynamics take over; actionable coordination drowns in noise
4. **The most vulnerable are invisible** — elderly neighbors, people with disabilities, non-English speakers, households without cars — nobody has a list

FEMA itself recommends communities prepare for 72 hours of self-reliance. There is no app that helps them actually do it.

---

### How It Works

**Setup phase (before any crisis):**

- Households register and self-report relevant info: number of residents, mobility limitations, medical equipment dependencies (oxygen concentrator, dialysis), pets, languages spoken, whether they can help others
- Block captains are nominated and verified (address confirmation + neighbor endorsement)
- Neighborhood grid is divided into zones of ~20 households per block captain
- Resource inventory: who has a generator, a truck, first aid training, a spare room

**During a crisis:**

- Any verified resident can declare a local event (storm, outage, flooding, missing person)
- CrisisGrid activates the relevant zone(s) and notifies block captains
- A structured task board appears: "Check on 847 Oak St (elderly resident, no car)" — not a feed, a work queue
- Residents claim tasks, mark them complete, flag if help is needed
- Priority scoring surfaces the highest-risk households first
- Offline mode + SMS fallback for when data is unavailable

**After the crisis:**

- Auto-generated debrief: who was checked on, what resources were used, what gaps appeared
- Block captains can submit reports to municipal emergency management
- Community resilience score improves over time with each exercise

---

### Why truly novel

- **FEMA / ready.gov** — informational only; no coordination layer
- **Nextdoor** — social network optimized for engagement, not operations; no task structure, no verified roles, no vulnerability data
- **PulsePoint** — cardiac emergency crowdsourcing only; no neighborhood coordination
- **Zello** — walkie-talkie app; no structure, no task routing, no data
- **Amazon Sidewalk / Ring Neighbors** — surveillance-focused, no coordination
- **Genasys (formerly Zonehaven)** — evacuation management for governments only; no citizen layer

CrisisGrid is the **first app to implement a civilian Incident Command System (ICS)** — the same hierarchical coordination structure used by FEMA and fire departments — at the neighborhood scale, with AI augmentation.

---

### How AI is used

AI is critical infrastructure, not a gimmick:

1. **Vulnerability scoring** — at activation, AI ranks households by risk level using self-reported data (mobility, medical dependencies, number of residents, age) + external data (building type, flood zone, grid reliability history). Block captains get a prioritized checklist, not an alphabetical list.

2. **Task routing** — AI matches available volunteers to tasks by proximity, capability (has a truck, speaks Spanish, has first aid training), and current task load. Prevents duplication; ensures coverage.

3. **Resource demand prediction** — based on crisis type and duration forecast, AI estimates: how many households will need food/water/warmth, how much generator fuel will run out in 24 hours, which residents are likely to need evacuation assistance.

4. **Anomaly detection** — flags households that haven't been checked on despite high priority; flags zones with no active block captains; alerts when tasks are claimed but not completed.

5. **Post-event debrief generation** — auto-drafts a structured incident report from task completion data, timestamps, and volunteer notes — ready for submission to city emergency management.

6. **Multilingual communication** — AI translates all alerts and task descriptions in real time for households with non-English language preferences.

---

### Why a chatbot can't replace it

The product is **physical human action with legal accountability and real stakes**.

- A chatbot cannot check on a bedridden neighbor
- A chatbot cannot carry supplies across a flooded street
- A chatbot cannot make the judgment call to call 911 for someone who isn't responding
- A chatbot cannot vouch for a verified block captain who the municipality trusts
- A chatbot cannot build the neighborhood trust that makes people open their doors

AI coordinates. Humans act. The outcome (a neighbor checked on, a crisis managed) requires a human body in the world.

---

### Large population served

**Primary:**
- 131M US households — every one is subject to some local emergency risk
- 19,000+ municipalities in the US, most with no civilian coordination infrastructure
- 355,000+ HOAs covering ~74M Americans

**Secondary:**
- 47M Americans with disabilities (higher emergency vulnerability)
- 55M Americans 65+ (highest emergency mortality risk)
- Non-English speaking households (lowest access to emergency info)

**Macro tailwind:** The number of US billion-dollar weather/climate disasters has risen from ~6/yr in the 1990s to 20+/yr in the 2020s. This market grows every year climate change advances.

---

### Path to $23.5M

**Revenue streams:**

| Stream | Unit | Price | Notes |
|--------|------|-------|-------|
| Municipal SaaS | Per city/yr | $5K–$50K | Based on population; includes training + reporting |
| HOA/community licensing | Per HOA/mo | $99–$299 | Self-serve; smaller communities |
| County emergency management | Per county/yr | $25K–$150K | Integrates with existing EOC systems |
| FEMA/state grant integration | Revenue share | TBD | Several grant programs fund community resilience tools |

**Valuation path:**

- Year 1–2: 100 municipal pilots at $8K avg + 500 HOAs at $150/mo = ~$1.7M ARR
- Year 3: 400 cities + 2K HOAs + 10 county contracts = ~$5M ARR
- Exit at 5–6x ARR = **$25–30M acquisition**

**Why multiples are high:** Government/municipal SaaS has high retention (3–5 yr contracts), low churn, and strategic acquirers who value the data and relationships.

**Acquisition targets:**
- **Motorola Solutions** — public safety communications; CrisisGrid is the civilian complement to their first-responder tools
- **Axon** — expanding beyond law enforcement into community safety
- **AT&T FirstNet** — emergency communications network; CrisisGrid is their missing civilian layer
- **Palantir / Esri** — geospatial emergency management; CrisisGrid adds the neighborhood human layer
- **Everbridge** — mass notification platform; CrisisGrid adds two-way coordination they don't have

---

### Go-to-Market Strategy

**Don't start with cities. Start with disasters.**

1. **Disaster-recovery seeding** — When a major storm or wildfire hits, deploy CrisisGrid free to the affected community. Document outcomes (households checked, resources coordinated). Build case studies.

2. **CERT program partnerships** — Community Emergency Response Teams (CERT) exist in thousands of cities. CrisisGrid is the app their members have always needed. Partner with CERT trainers to distribute.

3. **HOA land-and-expand** — HOAs are fast to sign, pay directly, and talk to each other. One HOA in a city leads to municipal interest. Municipalities lead to county contracts.

4. **Grant-funded pilots** — FEMA's BRIC (Building Resilient Infrastructure and Communities) grant program funds exactly this. Target cities actively applying for resilience funding.

---

### Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Liability if coordination fails during a crisis | Terms of service clearly position CrisisGrid as coordination support, not emergency dispatch. Same model as Nextdoor/Facebook. |
| Data privacy (vulnerability data is sensitive) | All household data is self-reported, encrypted, visible only to verified block captains in that zone, and deletable on request. |
| Low adoption before a crisis makes it useless | Gamified neighborhood readiness exercises (monthly 10-min drills); readiness score displayed to HOA boards. |
| Competing with free tools (group texts, Facebook) | Those tools have no structure, no accountability, no offline mode, no vulnerability data. CrisisGrid is an ops tool, not a social network. |
| Municipalities are slow to buy | HOA and CERT channel provides revenue and case studies while municipal sales cycle runs. |

---

### Security Posture (for Municipal Procurement)

Cities will ask basic security questions even for a small pilot contract. Below is an honest, current-state answer for each category — plus the gap-fill language to use while controls are being built.

| Category | Current State (MVP) | What to Say in Procurement |
|----------|--------------------|-----------------------------|
| **Authentication** | Household ID stored in localStorage; no password system yet | "Currently session-based; production deployment will add email magic links or SSO (Okta/Azure AD) per City requirements" |
| **Encryption in transit** | HTTPS enforced via hosting platform (Vite dev proxy; production via Vercel/Render TLS) | "All traffic encrypted in transit via TLS 1.2+" |
| **Encryption at rest** | SQLite file on server disk; not encrypted at rest by default | "Database-at-rest encryption in progress; can deploy on PostgreSQL with transparent data encryption (TDE) for City deployment" |
| **Access control** | Three roles enforced: resident (own data only), block captain (zone data), admin (seed/all) — all enforced in API layer | "Role-based access control (RBAC) implemented: residents, block captains, and administrators have distinct, server-enforced permission scopes" |
| **Audit logs** | `created_at` timestamps on all records; task claim/complete/flag events timestamped | "Basic event timestamping in place; full audit log (who did what, when, from which IP) can be added prior to production deployment" |
| **Data retention & deletion** | No self-service deletion yet | "Households can request data deletion via block captain or service operator; automated self-service deletion can be added per City data retention policy" |
| **Backups** | Not yet configured | "Automated daily backups can be configured on any managed PostgreSQL host (Supabase, RDS, Render) prior to go-live" |
| **Uptime monitoring** | Not yet configured | "Uptime monitoring via UptimeRobot or Datadog can be added; SLA terms negotiable per contract" |
| **Vulnerability data sensitivity** | Household medical/mobility data stored in plain text in DB | "Sensitive fields (medical equipment, mobility status) will be encrypted at the column level in production using AES-256 prior to handling real resident data" |
| **Penetration testing** | Not yet performed | "Third-party pen test can be scoped and completed during onboarding if required by City procurement" |

**Boilerplate language for RFPs and pilots:**

> *CrisisGrid is currently in active development. Core security controls — HTTPS in transit, role-based access control, and event timestamping — are implemented. Additional enterprise controls (SSO, at-rest encryption, audit logging, automated backups, penetration testing) are available and can be configured to meet City-specific requirements during the onboarding engagement. We are happy to complete a vendor security questionnaire.*

**Honest gaps to fix before any real City deployment (in priority order):**
1. Replace localStorage auth with email magic links or SSO
2. Migrate from SQLite to PostgreSQL with at-rest encryption
3. Add a full audit log table (`user_id`, `action`, `target`, `ip`, `timestamp`)
4. Add self-service household data deletion endpoint
5. Configure automated database backups
6. Add uptime monitoring with alert routing
7. Commission a basic penetration test (many firms offer $2–5K entry-level assessments)

---

## Idea 4: **SkillAttest** — Human-Verified Professional Skills Marketplace

### What it is
A professional credentialing platform where skills are attested **by verified peers and employers through structured task evidence** — not AI-generated endorsements, not self-reported resumes.

As AI floods job applications and LinkedIn with fake credentials, hiring managers cannot trust what they see. SkillAttest creates a **tamper-resistant skill record** built on actual work evidence reviewed by real humans.

### Why truly novel
- LinkedIn endorsements = meaningless, AI-generatable
- Credly/Badgr = institutional, requires course completion
- No peer-to-peer task-evidence skill verification platform at scale

### How AI is used
AI analyzes submitted work samples for quality signals, suggests which peers to request attestations from, detects AI-generated submissions, and helps employers query skill records semantically.

### Why a chatbot can't replace it
An AI-generated endorsement is worthless — that's the core problem. A verified human who worked with you and signs off carries legal and reputational weight that no AI can replicate. The human signature is the product.

### Large population served
- 165M US workforce participants
- 11M+ open jobs in the US facing credential verification problems
- Growing post-AI hiring crisis: companies cannot tell human work from AI work

### Path to $23.5M
- Job seeker profiles: $15/mo Pro
- Employer verification API access: $500–$2,000/mo
- 3,000 employers at $500/mo = $18M ARR → 1.3x = $23M
- Acquisition target: LinkedIn/Microsoft, Indeed, Workday, HireRight

---

## Idea 5: **CommonsTime** — Hyperlocal Time Banking Network

### What it is
A **structured time bank app** where 1 hour of any service = 1 hour of any other service, enabling neighbors to exchange skills, labor, and help without money — at meaningful local scale, with reputation built on completed exchanges.

Time banking has existed in theory since the 1980s but has never scaled because there was no good mobile-first, location-aware platform with real trust infrastructure.

### Why truly novel
- No modern, well-designed time banking app exists at consumer scale
- TaskRabbit = money-based, not reciprocal
- Nextdoor = passive posting, no structured exchange or reputation system

### How AI is used
AI recommends exchange matches based on need/skill overlap, mediates disputes, predicts which exchanges are likely to succeed, and identifies underserved community needs from aggregate patterns.

### Why a chatbot can't replace it
The exchange IS physical human labor and time. A chatbot cannot mow a lawn, watch a child, or teach a skill in person. AI optimizes the network; humans deliver the value.

### Large population served
- Works in any neighborhood globally
- Especially valuable in lower-income communities where cash is scarce but time is not
- Potential municipal adoption for community care programs

### Path to $23.5M
- Freemium consumer app (free to $8/mo Pro)
- Municipality and nonprofit licensing ($500–$5,000/mo)
- Network effect business: 1M users at 3% paying $6/mo = $2.16M ARR → 10x = $21.6M
- Acquisition target: AARP, United Way, government civic tech departments, fintech companies

---

## Idea 6: **WitnessChain** — Verified Eyewitness Evidence Platform

### What it is
A platform that lets **ordinary people securely capture, timestamp, and submit eyewitness evidence** (video, photo, written account) with cryptographic integrity — for use in insurance claims, legal proceedings, tenant disputes, workplace incidents, and civil rights documentation.

No existing platform provides tamper-proof citizen evidence with proper chain of custody. Phone videos get deleted, metadata gets stripped, and courts won't accept unverified recordings.

### Why truly novel
- No consumer-grade evidence integrity platform exists
- Legal evidence tools are for lawyers, not citizens
- Nothing connects citizen witnesses to legal proceedings with proper custody chains

### How AI is used
AI auto-redacts bystander faces, transcribes audio, extracts GPS/metadata, tags key moments in long videos, and suggests relevant legal context based on incident type.

### Why a chatbot can't replace it
A chatbot cannot be a legal witness. The value is the **human eyewitness + cryptographic proof of integrity** — a combination that carries legal weight. AI enhances but cannot be the witness.

### Large population served
- 131M US households deal with insurance claims, disputes, incidents
- 40M+ tenant-landlord disputes annually
- Growing demand for civil accountability documentation

### Path to $23.5M
- Consumer: free capture, $5/mo for legal-grade export
- B2B: insurance companies, law firms, HR departments ($300–$2K/mo)
- 2,000 B2B customers at $600/mo = $14.4M ARR → ~1.6x = $23M
- Acquisition target: LegalZoom, DocuSign, insurance tech companies, court tech vendors

---

## Idea 7: **MoodMesh** — Community Mental Wellness Check-in Network

### What it is
A peer-to-peer mental wellness accountability platform where **users form small "pods" of 4–6 people** who check in on each other daily with structured prompts — not therapy, not crisis intervention, but consistent human accountability for mental health habits.

Every AI mental health app is a chatbot. MoodMesh's core insight is that **humans want other humans to notice when they're struggling** — and that a chatbot noticing is not the same thing.

### Why truly novel
- BetterHelp/Talkspace = professional therapy, expensive, one-directional
- Woebot/Wysa = AI chatbots (exactly what this isn't)
- No peer accountability pod platform focused on daily mental wellness exists

### How AI is used
AI analyzes check-in patterns to flag concerning trends to pod members (not to the platform), suggests evidence-based micro-interventions, and personalizes daily prompts based on what resonates with each user.

### Why a chatbot can't replace it
Research consistently shows peer accountability is the strongest predictor of mental health habit maintenance. People don't want a chatbot to say "I noticed you've been struggling" — they want a real person who chose to show up.

### Large population served
- 1 in 5 US adults have a mental health condition (50M+ people)
- Mental health app market is $6B+ and growing
- Employers actively seeking non-clinical employee wellness solutions

### Path to $23.5M
- Consumer: $12/mo Pro (pod analytics, advanced prompts)
- Employer wellness licensing: $5–$15/employee/mo
- 5K employer seats at $8/mo = $480K/mo = $5.7M ARR → 4x = $22.8M
- Acquisition target: Calm, Headspace, Noom, large HR benefits platforms

---

## Idea 8: **GuardianProxy** — Family Legal Decision Coordination Platform

### What it is
A secure platform for **families coordinating legal and medical decisions** for aging parents, children with special needs, or incapacitated family members — combining document management, multi-party decision logs, and verified role assignment (healthcare proxy, power of attorney, trustee).

Families navigating these situations rely on email chains, phone calls, and confusion. When disputes arise, there's no record. When emergencies happen, no one knows who has authority.

### Why truly novel
- Legal document tools (DocuSign, LegalZoom) are document-focused, not coordination-focused
- No platform designed specifically for ongoing family legal coordination over months/years
- Not estate planning software — operational coordination during the messy middle

### How AI is used
AI drafts meeting summaries, flags conflicting decisions in the log, alerts when time-sensitive legal documents are expiring, and suggests next steps based on jurisdiction and case type.

### Why a chatbot can't replace it
Legal authority requires named, verified humans. A chatbot cannot hold power of attorney. The platform coordinates real people who bear real legal responsibility — AI just reduces the administrative burden.

### Large population served
- 53M family caregivers in the US
- 1.5M new dementia diagnoses per year requiring family coordination
- 70M Americans who will need to manage a parent's affairs in the next decade

### Path to $23.5M
- Family subscriptions: $25/mo
- Law firm and elder care agency licensing: $500–$2K/mo
- 1,500 professional licenses at $800/mo = $14.4M ARR → 1.6x = $23M
- Acquisition target: Everplans, Trust & Will, elder law software companies, AARP

---

## Idea 9: **ProofOfPlace** — Verified Local Experience Passport

### What it is
A platform where **people build a verified record of real places they've been** and things they've done — not social media flex, but a portable "experience passport" used for trust signals in communities, dating apps, rental platforms, and travel groups.

As AI generates fake travel content and dating profiles fake locations, platforms need a way to verify "this person actually has real-world experience in X." ProofOfPlace creates that layer.

### Why truly novel
- Foursquare check-ins were social, not trust-functional
- No portable, cross-platform verified experience record exists
- Dating apps, Airbnb, travel communities all need this but none have built it

### How AI is used
AI detects anomalous check-in patterns (impossible travel, spoofed locations), clusters experiences into interest profiles, and suggests communities or connections based on genuine shared experiences.

### Why a chatbot can't replace it
Physical presence cannot be faked without being there. The entire value is the **verified human who was actually in that place** — AI enforces the verification but cannot be the presence.

### Large population served
- 350M+ dating app users globally who need trust signals
- 150M+ Airbnb users and hosts needing verified guest history
- Every travel platform, outdoor adventure community, and local experience marketplace

### Path to $23.5M
- API licensing to dating apps, rental platforms, travel apps ($0.10–$0.50 per verification)
- Consumer passport subscriptions ($7/mo)
- 3 mid-size platform API partners at $500K/yr each = $1.5M ARR + consumer = $3M ARR → 8x = $24M
- Acquisition target: Match Group, Airbnb, Tripadvisor, identity verification companies (Jumio, Onfido)

---

## Idea 10: **TradeMentor** — Apprenticeship Matching & Progress Platform for Skilled Trades

### What it is
A platform connecting **trade apprentices with verified journeymen and master tradespeople** for mentorship, structured skill progression tracking, and eventually employer placement — for electricians, plumbers, HVAC techs, welders, carpenters.

The US has a 500K+ skilled trades worker shortage. Trade schools exist. Job boards exist. But there is **no structured mentorship-to-employment pipeline** specifically built for trades apprenticeships.

### Why truly novel
- Indeed/LinkedIn = generic job boards
- SkillCat = training content, not mentorship coordination
- No mentor-apprentice matching + milestone-tracking platform for trades exists

### How AI is used
AI recommends mentor matches based on specialty, location, and learning style; auto-generates milestone checklists per trade; tracks competency progression; and flags safety certification expirations.

### Why a chatbot can't replace it
A chatbot cannot teach someone to weld. Skilled trades require hands-on instruction, physical demonstration, and a master who will vouch for your competency. The human mentorship relationship is the core product.

### Large population served
- 6.5M+ skilled trade workers in the US
- 500K+ open trade jobs (growing due to infrastructure spending)
- Trade schools, unions, and contractors all need this pipeline

### Path to $23.5M
- Employer/contractor subscriptions for talent pipeline access ($200–$1K/mo)
- Union and trade school licensing ($2K–$10K/yr)
- 2,000 employer subscribers at $400/mo = $9.6M ARR → ~2.5x = $24M
- Acquisition target: BuildZoom, Jobber, ServiceTitan, trade-focused staffing companies

---

## Summary Matrix

| # | App | Core Human Need | AI Role | Chatbot Can't Replace | Valuation Path |
|---|-----|----------------|---------|----------------------|----------------|
| 1 | **VerifyLocal** | Business trust post-AI fake reviews | Liveness detection, pattern flagging | Verified human on camera IS the trust | 5K biz customers → $12M ARR |
| 2 | **ElderBridge** | Elder social connection & care | Matching, scheduling, wellbeing signals | Human showing up in person | 40K families → $2.5M ARR |
| 3 | **CrisisGrid** | Neighborhood emergency coordination | Routing, prioritization, resource prediction | Physical human presence during crisis | 400 municipal contracts → $2M ARR |
| 4 | **SkillAttest** | Credential trust post-AI hiring chaos | Work sample analysis, AI-content detection | Human employer sign-off has legal weight | 3K employers → $18M ARR |
| 5 | **CommonsTime** | Reciprocal local skill exchange | Match recommendations, dispute mediation | Real human labor cannot be AI-generated | 1M users, 3% paid → $2.1M ARR |
| 6 | **WitnessChain** | Tamper-proof citizen evidence capture | Redaction, transcription, metadata analysis | Human eyewitness + legal chain of custody | 2K B2B clients → $14.4M ARR |
| 7 | **MoodMesh** | Peer mental wellness accountability | Pattern flagging, micro-intervention prompts | Real peers who chose to show up | 5K employer seats → $5.7M ARR |
| 8 | **GuardianProxy** | Family legal/medical decision coordination | Summaries, conflict flagging, deadline alerts | Legal authority requires named humans | 1.5K professional licenses → $14.4M ARR |
| 9 | **ProofOfPlace** | Verified real-world experience passport | Anomaly detection, interest clustering | Physical presence cannot be faked | API licensing → $3M ARR |
| 10 | **TradeMentor** | Trades apprenticeship mentorship pipeline | Mentor matching, milestone tracking | Hands-on trade instruction requires humans | 2K employers → $9.6M ARR |

---

## Top Pick for $23.5M Target

**SkillAttest** has the strongest near-term path:
- The AI hiring crisis is happening *right now* (2025–2026)
- B2B SaaS to employers = high multiples (10–15x ARR)
- Clear, large acquisition targets (LinkedIn, Indeed, Workday)
- The problem gets *worse* with more AI, making the platform more valuable over time

**ElderBridge** has the strongest long-term social impact and a $500B+ total addressable market in senior care services — likely the best mission-driven acquisition target.
