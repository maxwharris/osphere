import React, { useEffect, useState } from "react";
import api from "../utils/api";
import styles from "../styles/Notifications.module.css";

const NotificationsDropdown = () => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await api.get("/api/notifications");
      setNotifications(res.data);
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

  const handleClick = async (notification) => {
    if (!notification.opened) {
      await markAsOpened(notification._id);
    }
    window.location.href = notification.link;
  };

  useEffect(() => {
    if (isOpen) fetchNotifications();
  }, [isOpen]);

  const toggleDropdown = () => {
    setIsOpen((prev) => !prev);
  };

  const unreadCount = notifications.filter((n) => !n.opened).length;

  return (
    <div className={styles.dropdownContainer}>
      <button className={styles.dropdownToggle} onClick={toggleDropdown}>
        {unreadCount > 0 ? unreadCount : "0"}
      </button>

      {isOpen && (
        <div className={styles.dropdownMenu}>
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
