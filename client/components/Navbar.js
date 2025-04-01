import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import styles from "../styles/Navbar.module.css";
import api from "../utils/api";
import NotificationsDropdown from "./NotificationsDropdown"; // ✅ Import added

const Navbar = () => {
  const [user, setUser] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [rotation, setRotation] = useState(0);
  const router = useRouter();

  const fetchUser = async () => {
    try {
      const res = await fetch("https://api.osphere.io/api/auth/me", {
        method: "GET",
        credentials: "include",
      });

      if (res.status === 401) {
        setUser(null);
        return;
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      setUser(data);
    } catch (err) {
      console.error("Navbar failed to fetch user:", err);
      setUser(null);
    }
  };

  useEffect(() => {
    fetchUser();

    const syncUser = () => fetchUser();
    window.addEventListener("storage", syncUser);
    return () => window.removeEventListener("storage", syncUser);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setScrolled(scrollY > 10);
      setRotation(scrollY);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = async () => {
    try {
      await api.post("/api/auth/logout", {}, { withCredentials: true });
    } catch (err) {
      console.error("Logout failed:", err);
    }

    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    router.push("https://osphere.io/login");
  };

  return (
    <div>
      <nav className={`${styles.navbar} ${scrolled ? styles.scrolled : ""}`}>
        <Link href="https://osphere.io/">
          <h1 className={styles.logo}>
            <span style={{ display: "inline-block", transform: `rotate(${rotation}deg)` }}>
              🌐
            </span>
            sphere
          </h1>
        </Link>
        <div className={styles.links}>
          {user ? (
            <>
              <NotificationsDropdown scrolled={scrolled} />
              <Link href="https://osphere.io/search">search</Link>
              <Link href="https://osphere.io/createpost">create</Link>
              <Link href="https://osphere.io/messages">message</Link>
              <Link href={`https://osphere.io/profile?username=${user.username}`}>
                {user.username}
              </Link>
              <button onClick={handleLogout} className={styles.logoutButton} >logout</button>
            </>
          ) : (
            <>
              <Link href="https://osphere.io/login">login</Link>
              <Link href="https://osphere.io/register">register</Link>
            </>
          )}
        </div>
      </nav>
    </div>
  );
};

export default Navbar;
