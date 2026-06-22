import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useStore } from "../context/StoreContext";
import API from "../api/axios";
import "./Navbar.css";
import logo from "../assets/limos_logo.png";
import { io } from "socket.io-client";
import { useNotification } from "../context/NotificationContext";

const Navbar = () => {
  const { user, logout } = useAuth();
  const { totalItems } = useCart();
  const { isOpen, setIsOpen } = useStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [showLogoutToast, setShowLogoutToast] = useState(false);
  const [togglingStore, setTogglingStore] = useState(false);

  const { notification, setNotification } = useNotification();
  const [notifInput, setNotifInput] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [savingNotif, setSavingNotif] = useState(false);

  const handleSaveNotification = async () => {
    setSavingNotif(true);
    try {
      const { data } = await API.put("/settings/notification", {
        message: notifInput.trim(),
      });
      setNotification(data.message);
      setNotifOpen(false);
      setNotifInput("");
    } catch (err) {
      console.error(err);
    } finally {
      setSavingNotif(false);
    }
  };

  const handleClearNotification = async () => {
    setSavingNotif(true);
    try {
      await API.put("/settings/notification", { message: "" });
      setNotification("");
    } catch (err) {
      console.error(err);
    } finally {
      setSavingNotif(false);
    }
  };

  const close = () => setOpen(false);
  const isAdmin = user?.role === "admin" || user?.role === "it";

  useEffect(() => {
    if (!isAdmin) return;

    const fetchPending = async () => {
      try {
        const { data } = await API.get("/orders");
        const count = data.filter((o) => o.status === "pending").length;
        setPendingCount(count);
      } catch {}
    };

    fetchPending();

    const socket = io(process.env.REACT_APP_API_URL?.replace("/api", "") || "http://localhost:5000");

    socket.on("new_order", () => {
      fetchPending();
    });

    return () => socket.disconnect();
  }, [isAdmin]);

  useEffect(() => {
    if (!showLogoutToast) return;
    const timer = setTimeout(() => setShowLogoutToast(false), 2500);
    return () => clearTimeout(timer);
  }, [showLogoutToast]);

  useEffect(() => {
    if (open) {
      document.body.classList.add("drawer-open-lock");
    } else {
      document.body.classList.remove("drawer-open-lock");
    }
    return () => document.body.classList.remove("drawer-open-lock");
  }, [open]);

  const handleLogout = () => {
    logout();
    close();
    navigate("/");
    setShowLogoutToast(true);
  };

  const handleToggleStore = async () => {
    setTogglingStore(true);
    try {
      const { data } = await API.put("/settings/store-status", {
        isOpen: !isOpen,
      });
      setIsOpen(data.isOpen);
    } catch (err) {
      console.error("Failed to toggle store status", err);
    } finally {
      setTogglingStore(false);
    }
  };

  return (
    <>
      <nav className="navbar">
        <Link to="/" className="navbar-logo">
          <img src={logo} alt="Limo's Bakery" className="logo-image" />
          <div className="logo-text">
            <span>
              Limo's <span className="arabic-inline">ليمو</span>
            </span>
            <small>Bakery</small>
          </div>
          {!isOpen && <span className="store-status-badge">Closed</span>}
        </Link>

        {/* ── Desktop-only inline links ── */}
        <div className="navbar-links-desktop">
          {isAdmin ? (
            <>
              <Link to="/" className="navbar-link">
                Home
              </Link>
              <Link to="/profile" className="navbar-link">
                Profile
              </Link>
              <Link to="/admin" className="navbar-link">
                Admin Dashboard
                {pendingCount > 0 && (
                  <span className="navbar-link-badge">{pendingCount}</span>
                )}
              </Link>
              <button
                className={`navbar-link store-toggle-btn ${isOpen ? "store-open" : "store-closed"}`}
                onClick={handleToggleStore}
                disabled={togglingStore}
              >
                <i
                  className={`ti ${isOpen ? "ti-door-enter" : "ti-door-off"}`}
                />
                {togglingStore
                  ? "Updating..."
                  : isOpen
                    ? "Store Open"
                    : "Store Closed"}
              </button>
              <button
                className="navbar-link navbar-link--btn"
                onClick={handleLogout}
              >
                Logout
              </button>
            </>
          ) : user ? (
            <>
              <Link to="/" className="navbar-link">
                Home
              </Link>
              <Link to="/menu" className="navbar-link">
                Menu
              </Link>
              <Link to="/profile" className="navbar-link">
                Profile
              </Link>
              <Link to="/my-orders" className="navbar-link">
                My Orders
              </Link>
              <button
                className="navbar-link navbar-link--btn"
                onClick={handleLogout}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/" className="navbar-link">
                Home
              </Link>
              <Link to="/menu" className="navbar-link">
                Menu
              </Link>
              <Link to="/login" className="navbar-link">
                Login
              </Link>
              <Link to="/register" className="navbar-link navbar-link--cta">
                Register
              </Link>
            </>
          )}
        </div>

        <div className="navbar-right">
          {isAdmin ? (
            <Link to="/admin" className="navbar-cart" title="Admin Dashboard">
              <i className="ti ti-layout-dashboard" />
              {pendingCount > 0 && (
                <span className="cart-nav-badge">{pendingCount}</span>
              )}
            </Link>
          ) : (
            <Link to="/cart" className="navbar-cart">
              <i className="ti ti-shopping-cart" />
              {totalItems > 0 && (
                <span className="cart-nav-badge">{totalItems}</span>
              )}
            </Link>
          )}

          {/* ── Hamburger toggles to X when drawer is open ── */}
          <button
            className="hamburger"
            onClick={() => setOpen((prev) => !prev)}
          >
            <i className={open ? "ti ti-x" : "ti ti-menu-2"} />
          </button>
        </div>
      </nav>
      <div className="navbar-spacer" />

      <div className={`menu-overlay ${open ? "open" : ""}`} onClick={close} />

      <div className={`drawer ${open ? "open" : ""}`}>
        {user && (
          <div className="drawer-user">
            <div className="drawer-avatar">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="drawer-user-info">
              <h4>{user.name}</h4>
              <p>{user.email}</p>
            </div>
          </div>
        )}

        <div className="drawer-links">
          {isAdmin ? (
            <>
              <Link to="/" className="drawer-link" onClick={close}>
                <i className="ti ti-home" /> Home
              </Link>
              <Link to="/profile" className="drawer-link" onClick={close}>
                <i className="ti ti-user" /> Profile
              </Link>
              <Link to="/admin" className="drawer-link" onClick={close}>
                <i className="ti ti-layout-dashboard" /> Admin Dashboard
                {pendingCount > 0 && (
                  <span
                    className="cart-nav-badge"
                    style={{ position: "static", marginLeft: "auto" }}
                  >
                    {pendingCount}
                  </span>
                )}
              </Link>
              <button
                className={`drawer-link store-toggle-btn ${isOpen ? "store-open" : "store-closed"}`}
                onClick={handleToggleStore}
                disabled={togglingStore}
              >
                <i
                  className={`ti ${isOpen ? "ti-door-enter" : "ti-door-off"}`}
                />
                {togglingStore
                  ? "Updating..."
                  : isOpen
                    ? "Store Open — Close it?"
                    : "Store Closed — Open it?"}
              </button>

              {notifOpen ? (
                <div
                  style={{
                    padding: "12px 20px",
                    borderBottom: "1px solid #f0e8de",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <textarea
                    rows={3}
                    placeholder="Write a message for all customers..."
                    value={notifInput}
                    onChange={(e) => setNotifInput(e.target.value)}
                    style={{
                      width: "100%",
                      border: "1px solid #ddd4c8",
                      borderRadius: 8,
                      padding: "8px 10px",
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 13,
                      resize: "none",
                      background: "#faf7f2",
                      color: "#1a0f05",
                      boxSizing: "border-box",
                    }}
                  />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={handleSaveNotification}
                      disabled={savingNotif || !notifInput.trim()}
                      style={{
                        flex: 1,
                        padding: "8px 0",
                        borderRadius: 8,
                        background: "#c4712a",
                        color: "#fff",
                        border: "none",
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                        opacity: notifInput.trim() ? 1 : 0.5,
                      }}
                    >
                      {savingNotif ? "Saving..." : "Send"}
                    </button>
                    <button
                      onClick={() => {
                        setNotifOpen(false);
                        setNotifInput("");
                      }}
                      style={{
                        padding: "8px 14px",
                        borderRadius: 8,
                        border: "1px solid #ddd4c8",
                        background: "#fff",
                        color: "#5a4030",
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 13,
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className="drawer-link"
                  onClick={() => {
                    setNotifOpen(true);
                    setNotifInput(notification);
                  }}
                >
                  <i className="ti ti-speakerphone" />
                  {notification ? "Edit Notification" : "Send Notification"}
                  {notification && (
                    <span
                      style={{
                        marginLeft: "auto",
                        fontSize: 10,
                        background: "#c4712a",
                        color: "#fff",
                        borderRadius: 999,
                        padding: "2px 8px",
                        fontWeight: 700,
                      }}
                    >
                      LIVE
                    </span>
                  )}
                </button>
              )}

              {notification && (
                <button
                  className="drawer-link"
                  onClick={handleClearNotification}
                  style={{ color: "#c0392b" }}
                >
                  <i className="ti ti-bell-off" style={{ color: "#c0392b" }} />
                  Clear Notification
                </button>
              )}
              <button className="drawer-link logout" onClick={handleLogout}>
                <i className="ti ti-logout" /> Logout
              </button>
            </>
          ) : user ? (
            <>
              <Link to="/" className="drawer-link" onClick={close}>
                <i className="ti ti-home" /> Home
              </Link>
              <Link to="/profile" className="drawer-link" onClick={close}>
                <i className="ti ti-user" /> Profile
              </Link>
              <Link to="/menu" className="drawer-link" onClick={close}>
                <i className="ti ti-tools-kitchen-2" /> Menu
              </Link>
              <Link to="/my-orders" className="drawer-link" onClick={close}>
                <i className="ti ti-receipt" /> My Orders
              </Link>
              <Link to="/cart" className="drawer-link" onClick={close}>
                <i className="ti ti-shopping-cart" /> Cart
                {totalItems > 0 && (
                  <span
                    className="cart-nav-badge"
                    style={{ position: "static", marginLeft: 6 }}
                  >
                    {totalItems}
                  </span>
                )}
              </Link>
              <button className="drawer-link logout" onClick={handleLogout}>
                <i className="ti ti-logout" /> Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/" className="drawer-link" onClick={close}>
                <i className="ti ti-home" /> Home
              </Link>
              <Link to="/menu" className="drawer-link" onClick={close}>
                <i className="ti ti-tools-kitchen-2" /> Menu
              </Link>
              <Link to="/login" className="drawer-link" onClick={close}>
                <i className="ti ti-login" /> Login
              </Link>
              <Link to="/register" className="drawer-link" onClick={close}>
                <i className="ti ti-user-plus" /> Register
              </Link>
            </>
          )}
        </div>
      </div>

      {/* ── Logout toast ── */}
      <div className={`logout-toast ${showLogoutToast ? "show" : ""}`}>
        <i className="ti ti-circle-check" />
        Logged out successfully
      </div>
    </>
  );
};

export default Navbar;
