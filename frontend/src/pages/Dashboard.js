import { Link, useNavigate } from "react-router-dom";

function Dashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const name = localStorage.getItem("name");
  const role = localStorage.getItem("role");
  const email = localStorage.getItem("email");

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <div>
      <h2>Dashboard</h2>

      {token ? (
        <>
          <p>Welcome, {name}</p>
          <p>Email: {email}</p>
          <p>Role: {role}</p>

          <br />

          <Link to="/">View Products</Link>
          <br /><br />

          {role === "ADMIN" && (
            <>
              <Link to="/add-product">Add Product</Link>
              <br /><br />
            </>
          )}

          <button onClick={handleLogout}>Logout</button>
        </>
      ) : (
        <p>Please login first</p>
      )}
    </div>
  );
}

export default Dashboard;