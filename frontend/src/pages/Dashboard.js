import { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { apiUrl } from "../config/api";

function Dashboard() {
  const navigate = useNavigate();
  const [wishlistCount, setWishlistCount] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const token = localStorage.getItem("token");
  const name = localStorage.getItem("name");
  const role = localStorage.getItem("role");
  const email = localStorage.getItem("email");

  useEffect(() => {
    if (!token) {
      setWishlistCount(0);
      return;
    }

    axios.get(apiUrl("/api/wishlist"), {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then((res) => {
        setWishlistCount(res.data.length);
      })
      .catch((err) => {
        console.log("Error fetching wishlist count:", err.response || err);
        if (err.response?.status === 401) {
          localStorage.clear();
          alert("Session expired. Please log in again.");
          navigate("/login");
        }
      });
  }, [token, navigate]);

  useEffect(() => {
    if (!token) {
      setOrderCount(0);
      return;
    }

    axios.get(apiUrl("/api/orders"), {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then((res) => {
        setOrderCount(res.data.length);
      })
      .catch((err) => {
        console.log("Error fetching order count:", err.response || err);
      });
  }, [token]);

  const handleLogout = () => {
    const preservedEntries = Object.entries(localStorage).filter(([key]) => key.startsWith("selectedAddressId:"));
    localStorage.clear();
    preservedEntries.forEach(([key, value]) => {
      localStorage.setItem(key, value);
    });
    navigate("/login");
  };

  return (
    <div className="account-shell">
      <section className="account-hero">
        <div>
          <p className="auth-eyebrow">My Account</p>
          <h1>{name ? `Welcome back, ${name}` : "Welcome back"}</h1>
          <p>Keep track of your saved pieces, shopping bag, and account details from one clean dashboard.</p>
        </div>
        <div className="account-chip-stack">
          <span className="account-chip">{role || "USER"}</span>
          <span className="account-chip">{email || "No email found"}</span>
        </div>
      </section>

      <section className="account-grid">
        <article className="account-card">
          <p className="section-label">Quick Access</p>
          <h3>Keep shopping</h3>
          <div className="account-links">
            <Link to="/" className="account-link-card">Browse Products</Link>
            <Link to="/wishlist" className="account-link-card">Wishlist ({wishlistCount})</Link>
            <Link to="/cart" className="account-link-card">Cart</Link>
            <Link to="/orders" className="account-link-card">Orders ({orderCount})</Link>
          </div>
        </article>

        <article className="account-card">
          <p className="section-label">Profile</p>
          <h3>Your details</h3>
          <div className="account-detail-list">
            <div><span>Name</span><strong>{name || "Not available"}</strong></div>
            <div><span>Email</span><strong>{email || "Not available"}</strong></div>
            <div><span>Role</span><strong>{role || "USER"}</strong></div>
          </div>
        </article>

        {role === "ADMIN" && (
          <article className="account-card">
            <p className="section-label">Admin</p>
            <h3>Manage catalog</h3>
            <p>Add new products and keep the storefront fresh with the latest collections.</p>
            <Link to="/add-product" className="auth-primary-button account-button-link">Add Product</Link>
          </article>
        )}
      </section>

      <button className="auth-secondary-button" onClick={handleLogout}>Logout</button>
    </div>
  );
}

export default Dashboard;
