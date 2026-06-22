import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import API from "../api/axios";
import "./Profile.css";

const Profile = () => {
  const { user, login } = useAuth();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    currentPassword: "",
    newPassword: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await API.get("/auth/me");
        setForm((prev) => ({
          ...prev,
          name: data.name || "",
          email: data.email || "",
          phone: data.phone || "",
          address: data.address || "",
        }));
      } catch (err) {
        setError(
          err?.response?.data?.message ||
            err.message ||
            "Failed to load profile.",
        );
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
    setSuccess("");
  };

  const handleSubmit = async () => {
    if (!form.currentPassword) {
      setError("Please enter your current password to save changes.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const { data } = await API.put("/auth/profile", form);

      // update stored user so navbar reflects new name
      login({ ...user, name: data.name, email: data.email });

      setForm((prev) => ({ ...prev, currentPassword: "", newPassword: "" }));
      setSuccess("Profile updated successfully.");
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err.message ||
          "Failed to update profile.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="profile-loading">Loading...</div>;

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="profile-avatar">
          {form.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="profile-name">{form.name}</h1>
          <p className="profile-role">{user?.role}</p>
        </div>
      </div>

      <div className="profile-section">
        <h2>Personal Info</h2>
        <div className="profile-form">
          <div className="profile-field">
            <label>Full Name</label>
            <input
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
            />
          </div>
          <div className="profile-field">
            <label>Email</label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
            />
          </div>
          <div className="profile-field">
            <label>Phone Number</label>
            <input
              name="phone"
              type="tel"
              value={form.phone}
              onChange={handleChange}
              placeholder="01XXXXXXXXX"
            />
          </div>
          <div className="profile-field">
            <label>Delivery Address</label>
            <textarea
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="Street, building, floor, apartment..."
              rows={3}
            />
          </div>
        </div>
      </div>

      <div className="profile-section">
        <h2>Change Password</h2>
        <div className="profile-form">
          <div className="profile-field">
            <label>
              New Password{" "}
              <span className="profile-optional">
                (leave blank to keep current)
              </span>
            </label>
            <input
              name="newPassword"
              type="password"
              value={form.newPassword}
              onChange={handleChange}
              placeholder="Min. 6 characters"
            />
          </div>
        </div>
      </div>

      <div className="profile-section profile-section--confirm">
        <h2>Confirm Changes</h2>
        <p className="profile-confirm-note">
          Enter your current password to save any changes above.
        </p>
        <div className="profile-form">
          <div className="profile-field">
            <label>Current Password</label>
            <input
              name="currentPassword"
              type="password"
              value={form.currentPassword}
              onChange={handleChange}
              placeholder="Required to save changes"
            />
          </div>
        </div>
      </div>

      {error && <p className="profile-error">{error}</p>}
      {success && <p className="profile-success">{success}</p>}

      <button
        className="btn-primary profile-save-btn"
        onClick={handleSubmit}
        disabled={saving}
      >
        {saving ? "Saving..." : "Save Changes"}
      </button>
    </div>
  );
};

export default Profile;
