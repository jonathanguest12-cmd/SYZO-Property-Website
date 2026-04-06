# P02a v2 — SYZO Property Website Design Overhaul

**Date:** 2026-04-06
**Status:** Approved

---

## Overview

Complete visual overhaul of the existing SYZO property website to match the brand identity of syzo.co. Add a room detail page as the primary sales page. Redesign all components for a premium, photography-driven aesthetic.

## Brand System

**Colours** (matched from syzo.co + logo):
- Primary: `#2D3038` (dark charcoal)
- Background: `#FAFAFA` (light warm grey)
- Surface: `#FFFFFF` (cards)
- Text primary: `#2D3038`
- Text secondary: `#888888`
- Bills included: `#2E7D32` on `#E8F5E9`
- Bills not included: `#B45309` on `#FEF3C7`
- Available now: `#2E7D32`
- Filter active: `#2D3038`
- Filter inactive: `#F0F0F0`

**Typography:** DM Sans (Google Fonts) — geometric sans-serif matching the SYZO logo feel. Headings 700/800, body 400/500.

**Cards:** 12px radius, shadow `0 2px 12px rgba(0,0,0,0.06)`, hover lift `translateY(-2px)` + deeper shadow, photo zoom 1.05x on hover.

**Motion:** CSS transitions only (0.2s ease). No scroll animations.

## Components

### Header
- Dark `#2D3038` background, sticky
- SYZO logo image (`/SYZO-logo.png`) left-aligned
- Minimal nav: "Browse Rooms" link in white

### Footer
- Dark `#2D3038` background
- SYZO logo
- Rutland House, Lynch Wood, Peterborough, PE2 6PZ
- 0117 450 4898 | hello@syzo.co
- © 2026 SYZO Ltd. All rights reserved.
- Privacy Policy (placeholder)

### RoomCard (browse page)
Entire card clickable → `/room/[id]`
- Photo with city badge overlay, zoom on hover
- Room title from `advert_title` (fallback: "Double Room — [property_name]")
- Address + postcode
- Rent bold: £XXX /month
- Bills badge (green or amber)
- 1-2 line description preview (HTML stripped, truncated)
- 2-3 amenity tags
- Available date
- "View Room" button

### PropertyCard (property view)
Entire card clickable → `/property/[cohoRef]`
- Property photo (real COHO photos)
- City badge overlay
- Property name
- Room count + price range
- "View Property" button

### FilterPanel
Expandable panel with preset clickable pills:
- Area: All / Plymouth / Newquay
- Price: Under £450 / £450–£550 / £550–£650 / £650+
- Availability: Available Now / Within 1 month / Within 3 months / Any
- Sort: Price low→high / high→low / Available soonest
- No room type filter
- "Filters" button with active count badge

### RoomBrowser
- Results bar: "[N] rooms available" + view toggle + filters button
- Default sort: grouped by property, then rent within property
- Room view: card grid
- Property view: one card per property (deduplicated)
- Empty state message

## Pages

### Browse (`/`, `/[city]`)
Server fetch all rooms → RoomBrowser client component

### Room Detail (`/room/[id]`) — NEW
- Photo gallery hero (room photos, then property photos as "Shared Spaces")
- Room title + property address
- Key details grid: rent, bills, available from, room type, deposit
- Full advert_description (sanitised HTML)
- Room amenities + property amenities
- House rules if available
- Other available rooms at same property
- "Apply to Rent" CTA (fixed on mobile)

### Property Detail (`/property/[cohoRef]`)
- Property photo hero
- Property name, address, amenities
- Available rooms using RoomCard

### Apply (`/apply/[id]`)
- Room details at top (photo, title, address, rent)
- "Application form coming soon" message
- "Back to Room" link
- Stale link handling

## Data Notes

- `advert_title` often null → fallback: "Double Room — [property_name]"
- `advert_description` is HTML → strip tags for preview, sanitise for full display
- `available_from` → parse: past/today = "Available Now", future = formatted date
- Photos from `d19qeljo1i8r7y.cloudfront.net`
- Property data in `additional_info.property`
- Amenities in `additional_info.amenities` (room) and `additional_info.property.amenities`
