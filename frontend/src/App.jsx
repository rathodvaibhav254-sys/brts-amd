import React, { useState, useEffect } from "react";
import { database, auth } from "./firebase";
import { ref, onValue, push, set, update, get } from "firebase/database";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { LogOut, Sun, Moon, Shield, Radio, ShieldAlert } from "lucide-react";

// Components
import CyberGrid from "./components/CyberGrid";
import AuthPanel from "./components/AuthPanel";
import MapPanel from "./components/MapPanel";
import FleetPanel from "./components/FleetPanel";
import AnalyticsPanel from "./components/AnalyticsPanel";
import RoutePanel from "./components/RoutePanel";
import AIPanel from "./components/AIPanel";
import AdminPanel from "./components/AdminPanel";

export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [connected, setConnected] = useState(false);
  const [time, setTime] = useState("");
  const [theme, setTheme] = useState("dark");

  // Map focus state
  const [focusCoords, setFocusCoords] = useState(null);

  // SOS modal states
  const [sosModalOpen, setSosModalOpen] = useState(false);
  const [sosLocation, setSosLocation] = useState(null);
  const [sosLocStatus, setSosLocStatus] = useState("");

  // ── 1. Live Clock
  useEffect(() => {
    const updateTime = () => {
      setTime(new Date().toLocaleTimeString("en-IN", { hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // ── 2. Firebase Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Load user profile role
        const snap = await get(ref(database, `users/${currentUser.uid}`));
        if (snap.exists()) {
          setProfile(snap.val());
        } else {
          // Fallback profile
          setProfile({
            name: currentUser.displayName || currentUser.email.split("@")[0],
            role: "user",
          });
        }
      } else {
        setUser(null);
        setProfile(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // ── 3. Real-time Firebase listeners
  useEffect(() => {
    if (!user) return;

    // A. Connection status
    const connRef = ref(database, ".info/connected");
    const unsubConn = onValue(connRef, (snap) => {
      setConnected(!!snap.val());
    });

    // B. Buses telemetry
    const busesRef = ref(database, "buses");
    const unsubBuses = onValue(busesRef, (snap) => {
      const list = [];
      if (snap.exists()) {
        snap.forEach((child) => {
          list.push({ id: child.key, ...child.val() });
        });
      }
      setBuses(list);
    });

    // C. Routes configuration
    const routesRef = ref(database, "routes");
    const unsubRoutes = onValue(routesRef, (snap) => {
      if (snap.exists()) {
        setRoutes(snap.val());
      }
    });

    // D. Active emergency alerts
    const alertsRef = ref(database, "alerts");
    const unsubAlerts = onValue(alertsRef, (snap) => {
      const list = [];
      if (snap.exists()) {
        snap.forEach((child) => {
          list.push({ id: child.key, ...child.val() });
        });
      }
      setAlerts(list);
    });

    return () => {
      unsubConn();
      unsubBuses();
      unsubRoutes();
      unsubAlerts();
    };
  }, [user]);

  // ── 4. Theme Toggle
  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
  };

  // ── 5. Logout
  const handleLogout = () => signOut(auth);

  // ── 6. KPI metrics
  const activeBusesCount = buses.length;
  const avgSpeed = buses.length
    ? (buses.reduce((sum, b) => sum + (b.speed || 0), 0) / buses.length).toFixed(1)
    : "--";
  const delayedCount = buses.filter((b) => b.status === "delayed").length;
  const activeSOS = alerts.filter((a) => a.type === "sos" && a.status === "active");
  const activeSOSCount = activeSOS.length;
  const estPassengers = buses.reduce((sum, b) => {
    return sum + (b.crowd === "high" ? 45 : b.crowd === "medium" ? 25 : 10);
  }, 0);

  // ── 7. SOS button trigger
  const handleSOSClick = () => {
    setSosModalOpen(true);
    setSosLocation(null);
    setSosLocStatus("📍 Aquiring emergency GPS parameters...");

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setSosLocation(coords);
          setSosLocStatus(`📍 GPS Locked: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`);
        },
        (err) => {
          setSosLocStatus("⚠️ Coordinates unavailable — Alert will be sent without GPS");
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setSosLocStatus("⚠️ Geolocation protocol unsupported by device browser");
    }
  };

  const confirmSOS = async () => {
    if (!user) return;

    // Helper: Haversine distance to locate nearest active bus
    const haversine = (lat1, lon1, lat2, lon2) => {
      const R = 6371; // km
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    let nearestBus = null;
    if (sosLocation) {
      let minDist = Infinity;
      buses.forEach((bus) => {
        if (bus.lat && bus.lng) {
          const d = haversine(sosLocation.lat, sosLocation.lng, bus.lat, bus.lng);
          if (d < minDist) {
            minDist = d;
            nearestBus = bus;
          }
        }
      });
    }

    const payload = {
      type: "sos",
      userId: user.uid,
      userName: profile?.name || user.email.split("@")[0],
      userEmail: user.email,
      emergencyContact: profile?.emergencyContacts || "",
      location: sosLocation,
      busId: nearestBus?.id || null,
      timestamp: Date.now(),
      status: "active",
    };

    try {
      const alertRef = push(ref(database, "alerts"));
      await set(alertRef, payload);

      // Flag nearest bus as emergency
      if (nearestBus) {
        await update(ref(database, `buses/${nearestBus.id}`), { status: "emergency" });
      }
      setSosModalOpen(false);
    } catch (e) {
      console.error(e);
      setSosLocStatus("Critical fail sending dispatch payload. Call 112 directly.");
    }
  };

  const handleFocusBus = (lat, lng) => {
    setFocusCoords([lat, lng]);
    // Reset focus coordinates after map updates center, so user can pan around
    setTimeout(() => setFocusCoords(null), 1000);
  };

  // ── Render Auth view if not logged in
  if (!user) {
    return (
      <>
        <CyberGrid />
        <AuthPanel />
      </>
    );
  }

  return (
    <div className="app">
      <CyberGrid />

      {/* HEADER NAVBAR */}
      <header className="header">
        <div className="header-left">
          <div className="header-logo">⚡</div>
          <div>
            <h1 className="header-title">BRTS COMMAND</h1>
            <p className="header-sub">Ahmedabad Transit System · Control Hub</p>
          </div>
        </div>

        <div className="header-center">
          <div className="system-status">
            <span className={`status-dot ${connected ? "connected" : "error"}`}></span>
            <span>{connected ? "TELEMETRY CONNECTED" : "RECONNECTING DATABASE..."}</span>
          </div>
        </div>

        <div className="header-right">
          <div className="header-time">{time}</div>

          <button className="theme-btn" onClick={toggleTheme} title="Toggle theme mode">
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          <div className="user-badge">
            <div className="user-avatar">{profile?.name ? profile.name[0].toUpperCase() : "U"}</div>
            <div className="user-info">
              <span className="user-name">{profile?.name || "Loading..."}</span>
              <span className={`role-badge ${profile?.role || "user"}`}>
                {profile?.role || "Passenger"}
              </span>
            </div>
          </div>

          <button className="logout-btn" onClick={handleLogout} title="Sign Out">
            <LogOut size={13} />
            <span>Exit</span>
          </button>
        </div>
      </header>

      {/* ALERTS TICKER BANNER */}
      {activeSOSCount > 0 && (
        <div className="alerts-banner">
          <span className="alert-tag">DISPATCH ALERT</span>
          <div className="alert-scroll">
            <div className="alert-scroll-inner">
              {activeSOS.map((alert) => (
                <span key={alert.id} className="alert-item">
                  🚨 CRITICAL EMERGENCY • Call Origin: {alert.userName} • Assigned Bus: {alert.busId || "None"} • Local Time: {new Date(alert.timestamp).toLocaleTimeString()} • Coordinates: {alert.location ? `${alert.location.lat.toFixed(4)}, ${alert.location.lng.toFixed(4)}` : "Unavailable"}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* KPI STRIP */}
      <div className="kpi-strip">
        <div className="kpi-card" title="Buses in current transit cycle">
          <div className="kpi-top">
            <div className="kpi-icon">🚌</div>
            <span className="kpi-trend up">↑ 3%</span>
          </div>
          <div className="kpi-val">{activeBusesCount}</div>
          <div className="kpi-label">Active Fleet Units</div>
        </div>

        <div className="kpi-card" title="Combined transit average velocity">
          <div className="kpi-top">
            <div className="kpi-icon">⚡</div>
            <span className="kpi-trend flat">→ 0%</span>
          </div>
          <div className="kpi-val">{avgSpeed}</div>
          <div className="kpi-label">Avg Fleet Speed (km/h)</div>
        </div>

        <div className="kpi-card alert-kpi has-sos" title="Critical emergency alerts">
          <div className="kpi-top">
            <div className="kpi-icon" style={{ background: "rgba(255,51,85,0.15)", color: "var(--red)" }}>
              <ShieldAlert size={16} />
            </div>
            <span className="kpi-trend down">ALERT</span>
          </div>
          <div className="kpi-val" style={{ color: activeSOSCount > 0 ? "var(--red)" : "inherit" }}>
            {activeSOSCount}
          </div>
          <div className="kpi-label">Active SOS Dispatches</div>
        </div>

        <div className="kpi-card" title="Transit units behind schedule indicators">
          <div className="kpi-top">
            <div className="kpi-icon" style={{ background: "rgba(255,209,102,0.15)", color: "var(--yellow)" }}>
              ⚠️
            </div>
            <span className="kpi-trend down">↓ 1%</span>
          </div>
          <div className="kpi-val">{delayedCount}</div>
          <div className="kpi-label">Delayed Fleet Units</div>
        </div>

        <div className="kpi-card" title="Current transit passenger load estimate">
          <div className="kpi-top">
            <div className="kpi-icon" style={{ background: "rgba(176,110,255,0.15)", color: "var(--purple)" }}>
              👥
            </div>
            <span className="kpi-trend up">↑ 8%</span>
          </div>
          <div className="kpi-val">{estPassengers}</div>
          <div className="kpi-label">Transit Passengers</div>
        </div>
      </div>

      {/* DASHBOARD LAYOUT GRID */}
      <div className="main-grid">
        {/* Map visualization */}
        <MapPanel buses={buses} routes={routes} focusCoords={focusCoords} />

        {/* Bus list table */}
        <FleetPanel buses={buses} onFocusBus={handleFocusBus} />

        {/* Route finding planner */}
        <RoutePanel routes={routes} buses={buses} />

        {/* Admin alerts resolution panel */}
        {profile?.role === "admin" && (
          <AdminPanel alerts={alerts} onFocusBus={handleFocusBus} />
        )}

        {/* Decision predicting module */}
        <AIPanel buses={buses} />

        {/* Analytics speeds and capacities */}
        <AnalyticsPanel buses={buses} />
      </div>

      {/* FLOATING SOS TRIGGER BUTTON */}
      <button className="sos-btn" onClick={handleSOSClick} title="Trigger Emergency SOS Protocol">
        <span className="sos-ring"></span>
        <span className="sos-ring delay"></span>
        SOS
      </button>

      {/* SOS TRIGGER MODAL */}
      {sosModalOpen && (
        <div className="modal-overlay">
          <div className="sos-modal-card">
            <div className="sos-modal-icon">🚨</div>
            <h2>Broadcast Emergency Beacon?</h2>
            <p>Your name, registered emergency contact details, and current GPS parameters will be shared with search controllers and nearby units.</p>
            <div className="sos-location-status">{sosLocStatus}</div>
            <div className="sos-modal-actions">
              <button className="btn-danger" onClick={confirmSOS}>
                Send SOS Alert
              </button>
              <button className="btn-outline" onClick={() => setSosModalOpen(false)}>
                Cancel
              </button>
            </div>
            <a href="tel:112" className="sos-call-link">
              📞 Direct Call Emergency Responder (112)
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
