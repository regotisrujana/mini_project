import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

const categoryOptionsByGender = {
  WOMEN: ["MIDI_DRESSES", "FORMAL_PANTS", "TROUSERS", "FORMAL_SHIRTS", "KURTHIS", "KURTHI_SETS", "JEANS", "TSHIRT"],
  MEN: ["FORMAL_PANTS", "FORMAL_SHIRTS", "SHIRTS", "JEANS", "TSHIRT", "JACKETS"]
};

const sizeOptionsByCategory = {
  JEANS: ["28", "30", "32", "34", "36", "38", "40", "42", "48"],
  FORMAL_PANTS: ["28", "30", "32", "34", "36", "38", "40", "42", "48"],
  default: ["XS", "S", "M", "L", "XL", "XXL", "3XL"]
};

function getSizeOptions(category) {
  return sizeOptionsByCategory[category] || sizeOptionsByCategory.default;
}

function AddProduct() {
  const [imageFiles, setImageFiles] = useState([]);
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [sizeStocks, setSizeStocks] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    gender: "",
    category: "",
    color: "",
    hotTrend: false
  });
  const sizeOptions = useMemo(() => getSizeOptions(formData.category), [formData.category]);
  const categoryOptions = categoryOptionsByGender[formData.gender] || [];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
      ...(name === "gender" ? { category: "" } : {})
    }));
  };

  useEffect(() => {
    axios.get("http://localhost:8080/api/products")
      .then((res) => setCatalogProducts(res.data))
      .catch((err) => console.log(err.response || err));
  }, []);

  useEffect(() => {
    setSizeStocks((current) => {
      const next = {};
      getSizeOptions(formData.category).forEach((size) => {
        next[size] = current[size] || "";
      });
      return next;
    });
  }, [formData.category]);

  const handleSizeStockChange = (size, value) => {
    setSizeStocks((current) => ({
      ...current,
      [size]: value
    }));
  };

  const handleDeleteProduct = async (productId) => {
    const token = localStorage.getItem("token");
    if (!window.confirm("Remove this product from the catalog?")) {
      return;
    }

    try {
      await axios.delete(`http://localhost:8080/api/products/${productId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setCatalogProducts((current) => current.filter((product) => product.id !== productId));
    } catch (err) {
      console.log(err.response || err);
      alert(err.response?.data?.message || err.response?.data || "Failed to remove product");
    }
  };

  const handleAddProduct = async () => {
    try {
      setIsSubmitting(true);
      const token = localStorage.getItem("token");
      const payload = new FormData();
      const activeVariantEntries = Object.entries(sizeStocks)
        .filter(([_, stock]) => Number(stock) > 0);

      if (!formData.name || !formData.description || !formData.price || !formData.gender || !formData.category) {
        alert("Please fill product name, description, price, gender, and category.");
        return;
      }

      if (!activeVariantEntries.length) {
        alert("Please add at least one size with stock.");
        return;
      }

      if (!token) {
        alert("Please log in again as admin.");
        return;
      }

      const variantStocks = activeVariantEntries.reduce((acc, [size, stock]) => {
        acc[size] = Number(stock);
        return acc;
      }, {});
      const totalStock = activeVariantEntries.reduce((sum, [_, stock]) => sum + Number(stock), 0);

      payload.append("name", formData.name);
      payload.append("description", formData.description);
      payload.append("price", formData.price);
      payload.append("stock", String(totalStock));
      payload.append("gender", formData.gender);
      payload.append("category", formData.category);
      payload.append("size", activeVariantEntries.map(([size]) => size).join(", "));
      payload.append("color", formData.color);
      payload.append("variantStocks", JSON.stringify(variantStocks));
      payload.append("hotTrend", formData.hotTrend);
      for (const file of imageFiles) {
        payload.append("images", file);
      }

      const response = await fetch("http://localhost:8080/api/products", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: payload,
        mode: "cors"
      });

      if (!response.ok) {
        throw new Error(`Request failed with status code ${response.status}`);
      }

      alert("Product added successfully");
      const refreshedProducts = await axios.get("http://localhost:8080/api/products");
      setCatalogProducts(refreshedProducts.data);
      setSizeStocks({});
      setFormData({
        name: "",
        description: "",
        price: "",
        gender: "",
        category: "",
        color: "",
        hotTrend: false
      });
      setImageFiles([]);
    } catch (err) {
      console.log(err.response || err);
      const message =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.response?.data ||
        err.message ||
        "Failed to add product";

      alert(`Failed to add product: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="admin-shell">
      <div className="admin-topbar">
        <div>
          <p className="auth-eyebrow">Admin Studio</p>
          <h2>Add New Product</h2>
          <p>Create a polished catalog card with image, size, category, and color options.</p>
        </div>
        <Link to="/" className="checkout-link">Back to Store</Link>
      </div>

      <div className="admin-layout">
        <section className="admin-form-card">
          <div className="admin-form-grid">
            <input className="auth-input" type="text" name="name" placeholder="Product Name" value={formData.name} onChange={handleChange} />
            <input className="auth-input" type="number" name="price" placeholder="Price" value={formData.price} onChange={handleChange} />
            <select className="auth-input" name="gender" value={formData.gender} onChange={handleChange}>
              <option value="">Select Gender</option>
              <option value="MEN">MEN</option>
              <option value="WOMEN">WOMEN</option>
            </select>
            <input className="auth-input" type="text" name="color" placeholder="Color or colors (comma separated)" value={formData.color} onChange={handleChange} />
            <select className="auth-input" name="category" value={formData.category} onChange={handleChange}>
              <option value="">Select Category</option>
              {categoryOptions.map((option) => (
                <option key={option} value={option}>{option.replaceAll("_", " ")}</option>
              ))}
            </select>
          </div>

          <textarea
            className="auth-input admin-textarea"
            name="description"
            placeholder="Description"
            value={formData.description}
            onChange={handleChange}
          />

          <div className="admin-upload-card">
            <span>Size-wise stock</span>
            <small>Enter stock for each size. Any size with `0` stock stays hidden for users.</small>
            {formData.category ? (
              <div className="admin-variant-list">
                {sizeOptions.map((size) => (
                  <div key={size} className="admin-variant-row compact">
                    <div className="admin-size-label">{size}</div>
                    <input
                      className="auth-input"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={sizeStocks[size] || ""}
                      onChange={(e) => handleSizeStockChange(size, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <small>Select a category first to enter size-wise stock.</small>
            )}
          </div>

          <div className="admin-actions-row">
            <label className="admin-upload-card">
              <span>Upload image</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setImageFiles(Array.from(e.target.files || []))}
              />
              <small>
                {imageFiles.length > 0
                  ? `${imageFiles.length} image(s) selected for Cloudinary upload.`
                  : "Choose one or more product images"}
              </small>
            </label>

            <label className="admin-toggle">
              <input
                type="checkbox"
                name="hotTrend"
                checked={formData.hotTrend}
                onChange={handleChange}
              />
              <span>Mark as Hot Trend</span>
            </label>
          </div>

          <button className="auth-primary-button" onClick={handleAddProduct} disabled={isSubmitting}>
            {isSubmitting ? "Adding Product..." : "Add Product"}
          </button>
        </section>

        <section className="admin-form-card">
          <div className="admin-topbar">
            <div>
              <p className="auth-eyebrow">Catalog</p>
              <h2>Products You Added</h2>
            </div>
          </div>
            <div className="wishlist-grid">
            {catalogProducts.map((product) => (
              <article key={product.id} className="wishlist-card">
                <div className="wishlist-image-wrap">
                  <img className="wishlist-image" src={(product.imageUrl || "").split(",")[0]?.trim()} alt={product.name} />
                </div>
                <div className="wishlist-card-body">
                  <p className="product-category">{(product.category || "").replaceAll("_", " ")}</p>
                  <h3>{product.name}</h3>
                  <strong>Rs. {product.price}</strong>
                  <p>{product.size || "No sizes added"}</p>
                  <button
                    type="button"
                    className="product-action-button admin-danger"
                    onClick={() => handleDeleteProduct(product.id)}
                  >
                    Remove Product
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default AddProduct;
