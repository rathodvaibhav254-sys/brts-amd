import React, { useState } from "react";
import { auth, database } from "../firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { ref, set } from "firebase/database";
import { Shield, Mail, Lock, User, Phone, Zap } from "lucide-react";

export default function AuthPanel() {
  const [tab, setTab] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("user");
  const [emergency, setEmergency] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const showError = (msg) => {
    setError(msg);
    setTimeout(() => setError(""), 5000);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return showError("Please enter email and password.");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
      showError(e.message.replace("Firebase: ", "").replace(/ \(auth.*?\)\./g, ""));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (e) {
      showError(e.message.replace("Firebase: ", "").replace(/ \(auth.*?\)\./g, ""));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) return showError("Please fill all required fields.");
    if (password.length < 6) return showError("Password must be at least 6 characters.");
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      // Save profile metadata
      await set(ref(database, `users/${cred.user.uid}`), {
        name,
        email,
        role,
        emergencyContacts: emergency || "",
        createdAt: Date.now(),
      });
    } catch (e) {
      showError(e.message.replace("Firebase: ", "").replace(/ \(auth.*?\)\./g, ""));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-overlay">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <Zap className="logo-spark" />
          </div>
          <h1>
            BRTS <span style={{ color: "var(--cyan)" }}>CMD</span>
          </h1>
          <p>AHMEDABAD RAPID TRANSIT SYSTEM</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <div className="auth-tabs">
          <button
            className={`auth-tab ${tab === "login" ? "active" : ""}`}
            onClick={() => {
              setTab("login");
              setError("");
            }}
          >
            Sign In
          </button>
          <button
            className={`auth-tab ${tab === "register" ? "active" : ""}`}
            onClick={() => {
              setTab("register");
              setError("");
            }}
          >
            Register
          </button>
        </div>

        {tab === "login" ? (
          <form className="auth-form" onSubmit={handleLogin}>
            <div className="input-group">
              <Mail className="input-icon" />
              <input
                type="email"
                placeholder="Email address"
                className="auth-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="input-group">
              <Lock className="input-icon" />
              <input
                type="password"
                placeholder="Password"
                className="auth-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            <button type="submit" className="auth-btn primary" disabled={loading}>
              {loading ? "Authenticating..." : "Sign In"}
            </button>
            <div className="auth-divider">
              <span>or</span>
            </div>
            <button
              type="button"
              className="auth-btn google"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" style={{ marginRight: 8 }}>
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleRegister}>
            <div className="input-group">
              <User className="input-icon" />
              <input
                type="text"
                placeholder="Full name"
                className="auth-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="input-group">
              <Mail className="input-icon" />
              <input
                type="email"
                placeholder="Email address"
                className="auth-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="input-group">
              <Lock className="input-icon" />
              <input
                type="password"
                placeholder="Password (min 6 chars)"
                className="auth-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="input-group">
              <Shield className="input-icon" />
              <select
                className="auth-input select-input"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                disabled={loading}
              >
                <option value="user">Passenger</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="input-group">
              <Phone className="input-icon" />
              <input
                type="tel"
                placeholder="Emergency contact number"
                className="auth-input"
                value={emergency}
                onChange={(e) => setEmergency(e.target.value)}
                disabled={loading}
              />
            </div>
            <button type="submit" className="auth-btn primary" disabled={loading}>
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
