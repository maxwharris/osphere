import React from "react";
import Link from "next/link";
import { useState, useEffect } from "react";
import styles from "../styles/Post.module.css";
import Comments from "./Comments";
import api from "../utils/api";
import AudioPlayer from "react-h5-audio-player";
import "react-h5-audio-player/lib/styles.css";

const Post = ({ post, onDelete }) => {
  const [likes, setLikes] = useState(post.likes?.length || 0);
  const [dislikes, setDislikes] = useState(post.dislikes?.length || 0);
  const [userLiked, setUserLiked] = useState(false);
  const [userDisliked, setUserDisliked] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const [recentChats, setRecentChats] = useState([]);
  const [showShareOverlay, setShowShareOverlay] = useState(false);
  const [selectedChat, setSelectedChat] = useState("");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [groupName, setGroupName] = useState(null);

  const formatText = (text) => {
    if (!text) return null;
  
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const markdownLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
    const doubleBracketLinkRegex = /\[\[([^\]]+)\]\]/g;
  
    return text.split("\n").map((line, index) => {
      const parts = [];
      let lastIndex = 0;
  
      // First replace markdown-style links
      line.replace(markdownLinkRegex, (match, text, url, offset) => {
        if (lastIndex < offset) {
          parts.push(line.slice(lastIndex, offset));
        }
        parts.push(
          <a
            key={`${index}-md-${offset}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#1E90FF", textDecoration: "underline" }}
          >
            {text}
          </a>
        );
        lastIndex = offset + match.length;
      });
  
      // Handle any remaining text after markdown links
      let leftover = line.slice(lastIndex);
      lastIndex = 0;
  
      // Replace double bracket links ([[link]])
      leftover.replace(doubleBracketLinkRegex, (match, linkText, offset) => {
        if (lastIndex < offset) {
          parts.push(leftover.slice(lastIndex, offset));
        }
        const url = `https://${linkText}`;
        parts.push(
          <a
            key={`${index}-bb-${offset}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#1E90FF", textDecoration: "underline" }}
          >
            {linkText}
          </a>
        );
        lastIndex = offset + match.length;
      });
  
      if (lastIndex < leftover.length) {
        leftover = leftover.slice(lastIndex);
        // Replace plain URLs in the remainder
        leftover.split(urlRegex).forEach((part, i) => {
          parts.push(
            urlRegex.test(part) ? (
              <a
                key={`${index}-url-${i}`}
                href={part}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#1E90FF", textDecoration: "underline" }}
              >
                {part}
              </a>
            ) : (
              part
            )
          );
        });
      }
  
      return (
        <React.Fragment key={index}>
          {parts}
          <br />
        </React.Fragment>
      );
    });
  };
  

  useEffect(() => {
    const fetchPostDetails = async () => {
      try {
        const res = await api.get(`/api/posts/${post._id}`);
        const userData = await api.get("/api/auth/me");
        const loggedInUser = userData.data;
        if (loggedInUser) {
          setUserLiked(res.data.likes?.includes(loggedInUser._id));
          setUserDisliked(res.data.dislikes?.includes(loggedInUser._id));
          setIsOwner(res.data.user._id === loggedInUser._id);
        }
        setLikes(res.data.likes?.length || 0);
        setDislikes(res.data.dislikes?.length || 0);
      } catch (err) {
        console.error("Error fetching post details:", err.response?.data || err.message);
      }
    };

    fetchRecentChats();
    fetchPostDetails();
  }, [post._id]);

  useEffect(() => {
    const fetchGroupName = async () => {
      if (post.group) {
        try {
          const res = await api.get(`/api/groups/id/${post.group}`);
          setGroupName(res.data.name);
        } catch (err) {
          console.error("Error fetching group name:", err.response?.data || err.message);
        }
      }
    };

    fetchGroupName();
  }, [post.group]);

  const fetchRecentChats = async () => {
    try {
      const res = await api.get("/api/messages/recent");
      setRecentChats(res.data);
    } catch (err) {
      console.error("Error fetching recent chats:", err.response?.data || err.message);
    }
  };

  const handleCopyLink = async () => {
    const postUrl = `https://osphere.io/p?id=${post._id}`;
    try {
      await navigator.clipboard.writeText(postUrl);
      alert("Post link copied to clipboard!");
    } catch (err) {
      console.error("Clipboard write failed:", err);
    }
    setShowShareOverlay(false);
  };

  const handleSendMessage = async () => {
    if (!selectedChat) return alert("Select a user to send the post to.");
    try {
      await api.post("/api/messages", {
        recipient: selectedChat,
        content: `Check out this post: https://osphere.io/p?id=${post._id}`,
      });
      setShowShareOverlay(false);
      alert("Post sent successfully!");
    } catch (err) {
      console.error("Error sending post:", err.response?.data || err.message);
      alert("Failed to send the post.");
    }
  };

  const handleLike = async () => {
    try {
      const res = await api.post(`/api/posts/${post._id}/like`);
      setLikes(res.data.likes);
      setDislikes(res.data.dislikes);
      setUserLiked(!userLiked);
      setUserDisliked(false);
    } catch (err) {
      console.error("Error liking post:", err.response?.data || err.message);
    }
  };

  const handleDislike = async () => {
    try {
      const res = await api.post(`/api/posts/${post._id}/dislike`);
      setLikes(res.data.likes);
      setDislikes(res.data.dislikes);
      setUserDisliked(!userDisliked);
      setUserLiked(false);
    } catch (err) {
      console.error("Error disliking post:", err.response?.data || err.message);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    try {
      await api.delete(`/api/posts/${post._id}`);
      setIsDeleted(true);
      if (onDelete) onDelete(post._id);
    } catch (err) {
      console.error("Error deleting post:", err.response?.data || err.message);
    }
  };

  if (isDeleted) return null;

  const handleClickImage = () => {
    const imageFiles = post.files
      .map((file, index) => ({ file, type: post.fileTypes[index] }))
      .filter(({ type }) => type === "image");
    if (imageFiles.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % imageFiles.length);
    }
  };

  const imageFiles = post.files
    .map((file, index) => ({ file, type: post.fileTypes[index] }))
    .filter(({ type }) => type === "image");

  const nonImageFiles = post.files
    .map((file, index) => ({ file, type: post.fileTypes[index] }))
    .filter(({ type }) => type !== "image");

  return (
    <div className={styles.post}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          {post.group && (
            <Link href={`https://${groupName}.osphere.io/group`} className={styles.groupLink}>
              <strong>{groupName}.</strong>
            </Link>
          )}
          <>🌐</>
          <Link href={`https://osphere.io/profile?username=${post.user.username}`} className={styles.authorLink}>
            <strong>{post.user.username}</strong>
          </Link>
        </div>
        {isOwner && (
          <button className={styles.deleteButton} onClick={handleDelete}>
            delete
          </button>
        )}
      </div>

      <div className={styles.postInfo}>
        <h2 className={styles.postTitle}>
          <Link href={`https://osphere.io/p?id=${post._id}`} className={styles.postLink}>
            {post.title}
          </Link>
        </h2>
        <button onClick={() => setShowShareOverlay(true)} className={styles.shareButton}>
          share
        </button>
        {showShareOverlay && (
          <div className={styles.overlay}>
            <div className={styles.overlayContent}>
              <h3>share post</h3>
              <button onClick={handleCopyLink} className={styles.shareOption}>copy link</button>
              <select value={selectedChat} onChange={(e) => setSelectedChat(e.target.value)} className={styles.shareDropdown}>
                <option value="">send to recent chat</option>
                {recentChats.map((chat) => (
                  <option key={chat._id} value={chat._id}>{chat.username}</option>
                ))}
              </select>
              <button onClick={handleSendMessage} className={styles.shareOption}>Send</button>
              <button onClick={() => setShowShareOverlay(false)} className={styles.overlayCloseButton}>
                close
              </button>
            </div>
          </div>
        )}
      </div>

      {post.text && <p className={styles.postText}>{formatText(post.text)}</p>}

      {imageFiles.length > 0 && (
        imageFiles.length === 1 ? (
          <img
            src={`https://api.osphere.io${imageFiles[0].file}`}
            alt="Post Image"
            className={styles.postImage}
          />
        ) : (
          <div onClick={handleClickImage} style={{ cursor: "pointer", position: "relative" }}>
            <img
              src={`https://api.osphere.io${imageFiles[currentImageIndex].file}`}
              alt={`Post Image ${currentImageIndex + 1}`}
              className={styles.postImage}
            />
            <div style={{ position: "absolute", bottom: 8, right: 12, background: "rgba(0,0,0,0.5)", color: "white", padding: "2px 6px", borderRadius: "4px", fontSize: "12px" }}>
              {currentImageIndex + 1}/{imageFiles.length}
            </div>
          </div>
        )
      )}

      {nonImageFiles.map(({ file, type }, index) => {
        if (type === "video") {
          return (
            <video key={index} controls className={styles.postVideo}>
              <source src={`https://api.osphere.io${file}`} type="video/mp4" />
              your browser does not support the video tag.
            </video>
          );
        }
        return null;
      })}

      {/* Multiple audio files */}
      {nonImageFiles
        .filter(({ type }) => type === "audio")
        .map(({ file }, index, all) => (
          <div key={index} style={{ marginTop: "10px" }}>
            <AudioPlayer
              src={`https://api.osphere.io${file}`}
              showSkipControls={false}
              showJumpControls={false}
              layout="horizontal"
              style={{ borderRadius: "8px" }}
            />
          </div>
      ))}

      <div className={styles.postFooter}>
        <div className={styles.voteContainer}>
          <span className={styles.likeCount}>{likes - dislikes}</span>
          <button className={`${styles.voteButton} ${userLiked ? styles.liked : ""}`} onClick={handleLike}>▲</button>
          <button className={`${styles.voteButton} ${userDisliked ? styles.disliked : ""}`} onClick={handleDislike}>▼</button>
        </div>
        <small>{new Date(post.createdAt).toLocaleString()}</small>
      </div>

      <button className={styles.toggleCommentsButton} onClick={() => setShowComments(!showComments)}>
        {showComments ? "hide comments" : "show comments"}
      </button>

      {showComments && <Comments postId={post._id} postAuthorId={post.user._id} />}
    </div>
  );
};

export default Post;
