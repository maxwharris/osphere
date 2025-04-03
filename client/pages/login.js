import { useState } from "react";
import { useRouter } from "next/router";
import api from "../utils/api";
import Navbar from "../components/Navbar";
import styles from "../styles/Register.module.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const res = await api.post("/api/auth/login", { email, password });

      if (!res.data.user.isVerified) {
        setError("Please verify your email before logging in.");
        return;
      }

      localStorage.setItem("user", JSON.stringify(res.data.user));
      router.push("/");
    } catch (err) {
      console.error("❌ Login failed:", err.response?.data || err.message);
      setError(err.response?.data?.error || "Invalid credentials. Please try again.");
    }
  };

  return (
    <div>
      <Navbar />
      <div className={styles.container}>
        <h2>login</h2>
        <form onSubmit={handleLogin} className={styles.form}>
          <input
            type="email"
            placeholder="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={styles.input}
          />
          <input
            type="password"
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={styles.input}
          />
          <button type="submit">login</button>
        </form>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <p>
          don't have an account? <a href="/register">register here</a>
        </p>
      </div>
    </div>
  );
};

export default Login;
