import { useState } from "react";
import { useRouter } from "next/router";
import styles from "../styles/Register.module.css";
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

    const trimmedUsername = username.trim();

    if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
      setError("Username can only include letters, numbers, and underscores.");
      return;
    }

    const formattedUsername = `.${trimmedUsername}`;

    try {
      await api.post("/api/auth/register", {
        username: formattedUsername,
        email,
        password,
      });

      alert("Verification email sent. Please check your email to activate your account.");

      // Auto-login after registration (uncomment if needed)
      // await api.post("/api/auth/login", { email, password });

      router.push("/");
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed");
    }
  };


  return (
    <div>
      <Navbar />
      <div className={styles.container}>
        <h2>register new account</h2>
        <form onSubmit={handleRegister} className={styles.form}>
          <div className={styles.inputGroup}>
            <span>.</span>
            <input
              type="text"
              placeholder="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
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
          <button type="submit" className={styles.button}>register</button>

        </form>
        {error && <p className={styles.error}>{error}</p>}
        <p className={styles.altLink}>
          already have an account? <a href="/login">login here</a>
        </p>
      </div>
    </div>

  );
};

export default Register;
