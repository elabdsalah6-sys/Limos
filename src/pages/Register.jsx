import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../api/axios";
import { useAuth } from "../context/AuthContext";
import "./Login.css";

const Register = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState("form"); // "form" | "otp"
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    address: "",
  });
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  // Step 1: Send OTP
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (form.phone && !/^01[0125]\d{8}$/.test(form.phone)) {
      setError("Phone must start with 010, 011, 012, or 015 and be 11 digits.");
      return;
    }

    setLoading(true);
    try {
      await API.post("/auth/register", form);
      setStep("otp"); // show OTP screen
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerify = async (e) => {
    e.preventDefault();

    if (otp.length !== 6) {
      setError("Please enter the 6-digit code.");
      return;
    }

    setLoading(true);
    try {
      const { data } = await API.post("/auth/verify-email", {
        email: form.email,
        code: otp,
      });
      login(data);
      navigate("/");
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
      await API.post("/auth/register", form);
    } catch (err) {
      setError(err.response?.data?.message || "Could not resend code.");
    } finally {
      setLoading(false);
    }
  };

  // ── OTP SCREEN ──────────────────────────────────────────
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
              {form.email}
            </p>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <form className="auth-form" onSubmit={handleVerify}>
            <div className="form-group">
              <label>Verification Code</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value.replace(/\D/g, "")); // numbers only
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
              {loading ? "Verifying..." : "Verify & Create Account"}
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
                setStep("form");
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
              ← Back to registration
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── REGISTER FORM ────────────────────────────────────────
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <h2>
            Limo's <em>Bakery</em>
          </h2>
          <p>Create your account to start ordering.</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              name="name"
              placeholder="Limo's Member"
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              placeholder="you@email.com"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Phone</label>
            <input
              type="text"
              name="phone"
              placeholder="01XXXXXXXXX"
              value={form.phone}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Address</label>
            <input
              type="text"
              name="address"
              placeholder="Tanta, Egypt"
              value={form.address}
              onChange={handleChange}
            />
          </div>

          <button className="auth-btn" type="submit" disabled={loading}>
            {loading ? "Sending code..." : "Create Account"}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
