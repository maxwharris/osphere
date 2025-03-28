import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "../styles/UserGroups.module.css";
import api from "../utils/api"; // ✅ Using centralized API instance

const UserGroups = () => {
  const [groups, setGroups] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchUserGroups();
  }, []);

  const fetchUserGroups = async () => {
    try {
        const res = await api.get("/api/groups/user/groups");
        setGroups(res.data);
        
    } catch (err) {
        console.error("Error fetching groups:", err);
        setError(err.response?.data?.error || "Failed to load groups.");
    }
};

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>your circles</h2>

      {error && <p className={styles.error}>{error}</p>}

      {groups.length > 0 ? (
        <ul className={styles.groupList}>
          {groups.map((group) => (
            <li key={group._id} className={styles.groupItem}>
              <Link href={`https://${group.name}.osphere.io/group`} legacyBehavior>
                <a className={styles.groupLink}>{group.name}</a>
              </Link>
             
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.noGroups}>you are not in any circles yet.</p>
      )}

      <div className={styles.createGroupContainer}>
        <Link href="/creategroup" legacyBehavior>
          <a className={styles.createGroupButton}>create circle</a>
        </Link>
      </div>
    </div>
  );
};

export default UserGroups;
