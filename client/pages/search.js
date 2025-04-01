import { useState } from "react";
import api from "../utils/api"; // ✅ Centralized API instance
import Navbar from "../components/Navbar";
import Post from "../components/Post";
import ProfileCard from "../components/ProfileCard";
import styles from "../styles/Post.module.css";
import stylessort from "../styles/Search.module.css";

const Search = () => {
  const [query, setQuery] = useState("");
  const [userResults, setUserResults] = useState([]);
  const [postResults, setPostResults] = useState([]);
  const [error, setError] = useState(null);
  const [sortOption, setSortOption] = useState("newest");

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

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query) return;

    try {
      const res = await api.get(`/api/search?q=${query}`);

      setUserResults(res.data.users || []);
      setPostResults(sortPosts(res.data.posts || [], sortOption));
      setError(res.data.users.length === 0 && res.data.posts.length === 0 ? "No results found." : null);
    } catch (err) {
      console.error("❌ Search failed:", err.response?.data || err.message);
      setError("no results found.");
    }
  };

  const handleSortChange = (e) => {
    const newOption = e.target.value;
    setSortOption(newOption);
    setPostResults((prev) => sortPosts(prev, newOption));
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
          <div className={stylessort.searchResults}>
            <div className={stylessort.postsSectionHeader}>
              <h3>posts</h3>
              <div className={stylessort.sortBar}>
                <label htmlFor="sort">Sort by:</label>
                <select id="sort" value={sortOption} onChange={handleSortChange}>
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="mostLikes">Most Likes</option>
                  <option value="mostDislikes">Most Dislikes</option>
                </select>
              </div>
            </div>
            {postResults.map((post) => <Post key={post._id} post={post} />)}
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;
