// ═══════════════════════════════════════════════════════════════
// backend/simulator.js — BRTS Backend Simulator
// Runs as Node.js process. Writes to Firebase Realtime DB.
// Deploy as Firebase Function or run standalone: node simulator.js
// ═══════════════════════════════════════════════════════════════

const admin = require('firebase-admin');

// ──────────────────────────────────────────────────────────────
// Firebase Admin Init
// Download serviceAccountKey.json from:
// Firebase Console → Project Settings → Service Accounts
// ──────────────────────────────────────────────────────────────
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential:  admin.credential.cert(serviceAccount),
  databaseURL: 'https://brts-amd-default-rtdb.asia-southeast1.firebasedatabase.app'
});

const db = admin.database();

// ═══════════════════════════════════════════════════════════════
// ROUTE DEFINITIONS
// These are seeded once to Firebase /routes
// Waypoints are [lat, lng] arrays along Ahmedabad BRTS corridors
// ═══════════════════════════════════════════════════════════════
const ROUTES = {
  R1: {
    name: 'Naroda–Nehru Nagar',
    color: '#00d4ff',
    stops: ['Naroda', 'Odhav', 'Vastral', 'Nikol', 'Rabari Colony', 'Nehru Nagar'],
    waypoints: [
      [23.0775, 72.6648], [23.0701, 72.6521], [23.0613, 72.6398],
      [23.0534, 72.6275], [23.0456, 72.6152], [23.0369, 72.6033]
    ]
  },
  R2: {
    name: 'Thaltej–Gota',
    color: '#00e676',
    stops: ['Thaltej', 'Bodakdev', 'Judges Bungalow', 'Vijay Cross Road', 'Gujarat University', 'Gota'],
    waypoints: [
      [23.0501, 72.5082], [23.0478, 72.5216], [23.0456, 72.5350],
      [23.0428, 72.5490], [23.0404, 72.5625], [23.0380, 72.5760]
    ]
  },
  R3: {
    name: 'Maninagar–APMC',
    color: '#ffca28',
    stops: ['Maninagar', 'Rajpur', 'Vatva', 'Narol', 'Isanpur', 'APMC'],
    waypoints: [
      [22.9975, 72.6074], [22.9890, 72.6198], [22.9805, 72.6322],
      [22.9720, 72.6446], [22.9635, 72.6570], [22.9550, 72.6694]
    ]
  },
  R4: {
    name: 'Sabarmati–Kalupur',
    color: '#ff6d00',
    stops: ['Sabarmati', 'Chandlodia', 'Motera', 'Visat', 'Ranip', 'Kalupur'],
    waypoints: [
      [23.1027, 72.5878], [23.0910, 72.5820], [23.0792, 72.5762],
      [23.0675, 72.5704], [23.0557, 72.5646], [23.0228, 72.5990]
    ]
  },
  R5: {
    name: 'Science City–Satellite',
    color: '#e040fb',
    stops: ['Science City', 'Sola', 'Gurukul', 'Drive-in', 'Memnagar', 'Satellite'],
    waypoints: [
      [23.0837, 72.5288], [23.0710, 72.5245], [23.0583, 72.5201],
      [23.0456, 72.5158], [23.0329, 72.5114], [23.0202, 72.5071]
    ]
  }
};

// ═══════════════════════════════════════════════════════════════
// BUS FLEET DEFINITIONS
// Each bus tracks position along route waypoints
// ═══════════════════════════════════════════════════════════════
const FLEET = [
  { id: 'BRT-01', routeKey: 'R1', waypointIdx: 0, direction: 1, speed: 35 },
  { id: 'BRT-02', routeKey: 'R1', waypointIdx: 2, direction: 1, speed: 28 },
  { id: 'BRT-03', routeKey: 'R2', waypointIdx: 0, direction: 1, speed: 40 },
  { id: 'BRT-04', routeKey: 'R2', waypointIdx: 3, direction: -1, speed: 32 },
  { id: 'BRT-05', routeKey: 'R3', waypointIdx: 1, direction: 1, speed: 38 },
  { id: 'BRT-06', routeKey: 'R3', waypointIdx: 4, direction: -1, speed: 25 },
  { id: 'BRT-07', routeKey: 'R4', waypointIdx: 0, direction: 1, speed: 45 },
  { id: 'BRT-08', routeKey: 'R4', waypointIdx: 2, direction: 1, speed: 30 },
  { id: 'BRT-09', routeKey: 'R5', waypointIdx: 1, direction: 1, speed: 42 },
  { id: 'BRT-10', routeKey: 'R5', waypointIdx: 3, direction: -1, speed: 22 }
];

// ═══════════════════════════════════════════════════════════════
// IN-MEMORY BUS STATE (simulator state, not DB)
// ═══════════════════════════════════════════════════════════════
const busStates = {};

FLEET.forEach(bus => {
  const route     = ROUTES[bus.routeKey];
  const waypoints = route.waypoints;
  const wp        = waypoints[bus.waypointIdx];

  busStates[bus.id] = {
    id:           bus.id,
    routeKey:     bus.routeKey,
    waypointIdx:  bus.waypointIdx,
    progress:     0,           // 0–1 between current and next waypoint
    direction:    bus.direction,
    lat:          wp[0],
    lng:          wp[1],
    speed:        bus.speed,
    crowd:        randomCrowd(),
    status:       'normal',
    updatedAt:    Date.now()
  };
});

// ═══════════════════════════════════════════════════════════════
// SEEDING: Write routes to Firebase once
// ═══════════════════════════════════════════════════════════════
async function seedRoutes() {
  console.log('[BRTS Simulator] Seeding routes...');
  const routesRef = db.ref('routes');
  const snapshot  = await routesRef.once('value');
  if (!snapshot.exists()) {
    await routesRef.set(ROUTES);
    console.log('[BRTS Simulator] Routes seeded to Firebase ✓');
  } else {
    console.log('[BRTS Simulator] Routes already exist in Firebase');
  }
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════
function randomCrowd() {
  const hour = new Date().getHours();
  const peakMorning = hour >= 8  && hour <= 10;
  const peakEvening = hour >= 17 && hour <= 20;

  if (peakMorning || peakEvening) {
    const r = Math.random();
    return r < 0.5 ? 'high' : r < 0.8 ? 'medium' : 'low';
  } else if (hour >= 11 && hour <= 16) {
    const r = Math.random();
    return r < 0.3 ? 'medium' : r < 0.1 ? 'high' : 'low';
  } else {
    return Math.random() < 0.2 ? 'medium' : 'low';
  }
}

function bearingDeg(lat1, lon1, lat2, lon2) {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const la1  = lat1 * Math.PI / 180;
  const la2  = lat2 * Math.PI / 180;
  const x    = Math.sin(dLon) * Math.cos(la2);
  const y    = Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(dLon);
  return ((Math.atan2(x, y) * 180 / Math.PI) + 360) % 360;
}

function haversineDist(lat1, lon1, lat2, lon2) {
  const R    = 6371000; // metres
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a    = Math.sin(dLat/2) ** 2 +
               Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Interpolate between two waypoints
function interpolate(wp1, wp2, t) {
  return [
    wp1[0] + (wp2[0] - wp1[0]) * t,
    wp1[1] + (wp2[1] - wp1[1]) * t
  ];
}

// ═══════════════════════════════════════════════════════════════
// AI PREDICTION — DELAY DETECTION (Backend)
// ═══════════════════════════════════════════════════════════════
function predictStatus(bus, expectedSpeed) {
  // If emergency flag is set externally, don't override
  if (bus.status === 'emergency') return 'emergency';
  if (bus.speed < expectedSpeed * 0.5) return 'delayed';
  return 'normal';
}

// ═══════════════════════════════════════════════════════════════
// MAIN SIMULATION TICK
// Called every 2–5 seconds per bus
// ═══════════════════════════════════════════════════════════════
function simulateBus(busId) {
  const state  = busStates[busId];
  const route  = ROUTES[state.routeKey];
  const wps    = route.waypoints;
  const n      = wps.length;

  // Vary speed slightly (±5 km/h) + occasional slowdown
  const slowFactor = Math.random() < 0.08 ? 0.3 : 1; // 8% chance of congestion
  const baseSpeed  = FLEET.find(b => b.id === busId).speed;
  state.speed = Math.max(5, baseSpeed + (Math.random() - 0.5) * 10) * slowFactor;

  // Advance progress: speed(km/h) → metres per tick
  const tickMs      = 3000;
  const distPerTick = (state.speed / 3.6) * (tickMs / 1000); // metres

  // Distance to next waypoint
  const curIdx  = state.waypointIdx;
  const nextIdx = clamp(curIdx + state.direction, 0, n - 1);
  const curWP   = wps[curIdx];
  const nextWP  = wps[nextIdx];
  const segDist = haversineDist(curWP[0], curWP[1], nextWP[0], nextWP[1]);

  state.progress += distPerTick / segDist;

  if (state.progress >= 1) {
    state.progress     = 0;
    state.waypointIdx  = nextIdx;

    // Reverse direction at endpoints
    if (state.waypointIdx >= n - 1) state.direction = -1;
    if (state.waypointIdx <= 0)     state.direction =  1;
  }

  // Interpolate lat/lng
  const [lat, lng] = interpolate(
    wps[state.waypointIdx],
    wps[clamp(state.waypointIdx + state.direction, 0, n - 1)],
    state.progress
  );

  state.lat       = lat;
  state.lng       = lng;
  state.direction = bearingDeg(curWP[0], curWP[1], nextWP[0], nextWP[1]);

  // Update crowd every ~30s
  if (Math.random() < 0.1) state.crowd = randomCrowd();

  // AI delay prediction
  if (state.status !== 'emergency') {
    state.status = predictStatus(state, baseSpeed);
  }

  state.updatedAt = Date.now();
  return state;
}

function clamp(v, min, max) { return Math.min(Math.max(v, min), max); }

// ═══════════════════════════════════════════════════════════════
// WRITE BUS STATE TO FIREBASE
// ═══════════════════════════════════════════════════════════════
async function writeBusToFirebase(busId) {
  const state = busStates[busId];
  const payload = {
    id:        state.id,
    routeKey:  state.routeKey,
    lat:       state.lat,
    lng:       state.lng,
    speed:     Math.round(state.speed * 10) / 10,
    direction: Math.round(state.direction),
    crowd:     state.crowd,
    status:    state.status,
    updatedAt: state.updatedAt
  };

  try {
    await db.ref(`buses/${busId}`).update(payload);
  } catch (e) {
    console.error(`[${busId}] Firebase write error:`, e.message);
  }
}

// ═══════════════════════════════════════════════════════════════
// ANALYTICS LOGGING
// ═══════════════════════════════════════════════════════════════
async function logAnalyticsEvent(type, data) {
  try {
    await db.ref('analytics/events').push({
      type,
      timestamp: Date.now(),
      ...data
    });
  } catch (_) {}
}

// ═══════════════════════════════════════════════════════════════
// EMERGENCY STATUS SYNC
// Check /alerts for active SOS and keep bus status in sync
// ═══════════════════════════════════════════════════════════════
function watchAlerts() {
  db.ref('alerts').on('value', snap => {
    if (!snap.exists()) return;
    snap.forEach(child => {
      const alert = child.val();
      if (alert.type === 'sos' && alert.busId) {
        if (alert.status === 'active' && busStates[alert.busId]) {
          busStates[alert.busId].status = 'emergency';
        } else if (alert.status === 'resolved' && busStates[alert.busId]) {
          if (busStates[alert.busId].status === 'emergency') {
            busStates[alert.busId].status = 'normal';
          }
        }
      }
    });
  });
}

// ═══════════════════════════════════════════════════════════════
// SCHEDULER: Stagger bus updates to avoid burst writes
// ═══════════════════════════════════════════════════════════════
function scheduleBus(busId, delayMs) {
  setTimeout(async () => {
    async function tick() {
      simulateBus(busId);
      await writeBusToFirebase(busId);
      // Random 2–5 second interval
      const next = 2000 + Math.random() * 3000;
      setTimeout(tick, next);
    }
    tick();
  }, delayMs);
}

// ═══════════════════════════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════════════════════════
async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   BRTS Backend Simulator — Ahmedabad     ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');

  await seedRoutes();

  watchAlerts();

  // Stagger bus starts: 200ms apart
  Object.keys(busStates).forEach((busId, i) => {
    scheduleBus(busId, i * 200);
    console.log(`[BRTS] Scheduled bus ${busId} (route ${busStates[busId].routeKey})`);
  });

  // Analytics heartbeat every 60s
  setInterval(() => {
    const buses = Object.values(busStates);
    const avgSpeed = buses.reduce((s, b) => s + b.speed, 0) / buses.length;
    const delayed  = buses.filter(b => b.status === 'delayed').length;
    logAnalyticsEvent('heartbeat', {
      activeBuses: buses.length,
      avgSpeed:    Math.round(avgSpeed),
      delayed,
      emergency:   buses.filter(b => b.status === 'emergency').length
    });
  }, 60000);

  console.log(`\n[BRTS] Simulator running. ${Object.keys(busStates).length} buses active.\n`);
}

main().catch(console.error);
