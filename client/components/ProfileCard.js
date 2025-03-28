import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "../styles/ProfileCard.module.css";
import api from "../utils/api";

const ProfileCard = ({ user }) => {
  const [isFollowing, setIsFollowing] = useState(false);
  const [isSelfProfile, setIsSelfProfile] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState(null);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const res = await api.get("/api/auth/me");
        setLoggedInUser(res.data);
        setIsSelfProfile(res.data.username === user.username);
        fetchFollowStatus(user._id);
      } catch (err) {
        console.log("Not authenticated");
        setLoggedInUser(null);
      }
    };

    fetchCurrentUser();
  }, [user]);

  const fetchFollowStatus = async (profileUserId) => {
    try {
      const res = await api.get(`/api/users/${profileUserId}/follow-status`);
      setIsFollowing(res.data.isFollowing);
    } catch (err) {
      console.error("Error fetching follow status:", err.response?.data || err.message);
    }
  };

  const handleFollowToggle = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await api.post(`/api/users/${user._id}/follow`);
      setIsFollowing(res.data.isFollowing);
    } catch (err) {
      console.error("Error toggling follow:", err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.profileCard}>
      <h2>
        <Link
          href={`https://osphere.io/profile?username=${user.username || "unknown"}`}
          className={styles.username}
        >
          {user.username || "Unknown User"}
        </Link>
      </h2>

      <p><strong>followers:</strong> {user.followers?.length || 0}</p>
      <p><strong>following:</strong> {user.following?.length || 0}</p>

      {loggedInUser && !isSelfProfile && (
        <button
          onClick={handleFollowToggle}
          className={`${styles.followButton} ${isFollowing ? styles.following : ""}`}
          disabled={loading}
        >
          {loading ? "Processing..." : isFollowing ? "Unfollow" : "Follow"}
        </button>
      )}
    </div>
  );
};

export default ProfileCard;
