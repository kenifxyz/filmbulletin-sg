# Film Bulletin SG

A beautiful web app that displays Singapore indie and repertory film screenings, scraped from [filmbulletin.sg](https://filmbulletin.sg)'s Elfsight calendar widget.

## Features

- **Dark cinema-inspired design** - Beautiful, polished UI inspired by Box Office Owl
- **Real-time data** - Fetches events from Elfsight API every 6 hours
- **Advanced filtering** - Filter by venue, event type, and date range
- **Responsive design** - Works perfectly on mobile, tablet, and desktop
- **Event details modal** - Click any event to see full details, trailers, and ticket links
- **Fast and simple** - No database needed, in-memory caching for instant performance

## Quick Start

```bash
# Install dependencies
npm install

# Start the server
npm start
```

The app will be available at **http://localhost:3420**

## Tech Stack

- **Backend**: Express.js with in-memory caching
- **Frontend**: Vanilla HTML/CSS/JavaScript (no frameworks)
- **Data**: Elfsight API (filmbulletin.sg calendar widget)
- **Port**: 3420

## Architecture

- Single Express.js server serving both API and static frontend
- Data fetched from Elfsight API on startup and every 6 hours
- Events cached in memory for instant loading
- Only shows upcoming events (from today onwards)

## API Endpoints

- `GET /api/events` - Returns all upcoming events
  - Query params: `from` (date), `to` (date) for date range filtering
- `GET /api/events/:id` - Returns single event by ID

## File Structure

```
/server.js          - Express server + Elfsight fetcher
/public/index.html  - Single page app
/public/styles.css  - All styles
/public/app.js      - Client-side JavaScript
/package.json       - Dependencies
```

## Data Processing

The app processes raw Elfsight data to:
- Resolve location/host/eventType IDs to readable names
- Extract years from film titles (e.g., "Film (1952)" → year: 1952)
- Strip HTML from descriptions
- Filter out past events
- Sort by date (earliest first)

## Design

Dark cinema theme with:
- Background: `#0a0a0a` (near black)
- Cards: `#1a1a1a` with subtle borders
- Accent: `#e63946` (cinema red)
- Font: Inter (Google Fonts)

## License

MIT

---

**Not affiliated with filmbulletin.sg** - Data sourced from their public calendar widget.
