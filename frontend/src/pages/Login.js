import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { apiUrl } from "../config/api";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const res = await axios.post(apiUrl("/api/auth/login"), {
        email,
        password,
      });

      console.log(res.data);

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", res.data.role);
      localStorage.setItem("name", res.data.name);
      localStorage.setItem("email", res.data.email);

      alert("Login Successful");
      navigate("/");
    } catch (err) {
      console.log(err.response || err);
      alert("Login Failed");
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-panel">
        <div className="auth-copy">
          <p className="auth-eyebrow">Welcome Back</p>
          <h2>Sign in to continue shopping with VASTRA AI</h2>
          <p>Track orders, keep your wishlist, and move from cart to checkout without losing your picks.</p>
        </div>

        <div className="auth-form-card">
          <h3>Login</h3>

          <input
            className="auth-input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            className="auth-input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button className="auth-primary-button" onClick={handleLogin}>Login</button>

          <p className="auth-switch">
            Don't have an account? <Link to="/register">Register</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
