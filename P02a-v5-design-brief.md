# P02a v5 — SYZO Property Website: Premium Design Pass
# Working directory: ~/Documents/SYZO/syzo-property-website
# Start a FRESH claude session, paste this entire brief.

---

## Skills to Load

Load these skills at the start:
- `high-end-visual-design` — from Taste Skill, premium design execution
- `redesign-existing-projects` — from Taste Skill, redesign methodology
- `web-design-guidelines` — from Vercel, web design best practices
- `elite-frontend-ux` — premium frontend patterns
- `frontend-design` — distinctive design execution

---

## Context

This is an EXISTING Next.js 16 project at ~/Documents/SYZO/syzo-property-website. It's deployed at https://syzo-property-website.vercel.app. GitHub: jonathanguest12-cmd/SYZO-Property-Website.

The site is a tenant-facing property rental website for SYZO — a premium HMO property management company in Plymouth and Newquay. Tenants browse rooms, view details, and (eventually) apply to rent.

The site WORKS functionally but the design is poor. It looks AI-generated — flat, generic, no personality. We've been through 4 design iterations and it's still not right.

---

## THE REFERENCE: syzo.co

The main SYZO website is at https://www.syzo.co — built on Squarespace. It looks GOOD. Professional photography, clean sections, premium feel.

**YOUR FIRST TASK** before writing any code:

1. Use Playwright MCP to screenshot https://www.syzo.co (homepage, /rooms page, /properties page)
2. Use Playwright MCP to screenshot https://syzo-property-website.vercel.app (homepage, a room detail page)
3. Compare the two side by side. Identify EVERY visual difference:
   - Typography (fonts, weights, sizes, spacing)
   - Colour palette (backgrounds, text, accents, borders)
   - Photo treatment (sizing, aspect ratios, overlays, corners)
   - Card/section styling (borders, shadows, padding, spacing)
   - Header/footer design
   - Overall "feel" — what makes syzo.co feel premium and our site feel generic?
4. Write down your findings before touching any code.

The goal is: **a user should not be able to tell that syzo.co and our property site were built by different teams.** Same brand DNA, same quality bar, same aesthetic.

---

## Current Tech Stack

- Next.js 16, React 19, App Router, TypeScript
- Tailwind v4
- Supabase (anon key, RLS) — data fetching works, don't change it
- Fonts currently: Plus Jakarta Sans (body) + Instrument Serif (display)
- Deployed on Vercel

---

## Known Problems With Current Design

### 1. Overall aesthetic is flat and generic
- Looks like a Tailwind template, not a premium brand
- No visual depth, no texture, no atmosphere
- Cards are boring — basic white rectangles
- Typography hierarchy is weak
- Colours are lifeless

### 2. Room cards don't sell rooms
- Photos are sometimes blurry (small images stretched)
- Card layout is cramped
- Amenity tags look like afterthoughts
- "View Room →" text link at bottom is weak
- No visual hierarchy within the card

### 3. Room detail page is a mess
- "About this room" is still a wall of text
- The structured cards (Letting Details, etc.) don't look premium
- Photo gallery takes up too much vertical space
- The sticky CTA card on the right is basic
- No visual connection to the SYZO brand

### 4. Header/footer feel disconnected from syzo.co
- Current header has a scroll-reveal effect that feels janky
- Footer is plain text, no warmth
- Neither matches the syzo.co header/footer

### 5. Browse page has no brand presence
- Hero section exists but doesn't match syzo.co's style
- Filters look functional but not polished
- Results grid spacing is unrefined

---

## Design Approach

**DO NOT just apply Tailwind utilities randomly.** Follow this process:

1. **Screenshot syzo.co** — understand the exact visual language
2. **Extract the design system** — colours, typography, spacing, border radius, shadows from the reference site
3. **Apply that system** consistently across every component
4. **Screenshot your changes** — compare to syzo.co after each major component change
5. **Iterate** — if a component doesn't match the reference quality, fix it before moving on

### Visual Verification Loop

After changing EACH major component (header, cards, room detail page, footer):
1. Run the dev server (`npm run dev`)
2. Screenshot the page with Playwright
3. Compare to the equivalent section on syzo.co
4. If it doesn't match the quality bar → iterate
5. If it does → move to next component

---

## Specific Requirements

### Typography
- Study what fonts syzo.co uses. Match them or find equivalents.
- If syzo.co uses a clean sans-serif, use the same one — don't force a serif display font if it doesn't match the brand.
- Make sure font weights, sizes, and line-heights match the reference.

### Colours
- Extract the EXACT colour palette from syzo.co screenshots.
- Match backgrounds, text colours, accent colours, border colours.
- The SYZO logo is white on dark charcoal (#2D3038 or similar). Use this as the primary dark colour.

### Cards
- Look at how syzo.co displays property/room information. Match that card style.
- Proper spacing, clean borders (or no borders if the reference doesn't use them), appropriate shadows.

### Photos
- Card photos should have a MAX HEIGHT of 200px with `object-cover` to prevent stretching
- Use `quality={85}` and proper `sizes` attribute on all Next.js Image components
- Rooms with no photos: show a clean gradient placeholder, not empty space
- Skip exterior drawing images (first property photo is usually an illustration — use second photo)

### Room Detail Page
- Structure as clean, separate cards:
  - **Letting Details card**: Rent, bills, available from, room type, deposit — each as a clean label/value row
  - **Description card**: Properly formatted text — paragraphs separated, bullet points rendered as lists, short heading-like lines rendered bold
  - **Room Features card**: Amenity tags
  - **Property Features card**: Property amenity tags
  - **House Rules card**: Pets/smoking status
- Photo gallery should be contained width (max-w-4xl), not full-bleed
- Sticky CTA sidebar on desktop with rent, key details, and "Apply to Rent" button
- Mobile: sticky bottom bar with rent + button

### Available Dates
- Always show with context: "Available Now" or "Available from 12 Apr 2026"
- Never show bare dates without the "Available from" prefix
- Never show raw COHO text like "It is available now!"

### Header
- Match syzo.co's header style. If syzo.co has a simple clean header, do the same.
- Use the SYZO logo at `/public/SYZO-logo.png`
- Don't over-engineer with scroll effects unless syzo.co does the same

### Footer
- Match syzo.co's footer style
- Include: Company name (SYZO Ltd), address (Rutland House, Lynch Wood, Peterborough, PE2 6PZ), phone (0117 450 4898), email (hello@syzo.co), © 2026, Privacy Policy link
- Use text "SYZO" instead of the logo image in the footer (the PNG doesn't render well at small sizes)

---

## Supabase Data Notes

The actual database columns (NOT the original spec):
- `rent_pcm` (not `rent`)
- `photo_urls` — string array of CDN URLs
- `bills_included` — boolean
- `additional_info` — JSONB with full COHO data including:
  - `advertTitle` — room listing headline
  - `advertDescription` — room listing description (HTML)
  - `amenities` — room amenity array
  - `property.amenities` — property amenity array
  - `property.name`, `property.majorAreaReference`, `property.postcode`
  - `property.images` — array of {url, title} for property photos
  - `property.petsAllowed`, `property.smokingAllowed`
- Images hosted on `d19qeljo1i8r7y.cloudfront.net`

Types and queries are already correct — don't change data fetching logic.

---

## Testing

After all design changes:
- Run `npm test` — update any tests that break due to component API changes
- Run `npm run build` — must succeed
- Verify mobile responsiveness

---

## Deployment

After all changes:
```bash
git add -A && git commit -m "feat: v5 premium design pass — matched to syzo.co brand"
git push origin main
vercel --prod --yes
```

---

## Verification Checklist

- [ ] Screenshots taken of syzo.co for reference
- [ ] Screenshots taken of our site BEFORE changes
- [ ] Each component visually compared to syzo.co equivalent
- [ ] Typography matches syzo.co (or close equivalent)
- [ ] Colour palette matches syzo.co
- [ ] Card styling matches the premium feel of syzo.co
- [ ] Photos not blurry — max 200px height, object-cover
- [ ] No illustration/drawing images showing
- [ ] Room detail page has structured cards (Letting Details, Description, Amenities, etc.)
- [ ] Available dates always have context ("Available from..." prefix)
- [ ] Header matches syzo.co style
- [ ] Footer has full company details, matches syzo.co style
- [ ] Mobile responsive and premium-looking
- [ ] `npm run build` succeeds
- [ ] Tests pass
- [ ] Deployed to Vercel
- [ ] Final screenshots taken and compared to syzo.co — quality matches

---

## What NOT to Do

- Do NOT change routing, data fetching, or Supabase queries
- Do NOT add new pages or features
- Do NOT use placeholder/illustration images
- Do NOT use Inter, Roboto, or Arial fonts
- Do NOT make the design MORE complex — match syzo.co's clean simplicity
- Do NOT skip the visual verification loop — screenshot and compare at every step
