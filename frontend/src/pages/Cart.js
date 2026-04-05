import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config/api";

const GUEST_CART_KEY = "guestCartItems";

function getSelectedAddressStorageKey() {
  return `selectedAddressId:${localStorage.getItem("email") || "user"}`;
}

const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

function readGuestCart() {
  const saved = localStorage.getItem(GUEST_CART_KEY);
  return saved ? JSON.parse(saved) : [];
}

function writeGuestCart(items) {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
}

function getMaxCartQuantity(item) {
  const maxCartQuantity = Number(item?.maxCartQuantity);
  if (Number.isFinite(maxCartQuantity)) {
    return maxCartQuantity;
  }

  const stock = Number(item?.stock);
  if (Number.isFinite(stock)) {
    if (stock <= 0) {
      return 0;
    }
    return stock > 1 ? stock - 1 : 1;
  }

  return 9;
}

function Cart() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [isPaying, setIsPaying] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const token = localStorage.getItem("token");
  const selectedAddressId = localStorage.getItem(getSelectedAddressStorageKey());
  const address = savedAddresses.find((item) => String(item.id) === selectedAddressId) || savedAddresses[0] || null;

  useEffect(() => {
    if (!token) {
      setItems(readGuestCart());
      return;
    }

    axios.get(`${API_BASE_URL}/api/cart`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then((res) => {
        setItems(res.data);
      })
      .catch((err) => {
        console.log(err.response || err);
        if (err.response?.status === 401) {
          localStorage.clear();
          alert("Session expired. Please log in again.");
          navigate("/login");
        }
      });
  }, [token, navigate]);

  useEffect(() => {
    if (!token) {
      setSavedAddresses([]);
      return;
    }

    axios.get(`${API_BASE_URL}/api/addresses`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then((res) => {
        setSavedAddresses(res.data);
        if (res.data.length > 0 && !selectedAddressId) {
          localStorage.setItem(getSelectedAddressStorageKey(), String(res.data[0].id));
        }
      })
      .catch((err) => {
        console.log(err.response || err);
      });
  }, [token, selectedAddressId]);

  const updateQuantity = async (productId, quantity) => {
    const currentItem = items.find((item) => item.productId === productId);
    const maxCartQuantity = getMaxCartQuantity(currentItem);

    if (!token) {
      if (quantity > maxCartQuantity) {
        alert(`You can add up to ${maxCartQuantity} item(s) for this product.`);
        return;
      }

      const nextItems = quantity <= 0
        ? items.filter((item) => item.productId !== productId)
        : items.map((item) =>
            item.productId === productId ? { ...item, quantity } : item
          );
      setItems(nextItems);
      writeGuestCart(nextItems);
      return;
    }

    try {
      const res = await axios.put(`${API_BASE_URL}/api/cart/${productId}?quantity=${quantity}`, null, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setItems(res.data);
    } catch (err) {
      console.log(err.response || err);
      if (err.response?.status === 401) {
        localStorage.clear();
        alert("Session expired. Please log in again.");
        navigate("/login");
        return;
      }
      alert(err.response?.data?.message || err.response?.data || "Failed to update cart");
    }
  };

  const total = useMemo(
    () => items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
    [items]
  );
  const couponDiscount = appliedCoupon === "SAVE10"
    ? Math.min(total * 0.10, 250)
    : appliedCoupon === "NEWUSER100"
      ? Math.min(100, total)
      : 0;
  const platformFee = items.length > 0 ? 20 : 0;
  const finalAmount = Math.max(1, total - couponDiscount + platformFee);

  const applyCoupon = () => {
    const normalized = couponCode.trim().toUpperCase();
    if (normalized === "SAVE10" || normalized === "NEWUSER100") {
      setAppliedCoupon(normalized);
      alert(`Coupon applied: ${normalized}`);
    } else {
      setAppliedCoupon("");
      alert("Invalid coupon");
    }
  };

  const handlePlaceOrder = async () => {
    if (!items.length) {
      alert("Cart is empty");
      return;
    }

    if (!token) {
      alert("Please login to place your order.");
      navigate("/login");
      return;
    }

    if (!address) {
      navigate("/checkout/address");
      return;
    }

    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      alert("Failed to load Razorpay checkout");
      return;
    }

    try {
      setIsPaying(true);
      const orderRes = await axios.post(
        `${API_BASE_URL}/api/orders/razorpay`,
        {
          address,
          couponCode: appliedCoupon
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const razorpayKey = orderRes.data.keyId || process.env.REACT_APP_RAZORPAY_KEY_ID;
      if (!razorpayKey) {
        alert("Razorpay key is missing. Add it in backend or frontend environment.");
        return;
      }

      const options = {
        key: razorpayKey,
        amount: orderRes.data.amount,
        currency: orderRes.data.currency,
        name: "VASTRA AI",
        description: "Order Payment",
        order_id: orderRes.data.razorpayOrderId,
        handler: async function (response) {
          try {
            await axios.post(
              `${API_BASE_URL}/api/orders/confirm`,
              {
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                address,
                couponCode: appliedCoupon
              },
              {
                headers: {
                  Authorization: `Bearer ${token}`
                }
              }
            );

            setItems([]);
            setAppliedCoupon("");
            setCouponCode("");
            alert("Payment successful and order placed");
            navigate("/");
          } catch (err) {
            console.log(err.response || err);
            alert("Payment captured, but order confirmation failed");
          }
        },
        prefill: {
          name: localStorage.getItem("name") || "",
          email: localStorage.getItem("email") || "",
          contact: address.phone || ""
        },
        theme: {
          color: "#ff3f6c"
        },
        modal: {
          ondismiss: () => {
            setIsPaying(false);
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on("payment.failed", function (response) {
        const reason = response?.error?.description || "Payment failed. Please try again.";
        alert(reason);
        setIsPaying(false);
      });
      razorpay.open();
    } catch (err) {
      console.log(err.response || err);
      if (err.response?.status === 401) {
        localStorage.clear();
        alert("Session expired. Please log in again.");
        navigate("/login");
        return;
      }
      alert("Failed to start payment");
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <div className="checkout-shell">
      <div className="checkout-topbar">
        <div>
          <p className="checkout-eyebrow">Shopping Bag</p>
          <h2 className="checkout-title">{items.length} {items.length === 1 ? "Item" : "Items"} Ready</h2>
        </div>
        <Link to="/" className="checkout-link">Back to Products</Link>
      </div>

      {!token && items.length > 0 && (
        <div className="checkout-guest-banner">
          <div>
            <p className="section-label">Guest Cart</p>
            <strong>Your cart is saved on this device.</strong>
            <p>Login only when you are ready to place the order.</p>
          </div>
          <Link to="/login" className="checkout-secondary-button">Login to Checkout</Link>
        </div>
      )}

      {items.length === 0 ? (
        <div className="checkout-empty">
          <h3>Your cart is empty</h3>
          <p>Add a few styles to unlock the order summary and checkout flow.</p>
          <Link to="/" className="checkout-primary-link">Continue Shopping</Link>
        </div>
      ) : (
        <div className="checkout-layout">
          <div className="checkout-main">
            <section className="checkout-address-card">
              <div>
                <p className="section-label">Delivery Address</p>
                {address ? (
                  <>
                    <h3>{address.label || address.fullName}, {address.pincode}</h3>
                    <p>{address.addressLine}, {address.city}, {address.state}</p>
                  </>
                ) : (
                  <>
                    <h3>{token ? "Add a delivery address" : "Login to continue checkout"}</h3>
                    <p>{token ? "Save an address once and reuse it for the next orders." : "Guest cart works, but checkout needs your account."}</p>
                  </>
                )}
              </div>
              <button
                className="checkout-address-button"
                onClick={() => token ? navigate("/checkout/address") : navigate("/login")}
              >
                {token ? (address ? "Change" : "Add Address") : "Login"}
              </button>
            </section>

            <section className="checkout-items">
              {items.map((item) => (
                <article key={item.productId} className="cart-item-card">
                  <div className="cart-item-image-wrap">
                    <img src={item.imageUrl} alt={item.name} className="cart-item-image" />
                  </div>

                  <div className="cart-item-content">
                    <div className="cart-item-header">
                      <div>
                        <h3>{item.name}</h3>
                        <p>{item.description}</p>
                      </div>
                    </div>

                    <div className="cart-item-meta">
                      <span>Price</span>
                      <strong>Rs. {item.price}</strong>
                    </div>

                    <div className="cart-quantity-row">
                      <span>Quantity</span>
                      <div className="cart-quantity-control">
                        <button onClick={() => updateQuantity(item.productId, item.quantity - 1)}>-</button>
                        <span>{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          disabled={item.quantity >= getMaxCartQuantity(item)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </section>
          </div>

          <aside className="checkout-sidebar">
            <section className="checkout-panel coupon-panel">
              <div className="checkout-panel-header">
                <div>
                  <p className="section-label">Offers</p>
                  <h3>Apply Coupon</h3>
                </div>
              </div>

              <div className="coupon-row">
                <input
                  className="checkout-input"
                  type="text"
                  placeholder="Enter coupon code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                />
                <button className="checkout-secondary-button" onClick={applyCoupon}>Apply</button>
              </div>

              {appliedCoupon && <p className="coupon-success">Applied coupon: {appliedCoupon}</p>}
              <p className="coupon-hint">Try `SAVE10` or `NEWUSER100`.</p>
            </section>

            <section className="checkout-panel bill-panel">
              <div className="checkout-panel-header">
                <div>
                  <p className="section-label">Price Details</p>
                  <h3>{items.length} {items.length === 1 ? "Item" : "Items"}</h3>
                </div>
              </div>

              <div className="bill-row">
                <span>Total MRP</span>
                <span>Rs. {total.toFixed(2)}</span>
              </div>
              <div className="bill-row discount">
                <span>Coupon Discount</span>
                <span>- Rs. {couponDiscount.toFixed(2)}</span>
              </div>
              <div className="bill-row">
                <span>Platform Fee</span>
                <span>Rs. {platformFee.toFixed(2)}</span>
              </div>

              <div className="bill-divider" />

              <div className="bill-row total">
                <span>Total Amount</span>
                <span>Rs. {finalAmount.toFixed(2)}</span>
              </div>

              <div className="checkout-assurance">
                <span>Genuine Products</span>
                <span>Contactless Delivery</span>
                <span>Secure Payments</span>
              </div>
            </section>
          </aside>

          <div className="checkout-sticky-bar">
            <div>
              <p className="sticky-label">Total Payable</p>
              <strong>Rs. {finalAmount.toFixed(2)}</strong>
            </div>
            <button
              className="checkout-primary-button"
              onClick={handlePlaceOrder}
              disabled={isPaying}
            >
              {isPaying ? "Starting Payment..." : token ? "Place Order" : "Login to Checkout"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Cart;
