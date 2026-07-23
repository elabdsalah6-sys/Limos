import { useCart } from "../context/CartContext";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import "./CartDrawer.css";

const CartDrawer = () => {
  const {
    cart,
    removeItem,
    updateQty,
    totalPrice,
    clearCart,
    isCartOpen,
    closeCart,
  } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    if (isCartOpen) {
      document.body.classList.add("cart-drawer-open-lock");
    } else {
      document.body.classList.remove("cart-drawer-open-lock");
    }
    return () => document.body.classList.remove("cart-drawer-open-lock");
  }, [isCartOpen]);

  const handleCheckout = () => {
    closeCart();
    navigate("/checkout");
  };

  return (
    <>
      <div
        className={`cart-drawer-overlay ${isCartOpen ? "open" : ""}`}
        onClick={closeCart}
      />

      <div className={`cart-drawer ${isCartOpen ? "open" : ""}`}>
        <div className="cart-drawer-header">
          <h1>Your Cart</h1>
          <button className="cart-drawer-close" onClick={closeCart}>
            <i className="ti ti-x" />
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="cart-drawer-empty">
            <h2>Your cart is empty</h2>
            <p>Add some items from the menu first.</p>
          </div>
        ) : (
          <>
            <div className="cart-drawer-clear">
              <button className="cart-clear-btn" onClick={clearCart}>
                Clear all
              </button>
            </div>

            <div className="cart-items">
              {cart.map((item) => (
                <CartItem
                  key={item.key}
                  item={item}
                  onRemove={removeItem}
                  onQty={updateQty}
                />
              ))}
            </div>

            <div className="cart-footer">
              <div className="cart-total-row">
                <span>Total</span>
                <span className="cart-total-price">
                  {totalPrice.toLocaleString()} EGP
                </span>
              </div>
              <button
                className="btn-primary cart-checkout-btn"
                onClick={handleCheckout}
              >
                Proceed to Checkout
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
};

const CartItem = ({ item, onRemove, onQty }) => {
  if (item.type === "bundle") {
    return (
      <div className="cart-item">
        <div className="cart-item-img cart-item-img--bundle">
          ×{item.bundle.quantity}
        </div>
        <div className="cart-item-info">
          <p className="cart-item-name">{item.bundle.name}</p>
          <p className="cart-item-meta">
            {item.items
              .map((i) => `${i.product.name}${i.qty > 1 ? ` ×${i.qty}` : ""}`)
              .join(", ")}
          </p>
          {item.discount > 0 && (
            <p className="cart-item-saving">
              Saved {item.discount.toLocaleString()} EGP
            </p>
          )}
        </div>
        <div className="cart-item-right">
          <span className="cart-item-price">
            {item.total.toLocaleString()} EGP
          </span>
          <button
            className="cart-item-remove"
            onClick={() => onRemove(item.key)}
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-item">
      <div className="cart-item-img">
        {item.product.image && (
          <img src={item.product.image} alt={item.product.name} />
        )}
      </div>
      <div className="cart-item-info">
        <p className="cart-item-name">{item.product.name}</p>
        {item.size && <p className="cart-item-meta">{item.size.label}</p>}
        <p className="cart-item-unit">
          {Number(item.unitPrice).toLocaleString()} EGP each
        </p>
      </div>
      <div className="cart-item-right">
        <div className="cart-item-stepper">
          <button onClick={() => onQty(item.key, item.qty - 1)}>−</button>
          <span>{item.qty}</span>
          <button onClick={() => onQty(item.key, item.qty + 1)}>+</button>
        </div>
        <span className="cart-item-price">
          {(item.unitPrice * item.qty).toLocaleString()} EGP
        </span>
        <button className="cart-item-remove" onClick={() => onRemove(item.key)}>
          ✕
        </button>
      </div>
    </div>
  );
};

export default CartDrawer;
