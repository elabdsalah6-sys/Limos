import { useState, useEffect, useCallback, useRef } from "react";
import API from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { useStore } from "../context/StoreContext";
import "./Menu.css";
import "./Home.css";
import BundleSection from "./BundleSection";
import { useCart } from "../context/CartContext";

/* ─── constants ─────────────────────────────── */

const EMPTY_SIZE = {
  label: "",
  price: "",
  originalPrice: "",
  offerActive: false,
};

const EMPTY_FORM = {
  name: "",
  description: "",
  category: "",
  flavorType: null,
  sizes: [{ ...EMPTY_SIZE }],
  flavors: [],
  image: "",
  boxSizes: [],
  offer: { label: "", active: false },
  available: true,
};

/* ═══════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════ */
const Menu = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "it";
  const { isOpen: isStoreOpen } = useStore();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("");

  const [editingProduct, setEditingProduct] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [flavorInput, setFlavorInput] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);
  const { addItem, addBundle } = useCart();
  const [toast, setToast] = useState(null);

  const [categories, setCategories] = useState([]);

  useEffect(() => {
    API.get("/categories")
      .then((r) => setCategories(r.data))
      .catch(console.error);
  }, []);

  // Build the tabs array dynamically from fetched categories.
  // "All" and "Bundles" are always present; the rest come from the DB.
  // AFTER
  const CATEGORIES = [
    { label: "All", value: "", query: {} },
    { label: "Bundles", value: "bundles", query: { category: "bundles" } },
  ]
    .concat(
      categories.map((c) => ({
        label: c.name,
        value: c.slug,
        query: { category: c.name },
      })),
    )
    .concat(
      // Flavor subtabs — only show if "Limo Roll" category exists in DB
      categories.some((c) => c.name === "Limo-Roll")
        ? [
            {
              label: "Signature Flavours",
              value: "signature",
              query: { category: "Limo-Roll", flavorType: "signature" },
            },
            {
              label: "Premium Flavours",
              value: "premium",
              query: { category: "Limo-Roll", flavorType: "premium" },
            },
          ]
        : [],
    );
  const toastTimerRef = useRef(null);

  const showToast = (message) => {
    setToast(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2200);
  };

  /* ── fetch ── */
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const activeCategory = CATEGORIES.find((c) => c.value === activeTab);
      const params = new URLSearchParams(
        activeCategory?.query ?? {},
      ).toString();
      const { data } = await API.get(
        params ? `/products?${params}` : "/products",
      );
      setProducts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, categories]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  /* ── form helpers ── */
  const openAdd = () => {
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    setFlavorInput("");
    setFormOpen(true);
  };

  const openEdit = (p) => {
    setEditingProduct(p);
    setForm({
      name: p.name,
      description: p.description || "",
      category: p.category,
      flavorType: p.flavorType ?? null,
      sizes: p.sizes?.length
        ? p.sizes.map((s) => ({
            label: s.label,
            price: s.price,
            originalPrice: s.originalPrice ?? "",
            offerActive: s.offerActive ?? false,
          }))
        : [{ ...EMPTY_SIZE }],
      flavors: p.flavors || [],
      image: p.image || "",
      boxSizes: p.boxSizes || [],
      offer: p.offer || { label: "", active: false },
      available: p.available ?? true,
    });
    setFlavorInput("");
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingProduct(null);
  };

  const addSize = () =>
    setForm((f) => ({ ...f, sizes: [...f.sizes, { ...EMPTY_SIZE }] }));

  const removeSize = (i) =>
    setForm((f) => ({ ...f, sizes: f.sizes.filter((_, idx) => idx !== i) }));

  const updateSize = (i, key, val) =>
    setForm((f) => ({
      ...f,
      sizes: f.sizes.map((s, idx) => (idx === i ? { ...s, [key]: val } : s)),
    }));

  const addFlavor = () => {
    const v = flavorInput.trim();
    if (v && !form.flavors.includes(v))
      setForm((f) => ({ ...f, flavors: [...f.flavors, v] }));
    setFlavorInput("");
  };

  const removeFlavor = (fl) =>
    setForm((f) => ({ ...f, flavors: f.flavors.filter((x) => x !== fl) }));

  const handleSave = async () => {
    if (!form.name.trim()) return alert("Name is required");
    const validSizes = form.sizes.filter((s) => s.label && s.price !== "");
    if (!validSizes.length)
      return alert("At least one size with price required");
    setSaving(true);
    try {
      const payload = {
        ...form,
        sizes: validSizes.map((s) => ({
          label: s.label,
          price: Number(s.price),
          originalPrice:
            s.originalPrice !== "" ? Number(s.originalPrice) : undefined,
          offerActive: s.offerActive,
        })),
      };
      if (editingProduct) {
        await API.put(`/products/${editingProduct._id}`, payload);
      } else {
        await API.post("/products", payload);
      }
      await fetchProducts();
      closeForm();
    } catch (err) {
      alert(err?.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id) => setDeleteTarget(id);

  const confirmDelete = async () => {
    try {
      await API.delete(`/products/${deleteTarget}`);
      setProducts((ps) => ps.filter((p) => p._id !== deleteTarget));
    } catch {
      alert("Delete failed");
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleToggleAvailable = async (e, product) => {
    e.preventDefault();
    e.stopPropagation();

    setProducts((ps) =>
      ps.map((p) =>
        p._id === product._id ? { ...p, available: !product.available } : p,
      ),
    );

    try {
      await API.put(`/products/${product._id}`, {
        name: product.name,
        description: product.description,
        category: product.category,
        sizes: product.sizes,
        flavors: product.flavors,
        boxSizes: product.boxSizes,
        offer: product.offer,
        available: !product.available,
      });
    } catch {
      setProducts((ps) =>
        ps.map((p) =>
          p._id === product._id ? { ...p, available: product.available } : p,
        ),
      );
      alert("Failed to update availability");
    }
  };

  /* ═══════════ RENDER ═══════════ */
  return (
    <div className="menu">
      <div className="menu-header">
        <div className="menu-header-top">
          <div>
            <h1>Our Menu</h1>
            <p>Freshly baked every morning. Pick your favourite.</p>
          </div>
          {isAdmin && (
            <button className="admin-add-btn" onClick={openAdd}>
              + Add Product
            </button>
          )}
        </div>

        {!isStoreOpen && (
          <div className="store-closed-banner">
            We're currently closed. You can browse the menu, but ordering is
            paused for now.
          </div>
        )}

        <div className="menu-tabs">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              className={`menu-tab ${activeTab === c.value ? "active" : ""}`}
              onClick={() => setActiveTab(c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="menu-loading">Loading...</div>
      ) : (
        <>
          {(activeTab === "" || activeTab === "bundles") && (
            <BundleSection
              onAddToCart={({ bundle, items, total, discount }) => {
                addBundle(bundle, items, total, discount);
                showToast(`Added "${bundle.name}" to cart`);
              }}
              isStoreOpen={isStoreOpen}
            />
          )}

          {activeTab !== "bundles" &&
            (products.length === 0 ? (
              <div className="menu-empty">
                <h3>Nothing here yet</h3>
                <p>Check back soon for fresh items.</p>
              </div>
            ) : (
              <div className="menu-grid">
                {products.map((p) => (
                  <ProductCard
                    key={p._id}
                    product={p}
                    isAdmin={isAdmin}
                    isStoreOpen={isStoreOpen}
                    onEdit={() => openEdit(p)}
                    onDelete={() => handleDelete(p._id)}
                    onToggleAvailable={(e) => handleToggleAvailable(e, p)}
                    addItem={addItem}
                    showToast={showToast}
                  />
                ))}
              </div>
            ))}
        </>
      )}

      {/* ── admin form modal ── */}
      {formOpen && (
        <div className="modal-overlay" onClick={closeForm}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingProduct ? "Edit Product" : "Add Product"}</h2>
              <button className="modal-close" onClick={closeForm}>
                &#x2715;
              </button>
            </div>

            <div className="modal-body">
              <label className="form-label">Name *</label>
              <input
                className="form-input"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="e.g. Classic Limo Roll"
              />

              <label className="form-label">Description</label>
              <textarea
                className="form-input"
                rows={2}
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Short description..."
              />

              <label className="form-label">Category *</label>
              <select
                className="form-input"
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value }))
                }
              >
                {categories.map((c) => (
                  <option key={c._id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>

              <label className="form-label">Flavour Type</label>
              <select
                className="form-input"
                value={form.flavorType ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, flavorType: e.target.value || null }))
                }
              >
                <option value="">None</option>
                <option value="signature">Signature Flavour</option>
                <option value="premium">Premium Flavour</option>
              </select>

              <label className="form-label">Photo</label>
              <div className="form-img-upload-area">
                {form.image ? (
                  <img
                    src={form.image}
                    alt="preview"
                    className="form-img-preview"
                  />
                ) : (
                  <div className="form-img-placeholder">
                    <span className="form-img-placeholder-icon">&#8679;</span>
                    <span className="form-img-placeholder-text">
                      No photo selected
                    </span>
                  </div>
                )}
                <label className="form-img-choose-btn">
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (ev) =>
                        setForm((f) => ({ ...f, image: ev.target.result }));
                      reader.readAsDataURL(file);
                    }}
                  />
                  Choose from Device
                </label>
              </div>
              {form.image && (
                <button
                  className="form-add-link"
                  style={{ color: "#b03020", marginTop: 4 }}
                  onClick={() => setForm((f) => ({ ...f, image: "" }))}
                >
                  Remove photo
                </button>
              )}

              <label className="form-label" style={{ marginTop: 16 }}>
                Sizes & Prices *
              </label>

              <div className="form-size-header">
                <span>Label </span>
                <span>Before (EGP) </span>
                <span>After (EGP) </span>
                <span>On Offer? </span>
                <span />
              </div>

              {form.sizes.map((s, i) => (
                <div key={i} className="form-size-row">
                  <input
                    className="form-input form-input-sm"
                    placeholder="e.g. Mini"
                    value={s.label}
                    onChange={(e) => updateSize(i, "label", e.target.value)}
                  />
                  <input
                    className="form-input form-input-sm"
                    placeholder="Original"
                    type="number"
                    value={s.originalPrice}
                    onChange={(e) =>
                      updateSize(i, "originalPrice", e.target.value)
                    }
                  />
                  <input
                    className="form-input form-input-sm"
                    placeholder="Sale / Current"
                    type="number"
                    value={s.price}
                    onChange={(e) => updateSize(i, "price", e.target.value)}
                  />
                  <label className="form-size-offer-toggle">
                    <input
                      type="checkbox"
                      checked={s.offerActive}
                      onChange={(e) =>
                        updateSize(i, "offerActive", e.target.checked)
                      }
                    />
                    <span
                      className={`offer-pill${s.offerActive ? " offer-pill--on" : ""}`}
                    >
                      {s.offerActive ? "Yes" : "No"}
                    </span>
                  </label>
                  {form.sizes.length > 1 && (
                    <button
                      className="form-remove-btn"
                      onClick={() => removeSize(i)}
                    >
                      &#x2715;
                    </button>
                  )}
                </div>
              ))}

              {form.sizes.some(
                (s) =>
                  s.offerActive && s.originalPrice !== "" && s.price !== "",
              ) && (
                <div className="form-size-save-preview">
                  {form.sizes.map((s, i) => {
                    if (
                      !s.offerActive ||
                      s.originalPrice === "" ||
                      s.price === ""
                    )
                      return null;
                    const saved = Number(s.originalPrice) - Number(s.price);
                    if (saved <= 0) return null;
                    return (
                      <span key={i} className="form-save-chip">
                        {s.label || `Size ${i + 1}`}: Save{" "}
                        {saved.toLocaleString()} EGP
                      </span>
                    );
                  })}
                </div>
              )}

              <button className="form-add-link" onClick={addSize}>
                + Add size
              </button>

              <label className="form-label">Flavors</label>
              <div className="form-flavor-row">
                <input
                  className="form-input"
                  placeholder="e.g. Classic Limo Roll"
                  value={flavorInput}
                  onChange={(e) => setFlavorInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addFlavor()}
                />
                <button className="form-add-link" onClick={addFlavor}>
                  Add
                </button>
              </div>
              <div className="flavor-tags">
                {form.flavors.map((fl) => (
                  <span key={fl} className="flavor-tag">
                    {fl}
                    <button onClick={() => removeFlavor(fl)}>&#x2715;</button>
                  </span>
                ))}
              </div>

              <label className="form-label">Announcement</label>
              <div className="form-offer-row">
                <input
                  className="form-input"
                  placeholder='e.g. "Spring Sale"'
                  value={form.offer.label}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      offer: { ...f.offer, label: e.target.value },
                    }))
                  }
                />
                <label className="form-check-label">
                  <input
                    type="checkbox"
                    checked={form.offer.active}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        offer: { ...f.offer, active: e.target.checked },
                      }))
                    }
                  />
                  Active
                </label>
              </div>

              <label className="form-check-label" style={{ marginTop: 12 }}>
                <input
                  type="checkbox"
                  checked={form.available}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, available: e.target.checked }))
                  }
                />
                In Stock (available)
              </label>
            </div>

            <div className="modal-footer">
              <button className="btn-ghost" onClick={closeForm}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingProduct
                    ? "Save Changes"
                    : "Add Product"}
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
              <h2>Delete product?</h2>
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
                This action cannot be undone.
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
      {toast && (
        <div className="cart-toast">
          <span className="cart-toast-check">✓</span>
          {toast}
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════
   PRODUCT CARD
═══════════════════════════════════════════════ */
const ProductCard = ({
  product: p,
  isAdmin,
  isStoreOpen,
  onEdit,
  onDelete,
  onToggleAvailable,
  addItem,
  showToast,
}) => {
  const [qty, setQty] = useState(0);

  const hasOffer = p.offer?.active && p.offer?.label;
  const isAvailable = p.available !== false;
  // Controls only show when in stock, store is open, and viewer isn't an admin.
  const canOrder = isAvailable && isStoreOpen && !isAdmin;

  const displaySize = p.sizes?.find((s) => s.offerActive) ?? p.sizes?.[0];
  const anySizeOffer = p.sizes?.some((s) => s.offerActive);
  const salePrice = displaySize?.price;
  const originalPrice = displaySize?.offerActive
    ? displaySize?.originalPrice
    : null;
  const saveAmount =
    originalPrice != null && salePrice != null
      ? originalPrice - salePrice
      : null;

  const handleAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setQty((q) => q + 1);
  };

  const handleDec = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setQty((q) => Math.max(0, q - 1));
  };

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (qty === 0) return;
    addItem(p, qty, displaySize);
    showToast?.(`Added ${qty} × ${p.name} to cart`);
    setQty(0);
  };

  return (
    <div
      className={`product-card-wrapper${!isAvailable ? " out-of-stock" : ""}`}
    >
      {isAdmin && (
        <div className="admin-card-controls">
          <button className="admin-card-btn" onClick={onEdit}>
            Edit
          </button>
          <button
            className={`admin-card-btn admin-card-btn--stock${!isAvailable ? " unavailable" : ""}`}
            onClick={onToggleAvailable}
          >
            {isAvailable ? "Sold Out" : "In Stock"}
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
          {p.image && (
            <img src={p.image} alt={p.name} className="product-card-photo" />
          )}
          {hasOffer && <span className="offer-hero-text">{p.offer.label}</span>}
          {!isAvailable && (
            <div className="out-of-stock-overlay">
              <span className="out-of-stock-badge">Out of Stock</span>
            </div>
          )}
          {isAvailable && !isStoreOpen && (
            <div className="out-of-stock-overlay">
              <span className="out-of-stock-badge">Store Closed</span>
            </div>
          )}
        </div>

        <div className="product-card-body">
          <div className="product-card-tag">{p.category}</div>

          {/* Signature / Premium badge — inline in text flow, no overlap */}
          {p.flavorType && (
            <span
              className={`flavor-type-badge flavor-type-badge--${p.flavorType}`}
            >
              {p.flavorType === "signature" ? "Signature" : "Premium"}
            </span>
          )}

          <div className="product-card-name">{p.name}</div>
          <div className="product-card-desc">{p.description}</div>

          {p.flavors?.length > 0 && (
            <div className="product-card-flavors">
              {p.flavors.slice(0, 3).map((fl) => (
                <span key={fl} className="product-card-flavor-dot">
                  {fl}
                </span>
              ))}
              {p.flavors.length > 3 && (
                <span className="product-card-flavor-dot product-card-flavor-more">
                  +{p.flavors.length - 3}
                </span>
              )}
            </div>
          )}

          <div
            className="product-card-price-block"
            style={{ marginTop: "auto", paddingTop: 10 }}
          >
            {anySizeOffer ? (
              <>
                {originalPrice != null && (
                  <span className="product-card-original-price">
                    {Number(originalPrice).toLocaleString()} EGP
                  </span>
                )}
                <span className="product-card-price product-card-price--sale">
                  {salePrice != null
                    ? `${Number(salePrice).toLocaleString()} EGP`
                    : ""}
                </span>
                {saveAmount != null && saveAmount > 0 && (
                  <span className="product-card-save">
                    Save {Number(saveAmount).toLocaleString()} EGP
                  </span>
                )}
              </>
            ) : (
              <>
                <span className="product-card-price">
                  {salePrice != null
                    ? `${Number(salePrice).toLocaleString()} EGP`
                    : ""}
                </span>
                {p.sizes?.length > 1 && (
                  <span className="product-card-sizes">
                    {p.sizes.length} sizes
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {canOrder && (
        <div className="product-card-actions">
          <div className="product-card-footer">
            {qty === 0 ? (
              <button className="product-card-add" onClick={handleAdd}>
                +
              </button>
            ) : (
              <div className="product-card-stepper">
                <button
                  className="product-card-stepper-btn"
                  onClick={handleDec}
                >
                  −
                </button>
                <span className="product-card-stepper-qty">{qty}</span>
                <button
                  className="product-card-stepper-btn product-card-stepper-btn--add"
                  onClick={handleAdd}
                >
                  +
                </button>
              </div>
            )}
          </div>

          {qty > 0 && (
            <button className="product-card-cart-btn" onClick={handleAddToCart}>
              Add {qty} to cart
              {salePrice != null && (
                <span className="product-card-cart-total">
                  {(Number(salePrice) * qty).toLocaleString()} EGP
                </span>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default Menu;
