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
  const [sortOption, setSortOption] = useState("newest");
  const router = useRouter();
  const { username } = router.query;

  const sortPosts = (posts, option) => {
    const sorted = [...posts];
    switch (option) {
      case "oldest":
        return sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      case "mostLikes":
        return sorted.sort((a, b) => b.likes.length - a.likes.length);
      case "mostDislikes":
        return sorted.sort((a, b) => b.dislikes.length - a.dislikes.length);
      case "newest":
      default:
        return sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
  };

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
      setPosts(sortPosts(postsRes.data, sortOption))

      setLoading(false);
    } catch (err) {
      console.error("Error fetching profile:", err.response?.data || err.message);
      setError("User not found or session expired.");
      setLoading(false);
    }
  };

  const handleSortChange = (e) => {
    const newOption = e.target.value;
    setSortOption(newOption);
    setPosts((prev) => sortPosts(prev, newOption));
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
        <h3 className={styles.postsSectionHeader}>{userProfile.username}'s posts</h3>

        <div className={styles.sortBar}>
          <label htmlFor="sort">Sort by:</label>
          <select id="sort" value={sortOption} onChange={handleSortChange}>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="mostLikes">Most Likes</option>
            <option value="mostDislikes">Most Dislikes</option>
          </select>
        </div>

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
