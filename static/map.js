// ═══════════════════════════════════════════════════
//  MAP
// ═══════════════════════════════════════════════════

let mapInitialized = false;
let map, userMarker, userCoords = null, searchMarkers = [], activePopup = null;

function initMap() {
    map = new maplibregl.Map({
        container: 'map',
        style: 'https://tiles.openfreemap.org/styles/liberty',
        center: [0, 20],
        zoom: 2,
    });
    map.addControl(new maplibregl.NavigationControl(), 'bottom-right');
    map.on('click', () => {
        if (activePopup) { activePopup.remove(); activePopup = null; }
    });
}

// ── Locate ────────────────────────────────────────
let locationWatcher = null, bestAccuracy = Infinity, reverseGeocodeTimer = null;

function locateUser() {
    if (!navigator.geolocation) { setStatus('Geolocation not supported.', 'error'); return; }
    if (locationWatcher !== null) { navigator.geolocation.clearWatch(locationWatcher); locationWatcher = null; }
    bestAccuracy = Infinity;
    setStatus('Acquiring GPS signal…', 'loading');
    document.getElementById('locateBtn').textContent = '◎ Locating…';
    document.getElementById('coordsBadge').style.display = 'flex';
    document.getElementById('locationName').textContent = 'Waiting for GPS…';
    document.getElementById('locationAddr').textContent = '';

    const giveUpTimer = setTimeout(() => {
        if (locationWatcher !== null) { navigator.geolocation.clearWatch(locationWatcher); locationWatcher = null; }
        document.getElementById('locateBtn').innerHTML = svgLocate() + ' Locate Me';
    }, 15000);

    locationWatcher = navigator.geolocation.watchPosition(
        (pos) => {
            const { latitude: lat, longitude: lng, accuracy } = pos.coords;
            document.getElementById('latVal').textContent = lat.toFixed(5);
            document.getElementById('lngVal').textContent = lng.toFixed(5);
            setStatus(`Accuracy ±${Math.round(accuracy)} m — refining…`, 'loading');
            if (accuracy >= bestAccuracy) return;
            bestAccuracy = accuracy;
            userCoords = { lat, lng };

            if (userMarker) userMarker.remove();
            const el = document.createElement('div');
            el.innerHTML = `<div class="user-dot-outer"><div class="user-dot-inner"></div></div>`;
            userMarker = new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat([lng, lat]).addTo(map);

            const circleData = circleGeoJSON(lng, lat, accuracy);
            const doCircle = () => {
                if (map.getSource('acc')) { map.getSource('acc').setData(circleData); return; }
                map.addSource('acc', { type: 'geojson', data: circleData });
                map.addLayer({ id: 'acc-fill', type: 'fill', source: 'acc', paint: { 'fill-color': '#4a7ab5', 'fill-opacity': 0.1 } });
                map.addLayer({ id: 'acc-line', type: 'line', source: 'acc', paint: { 'line-color': '#4a7ab5', 'line-width': 1.5, 'line-opacity': 0.5 } });
            };
            map.isStyleLoaded() ? doCircle() : map.once('load', doCircle);

            map.flyTo({ center: [lng, lat], zoom: 17, speed: 1.6, curve: 1.4 });

            clearTimeout(reverseGeocodeTimer);
            reverseGeocodeTimer = setTimeout(() => reverseGeocode(lat, lng, accuracy), 1500);

            if (accuracy <= 50) {
                clearTimeout(giveUpTimer);
                navigator.geolocation.clearWatch(locationWatcher);
                locationWatcher = null;
                setStatus(`Location locked ±${Math.round(accuracy)} m`, 'ok');
                document.getElementById('locateBtn').innerHTML = svgLocate() + ' Locate Me';
            }
        },
        (err) => {
            clearTimeout(giveUpTimer);
            const msgs = { 1: 'Permission denied.', 2: 'Position unavailable.', 3: 'Timed out.' };
            setStatus(msgs[err.code] || 'Location error.', 'error');
            document.getElementById('locateBtn').innerHTML = svgLocate() + ' Locate Me';
            document.getElementById('locationName').textContent = 'Failed to locate';
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
}

function svgLocate() {
    return `<svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" stroke-width="1.5"/><circle cx="6.5" cy="6.5" r="2" fill="currentColor"/><path d="M6.5 1V3M6.5 10V12M1 6.5H3M10 6.5H12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
}

async function reverseGeocode(lat, lng, accuracy) {
    document.getElementById('locationName').textContent = 'Getting address…';
    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=18&addressdetails=1`,
            { headers: { 'Accept-Language': 'en' } }
        );
        const data = await res.json();
        const addr = data.address || {};
        const name = addr.amenity || addr.building || addr.shop || addr.road || addr.neighbourhood || addr.city || 'Your location';
        const street = [addr.house_number, addr.road].filter(Boolean).join(' ');
        const area = [addr.neighbourhood || addr.suburb, addr.city || addr.town].filter(Boolean).join(', ');
        const addrStr = [street, area].filter(Boolean).join(', ');

        document.getElementById('locationName').textContent = name;
        document.getElementById('locationAddr').textContent = addrStr;

        if (activePopup) activePopup.remove();
        activePopup = new maplibregl.Popup({ offset: [0, -14], closeButton: true, maxWidth: '240px' })
            .setLngLat([lng, lat])
            .setHTML(`
        <div style="font-size:11px;font-weight:700;color:#4a7ab5;margin-bottom:4px">📍 You are here</div>
        <div style="font-size:12px;font-weight:600;color:#1a1a1a;margin-bottom:3px">${name}</div>
        ${addrStr ? `<div style="font-size:11px;color:#888;margin-bottom:4px;line-height:1.4">${addrStr}</div>` : ''}
        <div style="font-family:monospace;font-size:10px;color:#aaa">${lat.toFixed(5)}, ${lng.toFixed(5)}</div>
        <div style="font-size:10px;color:#4a7ab5;margin-top:2px">±${Math.round(accuracy)} m</div>
      `).addTo(map);

        setStatus(`Location locked ±${Math.round(accuracy)} m`, 'ok');
    } catch {
        document.getElementById('locationName').textContent = 'Your location';
        document.getElementById('locationAddr').textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
}

function circleGeoJSON(cx, cy, r, n = 64) {
    const coords = [];
    for (let i = 0; i <= n; i++) {
        const a = (i / n) * 2 * Math.PI;
        coords.push([cx + (r / (111320 * Math.cos((cy * Math.PI) / 180))) * Math.sin(a), cy + (r / 111320) * Math.cos(a)]);
    }
    return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [coords] } };
}

// ── Status ────────────────────────────────────────
function setStatus(msg, type = '') {
    const el = document.getElementById('map-status');
    const text = document.getElementById('statusText');
    const dot = el.querySelector('.sdot');
    el.className = type;
    text.textContent = msg;
    dot.className = 'sdot' + (type === 'loading' ? ' pulse' : '');
}

// ── Distance ──────────────────────────────────────
function haversine(lat1, lng1, lat2, lng2) {
    const R = 6371000, dLat = ((lat2 - lat1) * Math.PI) / 180, dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
const fmtDist = (m) => m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;

// ── Search ────────────────────────────────────────
async function searchPlaces() {
    const query = document.getElementById('searchInput').value.trim();
    if (!query) { setStatus('Enter a search term.', 'error'); return; }
    setStatus('Searching…', 'loading');
    clearSearchMarkers();
    const results = (await photonSearch(query)) || (await nominatimSearch(query));
    if (!results || !results.length) { setStatus('No results found.', 'error'); return; }
    setStatus(`${results.length} result${results.length > 1 ? 's' : ''} found`, 'ok');
    renderResults(results);
    fitAndPlot(results);
}

async function photonSearch(query) {
    try {
        let url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=10&lang=en`;
        if (userCoords) url += `&lat=${userCoords.lat}&lon=${userCoords.lng}`;
        const data = await (await fetch(url)).json();
        if (!data.features?.length) return null;
        return data.features.map((f) => {
            const p = f.properties, [lon, lat] = f.geometry.coordinates;
            return { name: p.name || p.street || p.city || query, sub: [p.street, p.city, p.country].filter(Boolean).slice(0, 3).join(', '), lat, lon, dist: userCoords ? haversine(userCoords.lat, userCoords.lng, lat, lon) : null, badge: p.osm_value || '' };
        });
    } catch { return null; }
}

async function nominatimSearch(query) {
    try {
        let extra = '';
        if (userCoords) { const { lat, lng } = userCoords, d = 2; extra = `&viewbox=${lng - d},${lat - d},${lng + d},${lat + d}&bounded=0`; }
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=10&addressdetails=1${extra}`;
        const data = await (await fetch(url, { headers: { 'Accept-Language': 'en' } })).json();
        if (!data.length) return null;
        return data.map((p) => {
            const lat = +p.lat, lon = +p.lon;
            return { name: p.name || p.display_name.split(',')[0], sub: p.display_name.split(',').slice(1, 4).join(', ').trim(), lat, lon, dist: userCoords ? haversine(userCoords.lat, userCoords.lng, lat, lon) : null };
        });
    } catch { return null; }
}

function renderResults(data) {
    const el = document.getElementById('map-results');
    el.innerHTML = '';
    data.forEach((place, i) => {
        const div = document.createElement('div');
        div.className = 'result-item';
        div.innerHTML = `
      <div class="result-name">${place.name}</div>
      ${place.sub ? `<div class="result-sub">${place.sub}</div>` : ''}
      ${place.dist != null ? `<div class="result-dist">${fmtDist(place.dist)} away</div>` : ''}`;
        div.onclick = () => { map.flyTo({ center: [place.lon, place.lat], zoom: 17, speed: 1.4 }); openPopup(i, place); };
        el.appendChild(div);
    });
}

function fitAndPlot(data) {
    plotMarkers(data);
    if (data.length === 1) {
        map.flyTo({ center: [data[0].lon, data[0].lat], zoom: 16, speed: 1.3 });
    } else {
        const lngs = data.map(d => d.lon), lats = data.map(d => d.lat);
        map.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], { padding: 70, maxZoom: 16 });
    }
}

function plotMarkers(data) {
    data.forEach((place, i) => {
        const el = document.createElement('div');
        el.style.cssText = `width:22px;height:22px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
      background:#1a3a5c;border:2px solid rgba(255,255,255,0.8);cursor:pointer;
      box-shadow:0 2px 8px rgba(26,58,92,0.35);transition:transform .15s;`;
        el.onmouseenter = () => (el.style.transform = 'rotate(-45deg) scale(1.2)');
        el.onmouseleave = () => (el.style.transform = 'rotate(-45deg) scale(1)');
        const marker = new maplibregl.Marker({ element: el, anchor: 'bottom-left' }).setLngLat([place.lon, place.lat]).addTo(map);
        el.onclick = () => openPopup(i, place);
        searchMarkers.push(marker);
    });
}

function openPopup(index, place) {
    if (activePopup) activePopup.remove();
    activePopup = new maplibregl.Popup({ offset: [0, -6], closeButton: true, maxWidth: '220px' })
        .setLngLat([place.lon, place.lat])
        .setHTML(`
      <div style="font-size:12px;font-weight:700;color:#1a3a5c;margin-bottom:3px">${place.name}</div>
      ${place.sub ? `<div style="font-size:10px;color:#888">${place.sub}</div>` : ''}
      ${place.dist != null ? `<div style="font-size:10px;color:#4a7ab5;margin-top:3px">${fmtDist(place.dist)} away</div>` : ''}
    `).addTo(map);
}

function clearSearchMarkers() {
    searchMarkers.forEach(m => m.remove());
    searchMarkers = [];
    if (activePopup) { activePopup.remove(); activePopup = null; }
    document.getElementById('map-results').innerHTML = '';
}