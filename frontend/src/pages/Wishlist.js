import { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

function getPrimaryImage(imageUrl) {
  return (imageUrl || "").split(",").map((item) => item.trim()).filter(Boolean)[0] || "";
}

function Wishlist() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("token");

    axios.get("http://localhost:8080/api/wishlist", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then((res) => {
        setProducts(res.data);
      })
      .catch((err) => {
        console.log(err.response || err);
        if (err.response?.status === 401) {
          localStorage.clear();
          alert("Session expired. Please log in again.");
          navigate("/login");
        }
      });
  }, [navigate]);

  const handleRemove = async (productId) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.delete(`http://localhost:8080/api/wishlist/${productId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setProducts(res.data);
    } catch (err) {
      console.log(err.response || err);
      if (err.response?.status === 401) {
        localStorage.clear();
        alert("Session expired. Please log in again.");
        navigate("/login");
        return;
      }
      alert("Failed to remove from wishlist");
    }
  };

  return (
    <div className="wishlist-shell">
      <div className="wishlist-topbar">
        <div>
          <p className="auth-eyebrow">Wishlist</p>
          <h2>Saved styles ({products.length})</h2>
          <p>Keep track of the pieces you want to come back to later.</p>
        </div>
        <Link to="/" className="checkout-link">Back to Products</Link>
      </div>

      {products.length === 0 ? (
        <div className="checkout-empty">
          <h3>No wishlist items yet</h3>
          <p>Tap the heart icon on products you love and they will show up here.</p>
          <Link to="/" className="checkout-primary-link">Continue Shopping</Link>
        </div>
      ) : (
        <div className="wishlist-grid">
          {products.map((product) => (
            <article key={product.id} className="wishlist-card">
              <div className="wishlist-image-wrap">
                <img src={getPrimaryImage(product.imageUrl)} alt={product.name} className="wishlist-image" />
              </div>
              <div className="wishlist-card-body">
                <p className="product-category">{(product.category || "Style").replaceAll("_", " ")}</p>
                <h3>{product.name}</h3>
                <p>{product.description}</p>
                <strong>Rs. {product.price}</strong>
                <div className="wishlist-card-actions">
                  <Link to="/" className="checkout-secondary-button">Shop More</Link>
                  <button className="auth-secondary-button" onClick={() => handleRemove(product.id)}>Remove</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default Wishlist;
