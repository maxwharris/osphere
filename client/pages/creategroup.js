import React, { useState } from "react";
import Navbar from "../components/Navbar";
import api from "../utils/api"; // ✅ Centralized API import
import styles from "../styles/CreateGroup.module.css";

const CreateGroup = () => {
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleCreateGroup = async (e) => {
    e.preventDefault();

    if (/\s/.test(groupName)) {
      setError("Group name cannot contain spaces.");
      return;
    }

    const user = JSON.parse(localStorage.getItem("user")); // Get user info

    console.log(user.id);

    if (!user || !user.id) {
      alert("Unauthorized: No user ID found.");
      return;
    }

    try {
      const response = await api.post("/api/groups/create", {
        name: groupName,
        description,
        isPrivate,
        admin: user.id,
        members: [user.id],
      });

      alert("Group created successfully!");
      window.location.href = `https://${groupName}.osphere.io/group`;
    } catch (err) {
      console.error("Error creating group:", err.response?.data || err.message);
      alert(`Error: ${err.response?.data?.error || err.message}`);
    }
  };

  return (
    <div>
      <Navbar />
      <div className={styles.createGroupContainer}>
        <h2>create circle</h2>
        <form onSubmit={handleCreateGroup}>
          <label>circle name</label>
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Enter group name"
            required
          />

          <label>description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your group"
            required
          />

          <label>
            private group
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={() => setIsPrivate(!isPrivate)}
            />
          </label>

          <button type="submit">create circle</button>

          {error && <p className={styles.error}>{error}</p>}
          {success && <p className={styles.success}>{success}</p>}
        </form>
      </div>
    </div>
  );
};

export default CreateGroup;
