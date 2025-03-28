import { useState } from "react";
import api from "../utils/api"; // ✅ Centralized API instance
import Navbar from "../components/Navbar";
import Post from "../components/Post";
import ProfileCard from "../components/ProfileCard";
import styles from "../styles/Post.module.css";

const Search = () => {
  const [query, setQuery] = useState("");
  const [userResults, setUserResults] = useState([]);
  const [postResults, setPostResults] = useState([]);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query) return;

    try {
      const res = await api.get(`/api/search?q=${query}`);

      setUserResults(res.data.users || []);
      setPostResults(res.data.posts || []);
      setError(res.data.users.length === 0 && res.data.posts.length === 0 ? "No results found." : null);
    } catch (err) {
      console.error("❌ Search failed:", err.response?.data || err.message);
      setError("no results found.");
    }
  };

  return (
    <div>
      <Navbar />
      <div className={styles.searchContainer}>
        <h2>search</h2>
        <form onSubmit={handleSearch} className={styles.searchForm}>
          <input 
            type="text" 
            value={query} 
            onChange={(e) => setQuery(e.target.value)} 
            placeholder="search for users ('.username') or posts"
            className={styles.searchInput}
          />
          <button type="submit" className={styles.searchButton}>Search</button>
        </form>

        {error && <p className={styles.errorText}>{error}</p>}

        {userResults.length > 0 && (
          <div className={styles.searchResults}>
            <h3>users</h3>
            {userResults.map((user) => (
              <ProfileCard key={user._id} user={user} />
            ))}
          </div>
        )}

        {postResults.length > 0 && (
          <div className={styles.searchResults}>
            <h3>posts</h3>
            {postResults.map((post) => <Post key={post._id} post={post} />)}
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;
