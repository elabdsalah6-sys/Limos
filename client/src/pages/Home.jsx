import { Link } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import "./Home.css";
import defaultHeroBg from "../component/limosBg.jpeg";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useStore } from "../context/StoreContext";
import API from "../api/axios";
import Reviews from "./Reviews";
import { uploadImage } from "../utils/uploadImage";

const HERO_IMG_KEY = "limos_hero_image";

/* ─── Fan Favourite Card ─────────────────────── */
const FeaturedCard = ({ product: p, addItem, isOpen, showToast }) => {
  const [qty, setQty] = useState(0);

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
  const isAvailable = p.available !== false && isOpen;
  const hasOffer = p.offer?.active && p.offer?.label;

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
      <Link to={`/menu`} className="product-card">
        <div className="product-card-img">
          {p.image ? (
            <img src={p.image} alt={p.name} className="product-card-photo" />
          ) : (
            "🍥"
          )}
          {hasOffer && <span className="offer-hero-text">{p.offer.label}</span>}
          {!isOpen && p.available !== false && (
            <div className="out-of-stock-overlay">
              <span className="out-of-stock-badge">Store Closed</span>
            </div>
          )}
          {p.available === false && (
            <div className="out-of-stock-overlay">
              <span className="out-of-stock-badge">Out of Stock</span>
            </div>
          )}
        </div>

        <div className="product-card-body">
          <div className="product-card-tag">{p.category}</div>
          <div className="product-card-name">{p.name}</div>
          <div className="product-card-desc">{p.description}</div>

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
              <span className="product-card-price">
                {salePrice != null
                  ? `${Number(salePrice).toLocaleString()} EGP`
                  : "—"}
              </span>
            )}
          </div>
        </div>
      </Link>

      {isAvailable && (
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

/* ─── Home ───────────────────────────────────── */
const Home = () => {
  const { user } = useAuth();
  const { addItem } = useCart();
  const { isOpen } = useStore();
  const isAdmin = user?.role === "admin" || user?.role === "it";
  const fileInputRef = useRef(null);

  const [heroBg, setHeroBg] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [showPicker, setShowPicker] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const showToast = (message) => {
    setToast(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2200);
  };

  // Load hero bg
  useEffect(() => {
    const saved = localStorage.getItem(HERO_IMG_KEY);
    setHeroBg(saved || defaultHeroBg);
  }, []);

  // Fetch all products + featured IDs
  useEffect(() => {
    const load = async () => {
      try {
        const [productsRes, featuredRes] = await Promise.all([
          API.get("/products"),
          API.get("/settings/featured"),
        ]);
        const products = productsRes.data;
        const featuredIds = featuredRes.data;

        const validIds = featuredIds.filter((id) =>
          products.some((p) => p._id === id),
        );

        setAllProducts(products);
        setSelectedIds(validIds);

        const featuredProducts = featuredIds
          .map((id) => products.find((p) => p._id === id))
          .filter(Boolean);
        setFeatured(featuredProducts);
      } catch (err) {
        console.error("Failed to load products", err);
      }
    };
    load();
  }, []);

  // Hero photo handlers
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadImage(file);
      localStorage.setItem(HERO_IMG_KEY, url);
      setHeroBg(url);
    } catch (err) {
      alert("Image upload failed, please try again");
    }
  };

  const handleRemoveBg = () => {
    localStorage.removeItem(HERO_IMG_KEY);
    setHeroBg(defaultHeroBg);
    fileInputRef.current.value = "";
  };

  // Featured picker handlers
  const toggleProduct = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < 4
          ? [...prev, id]
          : prev,
    );
  };

  const saveFeatured = async () => {
    setSaving(true);
    try {
      await API.put("/settings/featured", { ids: selectedIds });
      const featuredProducts = selectedIds
        .map((id) => allProducts.find((p) => p._id === id))
        .filter(Boolean);
      setFeatured(featuredProducts);
      setShowPicker(false);
    } catch (err) {
      console.error("Failed to save featured", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="home">
      {!user && (
        <section className="home-join">
          <div className="home-join-content">
            <h2>Join the Limo's family</h2>
            <p>
              Create an account to track your orders and get exclusive deals.
            </p>
            <div className="home-join-actions">
              <div className="home-join-actions">
                <Link to="/register" className="home-cta">
                  Sign Up
                </Link>
                <Link to="/login" className="home-cta home-cta--outline">
                  Log In
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      <section
        className="home-hero"
        style={heroBg ? { backgroundImage: `url(${heroBg})` } : undefined}
      >
        <div className="hero-overlay" />

        {isAdmin && (
          <div className="hero-admin-bar">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              style={{ display: "none" }}
              id="hero-upload"
            />
            <label htmlFor="hero-upload" className="hero-admin-btn">
              📷 {heroBg !== defaultHeroBg ? "Change photo" : "Set hero photo"}
            </label>
            {heroBg !== defaultHeroBg && (
              <button
                className="hero-admin-btn hero-admin-remove"
                onClick={handleRemoveBg}
              >
                ✕ Remove
              </button>
            )}
          </div>
        )}

        <div className="home-hero-content">
          <div className="hero-eyebrow">
            <span>Fresh Daily</span>
          </div>
          <h1>
            Limo's
            <em>Bakery.</em>
          </h1>
          <p>
            Freshly Baked Cinnamon Rolls.
            <br />
            Made to Crave.
            <br />
            Made to Remember.
          </p>
          <div className="hero-actions">
            <Link to="/menu" className="home-cta">
              Order Now
            </Link>
            <Link to="/menu" className="hero-secondary-link">
              See the menu
            </Link>
          </div>
        </div>
      </section>

      {/* Fan Favourites */}
      <section className="home-featured">
        <div className="home-featured-header">
          <h2>Fan Favourites</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {isAdmin && (
              <button
                className="featured-edit-btn"
                onClick={() => setShowPicker(true)}
              >
                ✏️ Edit
              </button>
            )}
            <Link to="/menu" className="see-all">
              See all →
            </Link>
          </div>
        </div>

        {featured.length === 0 ? (
          <p className="featured-empty">
            {isAdmin
              ? "No featured products yet — click Edit to pick some."
              : "Coming soon!"}
          </p>
        ) : (
          <div className="products-grid">
            {featured.map((p) => (
              <FeaturedCard
                key={p._id}
                product={p}
                addItem={addItem}
                isOpen={isOpen}
                showToast={showToast}
              />
            ))}
          </div>
        )}
      </section>

      <div className="home-about-rolls">
        <h2>About Our Rolls</h2>

        <div className="about-rolls-row">
          <div className="about-rolls-item">
            <i className="ti ti-leaf" />
            <span>Premium Ingredients</span>
          </div>
          <div className="about-rolls-item">
            <i className="ti ti-roller-skating" />
            <span>Rich Cinnamon Flavor</span>
          </div>
          <div className="about-rolls-item">
            <i className="ti ti-heart" />
            <span>Soft, Warm &amp; Delicious</span>
          </div>
        </div>

        <div className="about-rolls-divider" />

        <div className="about-rolls-features">
          <div className="about-rolls-feature">
            <i className="ti ti-flame" />
            <span>Baked Fresh on Order</span>
          </div>
          <div className="about-rolls-feature">
            <i className="ti ti-clock" />
            <span>Pre-Order Recommended</span>
          </div>
          <div className="about-rolls-feature">
            <i className="ti ti-gift" />
            <span>Perfect for Gifts</span>
          </div>
          <div className="about-rolls-feature">
            <i className="ti ti-truck-delivery" />
            <span>Delivery Available</span>
          </div>
        </div>
      </div>

      <Reviews />

      {/* Admin Featured Picker Modal */}
      {showPicker && (
        <div className="picker-backdrop" onClick={() => setShowPicker(false)}>
          <div className="picker-modal" onClick={(e) => e.stopPropagation()}>
            <div className="picker-header">
              <h3>Choose Fan Favourites</h3>
              <p>Select up to 4 products</p>
            </div>
            <div className="picker-list">
              {allProducts.map((p) => {
                const selected = selectedIds.includes(p._id);
                return (
                  <div
                    key={p._id}
                    className={`picker-item ${selected ? "picker-item--selected" : ""}`}
                    onClick={() => toggleProduct(p._id)}
                  >
                    <div className="picker-item-img">
                      {p.image ? (
                        <img
                          src={p.image}
                          alt={p.name}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        "🍥"
                      )}
                    </div>
                    <div className="picker-item-info">
                      <span className="picker-item-name">{p.name}</span>
                      <span className="picker-item-cat">{p.category}</span>
                    </div>
                    <div className="picker-item-check">
                      {selected ? "✓" : ""}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="picker-footer">
              <span className="picker-count">
                {selectedIds.length} / 4 selected
              </span>
              <button
                className="picker-save-btn"
                onClick={saveFeatured}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save"}
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

export default Home;
