# BRTS Firebase Realtime Database Schema

## `/buses/{busId}`
```json
{
  "BRT-01": {
    "id":        "BRT-01",
    "routeKey":  "R1",
    "lat":       23.0534,
    "lng":       72.6275,
    "speed":     34.2,
    "direction": 127,
    "crowd":     "medium",
    "status":    "normal",
    "updatedAt": 1700000000000
  }
}
```
- `status`: `"normal"` | `"delayed"` | `"emergency"`
- `crowd`:  `"low"` | `"medium"` | `"high"`
- Written only by backend simulator (Admin SDK)
- Read publicly

---

## `/routes/{routeKey}`
```json
{
  "R1": {
    "name":  "Naroda–Nehru Nagar",
    "color": "#00d4ff",
    "stops": ["Naroda", "Odhav", "Vastral", "Nikol", "Rabari Colony", "Nehru Nagar"],
    "waypoints": [
      [23.0775, 72.6648],
      [23.0701, 72.6521]
    ]
  }
}
```
- Seeded once by simulator on startup
- Read publicly, no client write

---

## `/alerts/{alertId}`
```json
{
  "-NxABC123": {
    "type":             "sos",
    "userId":           "uid_abc",
    "userName":         "Priya Shah",
    "userEmail":        "priya@example.com",
    "emergencyContact": "9876543210",
    "location": {
      "lat": 23.0534,
      "lng": 72.6275
    },
    "busId":     "BRT-03",
    "timestamp": 1700000000000,
    "status":    "active"
  }
}
```
- `type`: `"sos"` | `"delay"` | `"crowd"`
- `status`: `"active"` | `"resolved"`
- Written by authenticated users
- Admin can update `status` to `"resolved"`

---

## `/users/{userId}`
```json
{
  "uid_abc": {
    "name":              "Priya Shah",
    "email":             "priya@example.com",
    "role":              "user",
    "emergencyContacts": "9876543210",
    "createdAt":         1700000000000
  }
}
```
- `role`: `"user"` | `"admin"`
- Users read/write their own profile
- Admins can read all profiles

---

## `/analytics/events/{eventId}`
```json
{
  "-NxDEF456": {
    "type":        "heartbeat",
    "timestamp":   1700000000000,
    "activeBuses": 10,
    "avgSpeed":    35,
    "delayed":     2,
    "emergency":   0
  }
}
```
- Written by backend simulator every 60 seconds
- Admin-only read access
