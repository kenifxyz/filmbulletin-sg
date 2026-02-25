# Film Bulletin SG — Build Instructions

Build a web app that displays Singapore indie/repertory film screenings scraped from filmbulletin.sg's Elfsight calendar widget.

## Architecture

Single Express.js server serving both API and static frontend.

### Backend (server.js)
- Express server on port 3420
- On startup and every 6 hours: fetch from Elfsight API, process into clean JSON, cache in memory
- Endpoint: `GET /api/events` — returns processed events JSON (with query params: `from`, `to` for date filtering)
- Endpoint: `GET /api/events/:id` — returns single event by ID
- Serve static files from `public/` directory

### Data Source
The Elfsight API returns ALL events in one call:
```
GET https://core.service.elfsight.com/p/boot/?page=https://filmbulletin.sg/&w=cc348067-d95b-47b3-8f5b-ab71e02ac0c7
```

Response structure:
```
data.widgets["cc348067-d95b-47b3-8f5b-ab71e02ac0c7"].data.settings.events[] — 561 events
data.widgets["cc348067-d95b-47b3-8f5b-ab71e02ac0c7"].data.settings.locations[] — 41 venues (id -> name, address)
data.widgets["cc348067-d95b-47b3-8f5b-ab71e02ac0c7"].data.settings.hosts[] — 10 orgs (id -> name, website, logo)
data.widgets["cc348067-d95b-47b3-8f5b-ab71e02ac0c7"].data.settings.eventTypes[] — 5 types (id -> name)
```

Each event has:
- `id`, `name`, `start.date`, `start.time`, `end.date`, `end.time`
- `description` (HTML string — strip tags for plain text, keep for rich display)
- `image.url` (poster/banner)
- `location[]` — array of location IDs → resolve to location name + address
- `host[]` — array of host IDs → resolve to host name + website
- `eventType[]` — array of eventType IDs → resolve to type name
- `buttonLink.value` — ticket URL
- `video.id` — YouTube video ID (for trailer)
- `tags[]` — array of tag objects with `tagName`

### Data Processing
1. Fetch raw data from Elfsight
2. Build lookup maps for locations, hosts, eventTypes (id → object)
3. For each event:
   - Resolve location/host/eventType IDs to names
   - Strip HTML tags from description (keep a `descriptionHtml` field too)
   - Extract year from name if present (e.g., "Singin' in the Rain (1952)" → year: 1952)
   - Sort by start date descending (newest first)
   - Only include events from today onwards (filter past events)
4. Cache processed result in memory

### Frontend (public/index.html — single page)

**Design language:** Dark cinema theme, inspired by Box Office Owl.

**Color palette:**
- Background: `#0a0a0a` (near black)
- Cards: `#1a1a1a` with subtle border `#2a2a2a`
- Accent: `#e63946` (cinema red) for buttons, highlights
- Text: `#f1f1f1` primary, `#999` secondary
- Font: Inter (Google Fonts)

**Layout:**
- Hero header: "FILM BULLETIN SG" in bold, subtitle "indie & repertory screenings in singapore", with a small "powered by filmbulletin.sg" credit link
- Filter bar below header: filter by venue (dropdown), event type (pills), date range
- Event cards in a responsive grid (1 col mobile, 2 cols tablet, 3 cols desktop)

**Event Card Design:**
- Event image as banner (16:9 aspect, object-fit cover, fallback gradient if no image)
- Below image: event type badge (small colored pill), date + time
- Title (bold, 1.1em), venue name + address (muted)
- "Get Tickets" button (accent red) if buttonLink exists
- On click/tap: expand card to show full description, YouTube embed if video exists, host info
- Subtle hover effect: slight lift + shadow

**Responsive:**
- Mobile: single column, full-width cards
- Tablet (768px+): 2-column grid
- Desktop (1024px+): 3-column grid

**Features:**
- Default view: upcoming events (today onwards), sorted by date
- Venue filter dropdown (populated from locations data)
- Event type filter as horizontal pill buttons
- "This Week" / "This Month" / "All Upcoming" quick filter buttons
- Smooth scroll, no page reloads
- Footer: "Data sourced from filmbulletin.sg. Not affiliated." + link to filmbulletin.sg

**JavaScript (vanilla, no framework):**
- Fetch `/api/events` on load
- Client-side filtering (venue, type, date range)
- Card expand/collapse with CSS transitions
- Lazy load images

**DO NOT:**
- Use React, Vue, or any framework — vanilla HTML/CSS/JS only
- Use any npm dependencies for the frontend
- Add authentication
- Run any deploy/SSH commands
- Ask for approval — just build it

## File Structure
```
/server.js          — Express server + Elfsight fetcher
/public/index.html  — Single page app
/public/styles.css  — All styles
/public/app.js      — Client-side JavaScript
/package.json       — Dependencies (express, node-fetch only)
```

## Important
- All times in SGT (Asia/Singapore, GMT+8)
- Port 3420
- Keep it simple — no database, just in-memory cache refreshed every 6 hours
- The app should work immediately after `npm install && node server.js`
