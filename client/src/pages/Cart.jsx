import { useCart } from "../context/CartContext";
import { useNavigate } from "react-router-dom";
import "./Cart.css";

const Cart = () => {
  const { cart, removeItem, updateQty, totalPrice, clearCart } = useCart();
  const navigate = useNavigate();

  if (cart.length === 0) {
    return (
      <div className="cart-empty">
        <h2>Your cart is empty</h2>
        <p>Add some items from the menu first.</p>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="cart-header">
        <h1>Your Cart</h1>
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
          onClick={() => navigate("/checkout")}
        >
          Proceed to Checkout
        </button>
      </div>
    </div>
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
        <button
          className="cart-item-remove"
          onClick={() => onRemove(item.key)}
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export default Cart;