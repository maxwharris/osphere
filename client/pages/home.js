import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Navbar from "../components/Navbar";
import styles from "../styles/Home.module.css";
import Post from "../components/Post";
import UserGroups from "../components/UserGroups";
import api from "../utils/api";

const Home = () => {
  const [posts, setPosts] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortOption, setSortOption] = useState("newest");
  const router = useRouter();

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
    const fetchUserAndFeed = async () => {
      try {
        const res = await api.get("/api/auth/me");
        setUser(res.data);
        fetchFeed(res.data._id);
      } catch (err) {
        console.error("Authentication failed:", err);
        router.push("/login");
      }
    };

    fetchUserAndFeed();
  }, []);

  const fetchFeed = async (userId) => {
    try {
      const res = await api.get(`/api/posts/feed/${userId}`);
      setPosts(sortPosts(res.data, sortOption));
    } catch (err) {
      console.error("Error fetching posts:", err.response?.data || err.message);

      if (err.response?.status === 401) {
        alert("Session expired. Please log in again.");
        router.push("/login");
      } else {
        setError("Failed to load posts.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePostDelete = (postId) => {
    setPosts(posts.filter((post) => post._id !== postId));
  };

  const handleSortChange = (e) => {
    const newOption = e.target.value;
    setSortOption(newOption);
    setPosts((prev) => sortPosts(prev, newOption));
  };

  return (
    <div>
      <Navbar />
      <UserGroups />

      <div className={styles.sortBar}>
        <label htmlFor="sort">Sort by:</label>
        <select id="sort" value={sortOption} onChange={handleSortChange}>
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="mostLikes">Most Likes</option>
          <option value="mostDislikes">Most Dislikes</option>
        </select>
      </div>

      <div className={styles.feed}>
        {loading ? (
          <p>Loading posts...</p>
        ) : error ? (
          <p>{error}</p>
        ) : posts.length === 0 ? (
          <p>No posts available. Follow users or create a post.</p>
        ) : (
          posts.map((post) => (
            <Post key={post._id} post={post} onDelete={handlePostDelete} />
          ))
        )}
      </div>
    </div>
  );
};

export default Home;
