import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import api from "../utils/api";
import Navbar from "../components/Navbar";
import ProfileCard from "../components/ProfileCard";
import Post from "../components/Post";
import UserGroups from "../components/UserGroups";
import styles from "../styles/Profile.module.css";

const Profile = () => {
  const [userProfile, setUserProfile] = useState(null);
  const [authUser, setAuthUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isSelfProfile, setIsSelfProfile] = useState(false);
  const router = useRouter();
  const { username } = router.query;

  useEffect(() => {
    if (username) {
      fetchProfile(username);
    }
  }, [username]);

  const fetchProfile = async (username) => {
    try {
      // ✅ Fetch authenticated user via secure cookie
      const authRes = await api.get("/api/auth/me");
      setAuthUser(authRes.data);

      // ✅ Fetch profile data
      const profileRes = await api.get(`/api/users/${username}`);
      const profileUser = profileRes.data;
      setUserProfile(profileUser);

      // ✅ Check relationship
      if (authRes.data.username === username) {
        setIsSelfProfile(true);
      } else {
        setIsFollowing(profileUser.isFollowing);
      }

      // ✅ Fetch user’s posts
      const postsRes = await api.get(`/api/users/${profileUser._id}/posts`);
      setPosts(postsRes.data);

      setLoading(false);
    } catch (err) {
      console.error("Error fetching profile:", err.response?.data || err.message);
      setError("User not found or session expired.");
      setLoading(false);
    }
  };

  const handleFollowToggle = async () => {
    try {
      if (!authUser) {
        alert("You must be logged in to follow users.");
        return;
      }

      const res = await api.post(`/api/users/${userProfile._id}/follow`);
      setIsFollowing(res.data.isFollowing);
    } catch (err) {
      console.error("Error following user:", err.response?.data || err.message);
    }
  };

  if (loading) return <p>loading profile...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div className={styles.profileContainer}>
      <Navbar user={authUser} />
      <UserGroups />
      
      <div className={styles.profileCardWrapper}>
        <ProfileCard 
          user={userProfile} 
          isFollowing={isFollowing} 
          onFollowToggle={handleFollowToggle} 
          isSelfProfile={isSelfProfile}
        />
      </div>

      {isSelfProfile && (
        <div className={styles.settingsLink}>
          <a href="/settings">edit profile</a>
        </div>
      )}

      <div className={styles.postsSection}>
        <h3>{userProfile.username}'s posts</h3>
        {posts.length === 0 ? (
          <p className={styles.noPostsMessage}>no posts available.</p>
        ) : (
          posts.map((post) => <Post key={post._id} post={post} />)
        )}
      </div>
    </div>
  );
};

export default Profile;
