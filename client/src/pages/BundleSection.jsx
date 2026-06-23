import { useState, useEffect } from "react";
import API from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { uploadImage } from "../utils/uploadImage";

/* ═══════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════ */
const getPrice = (p) => {
  const s = p.sizes?.find((s) => s.offerActive) ?? p.sizes?.[0];
  return s?.price ?? 0;
};

/* ═══════════════════════════════════════════════
   ADMIN FORM MODAL (unchanged — admin can always manage bundles)
═══════════════════════════════════════════════ */
const EMPTY = {
  type: "pick", // "pick" = customer chooses items | "static" = admin-fixed box
  name: "",
  description: "",
  quantity: 3,
  discountPct: "",
  eligibleCategories: [], // pick-only: categories customers may choose from. empty = all categories
  image: "",
  available: true,
  // static-only fields
  originalPrice: "",
  fixedItems: [], // [{ product: {...}, qty }]
};

const BundleFormModal = ({ bundle, onClose, onSaved }) => {
  const [form, setForm] = useState(() => {
    if (!bundle) return EMPTY;
    return {
      ...EMPTY,
      ...bundle,
      type: bundle.type ?? "pick",
      // back-compat: older bundles may have a single `eligibleCategory` string
      eligibleCategories: bundle.eligibleCategories?.length
        ? bundle.eligibleCategories
        : bundle.eligibleCategory
          ? [bundle.eligibleCategory]
          : [],
      fixedItems: (bundle.fixedItems ?? [])
        .map((fi) => {
          const isObj = fi.product && typeof fi.product === "object";
          if (!isObj) return null; // drop unpopulated raw-ID entries; catalog will re-add
          return {
            qty: fi.qty,
            product: { ...fi.product, _id: fi.product._id.toString() },
          };
        })
        .filter(Boolean),
    };
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [catalog, setCatalog] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    API.get("/products").then(({ data }) => setCatalog(data));
  }, []);

  useEffect(() => {
    API.get("/categories")
      .then(({ data }) => setCategories(data))
      .catch(console.error);
  }, []);

  /* ── pick box: which categories are customers allowed to choose from ── */
  const toggleEligibleCategory = (categoryName) => {
    setForm((f) => {
      const isOn = f.eligibleCategories.includes(categoryName);
      return {
        ...f,
        eligibleCategories: isOn
          ? f.eligibleCategories.filter((c) => c !== categoryName)
          : [...f.eligibleCategories, categoryName],
      };
    });
  };

  /* ── static box: fixed item steppers ── */
  const fixedQty = (productId) =>
    form.fixedItems.find(
      (fi) => fi.product?._id?.toString() === productId?.toString(),
    )?.qty ?? 0;
  const setFixedQty = (product, qty) => {
    setForm((f) => {
      const rest = f.fixedItems.filter(
        (fi) => fi.product?._id?.toString() !== product._id?.toString(),
      );
      return {
        ...f,
        fixedItems: qty > 0 ? [...rest, { product, qty }] : rest,
      };
    });
  };

  const totalFixedItems = form.fixedItems.reduce((s, fi) => s + fi.qty, 0);

  const offerPrice =
    form.originalPrice && form.discountPct
      ? Math.round(
          Number(form.originalPrice) * (1 - Number(form.discountPct) / 100),
        )
      : null;

  const handleSave = async () => {
    console.log(
      "fixedItems before save:",
      JSON.stringify(form.fixedItems, null, 2),
    );

    if (!form.name.trim()) return alert("Name required");

    if (form.type === "pick") {
      if (!form.quantity) return alert("Quantity required");
      if (!form.discountPct) return alert("Discount % required");
    } else {
      if (form.fixedItems.length === 0)
        return alert("Pick at least one product for the box");
      if (!form.originalPrice) return alert("Original price required");
      if (!form.discountPct) return alert("Discount % required");
    }

    setSaving(true);
    try {
      const payload =
        form.type === "pick"
          ? {
              type: "pick",
              name: form.name,
              description: form.description,
              quantity: form.quantity,
              discountPct: form.discountPct,
              eligibleCategories: form.eligibleCategories,
              image: form.image,
              available: form.available,
            }
          : {
              type: "static",
              name: form.name,
              description: form.description,
              image: form.image,
              available: form.available,
              originalPrice: Number(form.originalPrice),
              discountPct: Number(form.discountPct),
              offerPrice,
              quantity: form.fixedItems.reduce((s, fi) => s + fi.qty, 0), // ← ADD THIS
              fixedItems: form.fixedItems
                .map((fi) => {
                  const id =
                    typeof fi.product === "object"
                      ? fi.product?._id?.toString()
                      : String(fi.product);
                  return { product: id, qty: fi.qty };
                })
                .filter((fi) => fi.product && fi.product !== "undefined"),
            };

      if (bundle?._id) await API.put(`/bundles/${bundle._id}`, payload);
      else await API.post("/bundles", payload);
      await onSaved();
      onClose();
    } catch (err) {
      alert(err?.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{bundle ? "Edit Bundle" : "Add Bundle"}</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {/* ── type toggle ── */}
          <label className="form-label">Bundle Type *</label>
          <div style={{ display: "flex", gap: 10, marginBottom: 4 }}>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, type: "pick" }))}
              className="admin-card-btn"
              style={{
                flex: 1,
                padding: "10px 12px",
                borderColor: form.type === "pick" ? "#c4712a" : "#e0d0c0",
                color: form.type === "pick" ? "#c4712a" : "#6a5040",
                background: form.type === "pick" ? "#fdf0e4" : "#fff",
              }}
            >
              Pick Your Own
            </button>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, type: "static" }))}
              className="admin-card-btn"
              style={{
                flex: 1,
                padding: "10px 12px",
                borderColor: form.type === "static" ? "#c4712a" : "#e0d0c0",
                color: form.type === "static" ? "#c4712a" : "#6a5040",
                background: form.type === "static" ? "#fdf0e4" : "#fff",
              }}
            >
              Fixed Box
            </button>
          </div>

          <label className="form-label">Bundle Name *</label>
          <input
            className="form-input"
            placeholder="e.g. Box of 3"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />

          <label className="form-label">Description</label>
          <input
            className="form-input"
            placeholder="Pick any 3 items and save"
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
          />

          {form.type === "pick" ? (
            <>
              <label className="form-label">Number of Items *</label>
              <input
                className="form-input"
                type="number"
                min="1"
                value={form.quantity}
                onChange={(e) =>
                  setForm((f) => ({ ...f, quantity: e.target.value }))
                }
              />

              <label className="form-label">Discount % *</label>
              <input
                className="form-input"
                type="number"
                min="1"
                max="100"
                placeholder="e.g. 10"
                value={form.discountPct}
                onChange={(e) =>
                  setForm((f) => ({ ...f, discountPct: e.target.value }))
                }
              />

              {/* live preview */}
              {form.discountPct > 0 && (
                <p
                  style={{
                    fontFamily: "'DM Sans',sans-serif",
                    fontSize: 12,
                    color: "#c4712a",
                    marginTop: 6,
                    fontWeight: 600,
                  }}
                >
                  Customer saves {form.discountPct}% off the total price of any{" "}
                  {form.quantity} items
                </p>
              )}

              <label className="form-label" style={{ marginTop: 16 }}>
                Allowed Categories
              </label>
              <p
                style={{
                  fontSize: 11,
                  color: "#9a8878",
                  margin: "0 0 8px",
                  fontFamily: "'DM Sans',sans-serif",
                }}
              >
                Choose which categories customers can pick items from. Leave all
                unchecked to allow every product.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {categories.length === 0 ? (
                  <p
                    style={{
                      fontSize: 12,
                      color: "#9a8878",
                      fontFamily: "'DM Sans',sans-serif",
                    }}
                  >
                    Loading categories...
                  </p>
                ) : (
                  categories.map((c) => {
                    const active = form.eligibleCategories.includes(c.name);
                    return (
                      <button
                        key={c._id}
                        type="button"
                        onClick={() => toggleEligibleCategory(c.name)}
                        className="admin-card-btn"
                        style={{
                          padding: "6px 12px",
                          borderColor: active ? "#c4712a" : "#e0d0c0",
                          color: active ? "#c4712a" : "#6a5040",
                          background: active ? "#fdf0e4" : "#fff",
                        }}
                      >
                        {c.name}
                      </button>
                    );
                  })
                )}
              </div>
              {form.eligibleCategories.length > 0 && (
                <p
                  style={{
                    fontSize: 11,
                    color: "#9a8878",
                    marginTop: 6,
                    fontFamily: "'DM Sans',sans-serif",
                  }}
                >
                  Customers can only pick from:{" "}
                  {form.eligibleCategories.join(", ")}
                </p>
              )}
            </>
          ) : (
            <>
              <label className="form-label" style={{ marginTop: 10 }}>
                Choose the exact flavours in this box *
              </label>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  maxHeight: 50,
                  overflowY: "auto",
                  border: "1px solid #ecdfd3",
                  borderRadius: 25,
                  padding: 50,
                }}
              >
                {catalog.length === 0 ? (
                  <p
                    style={{
                      fontSize: 12,
                      color: "#9a8878",
                      fontFamily: "'DM Sans',sans-serif",
                    }}
                  >
                    Loading products...
                  </p>
                ) : (
                  catalog.map((p) => {
                    const qty = fixedQty(p._id);
                    return (
                      <div
                        key={p._id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "6px 8px",
                          borderRadius: 8,
                          background: qty > 0 ? "#fdf0e4" : "transparent",
                        }}
                      >
                        <span
                          style={{
                            flex: 1,
                            fontFamily: "'DM Sans',sans-serif",
                            fontSize: 13,
                            color: "#1a0f05",
                          }}
                        >
                          {p.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => setFixedQty(p, Math.max(0, qty - 1))}
                          disabled={qty === 0}
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: "50%",
                            border: "1.5px solid #ddd4c8",
                            background: qty > 0 ? "#fff" : "#f5f2ee",
                            color: qty > 0 ? "#c4712a" : "#c0b0a0",
                            cursor: qty > 0 ? "pointer" : "not-allowed",
                          }}
                        >
                          −
                        </button>
                        <span
                          style={{
                            minWidth: 18,
                            textAlign: "center",
                            fontSize: 13,
                            fontWeight: 700,
                            fontFamily: "'DM Sans',sans-serif",
                            color: "#1a0f05", // ← add this
                          }}
                        >
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => setFixedQty(p, qty + 1)}
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: "50%",
                            border: "1.5px solid #ddd4c8",
                            background: "#1a0f05",
                            color: "#fff",
                            cursor: "pointer",
                          }}
                        >
                          +
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
              {totalFixedItems > 0 && (
                <p
                  style={{
                    fontSize: 11,
                    color: "#9a8878",
                    marginTop: 6,
                    fontFamily: "'DM Sans',sans-serif",
                  }}
                >
                  {totalFixedItems} item{totalFixedItems !== 1 ? "s" : ""} in
                  this box
                </p>
              )}

              <label className="form-label" style={{ marginTop: 16 }}>
                Original Price (EGP) *
              </label>
              <input
                className="form-input"
                type="number"
                min="0"
                placeholder="e.g. 200"
                value={form.originalPrice}
                onChange={(e) =>
                  setForm((f) => ({ ...f, originalPrice: e.target.value }))
                }
              />

              <label className="form-label">Discount % *</label>
              <input
                className="form-input"
                type="number"
                min="1"
                max="100"
                placeholder="e.g. 15"
                value={form.discountPct}
                onChange={(e) =>
                  setForm((f) => ({ ...f, discountPct: e.target.value }))
                }
              />

              {offerPrice != null && (
                <p
                  style={{
                    fontFamily: "'DM Sans',sans-serif",
                    fontSize: 12,
                    color: "#c4712a",
                    marginTop: 6,
                    fontWeight: 600,
                  }}
                >
                  Offer price: {offerPrice.toLocaleString()} EGP (was{" "}
                  {Number(form.originalPrice).toLocaleString()} EGP)
                </p>
              )}
            </>
          )}

          <label className="form-label" style={{ marginTop: 16 }}>
            Photo
          </label>
          <label className="form-img-upload">
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setUploading(true);
                try {
                  const url = await uploadImage(file);
                  setForm((f) => ({ ...f, image: url }));
                } catch (err) {
                  alert("Image upload failed, please try again");
                } finally {
                  setUploading(false);
                }
              }}
            />
            {uploading ? (
              <div className="form-img-placeholder">
                <span className="form-img-placeholder-text">Uploading...</span>
              </div>
            ) : form.image ? (
              <img
                src={form.image}
                alt="preview"
                className="form-img-preview"
              />
            ) : (
              <div className="form-img-placeholder">
                <span className="form-img-placeholder-icon">↑</span>
                <span className="form-img-placeholder-text">
                  Click to upload photo
                </span>
              </div>
            )}
          </label>
          {form.image && (
            <button
              className="form-add-link"
              style={{ color: "#b03020", marginTop: 4 }}
              onClick={() => setForm((f) => ({ ...f, image: "" }))}
            >
              Remove photo
            </button>
          )}

          <label className="form-check-label" style={{ marginTop: 14 }}>
            <input
              type="checkbox"
              checked={form.available}
              onChange={(e) =>
                setForm((f) => ({ ...f, available: e.target.checked }))
              }
            />
            Available
          </label>
        </div>

        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : bundle ? "Save Changes" : "Add Bundle"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════
   CUSTOMER PRODUCT PICKER MODAL (Pick Your Own only)
   — disabled entirely when the store is closed
   — limited to bundle.eligibleCategories, if any are set
═══════════════════════════════════════════════ */
const ProductPickerModal = ({ bundle, onClose, onAddToCart, isStoreOpen }) => {
  const [products, setProducts] = useState([]);
  // selected: { [productId]: { product, qty } }
  const [selected, setSelected] = useState({});
  const max = Number(bundle.quantity);

  // back-compat: older bundles may carry a single `eligibleCategory` string
  // instead of the `eligibleCategories` array
  const allowedCategories =
    bundle.eligibleCategories?.length > 0
      ? bundle.eligibleCategories
      : bundle.eligibleCategory
        ? [bundle.eligibleCategory]
        : [];

  useEffect(() => {
    API.get("/products").then(({ data }) => {
      const inStock = data.filter((p) => p.available !== false);
      const scoped =
        allowedCategories.length > 0
          ? inStock.filter((p) => allowedCategories.includes(p.category))
          : inStock;
      setProducts(scoped);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bundle]);

  const totalSelected = Object.values(selected).reduce((s, x) => s + x.qty, 0);

  const addOne = (p) => {
    if (!isStoreOpen) return;
    if (totalSelected >= max) return;
    setSelected((prev) => ({
      ...prev,
      [p._id]: { product: p, qty: (prev[p._id]?.qty ?? 0) + 1 },
    }));
  };

  const removeOne = (p) => {
    if (!isStoreOpen) return;
    setSelected((prev) => {
      const current = prev[p._id]?.qty ?? 0;
      if (current <= 1) {
        const next = { ...prev };
        delete next[p._id];
        return next;
      }
      return { ...prev, [p._id]: { product: p, qty: current - 1 } };
    });
  };

  const subtotal = Object.values(selected).reduce(
    (s, { product, qty }) => s + getPrice(product) * qty,
    0,
  );
  const discount = Math.round((subtotal * bundle.discountPct) / 100);
  const total = subtotal - discount;
  const done = totalSelected === max;

  // flatten for cart: [{ product, qty }, ...]
  const cartItems = Object.values(selected);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{bundle.name}</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {!isStoreOpen && (
            <p
              style={{
                fontFamily: "'DM Sans',sans-serif",
                fontSize: 12,
                fontWeight: 600,
                color: "#a02820",
                background: "#fdecea",
                border: "1px solid #f3c6c2",
                borderRadius: 8,
                padding: "8px 12px",
                marginBottom: 12,
              }}
            >
              We're currently closed. You can browse, but ordering is paused for
              now.
            </p>
          )}

          <p
            style={{
              fontFamily: "'Cormorant Garamond',serif",
              fontSize: 16,
              color: "#5a4030",
              marginBottom: 10,
            }}
          >
            Pick {max} item{max !== 1 ? "s" : ""} total — save{" "}
            {bundle.discountPct}% off
          </p>

          {/* progress bar */}
          <div
            style={{
              background: "#e5ddd2",
              borderRadius: 999,
              height: 6,
              overflow: "hidden",
              marginBottom: 6,
            }}
          >
            <div
              style={{
                height: "100%",
                background: "#c4712a",
                borderRadius: 999,
                width: `${(totalSelected / max) * 100}%`,
                transition: "width 0.25s",
              }}
            />
          </div>
          <p
            style={{
              fontSize: 11,
              color: "#9a8878",
              marginBottom: 16,
              fontFamily: "'DM Sans',sans-serif",
            }}
          >
            {totalSelected} of {max} selected
          </p>

          {/* product list */}
          {products.length === 0 ? (
            <p
              style={{
                color: "#9a8878",
                fontSize: 13,
                fontFamily: "'DM Sans',sans-serif",
              }}
            >
              Loading...
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {products.map((p) => {
                const qty = selected[p._id]?.qty ?? 0;
                const on = qty > 0;
                const canAdd = isStoreOpen && totalSelected < max;
                const canRemove = isStoreOpen && qty > 0;
                const price = getPrice(p);

                return (
                  <div
                    key={p._id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      border: `1.5px solid ${on ? "#c4712a" : "#ddd4c8"}`,
                      borderRadius: 10,
                      padding: "10px 14px",
                      background: on ? "#fff3e8" : "#faf7f2",
                      transition: "all 0.15s",
                      opacity: isStoreOpen ? 1 : 0.7,
                    }}
                  >
                    {/* thumbnail */}
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 8,
                        overflow: "hidden",
                        background: "#e8e0d4",
                        flexShrink: 0,
                      }}
                    >
                      {p.image && (
                        <img
                          src={p.image}
                          alt={p.name}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      )}
                    </div>

                    {/* info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontFamily: "'Cormorant Garamond',serif",
                          fontSize: 16,
                          fontWeight: 700,
                          color: "#1a0f05",
                          margin: 0,
                          lineHeight: 1.2,
                        }}
                      >
                        {p.name}
                      </p>
                      <p
                        style={{
                          fontFamily: "'DM Sans',sans-serif",
                          fontSize: 11,
                          color: "#9a8878",
                          margin: "2px 0 0",
                        }}
                      >
                        {Number(price).toLocaleString()} EGP each
                      </p>
                    </div>

                    {/* qty stepper */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        flexShrink: 0,
                      }}
                    >
                      <button
                        onClick={() => removeOne(p)}
                        disabled={!canRemove}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          border: "1.5px solid #ddd4c8",
                          background: canRemove ? "#fff3e8" : "#f5f2ee",
                          color: canRemove ? "#c4712a" : "#c0b0a0",
                          fontSize: 18,
                          fontWeight: 300,
                          cursor: canRemove ? "pointer" : "not-allowed",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          lineHeight: 1,
                          paddingBottom: 1,
                        }}
                      >
                        −
                      </button>

                      <span
                        style={{
                          minWidth: 20,
                          textAlign: "center",
                          fontFamily: "'DM Sans',sans-serif",
                          fontSize: 14,
                          fontWeight: 700,
                          color: qty > 0 ? "#1a0f05" : "#c0b0a0",
                        }}
                      >
                        {qty}
                      </span>

                      <button
                        onClick={() => addOne(p)}
                        disabled={!canAdd}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          border: "1.5px solid #ddd4c8",
                          background: canAdd ? "#1a0f05" : "#f5f2ee",
                          color: canAdd ? "#f5f0e8" : "#c0b0a0",
                          fontSize: 18,
                          fontWeight: 300,
                          cursor: canAdd ? "pointer" : "not-allowed",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          lineHeight: 1,
                          paddingBottom: 1,
                        }}
                      >
                        +
                      </button>
                    </div>

                    {/* line total */}
                    {qty > 0 && (
                      <span
                        style={{
                          fontFamily: "'DM Sans',sans-serif",
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#c4712a",
                          flexShrink: 0,
                          minWidth: 60,
                          textAlign: "right",
                        }}
                      >
                        {(price * qty).toLocaleString()} EGP
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* footer */}
        <div
          className="modal-footer"
          style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}
        >
          {totalSelected > 0 && (
            <div
              style={{
                background: "#f0e8dc",
                borderRadius: 8,
                padding: "10px 14px",
                fontFamily: "'DM Sans',sans-serif",
                fontSize: 13,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 4,
                }}
              >
                <span style={{ color: "#9a8878" }}>Subtotal</span>
                <span style={{ color: "#1a0f05" }}>
                  {subtotal.toLocaleString()} EGP
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 4,
                }}
              >
                <span style={{ color: "#c4712a", fontWeight: 600 }}>
                  Bundle discount ({bundle.discountPct}%)
                </span>
                <span style={{ color: "#c4712a", fontWeight: 600 }}>
                  − {discount.toLocaleString()} EGP
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  borderTop: "1px solid #e5ddd2",
                  paddingTop: 6,
                  marginTop: 2,
                }}
              >
                <span style={{ fontWeight: 700, color: "#1a0f05" }}>Total</span>
                <span
                  style={{ fontWeight: 700, color: "#1a0f05", fontSize: 15 }}
                >
                  {total.toLocaleString()} EGP
                </span>
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button className="btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn-primary"
              disabled={!done || !isStoreOpen}
              style={{ opacity: done && isStoreOpen ? 1 : 0.5 }}
              onClick={() => {
                if (!isStoreOpen) return;
                onAddToCart?.({
                  bundle,
                  items: cartItems,
                  subtotal,
                  discount,
                  total,
                });
                onClose();
              }}
            >
              {!isStoreOpen
                ? "Store Closed"
                : done
                  ? `Add to Cart — ${total.toLocaleString()} EGP`
                  : `Add to Cart (${totalSelected}/${max})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════
   BUNDLE CARD
═══════════════════════════════════════════════ */
const BundleCard = ({
  bundle,
  isAdmin,
  isStoreOpen,
  onEdit,
  onDelete,
  onPick,
  onAddFixed,
}) => {
  const isAvail = bundle.available !== false;
  const isStatic = bundle.type === "static";
  const canOrder = isAvail && isStoreOpen;

  return (
    <div className={`product-card-wrapper${!isAvail ? " out-of-stock" : ""}`}>
      {isAdmin && (
        <div className="admin-card-controls">
          <button className="admin-card-btn" onClick={onEdit}>
            Edit
          </button>
          <button
            className="admin-card-btn admin-card-btn--delete"
            onClick={onDelete}
          >
            Delete
          </button>
        </div>
      )}

      <div className="product-card">
        <div className="product-card-img">
          {bundle.image ? (
            <img
              src={bundle.image}
              alt={bundle.name}
              className="product-card-photo"
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                background: "#6b3e1a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  fontFamily: "'Cormorant Garamond',serif",
                  fontSize: 42,
                  fontWeight: 700,
                  color: "#f5f0e8",
                }}
              >
                ×
                {isStatic
                  ? bundle.fixedItems?.reduce((s, fi) => s + fi.qty, 0)
                  : bundle.quantity}
              </span>
            </div>
          )}

          {/* discount badge */}
          <span
            style={{
              position: "absolute",
              top: 10,
              left: 10,
              background: "#c4712a",
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
              padding: "4px 10px",
              borderRadius: 999,
            }}
          >
            {bundle.discountPct}% Off
          </span>

          {!isAvail && (
            <div className="out-of-stock-overlay">
              <span className="out-of-stock-badge">Out of Stock</span>
            </div>
          )}
          {isAvail && !isStoreOpen && (
            <div className="out-of-stock-overlay">
              <span className="out-of-stock-badge">Store Closed</span>
            </div>
          )}
        </div>

        <div className="product-card-body">
          <div className="product-card-tag">Bundle</div>
          <div className="product-card-name">{bundle.name}</div>
          <div className="product-card-desc">
            {isStatic
              ? bundle.fixedItems
                  ?.map(
                    (fi) =>
                      `${fi.product?.name ?? fi.product}${fi.qty > 1 ? ` ×${fi.qty}` : ""}`,
                  )
                  .join(", ")
              : bundle.description}
          </div>

          <div className="product-card-footer">
            <div className="product-card-price-block">
              {isStatic ? (
                <>
                  <span
                    className="product-card-original-price"
                    style={{ fontSize: 12 }}
                  >
                    {Number(bundle.originalPrice).toLocaleString()} EGP
                  </span>
                  <span
                    className="product-card-price product-card-price--sale"
                    style={{ fontSize: 15 }}
                  >
                    {Number(bundle.offerPrice).toLocaleString()} EGP
                  </span>
                </>
              ) : (
                <>
                  <span
                    className="product-card-price"
                    style={{ fontSize: 13, fontWeight: 600 }}
                  ></span>
                  <span
                    className="product-card-save"
                    style={{ marginRight: 10 }}
                  >
                    Save {bundle.discountPct}%
                  </span>
                </>
              )}
            </div>

            {canOrder && (
              <button
                className="product-card-add"
                onClick={isStatic ? onAddFixed : onPick}
              >
                +
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════
   BUNDLE SECTION
═══════════════════════════════════════════════ */
const BundleSection = ({ onAddToCart, isStoreOpen = true }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "it";

  const [bundles, setBundles] = useState([]);
  const [formBundle, setFormBundle] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [pickBundle, setPickBundle] = useState(null);

  const fetchBundles = async () => {
    try {
      const { data } = await API.get("/bundles");
      setBundles(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchBundles();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this bundle?")) return;
    await API.delete(`/bundles/${id}`);
    setBundles((bs) => bs.filter((b) => b._id !== id));
  };

  /* ── add a fixed/static box straight to cart, no picker modal ── */
  const handleAddFixed = (bundle) => {
    if (!isStoreOpen) return;
    const items = (bundle.fixedItems ?? []).map((fi) => ({
      product: fi.product?._id
        ? fi.product
        : { _id: fi.product, name: "Unknown" },
      qty: fi.qty,
    }));
    const subtotal = Number(bundle.originalPrice);
    const discount = subtotal - Number(bundle.offerPrice);
    onAddToCart?.({
      bundle,
      items,
      subtotal,
      discount,
      total: Number(bundle.offerPrice),
    });
  };
  if (bundles.length === 0 && !isAdmin) return null;

  return (
    <div style={{ marginBottom: 36 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          marginBottom: 16,
        }}
      >
        <div>
          <h2
            style={{
              fontFamily: "'Cormorant Garamond',serif",
              fontSize: 28,
              fontWeight: 700,
              color: "#1a0f05",
              margin: 0,
            }}
          >
            Bundles & Boxes
          </h2>
          <p
            style={{
              fontSize: 12,
              color: "#9a8878",
              margin: "4px 0 0",
              fontFamily: "'DM Sans',sans-serif",
            }}
          >
            Mix & match flavours · 65g per piece · save more when you bundle
          </p>
        </div>
        {isAdmin && (
          <button
            className="admin-add-btn"
            onClick={() => {
              setFormBundle(null);
              setFormOpen(true);
            }}
          >
            + Add Bundle
          </button>
        )}
      </div>

      {bundles.length === 0 && isAdmin && (
        <p
          style={{
            padding: "0 16px",
            color: "#9a8878",
            fontSize: 13,
            fontFamily: "'DM Sans',sans-serif",
          }}
        >
          No bundles yet — add one above.
        </p>
      )}

      <div className="menu-grid">
        {bundles.map((b) => (
          <BundleCard
            key={b._id}
            bundle={b}
            isAdmin={isAdmin}
            isStoreOpen={isStoreOpen}
            onEdit={() => {
              setFormBundle(b);
              setFormOpen(true);
            }}
            onDelete={() => handleDelete(b._id)}
            onPick={() => setPickBundle(b)}
            onAddFixed={() => handleAddFixed(b)}
          />
        ))}
      </div>

      {formOpen && (
        <BundleFormModal
          bundle={formBundle}
          onClose={() => setFormOpen(false)}
          onSaved={fetchBundles}
        />
      )}

      {pickBundle && (
        <ProductPickerModal
          bundle={pickBundle}
          isStoreOpen={isStoreOpen}
          onClose={() => setPickBundle(null)}
          onAddToCart={onAddToCart}
        />
      )}
    </div>
  );
};

export default BundleSection;
