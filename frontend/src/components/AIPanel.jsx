import React from "react";
import { Brain, ShieldAlert, Sparkles, TrendingUp, AlertTriangle } from "lucide-react";

export default function AIPanel({ buses }) {
  const hour = new Date().getHours();
  const cards = [];

  // ── 1. Peak hour check
  const peakMorning = hour >= 8 && hour <= 10;
  const peakEvening = hour >= 17 && hour <= 20;
  const isPeak = peakMorning || peakEvening;
  cards.push({
    type: isPeak ? "warning" : "good",
    title: "Commute Peak Forecast",
    body: isPeak
      ? `Currently in commuter rush (${hour}:00). Extreme crowd loads anticipated on primary corridors. Plan for longer trip intervals.`
      : `Off-peak conditions active. Transit crowd loads predicted as low to nominal.`,
    badge: isPeak ? "PEAK HOUR" : "NOMINAL LOAD",
    badgeClass: isPeak ? "badge-high" : "badge-low",
  });

  // ── 2. Delay predictions
  const delayedBuses = buses.filter((b) => b.status === "delayed");
  const pctDelay = buses.length ? Math.round((delayedBuses.length / buses.length) * 100) : 0;
  if (delayedBuses.length > 0) {
    cards.push({
      type: pctDelay > 40 ? "alert" : "warning",
      title: "Schedule Adherence Deviation",
      body: `${delayedBuses.length} bus${delayedBuses.length > 1 ? "es" : ""} (${pctDelay}%) running behind schedule on routes: ${[
        ...new Set(delayedBuses.map((b) => b.routeKey)),
      ].join(", ")}.`,
      badge: `${pctDelay}% DELAYED`,
      badgeClass: pctDelay > 40 ? "badge-high" : "badge-medium",
    });
  } else {
    cards.push({
      type: "good",
      title: "Schedule Integrity",
      body: "All active services are running within scheduled variance parameters. No alerts.",
      badge: "100% PUNCTUAL",
      badgeClass: "badge-low",
    });
  }

  // ── 3. Congestion warning
  const slowBuses = buses.filter((b) => (b.speed || 0) < 10 && (b.speed || 0) > 0);
  if (slowBuses.length > 0) {
    cards.push({
      type: "warning",
      title: "Corridor Congestion",
      body: `${slowBuses.length} active unit${slowBuses.length > 1 ? "s" : ""} telemetry speed < 10 km/h. Bottleneck detected on route: ${[
        ...new Set(slowBuses.map((b) => b.routeKey)),
      ].join(", ")}.`,
      badge: "HEAVY TRAFFIC",
      badgeClass: "badge-medium",
    });
  }

  // ── 4. Emergency active
  const emergencyBuses = buses.filter((b) => b.status === "emergency");
  if (emergencyBuses.length > 0) {
    cards.push({
      type: "alert",
      title: "Critical SOS Dispatched",
      body: `Emergency responder coordination initiated for Bus: ${emergencyBuses
        .map((b) => b.id)
        .join(", ")}. Operations room monitoring status.`,
      badge: "SOS ACTIVE",
      badgeClass: "badge-high",
    });
  }

  // ── 5. Overload advisory
  const overloadedBuses = buses.filter((b) => b.crowd === "high");
  if (overloadedBuses.length > 1) {
    cards.push({
      type: "warning",
      title: "Route Load Advisory",
      body: `${overloadedBuses.length} buses reports HIGH passenger density. Recommended to add backup services on: ${[
        ...new Set(overloadedBuses.map((b) => b.routeKey)),
      ].join(", ")}.`,
      badge: "OVERLOAD RISK",
      badgeClass: "badge-medium",
    });
  }

  // ── 6. Average speed metric
  const avgSpeed = buses.length
    ? buses.reduce((s, b) => s + (b.speed || 0), 0) / buses.length
    : 0;
  if (avgSpeed > 40) {
    cards.push({
      type: "good",
      title: "Optimal Flow Rates",
      body: `Fleet velocity averaging ${avgSpeed.toFixed(1)} km/h. Signal priority and corridor flow optimization is highly effective.`,
      badge: "OPTIMIZED SPEED",
      badgeClass: "badge-low",
    });
  }

  return (
    <div className="panel panel-ai">
      <div className="panel-header">
        <span className="panel-title">
          <div className="panel-title-icon">🧠</div>
          COGNITIVE PREDICTIONS
        </span>
        <div className="ai-badge">
          <Brain size={12} className="ai-badge-icon animate-pulse" />
          DECISION MODULE
        </div>
      </div>

      <div className="ai-predictions">
        {cards.map((card, i) => (
          <div
            key={i}
            className={`ai-card ${card.type}`}
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <div className="ai-card-head">
              <span className="ai-card-label">{card.title}</span>
              {card.badge && (
                <span className={`ai-card-badge ${card.badgeClass}`}>
                  {card.badge}
                </span>
              )}
            </div>
            <div className="ai-card-body">{card.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
