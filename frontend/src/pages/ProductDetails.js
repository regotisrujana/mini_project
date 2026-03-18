import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";

const GUEST_CART_KEY = "guestCartItems";
const APPAREL_SIZES = ["S", "M", "L", "XL", "XXL", "3XL"];
const BOTTOM_SIZES = ["28", "30", "32", "34", "36", "38", "40", "42"];

function getResolvedStock(product) {
  return Number.isFinite(Number(product?.stock)) ? Math.max(Number(product.stock), 0) : 10;
}

function splitValues(value) {
  return (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getDisplaySizes(product) {
  const explicitSizes = splitValues(product?.size);
  if (explicitSizes.length > 0) {
    return explicitSizes;
  }

  const category = (product?.category || "").toUpperCase();
  if (category === "JEANS" || category === "FORMAL_PANTS") {
    return BOTTOM_SIZES;
  }

  return APPAREL_SIZES;
}

function getAvailableSizes(product, variants) {
  const variantSizes = variants
    .filter((variant) => Number(variant.stock) > 0)
    .map((variant) => variant.size)
    .filter(Boolean);

  if (variantSizes.length > 0) {
    return variantSizes;
  }

  return getDisplaySizes(product);
}

function buildRatingsBreakdown(rating, ratingCount) {
  const total = Math.max(ratingCount || 0, 1);
  const rounded = Math.round(rating || 0);
  const weights = [5, 4, 3, 2, 1].map((star) => {
    const distance = Math.abs(star - rounded);
    return Math.max(1, 5 - distance * 2);
  });
  const weightTotal = weights.reduce((sum, item) => sum + item, 0);
  const counts = weights.map((weight) => Math.round((weight / weightTotal) * total));
  const adjustedCounts = counts.map((count, index) =>
    index === 0 ? count + (total - counts.reduce((sum, item) => sum + item, 0)) : count
  );

  return [5, 4, 3, 2, 1].map((star, index) => ({
    star,
    count: adjustedCounts[index],
    percent: Math.round((adjustedCounts[index] / total) * 100)
  }));
}

function getPrimaryImage(imageUrl) {
  return splitValues(imageUrl)[0] || "";
}

function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [wishlistIds, setWishlistIds] = useState([]);
  const [cartIds, setCartIds] = useState([]);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedImage, setSelectedImage] = useState("");
  const [variants, setVariants] = useState([]);
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  useEffect(() => {
    axios.get(`http://localhost:8080/api/products/${id}`)
      .then((res) => {
        setProduct(res.data);
        const colors = splitValues(res.data.color);
        const images = splitValues(res.data.imageUrl);
        setSelectedColor(colors[0] || "");
        setSelectedImage(images[0] || "");
      })
      .catch(() => {
        navigate("/");
      });
  }, [id, navigate]);

  useEffect(() => {
    axios.get(`http://localhost:8080/api/products/${id}/variants`)
      .then((res) => setVariants(res.data))
      .catch(() => setVariants([]));
  }, [id]);

  useEffect(() => {
    if (!token) {
      const guestItems = JSON.parse(localStorage.getItem(GUEST_CART_KEY) || "[]");
      setCartIds(guestItems.map((item) => item.productId));
      setWishlistIds([]);
      return;
    }

    axios.get("http://localhost:8080/api/cart", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then((res) => setCartIds(res.data.map((item) => item.productId)))
      .catch(() => {});

    axios.get("http://localhost:8080/api/wishlist", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then((res) => setWishlistIds(res.data.map((item) => item.id)))
      .catch(() => {});
  }, [token]);

  const sizes = useMemo(() => getAvailableSizes(product, variants), [product, variants]);
  const colors = useMemo(() => splitValues(product?.color), [product]);
  const galleryImages = useMemo(() => splitValues(product?.imageUrl), [product]);
  const selectedVariantStock = useMemo(() => {
    if (!selectedSize) {
      return getResolvedStock(product);
    }

    const variant = variants.find((item) => item.size === selectedSize);
    return variant ? Math.max(Number(variant.stock) || 0, 0) : getResolvedStock(product);
  }, [variants, selectedSize, product]);
  useEffect(() => {
    if (!selectedSize && sizes.length > 0) {
      setSelectedSize(sizes[0]);
      return;
    }

    if (selectedSize && !sizes.includes(selectedSize)) {
      setSelectedSize(sizes[0] || "");
    }
  }, [sizes, selectedSize]);
  const selectedSizeMaxCartQuantity = useMemo(() => {
    if (selectedVariantStock <= 0) {
      return 0;
    }
    return selectedVariantStock > 1 ? selectedVariantStock - 1 : 1;
  }, [selectedVariantStock]);
  const ratingBreakdown = useMemo(
    () => buildRatingsBreakdown(product?.rating, product?.ratingCount),
    [product]
  );
  const detailsList = useMemo(() => {
    if (!product) {
      return [];
    }

    const base = splitValues(product.description.replace(/\./g, ","));
    return [
      `Colour: ${selectedColor || colors[0] || "Classic"}`,
      ...base.slice(0, 6),
      `${product.category?.replaceAll("_", " ") || "Fashion"} silhouette for ${product.gender || "all"}`
    ].filter(Boolean);
  }, [product, selectedColor, colors]);

  const handleWishlist = async () => {
    if (!product) {
      return;
    }

    if (!token) {
      navigate("/login");
      return;
    }

    const inWishlist = wishlistIds.includes(product.id);
    const res = inWishlist
      ? await axios.delete(`http://localhost:8080/api/wishlist/${product.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      : await axios.post(`http://localhost:8080/api/wishlist/${product.id}`, null, {
          headers: { Authorization: `Bearer ${token}` }
        });

    setWishlistIds(res.data.map((item) => item.id));
  };

  const handleAddToCart = async () => {
    if (!product) {
      return;
    }

    const maxCartQuantity = selectedSizeMaxCartQuantity;
    if (maxCartQuantity <= 0) {
      alert(`Selected size ${selectedSize || ""} is out of stock`);
      return;
    }

    if (cartIds.includes(product.id)) {
      navigate("/cart");
      return;
    }

    if (!token) {
      const guestItems = JSON.parse(localStorage.getItem(GUEST_CART_KEY) || "[]");
      const nextItems = [
        ...guestItems,
        {
          productId: product.id,
          name: product.name,
          description: product.description,
          imageUrl: getPrimaryImage(product.imageUrl),
          price: product.price,
          quantity: 1,
          stock: selectedVariantStock,
          maxCartQuantity
        }
      ];
      localStorage.setItem(GUEST_CART_KEY, JSON.stringify(nextItems));
      setCartIds(nextItems.map((item) => item.productId));
      alert("Added to cart");
      return;
    }

    const res = await axios.post(`http://localhost:8080/api/cart/${product.id}`, null, {
      headers: { Authorization: `Bearer ${token}` }
    });
    setCartIds(res.data.map((item) => item.productId));
    alert("Added to bag");
  };

  const handleDeleteProduct = async () => {
    if (role !== "ADMIN" || !product) {
      return;
    }

    if (!window.confirm("Remove this product from the catalog?")) {
      return;
    }

    try {
      await axios.delete(`http://localhost:8080/api/products/${product.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      navigate("/");
    } catch (err) {
      console.log(err.response || err);
      alert(err.response?.data?.message || err.response?.data || "Failed to remove product");
    }
  };

  if (!product) {
    return (
      <div className="product-detail-shell">
        <div className="checkout-empty">
          <h3>Loading product...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="product-detail-shell">
      <div className="product-detail-topbar">
        <button className="product-back-button" onClick={() => navigate(-1)} aria-label="Go back">
          {"<"}
        </button>
      </div>

      <section className="product-detail-layout">
        <div className="product-gallery-panel">
          <div className="product-gallery-main">
            <img src={selectedImage || getPrimaryImage(product.imageUrl)} alt={product.name} />
          </div>

          {galleryImages.length > 1 && (
            <div className="product-gallery-thumbs">
              {galleryImages.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  className={`product-gallery-thumb ${selectedImage === image ? "active" : ""}`}
                  onClick={() => setSelectedImage(image)}
                >
                  <img src={image} alt={`${product.name} ${index + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        <aside className="product-summary-card">
          <h1>{product.name}</h1>
          <p className="product-summary-subtitle">{product.description}</p>

          <div className="product-rating-chip">
            <strong>{product.rating || 0} ★</strong>
            <span>| {product.ratingCount || 0} Ratings</span>
          </div>

          <div className="product-price-block">
            <strong>Rs. {product.price}</strong>
          </div>
          <p className="product-tax-note">inclusive of all taxes</p>
          {selectedVariantStock > 0 && selectedVariantStock <= 3 && (
            <p className="product-tax-note product-low-stock-note">
              {selectedSize ? `${selectedSize} only ${selectedVariantStock} left` : `Only ${selectedVariantStock} left`}
            </p>
          )}

          {colors.length > 0 && (
            <div className="product-option-block">
              <div className="product-option-header">
                <h3>More Colors</h3>
              </div>
              <div className="product-color-swatches">
                {colors.map((color) => (
                  <button
                    key={color}
                    className={`product-color-card ${selectedColor === color ? "active" : ""}`}
                    onClick={() => setSelectedColor(color)}
                  >
                    <span className="product-color-preview" />
                    <small>{color}</small>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="product-option-block">
            <div className="product-option-header">
              <h3>Select Size</h3>
            </div>
            <div className="product-size-row">
              {sizes.map((size) => (
                <button
                  key={size}
                  className={`product-size-pill ${selectedSize === size ? "active" : ""}`}
                  onClick={() => setSelectedSize(size)}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <div className="product-cta-row">
            <button className="product-bag-button" onClick={handleAddToCart} disabled={!cartIds.includes(product.id) && selectedSizeMaxCartQuantity <= 0}>
              {cartIds.includes(product.id) ? "Go to Bag" : selectedSizeMaxCartQuantity <= 0 ? "Out of Stock" : "Add to Bag"}
            </button>
            {role === "ADMIN" ? (
              <button className="product-wishlist-button admin-danger-outline" onClick={handleDeleteProduct}>
                Remove
              </button>
            ) : (
              <button className="product-wishlist-button" onClick={handleWishlist}>
                Wishlist
              </button>
            )}
          </div>
        </aside>
      </section>

      <section className="product-detail-sections">
        <article className="product-info-card">
          <div className="product-section-header">
            <h3>Product Details</h3>
          </div>
          <ul className="product-detail-list">
            {detailsList.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article className="product-info-card">
          <div className="product-section-header">
            <h3>Ratings</h3>
          </div>

          <div className="ratings-summary-grid">
            <div className="ratings-overview">
              <strong>{product.rating || 0} ★</strong>
              <span>{product.ratingCount || 0} Verified Buyers</span>
            </div>

            <div className="ratings-bars">
              {product.ratingCount > 0 ? (
                ratingBreakdown.map((item) => (
                  <div key={item.star} className="rating-bar-row">
                    <span>{item.star} ★</span>
                    <div className="rating-bar-track">
                      <div className="rating-bar-fill" style={{ width: `${item.percent}%` }} />
                    </div>
                    <span>{item.count}</span>
                  </div>
                ))
              ) : (
                <p className="ratings-empty-note">No ratings yet for this product.</p>
              )}
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}

export default ProductDetails;
