(() => {
  let allEvents = [];
  let venues = [];
  let eventTypes = [];
  let currentRange = 'week';
  let currentVenue = '';
  let currentType = '';

  const grid = document.getElementById('events-grid');
  const loading = document.getElementById('loading');
  const empty = document.getElementById('empty');
  const count = document.getElementById('count');
  const lastUpdated = document.getElementById('last-updated');
  const venueFilter = document.getElementById('venue-filter');
  const typeFilter = document.getElementById('type-filter');

  // Date helpers
  function todayStr() {
    const d = new Date();
    return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' });
  }

  function endOfWeek() {
    const d = new Date();
    const day = d.getDay();
    const diff = 7 - day;
    d.setDate(d.getDate() + diff);
    return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' });
  }

  function endOfMonth() {
    const d = new Date();
    d.setMonth(d.getMonth() + 1, 0);
    return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' });
  }

  function formatDate(dateStr, timeStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T' + (timeStr || '00:00') + ':00');
    const opts = { weekday: 'short', day: 'numeric', month: 'short' };
    let str = d.toLocaleDateString('en-SG', opts);
    if (timeStr) {
      const [h, m] = timeStr.split(':');
      const hour = parseInt(h);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const h12 = hour % 12 || 12;
      str += ` · ${h12}:${m} ${ampm}`;
    }
    return str;
  }

  function formatTimeRange(startTime, endTime) {
    if (!startTime) return '';
    function fmt(t) {
      const [h, m] = t.split(':');
      const hour = parseInt(h);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      return `${hour % 12 || 12}:${m} ${ampm}`;
    }
    let s = fmt(startTime);
    if (endTime) s += ` - ${fmt(endTime)}`;
    return s;
  }

  // Fetch events
  async function fetchEvents() {
    try {
      const res = await fetch('/api/events');
      const data = await res.json();
      allEvents = data.events;
      venues = data.venues;
      eventTypes = data.eventTypes;
      
      // Populate filters
      venues.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v;
        opt.textContent = v;
        venueFilter.appendChild(opt);
      });
      
      eventTypes.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t;
        opt.textContent = t;
        typeFilter.appendChild(opt);
      });

      if (data.lastUpdated) {
        const d = new Date(data.lastUpdated);
        lastUpdated.textContent = d.toLocaleString('en-SG', { timeZone: 'Asia/Singapore' });
      }

      loading.style.display = 'none';
      renderEvents();
    } catch (err) {
      loading.innerHTML = '<p>Failed to load screenings. Try refreshing.</p>';
      console.error(err);
    }
  }

  // Filter & render
  function renderEvents() {
    let filtered = [...allEvents];

    // Date range
    const today = todayStr();
    if (currentRange === 'week') {
      const end = endOfWeek();
      filtered = filtered.filter(e => e.date >= today && e.date <= end);
    } else if (currentRange === 'month') {
      const end = endOfMonth();
      filtered = filtered.filter(e => e.date >= today && e.date <= end);
    }
    // 'all' = no date filter (server already filters past events)

    // Venue
    if (currentVenue) {
      filtered = filtered.filter(e => e.locations.some(l => l.name === currentVenue));
    }

    // Type
    if (currentType) {
      filtered = filtered.filter(e => e.types.includes(currentType));
    }

    count.textContent = filtered.length;
    
    if (filtered.length === 0) {
      grid.innerHTML = '';
      empty.style.display = 'block';
      return;
    }
    
    empty.style.display = 'none';
    grid.innerHTML = filtered.map(evt => cardHtml(evt)).join('');
  }

  function cardHtml(evt) {
    const dateStr = formatDate(evt.date, evt.startTime);
    const venueName = evt.locations[0]?.name || '';
    const venueAddr = evt.locations[0]?.address || '';
    const typeBadges = evt.types.map(t => `<span class="type-badge">${esc(t)}</span>`).join('');
    const timeRange = formatTimeRange(evt.startTime, evt.endTime);
    
    const imgHtml = evt.imageUrl
      ? `<img class="card-image" src="${esc(evt.imageUrl)}" alt="${esc(evt.name)}" loading="lazy" onerror="this.outerHTML='<div class=card-image-placeholder>🎬</div>'">`
      : `<div class="card-image-placeholder">🎬</div>`;

    // Expanded content
    let expandedHtml = '';
    if (evt.description) {
      expandedHtml += `<p class="card-description">${esc(evt.description)}</p>`;
    }
    if (evt.youtubeId) {
      expandedHtml += `<iframe class="youtube-embed" src="https://www.youtube-nocookie.com/embed/${esc(evt.youtubeId)}" allowfullscreen loading="lazy"></iframe>`;
    }
    if (evt.hosts.length > 0) {
      const hostLinks = evt.hosts.map(h => 
        h.website ? `<a href="${esc(h.website)}" target="_blank" rel="noopener">${esc(h.name)}</a>` : esc(h.name)
      ).join(', ');
      expandedHtml += `<p class="card-host">Hosted by ${hostLinks}</p>`;
    }
    if (venueAddr) {
      expandedHtml += `<p class="card-host">📍 ${esc(venueAddr)}</p>`;
    }
    
    let actionsHtml = '';
    if (evt.ticketUrl) {
      actionsHtml += `<a class="btn-ticket" href="${esc(evt.ticketUrl)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">🎟 ${esc(evt.ticketText)}</a>`;
    }
    if (evt.youtubeId) {
      actionsHtml += `<a class="btn-trailer" href="https://youtube.com/watch?v=${esc(evt.youtubeId)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">▶ Trailer</a>`;
    }
    if (actionsHtml) {
      expandedHtml += `<div class="card-actions">${actionsHtml}</div>`;
    }
    
    if (evt.tags.length > 0) {
      expandedHtml += `<div class="card-tags">${evt.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>`;
    }

    return `
      <div class="event-card" onclick="this.classList.toggle('open')">
        ${imgHtml}
        <div class="card-body">
          <div class="card-meta">
            ${typeBadges}
            <span class="card-date">${esc(dateStr)}</span>
          </div>
          <div class="card-title">${esc(evt.name)}</div>
          ${venueName ? `<div class="card-venue">${esc(venueName)}</div>` : ''}
          ${timeRange && !dateStr.includes(timeRange) ? `<div class="card-venue" style="margin-top:0.15rem">${esc(timeRange)}</div>` : ''}
        </div>
        <div class="card-expanded">
          <div class="card-expanded-inner">
            ${expandedHtml}
          </div>
        </div>
      </div>
    `;
  }

  function esc(s) {
    if (!s) return '';
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  // Event listeners
  document.querySelectorAll('.quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.quick-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentRange = btn.dataset.range;
      renderEvents();
    });
  });

  venueFilter.addEventListener('change', () => {
    currentVenue = venueFilter.value;
    renderEvents();
  });

  typeFilter.addEventListener('change', () => {
    currentType = typeFilter.value;
    renderEvents();
  });

  // Init
  fetchEvents();
})();
