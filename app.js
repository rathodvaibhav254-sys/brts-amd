// ═══════════════════════════════════════════════════════════════
// app.js — BRTS Frontend (READ-ONLY Firebase listener)
// NO simulation loops here. All data comes from Firebase.
// ═══════════════════════════════════════════════════════════════

import { database, auth } from './firebase-config.js';
import {
  ref, onValue, push, set, update, serverTimestamp, get
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

// ──────────────────────────────────────────────────────────────
// STATE
// ──────────────────────────────────────────────────────────────
let currentUser = null;
let userRole    = 'user';
let busMarkers  = {};          // busId → Leaflet marker
let busData     = {};          // busId → latest bus snapshot
let routeData   = {};          // routeKey → route object
let sosLocation = null;        // { lat, lng } captured for SOS
let map         = null;
let speedChart  = null;
let crowdChart  = null;
let activePref  = 'time';      // route planner preference
let routesLoaded = false;      // flag to track if routes are loaded

// ──────────────────────────────────────────────────────────────
// DOM REFS
// ──────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const authOverlay    = $('auth-overlay');
const appEl          = $('app');
const sosBtn         = $('sos-btn');
const sosModal       = $('sos-modal');

// ══════════════════════════════════════════════════════════════
// CLOCK
// ══════════════════════════════════════════════════════════════
function startClock() {
  function tick() {
    $('header-time').textContent =
      new Date().toLocaleTimeString('en-IN', { hour12: false });
  }
  tick();
  setInterval(tick, 1000);
}

// ══════════════════════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════════════════════
function initAuth() {
  // Tab switching
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      $('auth-login').classList.toggle('hidden',    tab.dataset.tab !== 'login');
      $('auth-register').classList.toggle('hidden', tab.dataset.tab !== 'register');
      $('auth-error').classList.add('hidden');
    });
  });

  // Email login
  $('btn-login').addEventListener('click', async () => {
    const email = $('login-email').value.trim();
    const pass  = $('login-password').value;
    if (!email || !pass) return showAuthError('Enter email and password');
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (e) {
      showAuthError(e.message.replace('Firebase: ', ''));
    }
  });

  // Google login
  $('btn-google').addEventListener('click', async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (e) {
      showAuthError(e.message.replace('Firebase: ', ''));
    }
  });

  // Register
  $('btn-register').addEventListener('click', async () => {
    const name      = $('reg-name').value.trim();
    const email     = $('reg-email').value.trim();
    const pass      = $('reg-password').value;
    const role      = $('reg-role').value;
    const emergency = $('reg-emergency').value.trim();

    if (!name || !email || !pass) return showAuthError('Fill all required fields');
    if (pass.length < 6) return showAuthError('Password must be ≥ 6 characters');

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      // Save user profile to DB
      await set(ref(database, `users/${cred.user.uid}`), {
        name, email, role, emergencyContacts: emergency || '',
        createdAt: Date.now()
      });
    } catch (e) {
      showAuthError(e.message.replace('Firebase: ', ''));
    }
  });

  // Logout
  $('btn-logout').addEventListener('click', () => signOut(auth));

  // Auth state
  onAuthStateChanged(auth, async user => {
    if (user) {
      currentUser = user;
      await loadUserProfile(user.uid);
      showApp();
    } else {
      currentUser = null;
      userRole = 'user';
      showAuthOverlay();
    }
  });
}

function showAuthError(msg) {
  const el = $('auth-error');
  el.textContent = msg;
  el.classList.remove('hidden');
}

async function loadUserProfile(uid) {
  const snap = await get(ref(database, `users/${uid}`));
  if (snap.exists()) {
    const data = snap.val();
    userRole = data.role || 'user';
    $('user-name').textContent  = data.name || currentUser.displayName || currentUser.email;
    $('user-avatar').textContent = (data.name || currentUser.email)[0].toUpperCase();
    $('user-role-badge').textContent = userRole;
    $('user-role-badge').className = `role-badge ${userRole}`;
    if (userRole === 'admin') {
      document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
    }
  } else {
    // Google user without profile yet — create one
    const displayName = currentUser.displayName || 'User';
    $('user-name').textContent   = displayName;
    $('user-avatar').textContent = displayName[0].toUpperCase();
    await set(ref(database, `users/${uid}`), {
      name: displayName,
      email: currentUser.email || '',
      role: 'user',
      emergencyContacts: '',
      createdAt: Date.now()
    });
  }
}

function showApp() {
  authOverlay.classList.add('hidden');
  appEl.classList.remove('hidden');
  sosBtn.classList.remove('hidden');
  initMap();
  initCharts();
  startFirebaseListeners();
  initRoutePlanner();
  startClock();
}

function showAuthOverlay() {
  authOverlay.classList.remove('hidden');
  appEl.classList.add('hidden');
  sosBtn.classList.add('hidden');
}

// ══════════════════════════════════════════════════════════════
// MAP INIT
// ══════════════════════════════════════════════════════════════
function initMap() {
  if (map) return;
  map = L.map('map', {
    center: [23.0225, 72.5714],
    zoom: 13,
    zoomControl: true,
    attributionControl: false
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19
  }).addTo(map);
}

function getBusIcon(bus) {
  const color =
    bus.status === 'emergency' ? '#ff1744' :
    bus.status === 'delayed'   ? '#ffca28' :
    '#00d4ff';

  const emoji =
    bus.status === 'emergency' ? '🚨' :
    bus.status === 'delayed'   ? '⚠️' : '🚌';

  return L.divIcon({
    className: '',
    html: `<div style="
      background:${color}22;
      border:2px solid ${color};
      border-radius:6px;
      padding:3px 7px;
      font-family:'JetBrains Mono',monospace;
      font-size:11px;
      color:${color};
      white-space:nowrap;
      ${bus.status === 'emergency' ? 'animation:none' : ''}
    ">${emoji} ${bus.id || ''}</div>`,
    iconAnchor: [30, 14]
  });
}

function updateMapMarker(busId, bus) {
  if (!map) return;
  const pos = [bus.lat, bus.lng];

  if (busMarkers[busId]) {
    busMarkers[busId].setLatLng(pos).setIcon(getBusIcon(bus));
    busMarkers[busId]._popup.setContent(buildPopup(bus));
  } else {
    const marker = L.marker(pos, { icon: getBusIcon(bus) })
      .bindPopup(buildPopup(bus), { className: 'brts-popup' })
      .addTo(map);
    busMarkers[busId] = marker;
  }
}

function buildPopup(bus) {
  const crowd = bus.crowd || 'low';
  const crowdColor = crowd === 'high' ? '#ff1744' : crowd === 'medium' ? '#ffca28' : '#00e676';
  return `
    <div style="font-family:'JetBrains Mono',monospace;font-size:12px;min-width:180px">
      <b style="color:#00d4ff">${bus.id}</b> · ${bus.routeKey || ''}<br/>
      🛣 Speed: <b>${Math.round(bus.speed || 0)} km/h</b><br/>
      👥 Crowd: <b style="color:${crowdColor}">${crowd.toUpperCase()}</b><br/>
      🧭 Direction: ${Math.round(bus.direction || 0)}°<br/>
      🕐 Updated: ${bus.updatedAt ? new Date(bus.updatedAt).toLocaleTimeString() : '—'}
    </div>`;
}

// ══════════════════════════════════════════════════════════════
// CHARTS INIT
// ══════════════════════════════════════════════════════════════
const CHART_DEFAULTS = {
  color: '#e0eaf4',
  borderColor: '#1e2d3d',
  backgroundColor: 'transparent',
  plugins: { legend: { display: false }, tooltip: { enabled: true } },
  scales: {
    x: { grid: { color: '#1e2d3d' }, ticks: { color: '#7a9bba', font: { family: 'JetBrains Mono', size: 10 } } },
    y: { grid: { color: '#1e2d3d' }, ticks: { color: '#7a9bba', font: { family: 'JetBrains Mono', size: 10 } } }
  }
};

function initCharts() {
  speedChart = new Chart($('speed-chart').getContext('2d'), {
    type: 'bar',
    data: { labels: [], datasets: [{
      label: 'Speed (km/h)',
      data: [],
      backgroundColor: '#00d4ff33',
      borderColor: '#00d4ff',
      borderWidth: 1.5,
      borderRadius: 3
    }]},
    options: { ...CHART_DEFAULTS, animation: { duration: 400 } }
  });

  crowdChart = new Chart($('crowd-chart').getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: ['Low', 'Medium', 'High'],
      datasets: [{
        data: [0, 0, 0],
        backgroundColor: ['#00e67633', '#ffca2833', '#ff174433'],
        borderColor:     ['#00e676',   '#ffca28',   '#ff1744'],
        borderWidth: 2
      }]
    },
    options: {
      plugins: {
        legend: {
          display: true,
          labels: { color: '#7a9bba', font: { family: 'JetBrains Mono', size: 10 }, boxWidth: 12 }
        }
      },
      animation: { duration: 400 }
    }
  });
}

function updateCharts() {
  const buses = Object.values(busData);
  if (!buses.length) return;

  // Speed bar chart
  const labels = buses.map(b => b.id);
  const speeds = buses.map(b => Math.round(b.speed || 0));
  speedChart.data.labels = labels;
  speedChart.data.datasets[0].data = speeds;
  speedChart.data.datasets[0].backgroundColor = buses.map(b =>
    b.status === 'emergency' ? '#ff174433' :
    b.status === 'delayed'   ? '#ffca2833' : '#00d4ff33'
  );
  speedChart.data.datasets[0].borderColor = buses.map(b =>
    b.status === 'emergency' ? '#ff1744' :
    b.status === 'delayed'   ? '#ffca28' : '#00d4ff'
  );
  speedChart.update('none');

  // Crowd doughnut
  let low = 0, medium = 0, high = 0;
  buses.forEach(b => {
    if (b.crowd === 'high')        high++;
    else if (b.crowd === 'medium') medium++;
    else                           low++;
  });
  crowdChart.data.datasets[0].data = [low, medium, high];
  crowdChart.update('none');
}

// ══════════════════════════════════════════════════════════════
// FIREBASE LISTENERS (READ-ONLY FRONTEND)
// ══════════════════════════════════════════════════════════════
function startFirebaseListeners() {

  // ─── Connection status ───
  const connRef = ref(database, '.info/connected');
  onValue(connRef, snap => {
    const connected = snap.val();
    const dot  = $('firebase-status');
    const text = $('firebase-status-text');
    if (connected) {
      dot.className  = 'status-dot connected';
      text.textContent = 'LIVE · Firebase';
    } else {
      dot.className  = 'status-dot error';
      text.textContent = 'Reconnecting...';
    }
  });

  // ─── Buses ───
  onValue(ref(database, 'buses'), snap => {
    busData = {};
    if (!snap.exists()) return;
    snap.forEach(child => {
      busData[child.key] = { id: child.key, ...child.val() };
    });
    renderFleetTable();
    updateMapMarkers();
    updateCharts();
    updateKPIs();
    runAIPredictions();
  });

  // ─── Routes (for planner) ───
  onValue(ref(database, 'routes'), snap => {
    routeData = {};
    if (!snap.exists()) return;
    snap.forEach(child => {
      routeData[child.key] = { id: child.key, ...child.val() };
    });
    routesLoaded = true;
    populateRoutePlannerStops();
    const searchBtn = $('rp-search');
    if (searchBtn) searchBtn.disabled = false;
  });

  // ─── Alerts (SOS) ───
  onValue(ref(database, 'alerts'), snap => {
    const alerts = [];
    if (snap.exists()) {
      snap.forEach(child => {
        alerts.push({ id: child.key, ...child.val() });
      });
    }
    // Only show active SOS
    const activeSOS = alerts.filter(a => a.type === 'sos' && a.status === 'active');
    renderSOSAlerts(activeSOS);
    updateAlertsBanner(activeSOS);

    // KPI
    $('kpi-sos').textContent = activeSOS.length;
    const card = $('kpi-sos-card');
    if (activeSOS.length > 0) card.classList.add('has-sos');
    else                       card.classList.remove('has-sos');
    $('sos-count-badge').textContent = activeSOS.length;
  });
}

// ──────────────────────────────────────────────────────────────
// MAP MARKERS UPDATE
// ──────────────────────────────────────────────────────────────
function updateMapMarkers() {
  Object.entries(busData).forEach(([busId, bus]) => {
    updateMapMarker(busId, bus);
  });
  // Remove stale markers
  Object.keys(busMarkers).forEach(id => {
    if (!busData[id]) {
      map.removeLayer(busMarkers[id]);
      delete busMarkers[id];
    }
  });
}

// ──────────────────────────────────────────────────────────────
// FLEET TABLE
// ──────────────────────────────────────────────────────────────
function renderFleetTable() {
  const tbody  = $('fleet-tbody');
  const filter = $('bus-search').value.toLowerCase();
  const buses  = Object.values(busData)
    .filter(b => b.id.toLowerCase().includes(filter) ||
                 (b.routeKey || '').toLowerCase().includes(filter));

  tbody.innerHTML = buses.map(b => {
    const crowd  = b.crowd || 'low';
    const status = b.status || 'normal';
    const pips   = crowd === 'high' ? 3 : crowd === 'medium' ? 2 : 1;
    const ago    = b.updatedAt ? timeSince(b.updatedAt) : '—';

    return `<tr class="${status === 'emergency' ? 'emergency-row' : ''}">
      <td class="bus-id-cell">${b.id}</td>
      <td style="color:var(--text-secondary)">${b.routeKey || '—'}</td>
      <td style="font-weight:600">${Math.round(b.speed || 0)}</td>
      <td>
        <div class="crowd-bar">
          ${[1,2,3].map(i => `<span class="crowd-pip ${i <= pips ? `filled ${crowd}` : ''}"></span>`).join('')}
          <span style="font-size:10px;color:var(--text-muted)">${crowd}</span>
        </div>
      </td>
      <td>
        <span class="status-chip ${status}">
          ${ status === 'emergency' ? '🚨' : status === 'delayed' ? '⚠️' : '✓' }
          ${status}
        </span>
      </td>
      <td style="color:var(--text-muted);font-size:11px">${ago}</td>
    </tr>`;
  }).join('');
}

$('bus-search').addEventListener('input', renderFleetTable);

// ──────────────────────────────────────────────────────────────
// KPIs
// ──────────────────────────────────────────────────────────────
function updateKPIs() {
  const buses = Object.values(busData);
  $('kpi-active-buses').textContent = buses.length;
  const avgSpeed = buses.length
    ? (buses.reduce((s, b) => s + (b.speed || 0), 0) / buses.length).toFixed(1)
    : '--';
  $('kpi-avg-speed').textContent = avgSpeed;
  $('kpi-delayed').textContent   = buses.filter(b => b.status === 'delayed').length;

  // Rough passenger estimate: low=10, medium=25, high=45
  const pax = buses.reduce((s, b) => {
    return s + (b.crowd === 'high' ? 45 : b.crowd === 'medium' ? 25 : 10);
  }, 0);
  $('kpi-total-pax').textContent = pax;
}

// ──────────────────────────────────────────────────────────────
// ALERTS BANNER
// ──────────────────────────────────────────────────────────────
function updateAlertsBanner(activeSOS) {
  const banner = $('alerts-banner');
  if (!activeSOS.length) {
    banner.classList.add('hidden');
    return;
  }
  banner.classList.remove('hidden');
  const items = activeSOS.map(a =>
    `<span class="alert-item">🚨 SOS ALERT · ${a.userName || 'Unknown'} · Bus ${a.busId || 'N/A'} · ${new Date(a.timestamp || Date.now()).toLocaleTimeString()}</span>`
  );
  // Duplicate for seamless scroll
  $('alert-scroll-inner').innerHTML = [...items, ...items].join('');
}

// ──────────────────────────────────────────────────────────────
// SOS ALERT LIST (Admin)
// ──────────────────────────────────────────────────────────────
function renderSOSAlerts(alerts) {
  const list = $('sos-alert-list');
  if (!alerts.length) {
    list.innerHTML = '<div class="empty-state">No active SOS alerts</div>';
    return;
  }
  list.innerHTML = alerts.map(a => `
    <div class="sos-alert-item">
      <div class="sos-alert-user">🚨 ${a.userName || 'Anonymous'}</div>
      <div class="sos-alert-meta">
        <span>📍 ${a.location ? `${a.location.lat.toFixed(4)}, ${a.location.lng.toFixed(4)}` : 'Location N/A'}</span>
        <span>🚌 Bus: ${a.busId || 'Unknown'}</span>
        <span>🕐 ${new Date(a.timestamp || Date.now()).toLocaleString()}</span>
        <span>📞 ${a.emergencyContact || 'No contact saved'}</span>
      </div>
      ${userRole === 'admin' ? `
        <button class="sos-resolve-btn" data-id="${a.id}">✓ Mark Resolved</button>
      ` : ''}
    </div>
  `).join('');

  // Resolve buttons (admin only)
  list.querySelectorAll('.sos-resolve-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      await update(ref(database, `alerts/${id}`), { status: 'resolved' });
    });
  });
}

// ══════════════════════════════════════════════════════════════
// SOS SYSTEM
// ══════════════════════════════════════════════════════════════
sosBtn.addEventListener('click', () => {
  sosModal.classList.remove('hidden');
  sosLocation = null;
  $('sos-location-status').textContent = '📍 Getting your location...';

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      pos => {
        sosLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        $('sos-location-status').textContent =
          `📍 Location acquired: ${sosLocation.lat.toFixed(4)}, ${sosLocation.lng.toFixed(4)}`;
      },
      err => {
        $('sos-location-status').textContent = '⚠️ Location unavailable — alert will still be sent';
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  } else {
    $('sos-location-status').textContent = '⚠️ Geolocation not supported';
  }
});

$('sos-cancel').addEventListener('click', () => {
  sosModal.classList.add('hidden');
});

$('sos-confirm').addEventListener('click', async () => {
  if (!currentUser) return;

  // Find nearest bus
  let nearestBus = null;
  if (sosLocation) {
    let minDist = Infinity;
    Object.values(busData).forEach(bus => {
      const d = haversineDistance(sosLocation.lat, sosLocation.lng, bus.lat, bus.lng);
      if (d < minDist) { minDist = d; nearestBus = bus; }
    });
  }

  // Get user's emergency contact
  let emergencyContact = '';
  try {
    const snap = await get(ref(database, `users/${currentUser.uid}`));
    if (snap.exists()) emergencyContact = snap.val().emergencyContacts || '';
  } catch (_) {}

  const alertData = {
    type:             'sos',
    userId:           currentUser.uid,
    userName:         currentUser.displayName || currentUser.email,
    userEmail:        currentUser.email || '',
    emergencyContact,
    location:         sosLocation || null,
    busId:            nearestBus?.id || null,
    timestamp:        Date.now(),
    status:           'active'
  };

  try {
    const alertRef = push(ref(database, 'alerts'));
    await set(alertRef, alertData);

    // Mark nearest bus as emergency
    if (nearestBus) {
      await update(ref(database, `buses/${nearestBus.id}`), { status: 'emergency' });
    }

    sosModal.classList.add('hidden');
    showToast('🚨 SOS Alert Sent! Help is on the way.');
  } catch (e) {
    showToast('Failed to send alert. Please call 112 directly.', true);
    console.error(e);
  }
});

// ══════════════════════════════════════════════════════════════
// ROUTE PLANNER
// ══════════════════════════════════════════════════════════════
function populateRoutePlannerStops() {
  const allStops = new Set();
  Object.values(routeData).forEach(route => {
    (route.stops || []).forEach(s => allStops.add(s));
  });

  const fromSel = $('rp-from');
  const toSel   = $('rp-to');
  const current = { from: fromSel.value, to: toSel.value };

  fromSel.innerHTML = '<option value="">-- From Stop --</option>';
  toSel.innerHTML   = '<option value="">-- To Stop --</option>';

  [...allStops].sort().forEach(stop => {
    fromSel.innerHTML += `<option value="${stop}" ${current.from === stop ? 'selected' : ''}>${stop}</option>`;
    toSel.innerHTML   += `<option value="${stop}" ${current.to   === stop ? 'selected' : ''}>${stop}</option>`;
  });
}

function initRoutePlanner() {
  const searchBtn = $('rp-search');
  // Disable search button until routes are loaded
  if (searchBtn) searchBtn.disabled = true;

  // Preference chips
  document.querySelectorAll('.pref-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.pref-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activePref = chip.dataset.pref;
    });
  });

  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      const from = $('rp-from').value;
      const to   = $('rp-to').value;

      if (!from || !to) return showToast('Select origin and destination', true);
      if (from === to)   return showToast('Origin and destination must differ', true);

      const results = findRoutes(from, to, activePref);
      renderRouteResults(results);
    });
  }
}

function findRoutes(from, to, pref) {
  const results = [];
  const buses = Object.values(busData);
  const normalizedFrom = from.trim().toLowerCase();
  const normalizedTo = to.trim().toLowerCase();

  console.log('Looking for routes from', normalizedFrom, 'to', normalizedTo);

  Object.values(routeData).forEach(route => {
    const stops = (route.stops || []).map(s => s.trim().toLowerCase());
    const fi = stops.indexOf(normalizedFrom);
    const ti = stops.indexOf(normalizedTo);
    
    console.log(`Route ${route.id}: stops =`, stops, 'fi=', fi, 'ti=', ti);
    
    if (fi === -1 || ti === -1) return;
    
    const direction = fi < ti ? 1 : -1;
    const stopCount = Math.abs(ti - fi);

    // Find buses on this route
    const routeBuses = buses.filter(b => b.routeKey === route.id);
    const avgSpeed = routeBuses.length
      ? routeBuses.reduce((s, b) => s + (b.speed || 30), 0) / routeBuses.length
      : 30;

    // Rough distance: 800m per stop
    const distKm = stopCount * 0.8;
    const etaMins = avgSpeed > 0 ? Math.ceil((distKm / avgSpeed) * 60) : '--';

    // Crowd score
    const crowdCount = { low: 0, medium: 0, high: 0 };
    routeBuses.forEach(b => crowdCount[b.crowd || 'low']++);
    const crowdLabel = crowdCount.high > 0 ? 'high' :
                       crowdCount.medium > 0 ? 'medium' : 'low';

    // Delay count
    const delayed = routeBuses.filter(b => b.status === 'delayed').length;

    results.push({
      routeId:    route.id,
      routeName:  route.name || route.id,
      from, to, direction,
      stopCount,
      etaMins,
      distKm:     distKm.toFixed(1),
      crowd:      crowdLabel,
      delayed,
      busCount:   routeBuses.length,
      avgSpeed:   Math.round(avgSpeed),
      score:      computeScore({ etaMins, crowdLabel, delayed }, pref)
    });
  });
  
  console.log('Found routes:', results.length);
  return results.sort((a, b) => a.score - b.score);
}

function computeScore(r, pref) {
  const crowdPenalty = r.crowdLabel === 'high' ? 20 : r.crowdLabel === 'medium' ? 10 : 0;
  const delayPenalty = r.delayed * 5;
  const timePenalty  = isNaN(r.etaMins) ? 999 : r.etaMins;

  if (pref === 'time')  return timePenalty + delayPenalty * 0.3 + crowdPenalty * 0.1;
  if (pref === 'crowd') return crowdPenalty + timePenalty * 0.3 + delayPenalty * 0.2;
  if (pref === 'delay') return delayPenalty + timePenalty * 0.3 + crowdPenalty * 0.1;
  return timePenalty;
}

function renderRouteResults(results) {
  const el = $('rp-results');
  el.classList.remove('hidden');

  if (!results.length) {
    el.innerHTML = '<div class="empty-state" style="padding:20px">No routes found between these stops.</div>';
    return;
  }

  el.innerHTML = results.slice(0, 3).map((r, i) => {
    const crowdColor = r.crowd === 'high' ? 'var(--red)' :
                       r.crowd === 'medium' ? 'var(--yellow)' : 'var(--green)';
    return `
      <div class="route-option ${i === 0 ? 'best' : ''}">
        <div class="route-option-header">
          <span class="route-option-name">
            ${i === 0 ? '⭐ ' : ''}${r.routeName}
          </span>
          <span class="route-option-eta">${r.etaMins} min</span>
        </div>
        <div class="route-option-meta">
          <span>🛣 ${r.distKm} km</span>
          <span>🚏 ${r.stopCount} stops</span>
          <span style="color:${crowdColor}">👥 ${r.crowd}</span>
          ${r.delayed > 0 ? `<span style="color:var(--yellow)">⚠️ ${r.delayed} delayed</span>` : ''}
          <span>🚌 ${r.busCount} buses</span>
        </div>
      </div>
    `;
  }).join('');
}

// ══════════════════════════════════════════════════════════════
// AI PREDICTIONS (Rule-Based Engine)
// ══════════════════════════════════════════════════════════════
function runAIPredictions() {
  const buses  = Object.values(busData);
  const hour   = new Date().getHours();
  const cards  = [];

  // 1. Time-based crowd prediction
  const peakMorning = hour >= 8  && hour <= 10;
  const peakEvening = hour >= 17 && hour <= 20;
  const isPeak      = peakMorning || peakEvening;

  cards.push({
    type:  isPeak ? 'warning' : 'good',
    title: 'Crowd Prediction',
    body:  isPeak
      ? `Peak hour (${hour}:00). Expect HIGH crowd levels on most routes. Allow extra travel time.`
      : `Off-peak hour. Crowd levels expected to remain LOW to MEDIUM.`,
    badge: isPeak ? 'HIGH' : 'LOW',
    badgeClass: isPeak ? 'badge-high' : 'badge-low'
  });

  // 2. Delay prediction
  const delayed  = buses.filter(b => b.status === 'delayed');
  const pctDelay = buses.length ? (delayed.length / buses.length * 100).toFixed(0) : 0;

  if (delayed.length > 0) {
    cards.push({
      type:  pctDelay > 40 ? 'alert' : 'warning',
      title: 'Delay Alert',
      body:  `${delayed.length} bus${delayed.length > 1 ? 'es' : ''} (${pctDelay}%) running below expected speed. Routes: ${[...new Set(delayed.map(b => b.routeKey))].join(', ')}.`,
      badge: `${pctDelay}% DELAYED`,
      badgeClass: pctDelay > 40 ? 'badge-high' : 'badge-medium'
    });
  } else {
    cards.push({
      type: 'good',
      title: 'Schedule Status',
      body: 'All buses running on schedule. No significant delays detected.',
      badge: 'ON TIME',
      badgeClass: 'badge-low'
    });
  }

  // 3. Speed anomaly
  const avgSpeed = buses.length
    ? buses.reduce((s, b) => s + (b.speed || 0), 0) / buses.length
    : 0;
  const slowBuses = buses.filter(b => (b.speed || 0) < 10 && (b.speed || 0) > 0);

  if (slowBuses.length > 0) {
    cards.push({
      type: 'warning',
      title: 'Traffic Congestion',
      body: `${slowBuses.length} bus${slowBuses.length > 1 ? 'es' : ''} moving < 10 km/h. Possible congestion on ${[...new Set(slowBuses.map(b => b.routeKey))].join(', ')}.`,
      badge: 'SLOW TRAFFIC',
      badgeClass: 'badge-medium'
    });
  }

  // 4. Emergency status
  const emergency = buses.filter(b => b.status === 'emergency');
  if (emergency.length > 0) {
    cards.push({
      type: 'alert',
      title: '🚨 Emergency Active',
      body: `Bus${emergency.length > 1 ? 'es' : ''} ${emergency.map(b => b.id).join(', ')} have active SOS. Control team notified.`,
      badge: 'EMERGENCY',
      badgeClass: 'badge-high'
    });
  }

  // 5. Capacity recommendation
  const overloaded = buses.filter(b => b.crowd === 'high');
  if (overloaded.length > 1) {
    cards.push({
      type: 'warning',
      title: 'Capacity Advisory',
      body: `${overloaded.length} buses at HIGH capacity. Consider redistributing fleet or adding reserve buses on ${[...new Set(overloaded.map(b => b.routeKey))].join(', ')}.`,
      badge: 'ACTION NEEDED',
      badgeClass: 'badge-medium'
    });
  }

  // 6. ETA quality
  if (avgSpeed > 40) {
    cards.push({
      type: 'good',
      title: 'Optimal Throughput',
      body: `Average fleet speed ${avgSpeed.toFixed(1)} km/h — well above minimum threshold. ETA calculations are highly accurate.`,
      badge: 'OPTIMAL',
      badgeClass: 'badge-low'
    });
  }

  // Render
  $('ai-predictions').innerHTML = cards.map(c => `
    <div class="ai-card ${c.type}">
      <div class="ai-card-title">${c.title}</div>
      <div class="ai-card-body">${c.body}</div>
      ${c.badge ? `<span class="ai-card-badge ${c.badgeClass}">${c.badge}</span>` : ''}
    </div>
  `).join('');
}

// ══════════════════════════════════════════════════════════════
// UTILITIES
// ══════════════════════════════════════════════════════════════
function timeSince(ts) {
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 60)  return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec/60)}m ago`;
  return `${Math.floor(sec/3600)}h ago`;
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) ** 2 +
            Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
            Math.sin(dLon/2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function showToast(msg, isError = false) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position:fixed; bottom:110px; left:50%; transform:translateX(-50%);
    background:${isError ? 'var(--red)' : '#00e676'};
    color:${isError ? 'white' : '#000'};
    padding:12px 24px; border-radius:6px;
    font-family:var(--font-display); font-size:14px; font-weight:600;
    z-index:999; letter-spacing:0.5px;
    box-shadow:0 4px 20px rgba(0,0,0,0.5);
    animation:auth-in 0.3s ease;
  `;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// ══════════════════════════════════════════════════════════════
// BOOT
// ══════════════════════════════════════════════════════════════
initAuth();