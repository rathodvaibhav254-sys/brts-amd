import React, { useState } from "react";
import { Search, Compass, AlertCircle } from "lucide-react";

export default function FleetPanel({ buses, onFocusBus }) {
  const [search, setSearch] = useState("");

  const filteredBuses = buses.filter(
    (bus) =>
      bus.id.toLowerCase().includes(search.toLowerCase()) ||
      (bus.routeKey || "").toLowerCase().includes(search.toLowerCase())
  );

  const getCrowdPips = (crowd) => {
    const activePips = crowd === "high" ? 3 : crowd === "medium" ? 2 : 1;
    return (
      <div className="crowd-bar" title={`Crowd level: ${crowd || "low"}`}>
        {[1, 2, 3].map((pip) => (
          <span
            key={pip}
            className={`crowd-pip ${pip <= activePips ? `filled ${crowd || "low"}` : ""}`}
          />
        ))}
        <span className="crowd-label">{crowd || "low"}</span>
      </div>
    );
  };

  const formatTimeAgo = (ts) => {
    if (!ts) return "—";
    const sec = Math.floor((Date.now() - ts) / 1000);
    if (sec < 60) return `${sec}s ago`;
    if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
    return `${Math.floor(sec / 3600)}h ago`;
  };

  return (
    <div className="panel panel-table">
      <div className="panel-header">
        <span className="panel-title">
          <div className="panel-title-icon">🚌</div>
          FLEET MONITOR
        </span>
        <div className="table-search-wrap">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            placeholder="Filter by Bus ID or Route..."
            className="table-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="table-wrap">
        <table className="fleet-table">
          <thead>
            <tr>
              <th>BUS ID</th>
              <th>ROUTE</th>
              <th>SPEED</th>
              <th>CROWD</th>
              <th>STATUS</th>
              <th>LAST UPDATE</th>
            </tr>
          </thead>
          <tbody>
            {filteredBuses.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", padding: "30px", color: "var(--t3)" }}>
                  No active buses found matching the search.
                </td>
              </tr>
            ) : (
              filteredBuses.map((bus) => {
                const isEmergency = bus.status === "emergency";
                return (
                  <tr
                    key={bus.id}
                    className={`fleet-row ${isEmergency ? "emergency-row" : ""}`}
                    onClick={() => bus.lat && bus.lng && onFocusBus(bus.lat, bus.lng)}
                    title="Click to center on map"
                  >
                    <td className="bus-id-cell font-mono">{bus.id}</td>
                    <td style={{ color: "var(--text-secondary)" }}>{bus.routeKey || "—"}</td>
                    <td>
                      <span className="speed-val font-mono">{Math.round(bus.speed || 0)}</span>
                      <span style={{ fontSize: "10px", color: "var(--t3)", marginLeft: "4px" }}>km/h</span>
                    </td>
                    <td>{getCrowdPips(bus.crowd)}</td>
                    <td>
                      <span className={`status-chip ${bus.status || "normal"}`}>
                        {isEmergency ? "🚨 " : bus.status === "delayed" ? "⚠️ " : "✓ "}
                        {bus.status?.toUpperCase() || "NORMAL"}
                      </span>
                    </td>
                    <td className="font-mono text-muted">{formatTimeAgo(bus.updatedAt)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
