import { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8080";

function RatingStars({ value, onChange, disabled }) {
  return (
    <div className="rating-stars" aria-label="Rate product">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={`rating-star-button ${star <= value ? "active" : ""}`}
          onClick={() => onChange(star)}
          disabled={disabled}
          aria-label={`Rate ${star} star${star === 1 ? "" : "s"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function formatOrderDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short"
      });
}

function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ratingInputs, setRatingInputs] = useState({});
  const [pendingRatings, setPendingRatings] = useState([]);
  const token = localStorage.getItem("token");

  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/orders`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then((res) => {
        setOrders(res.data);
        const initialRatings = {};
        res.data.forEach((order) => {
          (order.items || []).forEach((item) => {
            if (item.userRating) {
              initialRatings[item.productId] = String(item.userRating);
            }
          });
        });
        setRatingInputs(initialRatings);
      })
      .catch((err) => {
        console.log(err.response || err);
        if (err.response?.status === 401) {
          localStorage.clear();
          alert("Session expired. Please log in again.");
          navigate("/login");
          return;
        }
        alert(err.response?.data?.message || err.response?.data || "Failed to load orders");
      })
      .finally(() => setLoading(false));
  }, [token, navigate]);

  const handleRateProduct = async (productId) => {
    const rating = Number(ratingInputs[productId] || 0);

    if (rating < 1 || rating > 5) {
      alert("Please choose a rating between 1 and 5.");
      return;
    }

    try {
      setPendingRatings((current) => [...current, productId]);
      await axios.post(
        `${API_BASE_URL}/api/products/${productId}/ratings?value=${rating}`,
        null,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setOrders((current) =>
        current.map((order) => ({
          ...order,
          items: (order.items || []).map((item) =>
            item.productId === productId ? { ...item, userRating: rating } : item
          )
        }))
      );
    } catch (err) {
      console.log(err.response || err);
      if (err.response?.status === 401) {
        localStorage.clear();
        alert("Session expired. Please log in again.");
        navigate("/login");
        return;
      }
      alert(err.response?.data?.message || err.response?.data || "Failed to save rating");
    } finally {
      setPendingRatings((current) => current.filter((id) => id !== productId));
    }
  };

  return (
    <div className="orders-shell">
      <div className="orders-topbar">
        <div>
          <p className="checkout-eyebrow">Your Purchases</p>
          <h2 className="checkout-title">Order History</h2>
        </div>
        <Link to="/dashboard" className="checkout-link">Back to Account</Link>
      </div>

      {loading ? (
        <div className="checkout-empty">
          <h3>Loading your orders...</h3>
        </div>
      ) : orders.length === 0 ? (
        <div className="checkout-empty">
          <h3>No orders yet</h3>
          <p>Your paid orders will appear here with delivery, payment, and tracking details.</p>
          <Link to="/" className="checkout-primary-link">Start Shopping</Link>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map((order) => (
            <article key={order.id} className="order-history-card">
              <div className="order-history-header">
                <div>
                  <p className="section-label">Order ID</p>
                  <h3>{order.orderNumber || `Order #${order.id}`}</h3>
                  <p className="order-history-date">{formatOrderDate(order.createdAt)}</p>
                </div>
                <div className="order-history-chip-stack">
                  <span className="order-status-chip">{order.paymentStatus || "PAID"}</span>
                  <span className="tracking-status-chip">{order.trackingStatus || "ORDER_CONFIRMED"}</span>
                </div>
              </div>

              <div className="order-history-grid">
                <section className="order-section">
                  <p className="section-label">Payment</p>
                  <div className="order-detail-list">
                    <div><span>Method</span><strong>{order.paymentMethod || "Razorpay"}</strong></div>
                    <div><span>Razorpay Order</span><strong>{order.razorpayOrderId}</strong></div>
                    <div><span>Payment ID</span><strong>{order.razorpayPaymentId}</strong></div>
                    <div><span>Total Paid</span><strong>Rs. {Number(order.finalAmount || 0).toFixed(2)}</strong></div>
                  </div>
                </section>

                <section className="order-section">
                  <p className="section-label">Delivery Address</p>
                  <div className="order-address-card">
                    <strong>{order.fullName}</strong>
                    <span>{order.phone}</span>
                    <span>{order.addressLine}</span>
                    <span>{order.city}, {order.state} - {order.pincode}</span>
                  </div>
                </section>

                <section className="order-section">
                  <p className="section-label">Bill Summary</p>
                  <div className="order-detail-list">
                    <div><span>Total MRP</span><strong>Rs. {Number(order.totalMrp || 0).toFixed(2)}</strong></div>
                    <div><span>Coupon Discount</span><strong>- Rs. {Number(order.couponDiscount || 0).toFixed(2)}</strong></div>
                    <div><span>Platform Fee</span><strong>Rs. {Number(order.platformFee || 0).toFixed(2)}</strong></div>
                    <div><span>Coupon</span><strong>{order.couponCode || "None"}</strong></div>
                  </div>
                </section>
              </div>

              <section className="order-items-list">
                {(order.items || []).map((item) => (
                  <div key={`${order.id}-${item.productId}`} className="order-item-row">
                    <img src={item.imageUrl} alt={item.productName} className="order-item-image" />
                    <div className="order-item-copy">
                      <strong>{item.productName}</strong>
                      <span>Qty: {item.quantity}</span>
                      <span>Price: Rs. {Number(item.price || 0).toFixed(2)}</span>
                    </div>
                    <div className="order-item-actions">
                      <Link to={`/products/${item.productId}`} className="checkout-secondary-button">
                        View Product
                      </Link>
                      <div className="order-rating-row">
                        <RatingStars
                          value={Number(ratingInputs[item.productId] || 0)}
                          onChange={(value) => setRatingInputs((current) => ({
                            ...current,
                            [item.productId]: String(value)
                          }))}
                          disabled={pendingRatings.includes(item.productId)}
                        />
                        <span className="order-rating-caption">
                          {item.userRating
                            ? `Your rating: ${item.userRating}/5`
                            : ratingInputs[item.productId]
                              ? `Selected: ${ratingInputs[item.productId]}/5`
                              : "Tap the stars to rate"}
                        </span>
                        <button
                          className="checkout-primary-button"
                          onClick={() => handleRateProduct(item.productId)}
                          disabled={pendingRatings.includes(item.productId)}
                        >
                          {pendingRatings.includes(item.productId)
                            ? "Saving..."
                            : item.userRating
                              ? `Update Rating (${item.userRating}/5)`
                              : "Submit Rating"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </section>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default Orders;
