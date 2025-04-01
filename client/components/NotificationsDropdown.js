import React, { useEffect, useState } from "react";
import api from "../utils/api";
import styles from "../styles/Notifications.module.css";
import { getSocket } from "../lib/socket";

const NotificationsDropdown = ({ scrolled }) => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [userId, setUserId] = useState(null);

  const fetchNotifications = async () => {
    try {
      const res = await api.get("/api/notifications", { withCredentials: true });
      const incoming = res.data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      const seen = new Set();
      const stacked = [];

      for (const n of incoming) {
        const key = n.type === "message" && n.fromUser ? `message:${n.fromUser}` : n._id;
        if (!seen.has(key)) {
          seen.add(key);
          stacked.push(n);
        }
      }

      setNotifications(stacked);
    } catch (err) {
      console.error("Failed to fetch notifications:", err.response?.data || err.message);
    }
  };

  const markAsOpened = async (notificationId) => {
    try {
      await api.patch(`/api/notifications/${notificationId}/open`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === notificationId ? { ...n, opened: true } : n))
      );
    } catch (err) {
      console.error("Failed to mark notification as opened:", err.response?.data || err.message);
    }
  };

  const clearAllNotifications = async () => {
    try {
      await api.delete("/api/notifications/clear", { withCredentials: true });
      setNotifications([]);
    } catch (err) {
      console.error("Failed to clear notifications:", err.response?.data || err.message);
    }
  };

  const handleClick = async (notification) => {
    if (!notification.opened) {
      await markAsOpened(notification._id);
    }
    window.location.href = notification.link;
  };

  const toggleDropdown = () => {
    setIsOpen((prev) => !prev);
  };

  const unreadCount = notifications.filter((n) => !n.opened).length;

  useEffect(() => {
    const getUser = async () => {
      try {
        const res = await api.get("/api/auth/me", { withCredentials: true });
        setUserId(res.data._id);
      } catch (err) {
        console.error("Failed to get user ID for socket:", err.response?.data || err.message);
      }
    };
    getUser();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const socket = getSocket(userId);

    const handleIncomingNotif = (incomingNotif) => {
      setNotifications((prev) => {
        if (incomingNotif.type === "message" && incomingNotif.fromUser) {
          const filtered = prev.filter(
            (n) =>
              n.type !== "message" ||
              !n.fromUser ||
              n.fromUser.toString() !== incomingNotif.fromUser.toString()
          );
          return [incomingNotif, ...filtered];
        }
        return [incomingNotif, ...prev];
      });
    };

    socket.on("new_notification", handleIncomingNotif);
    socket.on("notifications_cleared", () => setNotifications([]));

    return () => {
      socket.off("new_notification", handleIncomingNotif);
      socket.off("notifications_cleared");
    };
  }, [userId]);

  useEffect(() => {
    fetchNotifications();
  }, []);

  return (
    <div className={styles.dropdownContainer}>
      <button
        className={`${styles.dropdownToggle} ${scrolled ? styles.scrolledToggle : ""}`}
        onClick={toggleDropdown}
      >
        🔔{unreadCount > 0 ? unreadCount : "0"}
      </button>

      {isOpen && (
        <div className={styles.dropdownMenu}>
          {notifications.length > 0 && (
            <button className={styles.clearButton} onClick={clearAllNotifications}>
              Clear All
            </button>
          )}
          {notifications.length === 0 ? (
            <div className={styles.empty}>No notifications</div>
          ) : (
            notifications.map((n) => (
              <div
                key={n._id}
                className={`${styles.notificationItem} ${!n.opened ? styles.unread : ""}`}
                onClick={() => handleClick(n)}
              >
                <div className={styles.message}>{n.message}</div>
                <div className={styles.meta}>
                  <span>{new Date(n.timestamp).toLocaleString()}</span>
                  <span className={styles.typeTag}>{n.type}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationsDropdown;
