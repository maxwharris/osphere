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
  const router = useRouter();

  useEffect(() => {
    const fetchUserAndFeed = async () => {
      try {
        const res = await api.get("/api/auth/me"); // ✅ Validate user session
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
      setPosts(res.data);
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

  return (
    <div>
      <Navbar />
      <UserGroups />
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
