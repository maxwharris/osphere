import { useState } from "react";
import { useRouter } from "next/router";
import api from "../utils/api"; // ✅ Use centralized API instance
import Navbar from "../components/Navbar";

const Register = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const router = useRouter();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await api.post("/api/auth/register", { username, email, password });
      alert("Verification email sent. Please check your email to activate your account.");

      // Auto-login after registration
      await api.post("/api/auth/login", { email, password });

      router.push("/");
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed");
    }
  };

  return (
    <div>
      <Navbar />
      <div style={{ textAlign: "center", marginTop: "50px" }}>
        <h2>register new account</h2>
        <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", width: "300px", margin: "auto" }}>
          <input
            type="text"
            placeholder="username (.username format)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            type="email"
            placeholder="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">Register</button>
        </form>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <p>already have an account? <a href="/login">login here</a></p>
      </div>
    </div>
  );
};

export default Register;
