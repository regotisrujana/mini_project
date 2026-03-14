import { useEffect, useState } from "react";
import axios from "axios";

function Products() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    axios.get("http://localhost:8080/api/products")
      .then(res => {
        console.log("Products API Response:", res.data);
        setProducts(res.data);
      })
      .catch(err => {
        console.log("Error fetching products:", err);
      });
  }, []);

  return (
    <div>
      <h2>Our Products</h2>

      {products.length === 0 ? (
        <p>No products available</p>
      ) : (
        products.map(product => (
          <div
            key={product.id}
            style={{ border: "1px solid gray", margin: "10px", padding: "10px" }}
          >
            <img src={product.imageUrl} alt={product.name} width="150" />
            <h3>{product.name}</h3>
            <p>{product.description}</p>
            <h4>₹ {product.price}</h4>
          </div>
        ))
      )}
    </div>
  );
}

export default Products;