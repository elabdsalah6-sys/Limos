import { useState, useEffect, useCallback, useRef } from "react";
import API from "../api/axios";
import "./AdminDashboard.css";
import { io } from "socket.io-client";

/* ─── helpers ─────────────────────────────────────────────────── */
const STATUS_FLOW = [
  "pending",
  "confirmed",
  "preparing",
  "on_the_way",
  "delivered",
  "cancelled",
];

const fmt = (n) =>
  Number(n).toLocaleString("en-EG", { maximumFractionDigits: 0 });

const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
const fmtTime = (d) =>
  new Date(d).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

/* ═══════════════════════════════════════════════
    MAIN
  ═══════════════════════════════════════════════ */
const AdminDashboard = () => {
  const [tab, setTab] = useState("overview");

  // Single shared socket + refresh signal for the entire dashboard.
  // Every tab listens to `refreshKey` and refetches its own data when it
  // changes, so a new order refreshes Overview, Orders, etc. together,
  // not just whichever tab happens to be open.
  const [refreshKey, setRefreshKey] = useState(0);
  const socketRef = useRef(null);

  const [pendingCount, setPendingCount] = useState(0);
  const [soundMuted, setSoundMuted] = useState(false);
  const audioCtxRef = useRef(null);
  const beepIntervalRef = useRef(null);

  useEffect(() => {
    const socket = io(
      process.env.REACT_APP_API_URL?.replace("/api", "") ||
        "http://localhost:5000",
    );
    socketRef.current = socket;

    const bumpRefresh = () => setRefreshKey((k) => k + 1);

    // Listen for any event that should cause dashboard-wide data to go stale.
    // Add more events here as needed (e.g. "order_updated", "user_registered").
    socket.on("new_order", bumpRefresh);
    socket.on("order_updated", bumpRefresh);

    return () => {
      socket.off("new_order", bumpRefresh);
      socket.off("order_updated", bumpRefresh);
      socket.disconnect();
    };
  }, []);

  const checkPendingOrders = useCallback(async () => {
    try {
      const { data } = await API.get("/admin/analytics");
      setPendingCount(data.statusCounts?.pending ?? 0);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    checkPendingOrders();
  }, [checkPendingOrders, refreshKey]);

  const playBeep = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (
          window.AudioContext || window.webkitAudioContext
        )();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();

      const now = ctx.currentTime;

      // Two alternating tones, harsh square wave, fast pulses — siren feel
      const tones = [1200, 900]; // high-low alarm pattern
      const pulseDuration = 0.18;
      const gap = 0.04;
      const repeats = 4; // how many high-low pulses per playBeep() call

      for (let i = 0; i < repeats; i++) {
        tones.forEach((freq, toneIdx) => {
          const startTime =
            now +
            i * (pulseDuration * 2 + gap * 2) +
            toneIdx * (pulseDuration + gap);

          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "square"; // harsh, buzzy — not soft like sine
          osc.frequency.value = freq;

          gain.gain.setValueAtTime(0.0001, startTime);
          gain.gain.exponentialRampToValueAtTime(0.35, startTime + 0.01); // louder peak
          gain.gain.exponentialRampToValueAtTime(
            0.0001,
            startTime + pulseDuration,
          );

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(startTime);
          osc.stop(startTime + pulseDuration + 0.02);
        });
      }
    } catch {
      // Web Audio blocked or unsupported — fail silently
    }
  }, []);

  const hasPendingOrders = pendingCount > 0;

  useEffect(() => {
    if (hasPendingOrders && !soundMuted) {
      playBeep();
      beepIntervalRef.current = setInterval(playBeep, 2500);
    }
    return () => {
      if (beepIntervalRef.current) {
        clearInterval(beepIntervalRef.current);
        beepIntervalRef.current = null;
      }
    };
  }, [hasPendingOrders, soundMuted, playBeep]);
  return (
    <div className="admin">
      <div className="admin-header">
        <h1>
          Admin{" "}
          <em style={{ fontStyle: "italic", color: "#c4712a" }}>Dashboard</em>
        </h1>
        <p>Manage orders, users, discounts, and more.</p>

        {pendingCount > 0 && (
          <button
            className={`pending-alert-pill${soundMuted ? " muted" : ""}`}
            onClick={() => setSoundMuted((m) => !m)}
          >
            🔔 {pendingCount} pending order{pendingCount !== 1 ? "s" : ""}
            <span className="pending-alert-mute">
              {soundMuted ? "Unmute" : "Mute"}
            </span>
          </button>
        )}

        <div className="admin-tabs">
          {[
            { key: "overview", label: "Overview" },
            { key: "orders", label: "Orders" },
            { key: "top_items", label: "Top Items" },
            { key: "users", label: "Users" },
            { key: "discounts", label: "Discounts" },
            { key: "instapay", label: "InstaPay" },
            { key: "regions", label: "Regions" },
            { key: "pickup", label: "Pickup" },
            { key: "categories", label: "Categories" },
          ].map((t) => (
            <button
              key={t.key}
              className={`admin-tab ${tab === t.key ? "active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="admin-section">
        {tab === "overview" && <OverviewTab refreshKey={refreshKey} />}
        {tab === "orders" && (
          <OrdersTab
            refreshKey={refreshKey}
            onOrderUpdated={checkPendingOrders}
          />
        )}
        {tab === "top_items" && <TopItemsTab refreshKey={refreshKey} />}
        {tab === "users" && <UsersTab refreshKey={refreshKey} />}
        {tab === "discounts" && <DiscountsTab refreshKey={refreshKey} />}
        {tab === "instapay" && <InstapayTab refreshKey={refreshKey} />}
        {tab === "regions" && <RegionsTab refreshKey={refreshKey} />}
        {tab === "pickup" && <PickupLocationsTab refreshKey={refreshKey} />}
        {tab === "categories" && <CategoriesTab refreshKey={refreshKey} />}
      </div>
    </div>
  );
};

// REGION TAB

const EMPTY_REGION_FORM = { name: "", price: "", active: true };

const RegionsTab = ({ refreshKey }) => {
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_REGION_FORM);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    API.get("/delivery-regions/all")
      .then((r) => setRegions(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_REGION_FORM);
    setFormOpen(true);
  };

  const openEdit = (r) => {
    setEditingId(r._id);
    setForm({ name: r.name, price: r.price, active: r.active });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return alert("Region name is required.");
    if (form.price === "") return alert("Price is required.");
    setSaving(true);
    try {
      const payload = { ...form, price: Number(form.price) };
      if (editingId) {
        const { data } = await API.put(
          `/delivery-regions/${editingId}`,
          payload,
        );
        setRegions((prev) => prev.map((r) => (r._id === editingId ? data : r)));
      } else {
        const { data } = await API.post("/delivery-regions", payload);
        setRegions((prev) => [data, ...prev]);
      }
      setFormOpen(false);
    } catch (err) {
      alert(err?.response?.data?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (r) => {
    try {
      const { data } = await API.put(`/delivery-regions/${r._id}`, {
        active: !r.active,
      });
      setRegions((prev) => prev.map((x) => (x._id === r._id ? data : x)));
    } catch {
      alert("Failed to update.");
    }
  };

  const confirmDelete = async () => {
    try {
      await API.delete(`/delivery-regions/${deleteTarget}`);
      setRegions((prev) => prev.filter((r) => r._id !== deleteTarget));
    } catch {
      alert("Delete failed.");
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <>
      <div className="admin-toolbar">
        <div className="admin-toolbar-title">Delivery Regions</div>
        <button className="admin-add-btn" onClick={openAdd}>
          + New Region
        </button>
      </div>

      {loading ? (
        <div className="admin-loading">Loading regions…</div>
      ) : regions.length === 0 ? (
        <div className="admin-empty">
          <h3>No regions yet</h3>
          <p>Add your first delivery region.</p>
        </div>
      ) : (
        <div className="admin-list">
          {regions.map((r) => (
            <div key={r._id} className="discount-card">
              <div className="discount-code-chip">{r.name}</div>
              <div className="discount-card-info">
                <div className="discount-card-value">
                  {r.price === 0 ? "Free delivery" : `${fmt(r.price)} EGP`}
                </div>
                <div className="discount-card-meta">
                  {r.active ? (
                    "Active"
                  ) : (
                    <span style={{ color: "#b02020" }}>Inactive</span>
                  )}
                </div>
              </div>
              <div className="discount-card-actions">
                <button
                  className={`toggle-btn ${r.active ? "on" : ""}`}
                  onClick={() => handleToggle(r)}
                  title={r.active ? "Deactivate" : "Activate"}
                />
                <button
                  className="icon-btn"
                  onClick={() => openEdit(r)}
                  title="Edit"
                >
                  <i className="ti ti-pencil" />
                </button>
                <button
                  className="icon-btn icon-btn--danger"
                  onClick={() => setDeleteTarget(r._id)}
                  title="Delete"
                >
                  <i className="ti ti-trash" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      {formOpen && (
        <div className="modal-overlay" onClick={() => setFormOpen(false)}>
          <div
            className="modal-sheet modal-sheet--sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>{editingId ? "Edit Region" : "New Region"}</h2>
              <button
                className="modal-close"
                onClick={() => setFormOpen(false)}
              >
                &#x2715;
              </button>
            </div>
            <div className="modal-body">
              <label className="form-label">Region Name *</label>
              <input
                className="form-input"
                placeholder="e.g. Cairo, Giza, Alexandria"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
              />

              <label className="form-label" style={{ marginTop: 12 }}>
                Delivery Price (EGP) *
              </label>
              <input
                className="form-input"
                type="number"
                min="0"
                placeholder="0 = free delivery"
                value={form.price}
                onChange={(e) =>
                  setForm((f) => ({ ...f, price: e.target.value }))
                }
              />

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 16,
                  cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#5a4030",
                }}
              >
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, active: e.target.checked }))
                  }
                />
                Active (shown to customers at checkout)
              </label>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost" onClick={() => setFormOpen(false)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving
                  ? "Saving…"
                  : editingId
                    ? "Save Changes"
                    : "Create Region"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div
            className="modal-sheet modal-sheet--sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Delete region?</h2>
              <button
                className="modal-close"
                onClick={() => setDeleteTarget(null)}
              >
                &#x2715;
              </button>
            </div>
            <div className="modal-body">
              <p
                style={{
                  color: "#9a8878",
                  fontSize: 14,
                  margin: 0,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                This cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button
                className="btn-ghost"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button className="btn-danger" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

/* ═══════════════════════════════════════════════
    OVERVIEW TAB
  ═══════════════════════════════════════════════ */
const OverviewTab = ({ refreshKey }) => {
  const [data, setData] = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([API.get("/admin/analytics"), API.get("/orders")])
      .then(([analyticsRes, ordersRes]) => {
        setData(analyticsRes.data);

        // Revenue = sum of (totalPrice − delivery fee) for delivered orders only.
        // Pickup orders have no delivery fee; delivery orders subtract
        // deliveryRegion.price so the figure reflects product revenue,
        // not money that just passed through to a courier.
        const total = (ordersRes.data || [])
          .filter((o) => o.status === "delivered")
          .reduce((sum, o) => {
            const deliveryFee =
              o.fulfillmentType === "pickup"
                ? 0
                : (o.deliveryRegion?.price ?? 0);
            return sum + (o.totalPrice - deliveryFee);
          }, 0);
        setRevenue(total);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [refreshKey]);

  if (loading) return <div className="admin-loading">Loading analytics…</div>;
  if (!data) return <div className="admin-loading">Failed to load.</div>;

  return (
    <>
      <div className="admin-stats">
        <div className="stat-card">
          <div className="stat-card-label">Total Orders</div>
          <div className="stat-card-value">{data.totalOrders}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Customers</div>
          <div className="stat-card-value">{data.totalCustomers}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Delivered</div>
          <div className="stat-card-value">
            {data.statusCounts.delivered ?? 0}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Revenue (Delivered)</div>
          <div className="stat-card-value">
            {fmt(revenue ?? 0)}
            <span>EGP</span>
          </div>
        </div>
      </div>

      <div className="admin-chart-card">
        <div className="admin-chart-title">Orders by status</div>
        <div
          style={{ display: "flex", flexWrap: "wrap", gap: 8, paddingTop: 4 }}
        >
          {STATUS_FLOW.map((s) => (
            <div key={s} style={{ textAlign: "center", minWidth: 60 }}>
              <span className={`status-pill status-pill--${s}`}>
                {s === "on_the_way" ? "On The Way" : s}
              </span>
              <div
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: 22,
                  fontWeight: 700,
                  color: "#1a0f05",
                  marginTop: 4,
                }}
              >
                {data.statusCounts[s] ?? 0}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

/* ═══════════════════════════════════════════════
    STATUS DROPDOWN
    Custom dropdown that renders each status as its own colored pill
    (reusing the .status-pill--* palette), with an icon, a checkmark on
    the active item, and click-outside-to-close. Swaps in for the old
    plain <select> on the Orders tab.
  ═══════════════════════════════════════════════ */
const STATUS_META = {
  pending: { label: "Pending", icon: "ti-clock" },
  confirmed: { label: "Confirmed", icon: "ti-check" },
  preparing: { label: "Preparing", icon: "ti-tools-kitchen-2" },
  on_the_way: { label: "On The Way", icon: "ti-truck-delivery" },
  delivered: { label: "Delivered", icon: "ti-circle-check" },
  cancelled: { label: "Cancelled", icon: "ti-x" },
};

const StatusDropdown = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const meta = STATUS_META[value] || { label: value, icon: "ti-circle" };

  return (
    <div className="status-dropdown" ref={rootRef}>
      <button
        type="button"
        className={`status-dropdown-trigger status-pill status-pill--${value}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <i className={`ti ${meta.icon}`} />
        <span>{meta.label}</span>
        <i className="ti ti-chevron-down status-dropdown-chevron" />
      </button>

      {open && (
        <div className="status-dropdown-menu" role="listbox">
          {STATUS_FLOW.map((s) => {
            const m = STATUS_META[s];
            const isSelected = s === value;
            return (
              <button
                key={s}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`status-dropdown-item status-pill--${s}${
                  isSelected ? " selected" : ""
                }`}
                onClick={() => {
                  setOpen(false);
                  if (!isSelected) onChange(s);
                }}
              >
                <i className={`ti ${m.icon}`} />
                <span>{m.label}</span>
                {isSelected && (
                  <i className="ti ti-check status-dropdown-check" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ─── Bundle line item (Orders tab) ───
    Renders one purchased bundle as a single card: its name, the products
    inside it, and the before/after price with the discount %, instead of
    the bundle's products being flattened into the plain items list. */
const OrderBundleLine = ({ bundle }) => {
  const pct = bundle.discountPct || 0;
  return (
    <div
      className="order-item-row order-bundle-row"
      style={{ flexDirection: "column", alignItems: "stretch", gap: 4 }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        <span style={{ fontWeight: 700 }}>
          <i className="ti ti-gift" /> {bundle.name}
        </span>
        <span style={{ textAlign: "right" }}>
          {bundle.discountAmount > 0 && (
            <span className="order-original-price" style={{ marginRight: 6 }}>
              {fmt(bundle.originalPrice)} EGP
            </span>
          )}
          <strong>{fmt(bundle.finalPrice)} EGP</strong>
          {pct > 0 && (
            <span style={{ marginLeft: 6, fontSize: 12, color: "#c4712a" }}>
              ({pct}% off)
            </span>
          )}
        </span>
      </div>
      <div style={{ paddingLeft: 18, fontSize: 13, color: "#7a6a5a" }}>
        {bundle.items.map((bi, idx) => (
          <div
            key={idx}
            style={{ display: "flex", justifyContent: "space-between" }}
          >
            <span>
              {bi.productName}
              {bi.quantity > 1 ? ` ×${bi.quantity}` : ""}
            </span>
            <span>{fmt(bi.price * bi.quantity)} EGP</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════
    ORDERS TAB
  ═══════════════════════════════════════════════ */
const OrdersTab = ({ refreshKey, onOrderUpdated }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await API.get("/orders");
      setOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // The socket connection now lives in the parent <AdminDashboard />.
  // This tab just refetches whenever the shared refreshKey changes
  // (i.e. whenever a "new_order" or other relevant event fires),
  // whether or not this tab is the one currently visible.
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders, refreshKey]);

  const handleStatusChange = async (orderId, status) => {
    try {
      const { data } = await API.put(`/orders/${orderId}`, { status });
      setOrders((prev) => prev.map((o) => (o._id === orderId ? data : o)));
      onOrderUpdated?.();
    } catch {
      alert("Failed to update status.");
    }
  };

  const visible = orders.filter((o) => {
    if (filter !== "all" && o.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      const name = o.user?.name || o.guestInfo?.name || "";
      const email = o.user?.email || o.guestInfo?.email || "";
      if (
        !name.toLowerCase().includes(q) &&
        !email.toLowerCase().includes(q) &&
        !o._id.includes(q)
      )
        return false;
    }
    return true;
  });

  return (
    <>
      <div className="admin-toolbar">
        <div className="admin-toolbar-title">Orders</div>
        <div className="admin-toolbar-right">
          <input
            className="admin-search"
            placeholder="Search name, email or ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="admin-filter-tabs">
        {["all", ...STATUS_FLOW].map((s) => (
          <button
            key={s}
            className={`admin-filter-tab ${filter === s ? "active" : ""}`}
            onClick={() => setFilter(s)}
          >
            {s === "all" ? "All" : (STATUS_META[s]?.label ?? s)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="admin-loading">Loading orders…</div>
      ) : visible.length === 0 ? (
        <div className="admin-empty">
          <h3>No orders found</h3>
          <p>Try a different filter or search term.</p>
        </div>
      ) : (
        <div className="admin-list">
          {visible.map((o) => {
            const customerName = o.user?.name || o.guestInfo?.name || "Guest";
            const customerEmail = o.user?.email || o.guestInfo?.email || "";
            const customerPhone = o.checkoutPhone || o.guestInfo?.phone || "";
            const secondaryPhone =
              o.secondaryPhone || o.guestInfo?.secondaryPhone || "";
            const isOpen = expanded === o._id;
            const hasDiscount = o.discountCode && o.discountSavings > 0;
            const originalPrice = hasDiscount
              ? o.totalPrice + o.discountSavings
              : null;
            const shortId = o._id.slice(-6).toUpperCase();

            return (
              <div
                key={o._id}
                className={`admin-card${o.status === "pending" ? " admin-card--pending" : ""}`}
              >
                <div className="admin-card-top">
                  <div>
                    <div className="admin-card-title-row">
                      <span className="admin-card-title">{customerName}</span>
                      <button
                        type="button"
                        className="order-id-chip"
                        title={`Full order ID: ${o._id} (click to copy)`}
                        onClick={() => {
                          navigator.clipboard?.writeText(o._id);
                        }}
                      >
                        #{shortId}
                      </button>
                    </div>
                    <div className="admin-card-meta">
                      {customerEmail && <span>{customerEmail}</span>}
                      {customerPhone && (
                        <a
                          href={`tel:${customerPhone}`}
                          className="order-phone-link"
                        >
                          <i className="ti ti-phone" /> {customerPhone}
                        </a>
                      )}
                      {secondaryPhone && (
                        <a
                          href={`tel:${secondaryPhone}`}
                          className="order-phone-link"
                        >
                          <i className="ti ti-phone" /> {secondaryPhone}{" "}
                          <span style={{ fontSize: 11, opacity: 0.7 }}>
                            (2nd)
                          </span>
                        </a>
                      )}
                      <span> · {fmtDate(o.createdAt)}</span>
                      <span className="order-time-chip">
                        <i className="ti ti-clock" /> {fmtTime(o.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="admin-card-right">
                    {/* Price: show strikethrough original + discounted if discount applied */}
                    <div className="admin-card-price">
                      {hasDiscount && (
                        <span className="order-original-price">
                          {fmt(originalPrice)} EGP
                        </span>
                      )}
                      {fmt(o.totalPrice)} EGP
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <StatusDropdown
                    value={o.status}
                    onChange={(status) => handleStatusChange(o._id, status)}
                  />

                  <button
                    className="order-expand-btn"
                    onClick={() => setExpanded(isOpen ? null : o._id)}
                  >
                    {isOpen ? "Hide details ▲" : "View details ▼"}
                  </button>
                </div>

                {isOpen && (
                  <>
                    {o.notes && (
                      <div className="order-notes-box">
                        <span className="order-notes-label">
                          <i className="ti ti-note" /> Note from customer
                        </span>
                        <p className="order-notes-text">{o.notes}</p>
                      </div>
                    )}

                    {/* Payment method + InstaPay sender number */}
                    <div className="order-notes-box">
                      <span className="order-notes-label">
                        <i className="ti ti-credit-card" /> Payment
                      </span>
                      <p className="order-notes-text">
                        {o.paymentMethod === "instapay"
                          ? "InstaPay"
                          : o.paymentMethod === "card"
                            ? "Card"
                            : "Cash on Delivery"}
                        {o.paymentMethod === "instapay" && (
                          <>
                            {" "}
                            ·{" "}
                            {o.senderInstapayNumber ? (
                              <span>Sent from {o.senderInstapayNumber}</span>
                            ) : (
                              <span style={{ color: "#b02020" }}>
                                No sender number provided
                              </span>
                            )}
                          </>
                        )}
                      </p>
                    </div>

                    {/* Bundles purchased on this order, shown as grouped
                          cards (name + nested items + before/after price)
                          instead of flattened into the plain items list. */}
                    {o.bundles?.length > 0 && (
                      <div
                        className="order-items-list"
                        style={{ marginBottom: 10 }}
                      >
                        {o.bundles.map((b, i) => (
                          <OrderBundleLine key={i} bundle={b} />
                        ))}
                      </div>
                    )}

                    <div className="order-items-list">
                      {o.items.map((item, i) => (
                        <div key={i} className="order-item-row">
                          <span>
                            {item.productName} ({item.selectedSize}) ×{" "}
                            {item.quantity}
                          </span>
                          <span>{fmt(item.price * item.quantity)} EGP</span>
                        </div>
                      ))}

                      {/* Subtotal row — plain items + bundle final prices.
                            Bundles are rendered as their own grouped cards
                            above, but their money still belongs in the
                            subtotal, otherwise it silently vanishes from
                            this row while still being included in the
                            (separately-calculated) total paid. */}
                      <div className="order-item-row order-subtotal-row">
                        <span>Subtotal</span>
                        <span>
                          {fmt(
                            o.items.reduce(
                              (acc, i) => acc + i.price * i.quantity,
                              0,
                            ) +
                              (o.bundles ?? []).reduce(
                                (acc, b) => acc + b.finalPrice,
                                0,
                              ),
                          )}{" "}
                          EGP
                        </span>
                      </div>

                      {/* Delivery fee row */}
                      {o.fulfillmentType === "pickup" ? (
                        <div className="order-item-row order-delivery-row">
                          <span>
                            <i className="ti ti-map-pin" /> Pickup from —{" "}
                            {o.pickupLocation?.name ?? "—"}
                            {o.pickupLocation?.address && (
                              <span style={{ opacity: 0.65, fontSize: 12 }}>
                                {" "}
                                ({o.pickupLocation.address})
                              </span>
                            )}
                          </span>
                          <span>Free</span>
                        </div>
                      ) : (
                        <>
                          {o.deliveryRegion && (
                            <div className="order-item-row order-delivery-row">
                              <span>
                                <i className="ti ti-map-pin" /> Delivery —{" "}
                                {o.deliveryRegion.name}
                              </span>
                              <span>
                                {o.deliveryRegion.price === 0
                                  ? "Free"
                                  : `${fmt(o.deliveryRegion.price)} EGP`}
                              </span>
                            </div>
                          )}
                          {o.deliveryAddress && (
                            <div className="order-address-box">
                              <span className="order-address-label">
                                <i className="ti ti-map-pin-filled" /> Delivery
                                address
                              </span>
                              <p className="order-address-text">
                                {o.deliveryAddress}
                              </p>
                            </div>
                          )}
                        </>
                      )}

                      {/* Discount row */}
                      {hasDiscount && (
                        <div className="order-item-row order-discount-row">
                          <span className="order-discount-label">
                            <i className="ti ti-tag" /> Discount (
                            {o.discountCode})
                          </span>
                          <span className="order-discount-saving">
                            −{fmt(o.discountSavings)} EGP
                          </span>
                        </div>
                      )}

                      {/* Total row */}
                      <div className="order-item-row order-total-row">
                        <span style={{ fontWeight: 700 }}>Total paid</span>
                        <span style={{ fontWeight: 700 }}>
                          {fmt(o.totalPrice)} EGP
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};

const TopItemsTab = ({ refreshKey }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("quantity"); // "quantity" | "revenue"

  useEffect(() => {
    setLoading(true);
    API.get("/orders")
      .then(({ data: orders }) => {
        const map = {};

        const deliveredOrders = orders.filter((o) => o.status === "delivered");

        deliveredOrders.forEach((order) => {
          // Count plain items
          (order.items || []).forEach((item) => {
            const key = `${item.productName}__${item.selectedSize}`;
            if (!map[key]) {
              map[key] = {
                name: item.productName,
                size: item.selectedSize,
                quantity: 0,
                revenue: 0,
              };
            }
            map[key].quantity += item.quantity;
            map[key].revenue += item.price * item.quantity;
          });

          // Count bundle items too
          (order.bundles || []).forEach((bundle) => {
            (bundle.items || []).forEach((bi) => {
              const key = `${bi.productName}__${bi.size || ""}`;
              if (!map[key]) {
                map[key] = {
                  name: bi.productName,
                  size: bi.size || "—",
                  quantity: 0,
                  revenue: 0,
                };
              }
              map[key].quantity += bi.quantity;
              map[key].revenue += bi.price * bi.quantity;
            });
          });
        });

        setItems(Object.values(map));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const sorted = [...items].sort((a, b) => b[sortBy] - a[sortBy]);
  const maxVal = sorted[0]?.[sortBy] ?? 1;

  return (
    <>
      <div className="admin-toolbar">
        <div className="admin-toolbar-title">Top Selling Items</div>
        <div className="admin-toolbar-right">
          <select
            className="admin-search"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{ cursor: "pointer" }}
          >
            <option value="quantity">Sort by Units Sold</option>
            <option value="revenue">Sort by Revenue</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="admin-loading">Loading…</div>
      ) : sorted.length === 0 ? (
        <div className="admin-empty">
          <h3>No delivered orders yet</h3>
          <p>Top items will appear once orders are delivered.</p>
        </div>
      ) : (
        <div className="admin-list">
          {sorted.map((item, idx) => {
            const barPct = Math.round((item[sortBy] / maxVal) * 100);
            return (
              <div
                key={`${item.name}__${item.size}`}
                className="admin-card"
                style={{ padding: "14px 18px" }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 8,
                  }}
                >
                  {/* Rank badge */}
                  <div
                    style={{
                      minWidth: 32,
                      height: 32,
                      borderRadius: "50%",
                      background:
                        idx === 0
                          ? "#c4712a"
                          : idx === 1
                            ? "#9a8878"
                            : idx === 2
                              ? "#b07840"
                              : "#e8ddd4",
                      color: idx < 3 ? "#fff" : "#5a4030",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "'Cormorant Garamond', serif",
                      fontWeight: 700,
                      fontSize: 15,
                    }}
                  >
                    {idx + 1}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: "'Cormorant Garamond', serif",
                        fontSize: 17,
                        fontWeight: 700,
                        color: "#1a0f05",
                      }}
                    >
                      {item.name}
                      {item.size && item.size !== "—" && (
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 400,
                            color: "#9a8878",
                            marginLeft: 6,
                          }}
                        >
                          ({item.size})
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div
                      style={{
                        fontFamily: "'Cormorant Garamond', serif",
                        fontSize: 20,
                        fontWeight: 700,
                        color: "#1a0f05",
                      }}
                    >
                      {sortBy === "revenue"
                        ? `${fmt(item.revenue)} EGP`
                        : `×${item.quantity}`}
                    </div>
                    <div style={{ fontSize: 12, color: "#9a8878" }}>
                      {sortBy === "revenue"
                        ? `${item.quantity} units`
                        : `${fmt(item.revenue)} EGP`}
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div
                  style={{
                    height: 4,
                    background: "#f0e8e0",
                    borderRadius: 2,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${barPct}%`,
                      background: idx === 0 ? "#c4712a" : "#b8a898",
                      borderRadius: 2,
                      transition: "width 0.4s ease",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};

/* ═══════════════════════════════════════════════
    USERS TAB
  ═══════════════════════════════════════════════ */
const UsersTab = ({ refreshKey }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    // get the logged-in user's role from localStorage/AuthContext
    const stored = localStorage.getItem("user");
    if (stored) setCurrentUser(JSON.parse(stored));
  }, []);

  useEffect(() => {
    API.get("/admin/users")
      .then((r) => setUsers(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const isIT = currentUser?.role === "it";

  const handleRoleToggle = async (user) => {
    if (user.role === "it") return;
    if (!isIT && user.role === "it") return;
    const newRole = user.role === "admin" ? "customer" : "admin";
    try {
      const { data } = await API.put(`/admin/users/${user._id}/role`, {
        role: newRole,
      });
      setUsers((prev) => prev.map((u) => (u._id === user._id ? data : u)));
    } catch {
      alert("Failed to update role.");
    }
  };

  const confirmDelete = async () => {
    try {
      await API.delete(`/admin/users/${deleteTarget}`);
      setUsers((prev) => prev.filter((u) => u._id !== deleteTarget));
    } catch (err) {
      alert(err?.response?.data?.message || "Delete failed.");
    } finally {
      setDeleteTarget(null);
    }
  };

  const visible = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  });

  return (
    <>
      <div className="admin-toolbar">
        <div className="admin-toolbar-title">Users</div>
        <div className="admin-toolbar-right">
          <input
            className="admin-search"
            placeholder="Search name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="admin-loading">Loading users…</div>
      ) : visible.length === 0 ? (
        <div className="admin-empty">
          <h3>No users found</h3>
          <p>Try a different search.</p>
        </div>
      ) : (
        <div className="admin-list">
          {visible.map((u) => {
            // IT can do anything. Admin cannot touch IT accounts.
            const canEdit = isIT || u.role !== "it";
            const canDelete = isIT || u.role !== "it";

            return (
              <div key={u._id} className="admin-card">
                <div className="admin-card-top">
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 12 }}
                  >
                    <div className="user-avatar">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="user-row-info">
                      <div className="user-row-name">{u.name}</div>
                      <div className="user-row-email">{u.email}</div>
                    </div>
                  </div>
                  <div className="admin-card-right">
                    <span className={`role-badge role-badge--${u.role}`}>
                      {u.role}
                    </span>
                    <div className="user-row-date">{fmtDate(u.createdAt)}</div>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <div className="admin-card-meta">
                    {u.phone && <span>{u.phone} · </span>}
                    {u.address || "No address on file"}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {canEdit && u.role !== "it" && (
                      <button
                        className="icon-btn"
                        title={
                          u.role === "admin"
                            ? "Demote to customer"
                            : "Promote to admin"
                        }
                        onClick={() => handleRoleToggle(u)}
                      >
                        <i className="ti ti-shield-half" />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        className="icon-btn icon-btn--danger"
                        title="Delete user"
                        onClick={() => setDeleteTarget(u._id)}
                      >
                        <i className="ti ti-trash" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div
            className="modal-sheet modal-sheet--sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Delete user?</h2>
              <button
                className="modal-close"
                onClick={() => setDeleteTarget(null)}
              >
                &#x2715;
              </button>
            </div>
            <div className="modal-body">
              <p
                style={{
                  color: "#9a8878",
                  fontSize: 14,
                  margin: 0,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                This will permanently remove the user and cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button
                className="btn-ghost"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button className="btn-danger" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const InstapayTab = ({ refreshKey }) => {
  const [number, setNumber] = useState("");
  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get("/settings/instapay")
      .then((r) => {
        setNumber(r.data.value || "");
        setDraft(r.data.value || "");
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const handleSave = async () => {
    try {
      await API.put("/settings/instapay", { value: draft });
      setNumber(draft);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      alert("Failed to save.");
    }
  };

  if (loading) return <div className="admin-loading">Loading…</div>;

  return (
    <>
      <div className="admin-toolbar">
        <div className="admin-toolbar-title">InstaPay Number</div>
      </div>
      <div className="admin-card" style={{ maxWidth: 400 }}>
        <p
          style={{
            fontSize: 13,
            color: "#9a8878",
            marginBottom: 12,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          This number is shown to customers who choose InstaPay at checkout.
        </p>
        <label className="form-label">Phone Number</label>
        <input
          className="form-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="01XXXXXXXXX"
          style={{ fontFamily: "monospace", fontSize: 16 }}
        />
        <button
          className="btn-primary"
          style={{ marginTop: 12 }}
          onClick={handleSave}
        >
          {saved ? "✓ Saved!" : "Save"}
        </button>
      </div>
    </>
  );
};

// PICKUP LOCATIONS TAB

const EMPTY_PICKUP_FORM = { name: "", address: "", active: true };

const PickupLocationsTab = ({ refreshKey }) => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_PICKUP_FORM);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    API.get("/pickup-locations/all")
      .then((r) => setLocations(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_PICKUP_FORM);
    setFormOpen(true);
  };

  const openEdit = (loc) => {
    setEditingId(loc._id);
    setForm({
      name: loc.name,
      address: loc.address || "",
      active: loc.isActive ?? loc.active ?? true,
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return alert("Location name is required.");
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        address: form.address,
        isActive: form.active,
      };
      if (editingId) {
        const { data } = await API.put(
          `/pickup-locations/${editingId}`,
          payload,
        );
        setLocations((prev) =>
          prev.map((l) => (l._id === editingId ? data : l)),
        );
      } else {
        const { data } = await API.post("/pickup-locations", payload);
        setLocations((prev) => [data, ...prev]);
      }
      setFormOpen(false);
    } catch (err) {
      alert(err?.response?.data?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (loc) => {
    try {
      const { data } = await API.put(`/pickup-locations/${loc._id}`, {
        isActive: !(loc.isActive ?? loc.active),
      });
      setLocations((prev) => prev.map((x) => (x._id === loc._id ? data : x)));
    } catch {
      alert("Failed to update.");
    }
  };

  const confirmDelete = async () => {
    try {
      await API.delete(`/pickup-locations/${deleteTarget}`);
      setLocations((prev) => prev.filter((l) => l._id !== deleteTarget));
    } catch {
      alert("Delete failed.");
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <>
      <div className="admin-toolbar">
        <div className="admin-toolbar-title">Pickup Locations</div>
        <button className="admin-add-btn" onClick={openAdd}>
          + New Location
        </button>
      </div>

      {loading ? (
        <div className="admin-loading">Loading locations…</div>
      ) : locations.length === 0 ? (
        <div className="admin-empty">
          <h3>No pickup locations yet</h3>
          <p>Add your first pickup location.</p>
        </div>
      ) : (
        <div className="admin-list">
          {locations.map((loc) => {
            const isActive = loc.isActive ?? loc.active;
            return (
              <div key={loc._id} className="discount-card">
                <div className="discount-code-chip">{loc.name}</div>
                <div className="discount-card-info">
                  <div className="discount-card-value">
                    {loc.address || "No address set"}
                  </div>
                  <div className="discount-card-meta">
                    {isActive ? (
                      "Active"
                    ) : (
                      <span style={{ color: "#b02020" }}>Inactive</span>
                    )}
                  </div>
                </div>
                <div className="discount-card-actions">
                  <button
                    className={`toggle-btn ${isActive ? "on" : ""}`}
                    onClick={() => handleToggle(loc)}
                    title={isActive ? "Deactivate" : "Activate"}
                  />
                  <button
                    className="icon-btn"
                    onClick={() => openEdit(loc)}
                    title="Edit"
                  >
                    <i className="ti ti-pencil" />
                  </button>
                  <button
                    className="icon-btn icon-btn--danger"
                    onClick={() => setDeleteTarget(loc._id)}
                    title="Delete"
                  >
                    <i className="ti ti-trash" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      {formOpen && (
        <div className="modal-overlay" onClick={() => setFormOpen(false)}>
          <div
            className="modal-sheet modal-sheet--sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>{editingId ? "Edit Location" : "New Pickup Location"}</h2>
              <button
                className="modal-close"
                onClick={() => setFormOpen(false)}
              >
                &#x2715;
              </button>
            </div>
            <div className="modal-body">
              <label className="form-label">Location Name *</label>
              <input
                className="form-input"
                placeholder="e.g. Main Branch — Tanta"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
              />

              <label className="form-label" style={{ marginTop: 12 }}>
                Address
              </label>
              <input
                className="form-input"
                placeholder="e.g. 12 El-Geish St, Tanta"
                value={form.address}
                onChange={(e) =>
                  setForm((f) => ({ ...f, address: e.target.value }))
                }
              />

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 16,
                  cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#5a4030",
                }}
              >
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, active: e.target.checked }))
                  }
                />
                Active (shown to customers at checkout)
              </label>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost" onClick={() => setFormOpen(false)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving
                  ? "Saving…"
                  : editingId
                    ? "Save Changes"
                    : "Create Location"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div
            className="modal-sheet modal-sheet--sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Delete location?</h2>
              <button
                className="modal-close"
                onClick={() => setDeleteTarget(null)}
              >
                &#x2715;
              </button>
            </div>
            <div className="modal-body">
              <p
                style={{
                  color: "#9a8878",
                  fontSize: 14,
                  margin: 0,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                This cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button
                className="btn-ghost"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button className="btn-danger" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

/* ═══════════════════════════════════════════════
    DISCOUNTS TAB
  ═══════════════════════════════════════════════ */
const EMPTY_CODE_FORM = {
  code: "",
  type: "percentage",
  value: "",
  minOrderAmount: "",
  maxUses: "",
  expiresAt: "",
  active: true,
};

const DiscountsTab = ({ refreshKey }) => {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_CODE_FORM);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchCodes = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await API.get("/discounts");
      setCodes(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCodes();
  }, [fetchCodes, refreshKey]);

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_CODE_FORM);
    setFormOpen(true);
  };

  const openEdit = (c) => {
    setEditingId(c._id);
    setForm({
      code: c.code,
      type: c.type,
      value: c.value,
      minOrderAmount: c.minOrderAmount || "",
      maxUses: c.maxUses ?? "",
      maxAmount: "",
      expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : "",
      active: c.active,
    });
    setFormOpen(true);
  };

  const handleToggleActive = async (c) => {
    try {
      const { data } = await API.put(`/discounts/${c._id}`, {
        active: !c.active,
      });
      setCodes((prev) => prev.map((x) => (x._id === c._id ? data : x)));
    } catch {
      alert("Failed to update.");
    }
  };

  const handleSave = async () => {
    if (!form.code.trim()) return alert("Code is required.");
    if (!form.value) return alert("Value is required.");
    setSaving(true);
    try {
      const payload = {
        ...form,
        value: Number(form.value),
        minOrderAmount:
          form.minOrderAmount !== "" ? Number(form.minOrderAmount) : 0,
        maxUses: form.maxUses !== "" ? Number(form.maxUses) : null,
        maxAmount: form.maxAmount !== "" ? Number(form.maxAmount) : null,
        expiresAt: form.expiresAt || null,
      };
      if (editingId) {
        const { data } = await API.put(`/discounts/${editingId}`, payload);
        setCodes((prev) => prev.map((x) => (x._id === editingId ? data : x)));
      } else {
        const { data } = await API.post("/discounts", payload);
        setCodes((prev) => [data, ...prev]);
      }
      setFormOpen(false);
    } catch (err) {
      alert(err?.response?.data?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    try {
      await API.delete(`/discounts/${deleteTarget}`);
      setCodes((prev) => prev.filter((c) => c._id !== deleteTarget));
    } catch {
      alert("Delete failed.");
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <>
      <div className="admin-toolbar">
        <div className="admin-toolbar-title">Discount Codes</div>
        <button className="admin-add-btn" onClick={openAdd}>
          + New Code
        </button>
      </div>

      {loading ? (
        <div className="admin-loading">Loading codes…</div>
      ) : codes.length === 0 ? (
        <div className="admin-empty">
          <h3>No discount codes yet</h3>
          <p>Create your first code to reward customers.</p>
        </div>
      ) : (
        <div className="admin-list">
          {codes.map((c) => {
            const expired = c.expiresAt && new Date() > new Date(c.expiresAt);
            const maxed = c.maxUses !== null && c.usedCount >= c.maxUses;
            return (
              <div key={c._id} className="discount-card">
                <div className="discount-code-chip">{c.code}</div>
                <div className="discount-card-info">
                  <div className="discount-card-value">
                    {c.type === "percentage"
                      ? `${c.value}% off`
                      : `${fmt(c.value)} EGP off`}
                  </div>
                  <div className="discount-card-meta">
                    {c.minOrderAmount > 0 &&
                      `Min. order ${fmt(c.minOrderAmount)} EGP · `}
                    {c.maxUses !== null
                      ? `${c.usedCount}/${c.maxUses} uses`
                      : `${c.usedCount} uses`}
                    {c.maxAmount &&
                      c.type === "percentage" &&
                      ` · Max ${fmt(c.maxAmount)} EGP`}
                    {c.expiresAt && ` · Expires ${fmtDate(c.expiresAt)}`}
                    {expired && (
                      <span style={{ color: "#b02020", fontWeight: 700 }}>
                        {" "}
                        · Expired
                      </span>
                    )}
                    {maxed && !expired && (
                      <span style={{ color: "#b02020", fontWeight: 700 }}>
                        {" "}
                        · Limit reached
                      </span>
                    )}
                  </div>
                </div>
                <div className="discount-card-actions">
                  <button
                    className={`toggle-btn ${c.active ? "on" : ""}`}
                    onClick={() => handleToggleActive(c)}
                    title={c.active ? "Deactivate" : "Activate"}
                  />
                  <button
                    className="icon-btn"
                    onClick={() => openEdit(c)}
                    title="Edit"
                  >
                    <i className="ti ti-pencil" />
                  </button>
                  <button
                    className="icon-btn icon-btn--danger"
                    onClick={() => setDeleteTarget(c._id)}
                    title="Delete"
                  >
                    <i className="ti ti-trash" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {formOpen && (
        <div className="modal-overlay" onClick={() => setFormOpen(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? "Edit Code" : "New Discount Code"}</h2>
              <button
                className="modal-close"
                onClick={() => setFormOpen(false)}
              >
                &#x2715;
              </button>
            </div>
            <div className="modal-body">
              <label className="form-label">Code *</label>
              <input
                className="form-input"
                placeholder="e.g. SUMMER20"
                value={form.code}
                onChange={(e) =>
                  setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))
                }
                disabled={!!editingId}
              />

              <div className="form-row" style={{ marginTop: 0 }}>
                <div>
                  <label className="form-label">Type *</label>
                  <select
                    className="form-input"
                    value={form.type}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, type: e.target.value }))
                    }
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed (EGP)</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Value *</label>
                  <input
                    className="form-input"
                    type="number"
                    placeholder={
                      form.type === "percentage" ? "e.g. 15" : "e.g. 50"
                    }
                    value={form.value}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, value: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="form-row">
                <div>
                  <label className="form-label">Min. order (EGP)</label>
                  <input
                    className="form-input"
                    type="number"
                    placeholder="0 = no minimum"
                    value={form.minOrderAmount}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, minOrderAmount: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="form-label">Max uses</label>
                  <input
                    className="form-input"
                    type="number"
                    placeholder="Leave blank = unlimited"
                    value={form.maxUses}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, maxUses: e.target.value }))
                    }
                  />
                </div>
              </div>
              {form.type === "percentage" && (
                <div className="form-row">
                  <div>
                    <label className="form-label">
                      Max order total (EGP) — code blocked above this
                    </label>
                    <input
                      className="form-input"
                      type="number"
                      placeholder="Leave blank = no cap"
                      value={form.maxAmount}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, maxAmount: e.target.value }))
                      }
                    />
                  </div>
                  <div /> {/* spacer */}
                </div>
              )}

              <label className="form-label">Expiry date</label>
              <input
                className="form-input"
                type="date"
                value={form.expiresAt}
                onChange={(e) =>
                  setForm((f) => ({ ...f, expiresAt: e.target.value }))
                }
              />

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 16,
                  cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#5a4030",
                }}
              >
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, active: e.target.checked }))
                  }
                />
                Active (usable by customers)
              </label>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost" onClick={() => setFormOpen(false)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving
                  ? "Saving…"
                  : editingId
                    ? "Save Changes"
                    : "Create Code"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div
            className="modal-sheet modal-sheet--sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Delete code?</h2>
              <button
                className="modal-close"
                onClick={() => setDeleteTarget(null)}
              >
                &#x2715;
              </button>
            </div>
            <div className="modal-body">
              <p
                style={{
                  color: "#9a8878",
                  fontSize: 14,
                  margin: 0,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                This cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button
                className="btn-ghost"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button className="btn-danger" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

/* ═══════════════════════════════════════════════
    CATEGORIES TAB
  ═══════════════════════════════════════════════ */
const EMPTY_CAT_FORM = {
  name: "",
  description: "",
  sortOrder: "",
  active: true,
};

const CategoriesTab = ({ refreshKey }) => {
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_CAT_FORM);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    API.get("/categories/all")
      .then((r) => setCats(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_CAT_FORM);
    setFormOpen(true);
  };

  const openEdit = (c) => {
    setEditingId(c._id);
    setForm({
      name: c.name,
      description: c.description || "",
      sortOrder: c.sortOrder ?? "",
      active: c.active,
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return alert("Category name is required.");
    setSaving(true);
    try {
      const payload = {
        ...form,
        sortOrder: form.sortOrder !== "" ? Number(form.sortOrder) : 0,
      };
      if (editingId) {
        const { data } = await API.put(`/categories/${editingId}`, payload);
        setCats((prev) => prev.map((c) => (c._id === editingId ? data : c)));
      } else {
        const { data } = await API.post("/categories", payload);
        setCats((prev) =>
          [...prev, data].sort(
            (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
          ),
        );
      }
      setFormOpen(false);
    } catch (err) {
      alert(err?.response?.data?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (c) => {
    try {
      const { data } = await API.put(`/categories/${c._id}`, {
        active: !c.active,
      });
      setCats((prev) => prev.map((x) => (x._id === c._id ? data : x)));
    } catch {
      alert("Failed to update.");
    }
  };

  const confirmDelete = async () => {
    try {
      await API.delete(`/categories/${deleteTarget}`);
      setCats((prev) => prev.filter((c) => c._id !== deleteTarget));
    } catch {
      alert("Delete failed.");
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <>
      <div className="admin-toolbar">
        <div className="admin-toolbar-title">Categories</div>
        <button className="admin-add-btn" onClick={openAdd}>
          + New Category
        </button>
      </div>

      {loading ? (
        <div className="admin-loading">Loading categories…</div>
      ) : cats.length === 0 ? (
        <div className="admin-empty">
          <h3>No categories yet</h3>
          <p>Add your first category to organise your menu.</p>
        </div>
      ) : (
        <div className="admin-list">
          {cats.map((c) => (
            <div key={c._id} className="discount-card">
              <div className="discount-code-chip">{c.name}</div>
              <div className="discount-card-info">
                <div className="discount-card-value" style={{ fontSize: 14 }}>
                  {c.description || (
                    <span style={{ color: "#c0b0a0", fontStyle: "italic" }}>
                      No description
                    </span>
                  )}
                </div>
                <div className="discount-card-meta">
                  {c.active ? (
                    "Active"
                  ) : (
                    <span style={{ color: "#b02020" }}>Inactive</span>
                  )}
                  {" · "}slug: <code style={{ fontSize: 10 }}>{c.slug}</code>
                  {c.sortOrder > 0 && ` · Order: ${c.sortOrder}`}
                </div>
              </div>
              <div className="discount-card-actions">
                <button
                  className={`toggle-btn ${c.active ? "on" : ""}`}
                  onClick={() => handleToggle(c)}
                  title={c.active ? "Deactivate" : "Activate"}
                />
                <button
                  className="icon-btn"
                  onClick={() => openEdit(c)}
                  title="Edit"
                >
                  <i className="ti ti-pencil" />
                </button>
                <button
                  className="icon-btn icon-btn--danger"
                  onClick={() => setDeleteTarget(c._id)}
                  title="Delete"
                >
                  <i className="ti ti-trash" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      {formOpen && (
        <div className="modal-overlay" onClick={() => setFormOpen(false)}>
          <div
            className="modal-sheet modal-sheet--sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>{editingId ? "Edit Category" : "New Category"}</h2>
              <button
                className="modal-close"
                onClick={() => setFormOpen(false)}
              >
                &#x2715;
              </button>
            </div>
            <div className="modal-body">
              <label className="form-label">Name *</label>
              <input
                className="form-input"
                placeholder="e.g. Cakes, Hot Drinks, Seasonal"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
              />

              <label className="form-label" style={{ marginTop: 12 }}>
                Description
              </label>
              <input
                className="form-input"
                placeholder="Short description shown to customers (optional)"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
              />

              <label className="form-label" style={{ marginTop: 12 }}>
                Sort Order
              </label>
              <input
                className="form-input"
                type="number"
                min="0"
                placeholder="0 = first (lower numbers appear first)"
                value={form.sortOrder}
                onChange={(e) =>
                  setForm((f) => ({ ...f, sortOrder: e.target.value }))
                }
              />

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 16,
                  cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#5a4030",
                }}
              >
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, active: e.target.checked }))
                  }
                />
                Active (visible to customers)
              </label>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost" onClick={() => setFormOpen(false)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving
                  ? "Saving…"
                  : editingId
                    ? "Save Changes"
                    : "Create Category"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div
            className="modal-sheet modal-sheet--sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Delete category?</h2>
              <button
                className="modal-close"
                onClick={() => setDeleteTarget(null)}
              >
                &#x2715;
              </button>
            </div>
            <div className="modal-body">
              <p
                style={{
                  color: "#9a8878",
                  fontSize: 14,
                  margin: 0,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Products in this category won't be deleted — they'll just lose
                their category assignment. This cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button
                className="btn-ghost"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button className="btn-danger" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminDashboard;
