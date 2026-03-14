import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function AddProduct() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    gender: "",
    category: "",
    imageUrl: ""
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleAddProduct = async () => {
    try {
      const token = localStorage.getItem("token");

      await axios.post("http://localhost:8080/api/products", formData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      alert("Product added successfully");
      navigate("/");
    } catch (err) {
      console.log(err.response || err);
      alert("Failed to add product");
    }
  };

  return (
    <div>
      <h2>Add Product</h2>

      <input
        type="text"
        name="name"
        placeholder="Product Name"
        onChange={handleChange}
      />
      <br /><br />

      <textarea
        name="description"
        placeholder="Description"
        onChange={handleChange}
      />
      <br /><br />

      <input
        type="number"
        name="price"
        placeholder="Price"
        onChange={handleChange}
      />
      <br /><br />

      <input
        type="text"
        name="gender"
        placeholder="Gender (MEN/WOMEN)"
        onChange={handleChange}
      />
      <br /><br />

      <input
        type="text"
        name="category"
        placeholder="Category (TSHIRT, JEANS, KURTHI...)"
        onChange={handleChange}
      />
      <br /><br />

      <input
        type="text"
        name="imageUrl"
        placeholder="Image URL"
        onChange={handleChange}
      />
      <br /><br />

      <button onClick={handleAddProduct}>Add Product</button>
    </div>
  );
}

export default AddProduct;