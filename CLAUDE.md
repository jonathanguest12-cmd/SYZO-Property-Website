# SYZO Codebase Review Guidelines for Greptile

## Who is building this

Solo non-technical founder using Claude Code as the primary build tool. 
There is no engineering team. All code is AI-generated. This means:
- Review for logic correctness and security with extra scrutiny — the builder cannot self-verify
- Flag anything that looks like AI overreach (modifying files outside scope, unexpected deletions, scope creep)
- Prioritise clear, plain-English explanations in findings — no jargon

---

## The systems being built

### SYZO Parrot
Tenant acquisition and property management platform for a UK shared living company (Plymouth, Newquay, South West expansion).

**Stack:** Next.js 16 + React 19 + Tailwind v4 + Supabase + n8n + Unipile + Playwright on Hetzner VPS (89.167.127.188). Frontend deployed on Vercel.

**Key components:**
- SpareRoom automation: Playwright scraper with Decodo ISP residential proxy (isp.decodo.com:10001). Email-triggered architecture — NOT polling. Authenticates directly via proxy, no cookie injection
- n8n workflows on Hetzner handling: COHO sync, WhatsApp via Unipile, tenant screening, maintenance routing
- Tenant screening form (Next.js on Vercel) with scoring model: RED/AMBER/GREEN tiers based on income, employment, pets, smoking, stay length, adverse credit, guarantor
- Viewing calendar with travel-time-based day suppression (NOT location count based) and atomic slot claiming via single UPDATE with RETURNING
- WhatsApp AI (Verity persona) scoped strictly to single tenant before LLM invocation — output must be PII filtered
- Supabase: ropaatqbzctqxzfyrgop.supabase.co — uses session pooler (NOT direct connection, IPv6 incompatible)

**Critical rules for Parrot review:**
- Never use direct Supabase connection string — always session pooler
- Playwright must always route through Decodo proxy — never direct requests to SpareRoom
- WhatsApp AI queries must be scoped to a single tenant before hitting the LLM
- No SELECT * on PII tables — always explicit column selection
- Screening scores must be saved to Supabase regardless of tier result
- Verity persona must never reveal scoring logic, flags, or reasons to tenants

### SYZO Scout
HMO landlord intelligence CRM. Identifies motivated HMO sellers before they list publicly.

**Stack:** TypeScript monorepo at /root/apps/acquisition-crm (GitHub: jonathanguest12-cmd/SYZO-Scout). Supabase backend. Next.js CRM on Vercel.

**Data sources:** SpareRoom behavioural signals + Land Registry CCOD bulk data + Companies House bulk SIC 68209 + Bristol HMO register

**Pipeline:** 5-tier entity resolution → 11-step enrichment → 0-100 motivated seller score (SCORE_MAX=97, normalised)

**Phase status:** Phase 3A complete (39+ tests passing, zero TypeScript errors). Phase 3B in progress — Bristol HMO register import underway.

**Critical rules for Scout review:**
- Score must always normalise to 0-100 range
- Entity resolution must follow 5-tier hierarchy — no shortcuts
- Land Registry CCOD API requires two-step auth: GET dataset endpoint first to get current filename, then download
- Companies House API key must come from environment variables — never hardcoded
- Pipeline results must be idempotent — running twice on same data must not create duplicate records

### SYZO Property Website
Marketing/listings site. Next.js 16 + React 19 + Tailwind v4 + Supabase. Live at syzo-property-website.vercel.app (GitHub: jonathanguest12-cmd/SYZO-Property-Website).

**Critical rules:**
- All Next.js Image components must use optimisation enabled — never `unoptimized={true}`
- Images served from COHO CDN (d19qeljo1i8r7y.cloudfront.net) — remotePatterns must include this domain
- `sizes` prop must match actual rendered container width — mismatch causes blurriness
- ISR caching must be configured — no static pages without revalidation

---

## Security rules (apply to all repos)

These are non-negotiable. Flag any violation as CRITICAL severity:

- No hardcoded API keys, tokens, or credentials anywhere in code
- No secrets committed to git — all must be in environment variables
- Supabase interactions must use parameterised queries — no string interpolation in SQL
- n8n webhook endpoints must validate the incoming payload before processing
- No direct Postgres master/service key usage in application code — scoped roles only
- Audit log table is INSERT-only — flag any UPDATE or DELETE on audit_log
- PII query results must never be logged to console or written to files
- GDPR retention: financial data 6 years, right-to-rent docs 2 years — flag any hardcoded deletion logic that doesn't match these
- WhatsApp/Unipile credentials must never appear in workflow JSON exports

---

## Infrastructure context

- **Hetzner VPS:** 89.167.127.188 — runs n8n (Docker) and PM2 processes
- **Supabase:** ropaatqbzctqxzfyrgop.supabase.co — session pooler only, port 5432, user format postgres.zkphqxxgvhibnqosfmzl
- **Vercel:** deploys automatically from main branch on GitHub push
- **GitHub org:** jonathanguest12-cmd
- **n8n:** self-hosted, not cloud — no n8n cloud assumptions

---

## Git and deployment rules

- All work happens on feature branches — never directly on main
- Main branch = production. Anything merged to main deploys to Vercel immediately
- Flag any PR that modifies more than one unrelated system in a single commit
- Flag any PR that touches .env files or adds environment variable handling without a corresponding .env.example update

---

## Code quality standards

- TypeScript: zero errors required before merge — flag any `any` types or type suppressions
- All new API routes must have error handling — flag missing try/catch on external API calls
- Supabase queries must handle null results — flag unguarded `.data` access
- n8n workflow changes should be accompanied by a comment in the PR describing what the workflow does and what changed
- Playwright scripts must handle authentication failure gracefully — no silent failures
- Test coverage: new scoring logic, entity resolution, and enrichment functions must have tests

---

## What to flag as CRITICAL

- Hardcoded credentials or API keys
- SQL injection vectors
- Missing error handling on Supabase/external API calls
- Any code that could expose tenant PII in logs or responses
- Modifications to audit_log that aren't INSERT-only
- Direct Supabase connection string usage (must use session pooler)
- SpareRoom requests not routed through Decodo proxy
- Score normalisation logic that could produce values outside 0-100
- Deletion of n8n workflow JSON files
- `unoptimized={true}` on Next.js Image components in production

## What to flag as WARNING

- Missing `sizes` prop on Next.js Image components
- `any` TypeScript types
- Console.log statements containing user data
- Hardcoded URLs that should be environment variables
- Missing revalidation on ISR pages
- Functions over 100 lines without clear separation of concerns
- Duplicate logic across files that should be shared utilities
