import { useState, useEffect } from "react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";
import "./Checkout.css";

const Checkout = () => {
  const { cart, totalPrice, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: user?.name || "",
    phone: "",
    secondaryPhone: "",
    address: "",
    paymentMethod: "cash",
    fulfillmentType: "delivery", // "delivery" | "pickup"
    instapayNumber: "", // sender's instapay number
    notes: "",
  });

  const [regions, setRegions] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [regionOpen, setRegionOpen] = useState(false);

  const [pickupLocations, setPickupLocations] = useState([]);
  const [selectedPickup, setSelectedPickup] = useState(null);
  const [pickupOpen, setPickupOpen] = useState(false);

  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const [discountError, setDiscountError] = useState("");
  const [discountLoading, setDiscountLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [instapayStoreNumber, setInstapayStoreNumber] = useState("01XXXXXXXXX");
  const [error, setError] = useState("");

  /* ── pre-fill form from profile ── */
  useEffect(() => {
    if (!user?.token) return;
    const fetchProfile = async () => {
      try {
        const { data } = await API.get("/auth/me", {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        setForm((prev) => ({
          ...prev,
          name: data.name || prev.name,
          phone: data.phone || "",
          address: data.address || "",
        }));
      } catch {
        // silently ignore
      }
    };
    fetchProfile();
  }, [user?.token]);

  /* ── fetch store instapay number ── */
  useEffect(() => {
    API.get("/settings/instapay")
      .then((r) => setInstapayStoreNumber(r.data.value || "01XXXXXXXXX"))
      .catch(console.error);
  }, []);

  /* ── fetch delivery regions ── */
  useEffect(() => {
    API.get("/delivery-regions")
      .then((r) => setRegions(r.data))
      .catch(console.error);
  }, []);

  /* ── fetch pickup locations ── */
  useEffect(() => {
    API.get("/pickup-locations")
      .then((r) => setPickupLocations(r.data))
      .catch(() => setPickupLocations([]));
  }, []);

  /* ── derived totals ── */
  const savings = appliedDiscount?.savings ?? 0;
  const deliveryFee =
    form.fulfillmentType === "delivery" ? (selectedRegion?.price ?? 0) : 0;
  const finalPrice = Math.max(0, totalPrice + deliveryFee - savings);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  /* ── apply discount ── */
  const handleApplyDiscount = async () => {
    const code = discountCode.trim().toUpperCase();
    if (!code) return;

    setDiscountError("");
    setAppliedDiscount(null);
    setDiscountLoading(true);

    try {
      const headers = {};
      if (user?.token) headers["Authorization"] = `Bearer ${user.token}`;

      const { data } = await API.post(
        "/discounts/apply",
        { code, orderAmount: totalPrice },
        { headers },
      );

      const discountedAmount =
        data.discount ??
        (data.type === "percentage"
          ? (totalPrice * data.value) / 100
          : data.value);

      setAppliedDiscount({
        code: data.code ?? code,
        type: data.type,
        value: data.value,
        savings: Math.min(discountedAmount, totalPrice),
      });
    } catch (err) {
      setDiscountError(
        err?.response?.data?.message || "Invalid or expired code.",
      );
    } finally {
      setDiscountLoading(false);
    }
  };

  const handleRemoveDiscount = () => {
    setAppliedDiscount(null);
    setDiscountCode("");
    setDiscountError("");
  };

  /* ── place order ── */
  const handleSubmit = async () => {
    if (!form.name.trim() || !form.phone.trim()) {
      setError("Please fill in your name and phone number.");
      return;
    }

    const phoneRegex = /^01[0125]\d{8}$/;
    if (!phoneRegex.test(form.phone.trim())) {
      setError("Invalid primary phone number.");
      return;
    }

    if (
      form.secondaryPhone.trim() &&
      !phoneRegex.test(form.secondaryPhone.trim())
    ) {
      setError("Invalid secondary phone number.");
      return;
    }

    if (form.fulfillmentType === "delivery") {
      if (!form.address.trim()) {
        setError("Please enter your delivery address.");
        return;
      }
      if (!selectedRegion) {
        setError("Please select a delivery region.");
        return;
      }
    } else {
      if (!selectedPickup) {
        setError("Please select a pickup location.");
        return;
      }
    }

    if (form.paymentMethod === "instapay" && !form.instapayNumber.trim()) {
      setError(
        "Please enter your InstaPay number so we can confirm your transfer.",
      );
      return;
    }

    setError("");
    setLoading(true);

    try {
      const orderItems = cart.flatMap((item) => {
        if (item.type === "bundle") {
          return item.items.map((i) => ({
            product: i.product._id,
            productName: i.product.name,
            selectedSize: i.size?.label ?? "default",
            price: i.unitPrice ?? i.product.sizes?.[0]?.price ?? 0,
            quantity: i.qty,
          }));
        }
        return {
          product: item.product._id,
          productName: item.product.name,
          selectedSize: item.size?.label ?? "default",
          price: item.unitPrice,
          quantity: item.qty,
        };
      });

      const headers = {};
      if (user?.token) headers["Authorization"] = `Bearer ${user.token}`;

      await API.post(
        "/orders",
        {
          guestInfo: {
            name: form.name,
            phone: form.phone,
            secondaryPhone: form.secondaryPhone || null,
          },
          items: orderItems,
          itemsTotal: totalPrice,
          fulfillmentType: form.fulfillmentType,
          deliveryRegionId:
            form.fulfillmentType === "delivery" ? selectedRegion._id : null,
          pickupLocationId:
            form.fulfillmentType === "pickup" ? selectedPickup._id : null,
          discountCode: appliedDiscount?.code ?? null,
          discountSavings: savings,
          deliveryAddress:
            form.fulfillmentType === "delivery" ? form.address : null,
          paymentMethod: form.paymentMethod,
          senderInstapayNumber:
            form.paymentMethod === "instapay" ? form.instapayNumber : null,
          notes: form.notes || null,
        },
        { headers },
      );

      clearCart();
      navigate("/order-confirmed");
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="checkout-page">
      <div className="checkout-header">
        <h1>Checkout</h1>
      </div>

      {/* ── Order Summary ── */}
      <div className="checkout-section">
        <h2>Order Summary</h2>
        <div className="checkout-summary-items">
          {cart.map((item) => (
            <div className="checkout-summary-row" key={item.key}>
              <span className="checkout-summary-name">
                {item.type === "bundle" ? item.bundle.name : item.product.name}
                {item.qty > 1 && item.type !== "bundle" && (
                  <span className="checkout-summary-qty"> ×{item.qty}</span>
                )}
              </span>
              <span className="checkout-summary-price">
                {(item.type === "bundle"
                  ? item.total
                  : item.unitPrice * item.qty
                ).toLocaleString()}{" "}
                EGP
              </span>
            </div>
          ))}
        </div>

        <div className="checkout-summary-row checkout-subtotal-row">
          <span>Subtotal</span>
          <span>{totalPrice.toLocaleString()} EGP</span>
        </div>

        {form.fulfillmentType === "delivery" && selectedRegion && (
          <div className="checkout-summary-row checkout-delivery-row">
            <span>Delivery — {selectedRegion.name}</span>
            <span>
              {deliveryFee === 0
                ? "Free"
                : `${deliveryFee.toLocaleString()} EGP`}
            </span>
          </div>
        )}

        {form.fulfillmentType === "pickup" && (
          <div className="checkout-summary-row checkout-delivery-row">
            <span>Pickup</span>
            <span>Free</span>
          </div>
        )}

        {appliedDiscount && (
          <div className="checkout-summary-row checkout-discount-row">
            <span className="checkout-discount-label">
              Discount ({appliedDiscount.code})
            </span>
            <span className="checkout-discount-saving">
              −{savings.toLocaleString()} EGP
            </span>
          </div>
        )}

        <div className="checkout-total-row">
          <span>Total</span>
          <span className="checkout-total-price">
            {finalPrice.toLocaleString()} EGP
          </span>
        </div>
      </div>

      {/* ── Fulfillment Type ── */}
      <div className="checkout-section">
        <h2>How do you want to receive your order?</h2>
        <div className="checkout-fulfillment-tabs">
          <button
            className={`checkout-fulfillment-tab ${
              form.fulfillmentType === "delivery"
                ? "checkout-fulfillment-tab--active"
                : ""
            }`}
            onClick={() =>
              setForm((prev) => ({ ...prev, fulfillmentType: "delivery" }))
            }
            type="button"
          >
            🚚 Delivery
          </button>
          <button
            className={`checkout-fulfillment-tab ${
              form.fulfillmentType === "pickup"
                ? "checkout-fulfillment-tab--active"
                : ""
            }`}
            onClick={() =>
              setForm((prev) => ({ ...prev, fulfillmentType: "pickup" }))
            }
            type="button"
          >
            🏪 Pickup
          </button>
        </div>
      </div>

      {/* ── Delivery Region (collapsible) ── */}
      {form.fulfillmentType === "delivery" && (
        <div className="checkout-section">
          <h2>Delivery Region</h2>
          <button
            className={`checkout-accordion-trigger ${
              regionOpen ? "checkout-accordion-trigger--open" : ""
            }`}
            onClick={() => setRegionOpen((o) => !o)}
            type="button"
          >
            <span>
              {selectedRegion ? (
                <>
                  {selectedRegion.name}{" "}
                  <span className="checkout-accordion-badge">
                    {selectedRegion.price === 0
                      ? "Free"
                      : `${selectedRegion.price.toLocaleString()} EGP`}
                  </span>
                </>
              ) : (
                "Select a region"
              )}
            </span>
            <span className="checkout-accordion-chevron">
              {regionOpen ? "▲" : "▼"}
            </span>
          </button>

          {regionOpen && (
            <div className="checkout-accordion-body">
              {regions.length === 0 ? (
                <p className="checkout-prefill-note">Loading regions…</p>
              ) : (
                <div className="checkout-region-grid">
                  {regions.map((r) => (
                    <label
                      key={r._id}
                      className={`checkout-region-option ${
                        selectedRegion?._id === r._id
                          ? "checkout-region-option--active"
                          : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="deliveryRegion"
                        checked={selectedRegion?._id === r._id}
                        onChange={() => {
                          setSelectedRegion(r);
                          setRegionOpen(false);
                        }}
                      />
                      <span className="checkout-region-name">{r.name}</span>
                      <span className="checkout-region-price">
                        {r.price === 0
                          ? "Free"
                          : `${r.price.toLocaleString()} EGP`}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Pickup Location (collapsible) ── */}
      {form.fulfillmentType === "pickup" && (
        <div className="checkout-section">
          <h2>Pickup Location</h2>
          <button
            className={`checkout-accordion-trigger ${
              pickupOpen ? "checkout-accordion-trigger--open" : ""
            }`}
            onClick={() => setPickupOpen((o) => !o)}
            type="button"
          >
            <span>
              {selectedPickup ? (
                <>
                  {selectedPickup.name}{" "}
                  {selectedPickup.address && (
                    <span className="checkout-accordion-meta">
                      — {selectedPickup.address}
                    </span>
                  )}
                </>
              ) : (
                "Select a pickup location"
              )}
            </span>
            <span className="checkout-accordion-chevron">
              {pickupOpen ? "▲" : "▼"}
            </span>
          </button>

          {pickupOpen && (
            <div className="checkout-accordion-body">
              {pickupLocations.length === 0 ? (
                <p className="checkout-prefill-note">
                  No pickup locations available.
                </p>
              ) : (
                <div className="checkout-region-grid">
                  {pickupLocations.map((loc) => (
                    <label
                      key={loc._id}
                      className={`checkout-region-option ${
                        selectedPickup?._id === loc._id
                          ? "checkout-region-option--active"
                          : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="pickupLocation"
                        checked={selectedPickup?._id === loc._id}
                        onChange={() => {
                          setSelectedPickup(loc);
                          setPickupOpen(false);
                        }}
                      />
                      <span className="checkout-region-name">{loc.name}</span>
                      {loc.address && (
                        <span className="checkout-region-price">
                          {loc.address}
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Discount Code ── */}
      <div className="checkout-section">
        <h2>Discount Code</h2>

        {appliedDiscount ? (
          <div className="checkout-discount-applied">
            <div className="checkout-discount-applied-left">
              <i className="ti ti-tag" />
              <span>
                <strong>{appliedDiscount.code}</strong> —{" "}
                {appliedDiscount.type === "percentage"
                  ? `${appliedDiscount.value}% off`
                  : `${appliedDiscount.value.toLocaleString()} EGP off`}
              </span>
            </div>
            <button
              className="checkout-discount-remove"
              onClick={handleRemoveDiscount}
              title="Remove code"
            >
              <i className="ti ti-x" />
            </button>
          </div>
        ) : (
          <div className="checkout-discount-row-input">
            <input
              className="checkout-discount-input"
              type="text"
              placeholder="Enter code…"
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleApplyDiscount()}
            />
            <button
              className="checkout-discount-btn"
              onClick={handleApplyDiscount}
              disabled={discountLoading || !discountCode.trim()}
            >
              {discountLoading ? "…" : "Apply"}
            </button>
          </div>
        )}

        {discountError && (
          <p className="checkout-discount-error">{discountError}</p>
        )}
      </div>

      {/* ── Delivery Details ── */}
      <div className="checkout-section">
        <h2>Contact Details</h2>
        {user && (
          <p className="checkout-prefill-note">
            <i className="ti ti-info-circle" /> Pre-filled from your profile —
            feel free to change them.
          </p>
        )}
        <div className="checkout-form">
          <div className="checkout-field">
            <label htmlFor="name">Full Name</label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="Ahmed Mohamed"
              value={form.name}
              onChange={handleChange}
            />
          </div>

          <div className="checkout-field">
            <label htmlFor="phone">Phone Number</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              placeholder="01XXXXXXXXX"
              value={form.phone}
              onChange={handleChange}
            />
          </div>

          <div className="checkout-field">
            <label htmlFor="secondaryPhone">
              Secondary Phone{" "}
              <span className="checkout-field-optional">(optional)</span>
            </label>
            <input
              id="secondaryPhone"
              name="secondaryPhone"
              type="tel"
              placeholder="01XXXXXXXXX"
              value={form.secondaryPhone}
              onChange={handleChange}
            />
          </div>

          {form.fulfillmentType === "delivery" && (
            <div className="checkout-field">
              <label htmlFor="address">Delivery Address</label>
              <textarea
                id="address"
                name="address"
                placeholder="Street, building, floor, apartment..."
                value={form.address}
                onChange={handleChange}
                rows={3}
              />
            </div>
          )}
          <div className="checkout-field">
            <label htmlFor="notes">
              Order Notes{" "}
              <span className="checkout-field-optional">(optional)</span>
            </label>
            <textarea
              id="notes"
              name="notes"
              placeholder="Any special instructions, e.g. no nuts, leave at the door, call before arriving..."
              value={form.notes}
              onChange={handleChange}
              rows={2}
            />
          </div>
        </div>
      </div>

      {/* ── Payment Method ── */}
      <div className="checkout-section">
        <h2>Payment Method</h2>
        <div className="checkout-payment-options">
          <label
            className={`checkout-payment-option ${
              form.paymentMethod === "cash"
                ? "checkout-payment-option--active"
                : ""
            }`}
          >
            <input
              type="radio"
              name="paymentMethod"
              value="cash"
              checked={form.paymentMethod === "cash"}
              onChange={handleChange}
            />
            <div className="checkout-payment-icon">💵</div>
            <div>
              <p className="checkout-payment-label">Cash on Delivery</p>
              <p className="checkout-payment-sub">
                Pay when your order arrives
              </p>
            </div>
          </label>

          <label
            className={`checkout-payment-option ${
              form.paymentMethod === "instapay"
                ? "checkout-payment-option--active"
                : ""
            }`}
          >
            <input
              type="radio"
              name="paymentMethod"
              value="instapay"
              checked={form.paymentMethod === "instapay"}
              onChange={handleChange}
            />
            <div className="checkout-payment-icon">📱</div>
            <div>
              <p className="checkout-payment-label">InstaPay</p>
              <p className="checkout-payment-sub">Transfer before delivery</p>
            </div>
          </label>
        </div>

        {form.paymentMethod === "instapay" && (
          <div className="checkout-instapay-info">
            <p>
              Send <strong>{finalPrice.toLocaleString()} EGP</strong> to:
            </p>
            <p className="checkout-instapay-number">{instapayStoreNumber}</p>
            <p className="checkout-instapay-note">
              Screenshot your transfer — our team will confirm before dispatch.
            </p>

            {/* Sender's InstaPay number */}
            <div className="checkout-field checkout-instapay-sender-field">
              <label htmlFor="instapayNumber">Your InstaPay Number</label>
              <input
                id="instapayNumber"
                name="instapayNumber"
                type="tel"
                placeholder="The number you sent from (01XXXXXXXXX)"
                value={form.instapayNumber}
                onChange={handleChange}
              />
              <p className="checkout-field-hint">
                So we can match your transfer to this order.
              </p>
            </div>
          </div>
        )}
      </div>

      {error && <p className="checkout-error">{error}</p>}

      <button
        className="btn-primary checkout-submit-btn"
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading ? "Placing Order..." : "Place Order"}
      </button>
    </div>
  );
};

export default Checkout;
