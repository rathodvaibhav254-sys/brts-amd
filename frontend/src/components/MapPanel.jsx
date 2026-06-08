import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";

// Leaflet styles reset
import "leaflet/dist/leaflet.css";

// ── Smooth coordinate interpolation component
function SmoothMarker({ position, icon, children }) {
  const [currentPos, setCurrentPos] = useState(position);
  const posRef = useRef(position);

  useEffect(() => {
    // If coordinates are unchanged, don't run animation
    if (posRef.current[0] === position[0] && posRef.current[1] === position[1]) return;

    const startLat = posRef.current[0];
    const startLng = posRef.current[1];
    const endLat = position[0];
    const endLng = position[1];
    const duration = 2500; // Interpolation duration in ms
    const startTime = performance.now();

    let animId;

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // cubic ease-out
      const ease = 1 - Math.pow(1 - progress, 3);

      const currentLat = startLat + (endLat - startLat) * ease;
      const currentLng = startLng + (endLng - startLng) * ease;

      const newPos = [currentLat, currentLng];
      setCurrentPos(newPos);
      posRef.current = newPos;

      if (progress < 1) {
        animId = requestAnimationFrame(animate);
      }
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [position]);

  return (
    <Marker position={currentPos} icon={icon}>
      {children}
    </Marker>
  );
}

// ── Map controller helper to reset view or focus on a bus
function MapController({ center, zoom, focusCoords }) {
  const map = useMap();
  
  useEffect(() => {
    if (focusCoords) {
      map.setView(focusCoords, 15, { animate: true });
    }
  }, [focusCoords, map]);

  return null;
}

export default function MapPanel({ buses, routes, focusCoords }) {
  const defaultCenter = [23.0225, 72.5714];
  const defaultZoom = 13;
  const [mapInstance, setMapInstance] = useState(null);

  const getBusIcon = (bus) => {
    const color =
      bus.status === "emergency" ? "#ff3355" :
      bus.status === "delayed"   ? "#ffd166" :
      "#00f5a0";

    const emoji =
      bus.status === "emergency" ? "🚨" :
      bus.status === "delayed"   ? "⚠️" : "🚌";

    const pulseClass = bus.status === "emergency" ? "pulse-emergency" : 
                       bus.status === "delayed" ? "pulse-delayed" : "pulse-normal";

    return L.divIcon({
      className: "",
      html: `
        <div class="map-bus-marker ${pulseClass}" style="
          border-color: ${color};
          color: ${color};
          background: ${color}22;
        ">
          <span class="marker-emoji">${emoji}</span>
          <span class="marker-id">${bus.id}</span>
        </div>
      `,
      iconAnchor: [32, 14],
    });
  };

  const handleResetView = () => {
    if (mapInstance) {
      mapInstance.setView(defaultCenter, defaultZoom, { animate: true });
    }
  };

  return (
    <div className="panel panel-map">
      <div className="panel-header">
        <span className="panel-title">
          <div className="panel-title-icon">🗺</div>
          LIVE FLEET MAP
        </span>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button className="map-ctrl-btn reset-btn" onClick={handleResetView} title="Reset View">
            ⊙ Reset View
          </button>
          <div className="live-badge">
            <span className="live-dot animate-pulse"></span>
            LIVE FEED
          </div>
        </div>
      </div>

      <div className="map-wrapper" style={{ position: "relative", height: "450px" }}>
        <MapContainer
          center={defaultCenter}
          zoom={defaultZoom}
          zoomControl={false}
          attributionControl={false}
          style={{ height: "100%", width: "100%", borderRadius: "12px", background: "#020813" }}
          ref={setMapInstance}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            className="leaflet-dark-tiles"
          />

          <MapController focusCoords={focusCoords} />

          {/* Render Route Polylines */}
          {Object.entries(routes).map(([key, route]) => (
            <Polyline
              key={key}
              positions={route.waypoints}
              pathOptions={{
                color: route.color || "#00d4ff",
                weight: 4,
                opacity: 0.85,
                className: "glowing-route-line"
              }}
            />
          ))}

          {/* Render Active Buses */}
          {buses.map((bus) => {
            if (!bus.lat || !bus.lng) return null;
            const crowdColor = bus.crowd === "high" ? "#ff3355" : bus.crowd === "medium" ? "#ffd166" : "#00f5a0";
            return (
              <SmoothMarker
                key={bus.id}
                position={[bus.lat, bus.lng]}
                icon={getBusIcon(bus)}
              >
                <Popup>
                  <div className="map-popup-content">
                    <h3>{bus.id}</h3>
                    <div className="popup-row">
                      <span>Route:</span>
                      <strong>{bus.routeKey}</strong>
                    </div>
                    <div className="popup-row">
                      <span>Speed:</span>
                      <strong>{Math.round(bus.speed)} km/h</strong>
                    </div>
                    <div className="popup-row">
                      <span>Crowd Level:</span>
                      <strong style={{ color: crowdColor }}>{bus.crowd?.toUpperCase() || "LOW"}</strong>
                    </div>
                    <div className="popup-row">
                      <span>Direction:</span>
                      <strong>{Math.round(bus.direction || 0)}°</strong>
                    </div>
                    <div className="popup-row font-mono">
                      <span>Updated:</span>
                      <span>{bus.updatedAt ? new Date(bus.updatedAt).toLocaleTimeString() : "—"}</span>
                    </div>
                  </div>
                </Popup>
              </SmoothMarker>
            );
          })}
        </MapContainer>
        
        {/* Custom Zoom Controls overlay */}
        <div className="map-zoom-controls">
          <button onClick={() => mapInstance?.zoomIn()}>+</button>
          <button onClick={() => mapInstance?.zoomOut()}>−</button>
        </div>

        {/* Map Legend */}
        <div className="map-legend">
          <div className="legend-row">
            <span className="legend-indicator normal"></span> Normal
          </div>
          <div className="legend-row">
            <span className="legend-indicator delayed"></span> Delayed
          </div>
          <div className="legend-row">
            <span className="legend-indicator emergency"></span> Emergency
          </div>
        </div>
      </div>
    </div>
  );
}
