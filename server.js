const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3420;
const ELFSIGHT_URL = 'https://core.service.elfsight.com/p/boot/?page=https%3A%2F%2Ffilmbulletin.sg%2F&w=cc348067-d95b-47b3-8f5b-ab71e02ac0c7';
const REFRESH_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours

let cachedData = null;
let lastFetch = 0;

function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\u2019/g, "'")
    .replace(/\u2018/g, "'")
    .replace(/\u201c/g, '"')
    .replace(/\u201d/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractYear(name) {
  const match = name.match(/\((\d{4})\)/);
  return match ? parseInt(match[1]) : null;
}

async function fetchElfsightData() {
  try {
    console.log('[fetch] Fetching Elfsight data...');
    const res = await fetch(ELFSIGHT_URL);
    const json = await res.json();
    
    const widgetData = json.data.widgets['cc348067-d95b-47b3-8f5b-ab71e02ac0c7'].data.settings;
    
    // Build lookup maps
    const locationMap = {};
    (widgetData.locations || []).forEach(loc => {
      locationMap[loc.id] = { name: loc.name, address: loc.address || '', website: loc.website || '' };
    });
    
    const hostMap = {};
    (widgetData.hosts || []).forEach(h => {
      hostMap[h.id] = { name: h.name, website: h.website || '', logo: h.logo?.url || null };
    });
    
    const typeMap = {};
    (widgetData.eventTypes || []).forEach(t => {
      typeMap[t.id] = t.name;
    });
    
    // Process events
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const events = (widgetData.events || [])
      .map(evt => {
        const locations = (evt.location || []).map(id => locationMap[id]).filter(Boolean);
        const hosts = (evt.host || []).map(id => hostMap[id]).filter(Boolean);
        const types = (evt.eventType || []).map(id => typeMap[id]).filter(Boolean);
        const tags = (evt.tags || []).map(t => t.tagName).filter(Boolean);
        
        return {
          id: evt.id,
          name: evt.name,
          year: extractYear(evt.name),
          date: evt.start?.date || null,
          startTime: evt.start?.time || null,
          endDate: evt.end?.date || null,
          endTime: evt.end?.time || null,
          description: stripHtml(evt.description),
          descriptionHtml: evt.description || '',
          imageUrl: evt.image?.url || null,
          locations,
          hosts,
          types,
          tags,
          ticketUrl: evt.buttonLink?.value || null,
          ticketText: evt.buttonText || 'Get Tickets',
          youtubeId: evt.video?.id || null,
        };
      })
      .filter(evt => {
        if (!evt.date) return false;
        const eventDate = new Date(evt.date + 'T00:00:00+08:00');
        return eventDate >= today;
      })
      .sort((a, b) => {
        const da = a.date + (a.startTime || '00:00');
        const db = b.date + (b.startTime || '00:00');
        return da.localeCompare(db);
      });
    
    // Extract unique venues and types for filters
    const venues = [...new Set(events.flatMap(e => e.locations.map(l => l.name)))].sort();
    const eventTypes = [...new Set(events.flatMap(e => e.types))].sort();
    
    cachedData = { events, venues, eventTypes, totalEvents: events.length, lastUpdated: new Date().toISOString() };
    lastFetch = Date.now();
    console.log(`[fetch] Cached ${events.length} upcoming events, ${venues.length} venues, ${eventTypes.length} types`);
  } catch (err) {
    console.error('[fetch] Error:', err.message);
  }
}

// API routes
app.get('/api/events', (req, res) => {
  if (!cachedData) return res.status(503).json({ error: 'Data not loaded yet' });
  
  let filtered = cachedData.events;
  
  if (req.query.venue) {
    filtered = filtered.filter(e => e.locations.some(l => l.name === req.query.venue));
  }
  if (req.query.type) {
    filtered = filtered.filter(e => e.types.includes(req.query.type));
  }
  if (req.query.from) {
    filtered = filtered.filter(e => e.date >= req.query.from);
  }
  if (req.query.to) {
    filtered = filtered.filter(e => e.date <= req.query.to);
  }
  
  res.json({
    events: filtered,
    venues: cachedData.venues,
    eventTypes: cachedData.eventTypes,
    total: filtered.length,
    lastUpdated: cachedData.lastUpdated,
  });
});

app.get('/api/events/:id', (req, res) => {
  if (!cachedData) return res.status(503).json({ error: 'Data not loaded yet' });
  const evt = cachedData.events.find(e => e.id === req.params.id);
  if (!evt) return res.status(404).json({ error: 'Event not found' });
  res.json(evt);
});

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start
fetchElfsightData().then(() => {
  app.listen(PORT, () => console.log(`[server] Film Bulletin SG running on port ${PORT}`));
});

setInterval(fetchElfsightData, REFRESH_INTERVAL);
