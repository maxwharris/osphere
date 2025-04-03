import { useState } from "react";
import api from "../utils/api";
import Navbar from "../components/Navbar";
import Post from "../components/Post";
import ProfileCard from "../components/ProfileCard";
import GroupCard from "../components/GroupCard";
import styles from "../styles/Post.module.css";
import stylessort from "../styles/Search.module.css";

const Search = () => {
  const [query, setQuery] = useState("");
  const [userResults, setUserResults] = useState([]);
  const [groupResults, setGroupResults] = useState([]);
  const [postResults, setPostResults] = useState([]);
  const [error, setError] = useState(null);
  const [sortOption, setSortOption] = useState("newest");
  const [showInfo, setShowInfo] = useState(false); // 👈 NEW

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
      setGroupResults(res.data.groups || []);
      setPostResults(sortPosts(res.data.posts || [], sortOption));

      const noResults =
        (res.data.users?.length || 0) === 0 &&
        (res.data.groups?.length || 0) === 0 &&
        (res.data.posts?.length || 0) === 0;

      setError(noResults ? "No results found." : null);
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

        {/* SEARCH BAR + INFO BUTTON */}
        <form onSubmit={handleSearch} className={styles.searchForm} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="search..."
            className={styles.searchInput}
          />
          <button type="submit" className={styles.searchButton}>Search</button>
          <button
            type="button"
            title="how to search"
            onClick={() => setShowInfo(!showInfo)}
            style={{
              padding: "0.3rem 0.6rem",
              background: "#444",
              color: "#fff",
              border: "none",
              borderRadius: "50%",
              fontWeight: "bold",
              cursor: "pointer"
            }}
          >
            i
          </button>
        </form>

        {/* INFO BOX */}
        {showInfo && (
          <div className={stylessort.infoBox}>
            <p><code>.username</code> → search for users</p>
            <p><code>groupname.</code> → search for groups</p>
            <p><code>any keyword</code> → search for posts</p>
          </div>
        )}

        {error && <p className={styles.errorText}>{error}</p>}

        {userResults.length > 0 && (
          <div className={styles.searchResults}>
            <h3>users</h3>
            {userResults.map((user) => (
              <ProfileCard key={user._id} user={user} />
            ))}
          </div>
        )}

        {groupResults.length > 0 && (
          <div className={styles.searchResults}>
            <h3>groups</h3>
            {groupResults.map((group) => (
              <GroupCard key={group.name} group={group} />
            ))}
          </div>
        )}

        {postResults.length > 0 && (
          <div className={stylessort.searchResults}>
            <div className={stylessort.postsSectionHeader}>
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
            <h3>posts</h3>
            {postResults.map((post) => (
              <Post key={post._id} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;
