import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import api from "../utils/api";
import Navbar from "../components/Navbar";
import Post from "../components/Post";
import styles from "../styles/GroupPage.module.css";

const GroupPage = () => {
  const router = useRouter();
  const { groupName } = router.query;
  const [group, setGroup] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isMember, setIsMember] = useState(false);
  const [newPost, setNewPost] = useState("");
  const [posts, setPosts] = useState([]);
  const [sortOption, setSortOption] = useState("newest");
  const [selectedMember, setSelectedMember] = useState("");
  const subdomain = typeof window !== "undefined" ? window.location.hostname.split(".")[0] : "";

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
    if (subdomain && subdomain !== "osphere") {
      const init = async () => {
        try {
          const res = await api.get("/api/auth/me");
          setUser(res.data); // ✅ Save to state
          fetchGroup(subdomain, res.data); // ✅ Pass directly to group fetch
        } catch (err) {
          console.error("Not authenticated", err);
          setUser(null);
          fetchGroup(subdomain, null); // still load group even if not logged in
        }
      };
      init();
    }
  }, []);

  const fetchGroup = async (groupName, userObj) => {
    try {
      const res = await api.get(`/api/groups/${groupName}`);
      setGroup(res.data);
      if (userObj) {
        setIsMember(res.data.members.some((m) => m._id === userObj._id));
      }
      fetchGroupPosts(res.data._id);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load group");
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupPosts = async (groupId) => {
    try {
      const res = await api.get(`/api/posts/group/${groupId}`);
      const sorted = sortPosts(res.data.map(post => ({
        ...post,
        group: post.group?._id || post.group
      })), sortOption);
      setPosts(sorted);
    } catch (err) {
      console.error("Error fetching posts:", err.response?.data || err.message);
    }
  };

  const handleSortChange = (e) => {
    const newOption = e.target.value;
    setSortOption(newOption);
    setPosts((prev) => sortPosts(prev, newOption));
  };

  const handleJoinLeaveGroup = async () => {
    try {
      const endpoint = isMember ? "leave" : "join";
      await api.post(`/api/groups/${group.name}/${endpoint}`);
      setIsMember(!isMember);
      fetchGroup(subdomain, user); // re-fetch group with current user
    } catch (err) {
      console.error("Error updating membership:", err.response?.data || err.message);
    }
  };

  const assignModerator = async (memberId) => {
    if (!memberId) return;
    try {
      await api.post(`/api/groups/${group.name}/moderators/add`, { userId: memberId });
      fetchGroup(group.name, user);
    } catch (err) {
      console.error("Error assigning moderator:", err.response?.data || err.message);
    }
  };

  const removeModerator = async (modId) => {
    try {
      await api.post(`/api/groups/${group.name}/moderators/remove`, { userId: modId });
      fetchGroup(group.name, user);
    } catch (err) {
      console.error("Error removing moderator:", err.response?.data || err.message);
    }
  };

  const handleDeleteGroup = async () => {
    if (!confirm("Are you sure you want to delete this group? This action cannot be undone.")) return;

    try {
      await api.delete(`/api/groups/${group.name}`, {
        data: { userId: user._id },
      });
      router.push("/");
    } catch (err) {
      console.error("Error deleting group:", err.response?.data || err.message);
      alert(err.response?.data?.error || "Failed to delete group.");
    }
  };

  if (loading) return <p>Loading group...</p>;
  if (error) return <p className={styles.error}>{error}</p>;

  return (
    <div>
      <Navbar />
      <div className={styles.container}>
        <h1 className={styles.groupTitle}>{group.name}</h1>
        <p className={styles.groupDescription}>{group.description}</p>
        <p className={styles.groupPrivacy}>{group.isPrivate ? "🔒 Private" : "🌍 Public"}</p>

        <div className={styles.memberInfo}>
          <p><strong>Admin:</strong> {group.admin.username}</p>
          <p><strong>Moderators:</strong> {group.moderators.map(mod => mod.username).join(", ") || "None"}</p>
          <p><strong>Members:</strong> {group.members.length}</p>
        </div>

        {user && (
          <button onClick={handleJoinLeaveGroup} className={styles.joinLeaveButton}>
            {isMember ? "Leave" : "Join"}
          </button>
        )}

        <div className={styles.sortBar}>
          <label htmlFor="sort">Sort by:</label>
          <select id="sort" value={sortOption} onChange={handleSortChange}>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="mostLikes">Most Likes</option>
            <option value="mostDislikes">Most Dislikes</option>
          </select>
        </div>

        {posts.length > 0 ? (
          posts.map((post) => <Post key={post._id} post={post} />)
        ) : (
          <p>No posts yet.</p>
        )}

        {user?._id === group.admin._id && (
          <div className={styles.adminControls}>
            <h3>Admin Controls</h3>
            <button className={styles.deleteButton} onClick={handleDeleteGroup}>
              Delete Group
            </button>
            <p><strong>Manage Moderators:</strong></p>
            <select onChange={(e) => setSelectedMember(e.target.value)}>
              <option value="">Select a member</option>
              {group.members
                .filter(m => !group.moderators.some(mod => mod._id === m._id))
                .map(member => (
                  <option key={member._id} value={member._id}>{member.username}</option>
                ))}
            </select>
            <button onClick={() => assignModerator(selectedMember)}>Make Moderator</button>

            <p><strong>Remove Moderators:</strong></p>
            {group.moderators.map((mod) => (
              <div key={mod._id}>
                {mod.username} <button onClick={() => removeModerator(mod._id)}>Remove</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupPage;
