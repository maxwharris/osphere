import Link from "next/link";
import styles from "../styles/ProfileCard.module.css";

const GroupCard = ({ group }) => {
  return (
    <div className={styles.profileCard}>
      <h2>
        <Link
          href={`https://${group.name}.osphere.io/group`}
          className={styles.username}
        >
          {group.name}
        </Link>
      </h2>

      <p><strong>members:</strong> {group.memberCount || 0}</p>
      <p>{group.description || "No description available."}</p>
    </div>
  );
};

export default GroupCard;
