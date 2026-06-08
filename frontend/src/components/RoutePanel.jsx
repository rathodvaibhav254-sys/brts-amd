import React, { useState, useEffect } from "react";
import { ArrowUpDown, Zap, Users, Clock } from "lucide-react";

export default function RoutePanel({ routes, buses }) {
  const [fromStop, setFromStop] = useState("");
  const [toStop, setToStop] = useState("");
  const [pref, setPref] = useState("time"); // 'time' | 'crowd' | 'delay'
  const [results, setResults] = useState([]);
  const [stopsList, setStopsList] = useState([]);

  // Aggregate unique stops sorted alphabetically
  useEffect(() => {
    const uniqueStops = new Set();
    Object.values(routes).forEach((route) => {
      (route.stops || []).forEach((stop) => uniqueStops.add(stop));
    });
    setStopsList([...uniqueStops].sort());
  }, [routes]);

  const handleSwap = () => {
    const temp = fromStop;
    setFromStop(toStop);
    setToStop(temp);
    setResults([]);
  };

  const handleSearch = () => {
    if (!fromStop || !toStop) return;
    if (fromStop === toStop) return;

    const matchedResults = [];
    const normalizedFrom = fromStop.trim().toLowerCase();
    const normalizedTo = toStop.trim().toLowerCase();

    Object.values(routes).forEach((route) => {
      const stops = (route.stops || []).map((s) => s.trim().toLowerCase());
      const fi = stops.indexOf(normalizedFrom);
      const ti = stops.indexOf(normalizedTo);

      if (fi === -1 || ti === -1) return;

      const direction = fi < ti ? 1 : -1;
      const stopCount = Math.abs(ti - fi);

      // Find buses on this route
      const routeBuses = buses.filter((b) => b.routeKey === route.id);
      const avgSpeed = routeBuses.length
        ? routeBuses.reduce((s, b) => s + (b.speed || 30), 0) / routeBuses.length
        : 30;

      // Distance estimate: 0.8 km per stop
      const distKm = stopCount * 0.8;
      const etaMins = avgSpeed > 0 ? Math.ceil((distKm / avgSpeed) * 60) : 15;

      // Crowd level aggregating
      const crowdCount = { low: 0, medium: 0, high: 0 };
      routeBuses.forEach((b) => crowdCount[b.crowd || "low"]++);
      const crowdLabel =
        crowdCount.high > 0 ? "high" : crowdCount.medium > 0 ? "medium" : "low";

      // Delay count
      const delayed = routeBuses.filter((b) => b.status === "delayed").length;

      matchedResults.push({
        routeId: route.id,
        routeName: route.name || route.id,
        fromStop,
        toStop,
        direction,
        stopCount,
        etaMins,
        distKm: distKm.toFixed(1),
        crowd: crowdLabel,
        delayed,
        busCount: routeBuses.length,
        avgSpeed: Math.round(avgSpeed),
        score: computeScore({ etaMins, crowd: crowdLabel, delayed }, pref),
      });
    });

    // Sort by computed priority score (lower is better)
    matchedResults.sort((a, b) => a.score - b.score);
    setResults(matchedResults);
  };

  const computeScore = (r, preference) => {
    const crowdPenalty = r.crowd === "high" ? 20 : r.crowd === "medium" ? 10 : 0;
    const delayPenalty = r.delayed * 5;
    const timePenalty = isNaN(r.etaMins) ? 999 : r.etaMins;

    if (preference === "time") return timePenalty + delayPenalty * 0.3 + crowdPenalty * 0.1;
    if (preference === "crowd") return crowdPenalty + timePenalty * 0.3 + delayPenalty * 0.2;
    if (preference === "delay") return delayPenalty + timePenalty * 0.3 + crowdPenalty * 0.1;
    return timePenalty;
  };

  return (
    <div className="panel panel-route">
      <div className="panel-header">
        <span className="panel-title">
          <div className="panel-title-icon">🔀</div>
          ROUTE ADVISORY
        </span>
      </div>

      <div className="route-planner">
        <div className="route-inputs">
          <select
            className="route-select"
            value={fromStop}
            onChange={(e) => {
              setFromStop(e.target.value);
              setResults([]);
            }}
          >
            <option value="">— From Stop —</option>
            {stopsList.map((stop) => (
              <option key={stop} value={stop}>
                {stop}
              </option>
            ))}
          </select>

          <button className="route-swap" onClick={handleSwap} title="Swap Stops">
            <ArrowUpDown size={16} />
          </button>

          <select
            className="route-select"
            value={toStop}
            onChange={(e) => {
              setToStop(e.target.value);
              setResults([]);
            }}
          >
            <option value="">— To Stop —</option>
            {stopsList.map((stop) => (
              <option key={stop} value={stop}>
                {stop}
              </option>
            ))}
          </select>
        </div>

        <div className="route-prefs">
          <button
            className={`pref-chip ${pref === "time" ? "active" : ""}`}
            onClick={() => setPref("time")}
          >
            <Zap size={12} style={{ marginRight: "4px" }} /> Fastest
          </button>
          <button
            className={`pref-chip ${pref === "crowd" ? "active" : ""}`}
            onClick={() => setPref("crowd")}
          >
            <Users size={12} style={{ marginRight: "4px" }} /> Less Crowd
          </button>
          <button
            className={`pref-chip ${pref === "delay" ? "active" : ""}`}
            onClick={() => setPref("delay")}
          >
            <Clock size={12} style={{ marginRight: "4px" }} /> Punctual
          </button>
        </div>

        <button
          className="btn-primary"
          onClick={handleSearch}
          disabled={!fromStop || !toStop || fromStop === toStop}
        >
          Find Route
        </button>

        {results.length > 0 && (
          <div className="route-results">
            {results.slice(0, 3).map((r, i) => {
              const crowdColor =
                r.crowd === "high"
                  ? "var(--red)"
                  : r.crowd === "medium"
                  ? "var(--yellow)"
                  : "var(--green)";
              return (
                <div key={r.routeId} className={`route-option ${i === 0 ? "best" : ""}`}>
                  <div className="route-option-header">
                    <span className="route-option-name">
                      {i === 0 ? "⭐ " : ""}
                      {r.routeName}
                    </span>
                    <span className="route-option-eta">{r.etaMins} min</span>
                  </div>
                  <div className="route-option-meta">
                    <span>🛣 {r.distKm} km</span>
                    <span>𚟏 {r.stopCount} stops</span>
                    <span style={{ color: crowdColor }}>👥 {r.crowd?.toUpperCase()}</span>
                    {r.delayed > 0 && (
                      <span style={{ color: "var(--yellow)" }}>⚠️ {r.delayed} delayed</span>
                    )}
                    <span>🚌 {r.busCount} buses</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
