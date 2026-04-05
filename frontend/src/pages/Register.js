import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { apiUrl } from "../config/api";

function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleRegister = async () => {
    try {
      await axios.post(apiUrl("/api/auth/register"), {
        name,
        email,
        password,
      });

      alert("Registration Successful");
      navigate("/login");
    } catch (err) {
      console.log(err.response || err);
      alert("Error registering");
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-panel">
        <div className="auth-copy">
          <p className="auth-eyebrow">Create Account</p>
          <h2>Join VASTRA AI and save your fashion picks</h2>
          <p>Build your wishlist, keep your address ready, and check out faster once you are signed in.</p>
        </div>

        <div className="auth-form-card">
          <h3>Register</h3>

          <input
            className="auth-input"
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

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

          <button className="auth-primary-button" onClick={handleRegister}>Register</button>

          <p className="auth-switch">
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;
