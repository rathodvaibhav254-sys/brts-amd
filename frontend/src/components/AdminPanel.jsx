import React from "react";
import { database } from "../firebase";
import { ref, update } from "firebase/database";
import { ShieldCheck, AlertOctagon, PhoneCall, Compass, CheckCircle } from "lucide-react";

export default function AdminPanel({ alerts, onFocusBus }) {
  const activeAlerts = alerts.filter((a) => a.type === "sos" && a.status === "active");

  const handleResolve = async (id, busId) => {
    try {
      // Mark alert resolved
      await update(ref(database, `alerts/${id}`), { status: "resolved" });
      
      // We also update the bus status back to normal if needed,
      // but watchAlerts in simulator usually does this. Just in case,
      // the simulator also listens to Firebase and updates bus status.
      if (busId) {
        await update(ref(database, `buses/${busId}`), { status: "normal" });
      }
    } catch (e) {
      console.error("Failed to resolve SOS:", e);
    }
  };

  return (
    <div className="panel panel-admin">
      <div className="panel-header">
        <span className="panel-title">
          <div className="panel-title-icon">🛡</div>
          SOS COMMAND CONTROL
        </span>
        <span className="sos-count-badge animate-pulse">
          {activeAlerts.length} ACTIVE
        </span>
      </div>

      <div className="sos-alert-list">
        {activeAlerts.length === 0 ? (
          <div className="empty-state-clear">
            <ShieldCheck size={32} className="shield-clear-icon" />
            <p>Operations room secure. No active SOS alerts.</p>
          </div>
        ) : (
          activeAlerts.map((alert) => {
            const timeString = alert.timestamp
              ? new Date(alert.timestamp).toLocaleTimeString()
              : "N/A";
            return (
              <div key={alert.id} className="sos-alert-item animate-danger-glow">
                <div className="sos-alert-head">
                  <div className="sos-alert-title">
                    <AlertOctagon size={16} className="alert-oct-icon animate-pulse" />
                    <span>🚨 SOS ALERT: {alert.userName || "Anonymous Passenger"}</span>
                  </div>
                  <span className="sos-time-stamp font-mono">{timeString}</span>
                </div>

                <div className="sos-alert-meta">
                  <div className="meta-item">
                    <span>GPS Coordinates:</span>
                    <strong className="font-mono">
                      {alert.location
                        ? `${alert.location.lat.toFixed(4)}, ${alert.location.lng.toFixed(4)}`
                        : "Location N/A"}
                    </strong>
                    {alert.location && (
                      <button
                        className="map-center-btn"
                        onClick={() => onFocusBus(alert.location.lat, alert.location.lng)}
                        title="Center map on caller location"
                      >
                        <Compass size={12} />
                      </button>
                    )}
                  </div>
                  <div className="meta-item">
                    <span>Target Bus:</span>
                    <strong className="font-mono">{alert.busId || "None"}</strong>
                  </div>
                  <div className="meta-item">
                    <span>Contact Details:</span>
                    <a href={`tel:${alert.emergencyContact}`} className="contact-link font-mono">
                      <PhoneCall size={12} style={{ marginRight: "4px" }} />
                      {alert.emergencyContact || "Not Registered"}
                    </a>
                  </div>
                </div>

                <button
                  className="sos-resolve-btn"
                  onClick={() => handleResolve(alert.id, alert.busId)}
                >
                  <CheckCircle size={14} style={{ marginRight: "4px" }} />
                  Resolve Emergency Alert
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
