import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import api from "../utils/api"; // ✅ Centralized API instance
import Navbar from "../components/Navbar";
import styles from "../styles/Settings.module.css";

const Settings = () => {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const res = await api.get("/api/auth/me");

      if (!res.data) {
        console.error("No user data returned from API.");
        return;
      }

      setUsername(res.data.username || "");
      setEmail(res.data.email || "");
    } catch (err) {
      console.error("Error fetching user data:", err.response?.data || err.message);

      if (err.response?.status === 401) {
        console.error("Invalid token. Redirecting to login.");
        localStorage.removeItem("token");
        router.push("/login");
      }
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      await api.put("/api/auth/update", {
        username,
        email,
        currentPassword,
        newPassword,
        confirmPassword,
      });

      setMessage("Profile updated successfully.");
      fetchUserData(); // Refresh data
    } catch (err) {
      console.error("Error updating profile:", err.response?.data || err.message);
      setMessage("Failed to update profile.");
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm("Are you sure you want to delete your account? This action cannot be undone.")) return;

    try {
      await api.delete("/api/auth/delete");

      alert("Account deleted.");
      localStorage.removeItem("token");
      router.push("/login");
    } catch (err) {
      console.error("Error deleting account:", err.response?.data || err.message);
      setMessage("Failed to delete account.");
    }
  };

  return (
    <div>
      <Navbar />
      <div className={styles.container}>
        <h2>account settings</h2>

        {message && <p className={styles.message}>{message}</p>}

        <form onSubmit={handleUpdateProfile} className={styles.form}>
          <label>username</label>
          <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />

          <label>email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

          <label>current password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />

          <label>new password</label>
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />

          <label>confirm new password</label>
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />

          <button type="submit" className={styles.saveButton}>save changes</button>
        </form>

        <button onClick={handleDeleteAccount} className={styles.deleteButton}>delete account</button>
      </div>
    </div>
  );
};

export default Settings;
