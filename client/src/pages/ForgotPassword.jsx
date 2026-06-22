import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../api/axios";
import "./Login.css";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState("email"); // "email" | "otp" | "reset"
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Step 1: Send OTP
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await API.post("/auth/forgot-password", { email });
      setStep("otp");
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError("Please enter the 6-digit code.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await API.post("/auth/verify-reset-code", { email, code: otp });
      setStep("reset");
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await API.put("/auth/reset-password", { email, password });
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResend = async () => {
    setError("");
    setOtp("");
    setLoading(true);
    try {
      await API.post("/auth/forgot-password", { email });
    } catch (err) {
      setError(err.response?.data?.message || "Could not resend code.");
    } finally {
      setLoading(false);
    }
  };

  // ── STEP 1: Email ────────────────────────────────────────
  if (step === "email") {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">
            <h2>
              Limo's <em>Bakery</em>
            </h2>
            <p>Enter your email and we'll send a reset code.</p>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <form className="auth-form" onSubmit={handleSendOtp}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                required
              />
            </div>
            <button className="auth-btn" type="submit" disabled={loading}>
              {loading ? "Sending..." : "Send Reset Code"}
            </button>
          </form>

          <div className="auth-footer">
            <Link to="/login">← Back to Login</Link>
          </div>
        </div>
      </div>
    );
  }

  // ── STEP 2: OTP ──────────────────────────────────────────
  if (step === "otp") {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">
            <h2>
              Limo's <em>Bakery</em>
            </h2>
            <p>Enter the 6-digit code sent to</p>
            <p style={{ color: "#c4712a", fontWeight: 600, fontSize: 14 }}>
              {email}
            </p>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <form className="auth-form" onSubmit={handleVerifyOtp}>
            <div className="form-group">
              <label>Reset Code</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value.replace(/\D/g, ""));
                  setError("");
                }}
                style={{
                  letterSpacing: "0.4em",
                  fontSize: 22,
                  textAlign: "center",
                }}
                autoFocus
              />
            </div>
            <button className="auth-btn" type="submit" disabled={loading}>
              {loading ? "Verifying..." : "Verify Code"}
            </button>
          </form>

          <div className="auth-footer">
            Didn't receive it?{" "}
            <button
              onClick={handleResend}
              disabled={loading}
              style={{
                background: "none",
                border: "none",
                color: "#c4712a",
                fontWeight: 600,
                cursor: "pointer",
                fontSize: 14,
                padding: 0,
              }}
            >
              Resend code
            </button>
          </div>

          <div className="auth-footer">
            <button
              onClick={() => {
                setStep("email");
                setError("");
              }}
              style={{
                background: "none",
                border: "none",
                color: "#8a7060",
                cursor: "pointer",
                fontSize: 14,
                padding: 0,
              }}
            >
              ← Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── STEP 3: New Password ─────────────────────────────────
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <h2>
            Limo's <em>Bakery</em>
          </h2>
          <p>Choose a new password for your account.</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleResetPassword}>
          <div className="form-group">
            <label>New Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              required
            />
          </div>
          <div className="form-group">
            <label>Confirm Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setError("");
              }}
              required
            />
          </div>
          <button className="auth-btn" type="submit" disabled={loading}>
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;
