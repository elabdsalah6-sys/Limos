import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import "./MyOrders.css";

const STATUS_LABEL = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  on_the_way: "On The Way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_COLOR = {
  pending: "status--pending",
  confirmed: "status--confirmed",
  preparing: "status--preparing",
  on_the_way: "status--on-the-way",
  delivered: "status--delivered",
  cancelled: "status--cancelled",
};

const PROGRESS_STEPS = ["Confirmed", "Preparing", "On The Way", "Delivered"];

const STEP_INDEX = {
  confirmed: 0,
  preparing: 1,
  on_the_way: 2,
  delivered: 3,
};

const ProgressBar = ({ status }) => {
  const activeIndex = STEP_INDEX[status] ?? -1;
  return (
    <div className="myorders-progress">
      {PROGRESS_STEPS.map((step, i) => (
        <div
          key={step}
          style={{
            display: "flex",
            alignItems: "center",
            flex: i < PROGRESS_STEPS.length - 1 ? 1 : 0,
          }}
        >
          <div
            className={`myorders-progress-step ${
              i < activeIndex ? "done" : i === activeIndex ? "active" : ""
            }`}
          >
            {step}
          </div>
          {i < PROGRESS_STEPS.length - 1 && (
            <div
              className={`myorders-progress-divider ${i < activeIndex ? "done" : ""}`}
            />
          )}
        </div>
      ))}
    </div>
  );
};

const MyOrders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(null);

  const token = user?.token;

  useEffect(() => {
    if (!token) {
      setError("You must be logged in to view orders.");
      setLoading(false);
      return;
    }
    fetchOrders();
  });

  const fetchOrders = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/orders/mine", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch orders.");
      const data = await res.json();
      setOrders(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (orderId) => {
    setCancelling(orderId);
    try {
      const res = await fetch(
        `http://localhost:5000/api/orders/${orderId}/cancel`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!res.ok) throw new Error("Failed to cancel order.");
      setOrders((prev) =>
        prev.map((o) =>
          o._id === orderId ? { ...o, status: "cancelled" } : o,
        ),
      );
    } catch (err) {
      alert(err.message);
    } finally {
      setCancelling(null);
    }
  };

  if (loading) return <div className="myorders-loading">Loading orders...</div>;
  if (error) return <div className="myorders-error">{error}</div>;

  return (
    <div className="myorders-page">
      <div className="myorders-header">
        <h1>My Orders</h1>
      </div>

      {orders.length === 0 ? (
        <div className="myorders-empty">
          <p>You haven't placed any orders yet.</p>
        </div>
      ) : (
        <div className="myorders-list">
          {orders.map((order) => (
            <div className="myorders-card" key={order._id}>
              <div className="myorders-card-header">
                <div>
                  <p className="myorders-date">
                    {new Date(order.createdAt).toLocaleDateString("en-EG", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                  <p className="myorders-id">
                    #{order._id.slice(-6).toUpperCase()}
                  </p>
                </div>
                <span
                  className={`myorders-status ${STATUS_COLOR[order.status]}`}
                >
                  {STATUS_LABEL[order.status]}
                </span>
              </div>
              <div className="myorders-items">
                {order.items.map((item, i) => (
                  <div className="myorders-item-row" key={i}>
                    <span className="myorders-item-name">
                      {item.productName}
                      {item.selectedSize && item.selectedSize !== "default" && (
                        <span className="myorders-item-size">
                          {" — "}
                          {item.selectedSize}
                        </span>
                      )}
                    </span>
                    <span className="myorders-item-qty">×{item.quantity}</span>
                    <span className="myorders-item-price">
                      {(item.price * item.quantity).toLocaleString()} EGP
                    </span>
                  </div>
                ))}

                {/* Subtotal */}
                <div className="myorders-item-row myorders-subtotal-row">
                  <span className="myorders-item-name">Subtotal</span>
                  <span />
                  <span className="myorders-item-price">
                    {order.items
                      .reduce((acc, i) => acc + i.price * i.quantity, 0)
                      .toLocaleString()}{" "}
                    EGP
                  </span>
                </div>

                {/* Delivery fee */}
                {order.deliveryRegion && (
                  <div className="myorders-item-row myorders-delivery-row">
                    <span className="myorders-item-name">
                      Delivery — {order.deliveryRegion.name}
                    </span>
                    <span />
                    <span className="myorders-item-price">
                      {order.deliveryRegion.price === 0
                        ? "Free"
                        : `${order.deliveryRegion.price.toLocaleString()} EGP`}
                    </span>
                  </div>
                )}

                {/* Discount */}
                {order.discountCode && order.discountSavings > 0 && (
                  <div className="myorders-item-row myorders-discount-row">
                    <span className="myorders-discount-label">
                      Discount ({order.discountCode})
                    </span>
                    <span />
                    <span className="myorders-discount-saving">
                      −{order.discountSavings.toLocaleString()} EGP
                    </span>
                  </div>
                )}
              </div>

              <div className="myorders-card-footer">
                <div className="myorders-total">
                  <span>Total</span>
                  <span>{order.totalPrice.toLocaleString()} EGP</span>
                </div>
                {order.status === "pending" && (
                  <button
                    className="myorders-cancel-btn"
                    onClick={() => handleCancel(order._id)}
                    disabled={cancelling === order._id}
                  >
                    {cancelling === order._id
                      ? "Cancelling..."
                      : "Cancel Order"}
                  </button>
                )}
              </div>

              {["confirmed", "preparing", "on_the_way", "delivered"].includes(
                order.status,
              ) && <ProgressBar status={order.status} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyOrders;
