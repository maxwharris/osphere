import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "../styles/Comments.module.css";
import api from "../utils/api";

const Comments = ({ postId, postAuthorId }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState("");

  useEffect(() => {
    fetchComments();
  }, []);

  const fetchComments = async () => {
    try {
      const res = await api.get(`/api/comments/${postId}`);
      const userData = await api.get("/api/auth/me");
      const loggedInUser = userData.data;

      const updatedComments = res.data.map((comment) => {
        const userLiked = loggedInUser ? comment.likes.includes(loggedInUser._id) : false;
        const userDisliked = loggedInUser ? comment.dislikes.includes(loggedInUser._id) : false;

        return {
          ...comment,
          userLiked,
          userDisliked,
          replies: comment.replies.map((reply) => ({
            ...reply,
            userLiked: loggedInUser ? reply.likes.includes(loggedInUser._id) : false,
            userDisliked: loggedInUser ? reply.dislikes.includes(loggedInUser._id) : false,
          })),
        };
      });

      // Sort by score then date
      updatedComments.sort((a, b) => {
        const aScore = a.likes.length - a.dislikes.length;
        const bScore = b.likes.length - b.dislikes.length;
        if (bScore === aScore) {
          return new Date(b.createdAt) - new Date(a.createdAt);
        }
        return bScore - aScore;
      });

      setComments(updatedComments);
    } catch (err) {
      console.error("Error fetching comments:", err.response?.data || err.message);
    }
  };

  const handleCommentSubmit = async (e, parentId = null) => {
    e.preventDefault();
    const userData = await api.get("/api/auth/me");
    const authUser = userData.data;

    if (!authUser) return alert("You must be logged in to comment.");

    const content = parentId ? replyText : newComment;

    try {
      await api.post(`/api/comments/${postId}`, { content, parentId });
      await fetchComments();
      setNewComment("");
      setReplyText("");
      setReplyingTo(null);
    } catch (err) {
      console.error("Error posting comment:", err.response?.data || err.message);
    }
  };

  const handleDeleteComment = async (commentId) => {
    const userData = await api.get("/api/auth/me");
    const authUser = userData.data;
    if (!authUser) return alert("You must be logged in to delete comments.");

    try {
      await api.delete(`/api/comments/${commentId}`);
      setComments(comments.filter((comment) => comment._id !== commentId));
    } catch (err) {
      console.error("Error deleting comment:", err.response?.data || err.message);
    }
  };

  const handleVote = async (commentId, voteType) => {
    const userData = await api.get("/api/auth/me");
    const authUser = userData.data;
    if (!authUser) return alert("You must be logged in to vote.");

    try {
      const res = await api.post(`/api/comments/${commentId}/vote`, { voteType });

      setComments((prevComments) =>
        prevComments.map((comment) => ({
          ...comment,
          likes: comment._id === commentId ? Array(res.data.likes).fill("") : comment.likes,
          dislikes: comment._id === commentId ? Array(res.data.dislikes).fill("") : comment.dislikes,
          userLiked: comment._id === commentId ? res.data.userLiked : comment.userLiked,
          userDisliked: comment._id === commentId ? res.data.userDisliked : comment.userDisliked,
          replies: comment.replies.map((reply) =>
            reply._id === commentId
              ? {
                  ...reply,
                  likes: Array(res.data.likes).fill(""),
                  dislikes: Array(res.data.dislikes).fill(""),
                  userLiked: res.data.userLiked,
                  userDisliked: res.data.userDisliked,
                }
              : reply
          ),
        }))
      );
    } catch (err) {
      console.error("Error voting:", err.response?.data || err.message);
    }
  };

  const renderCommentText = (text) => {
    if (!text) return null;
  
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const markdownLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
    const doubleBracketLinkRegex = /\[\[([^\]]+)\]\]/g;
    const tagRegex = /(^|\s)(\.[a-zA-Z0-9_]+)/g;
  
    return text.split("\n").map((line, index) => {
      let parts = [];
      let lastIndex = 0;
  
      // Handle markdown links first
      line.replace(markdownLinkRegex, (match, linkText, url, offset) => {
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
            {linkText}
          </a>
        );
        lastIndex = offset + match.length;
      });
  
      let leftover = line.slice(lastIndex);
      lastIndex = 0;
  
      // Handle double brackets
      leftover.replace(doubleBracketLinkRegex, (match, inner, offset) => {
        if (lastIndex < offset) {
          parts.push(leftover.slice(lastIndex, offset));
        }
        parts.push(
          <a
            key={`${index}-bb-${offset}`}
            href={`https://${inner}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#1E90FF", textDecoration: "underline" }}
          >
            {inner}
          </a>
        );
        lastIndex = offset + match.length;
      });
  
      leftover = leftover.slice(lastIndex);
  
      // Final pass: tags + URLs
      let lastPos = 0;
      leftover.replace(tagRegex, (match, space, tag, offset) => {
        if (lastPos < offset) {
          const slice = leftover.slice(lastPos, offset);
          slice.split(urlRegex).forEach((token, i) => {
            if (urlRegex.test(token)) {
              parts.push(
                <a
                  key={`${index}-url-${offset}-${i}`}
                  href={token}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#1E90FF", textDecoration: "underline" }}
                >
                  {token}
                </a>
              );
            } else {
              parts.push(token);
            }
          });
        }
  
        if (space) parts.push(space);
        parts.push(
          <Link key={`${index}-tag-${offset}`} href={`/profile?username=${tag}`}>
            <span className={styles.tag}>{tag}</span>
          </Link>
        );
  
        lastPos = offset + match.length;
      });
  
      const final = leftover.slice(lastPos);
      final.split(urlRegex).forEach((token, i) => {
        if (urlRegex.test(token)) {
          parts.push(
            <a
              key={`${index}-url-final-${i}`}
              href={token}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#1E90FF", textDecoration: "underline" }}
            >
              {token}
            </a>
          );
        } else {
          parts.push(token);
        }
      });
  
      return (
        <span key={index}>
          {parts}
          <br />
        </span>
      );
    });
  };  

  return (
    <div className={styles.commentsSection}>
      <form onSubmit={(e) => handleCommentSubmit(e)} className={styles.commentForm}>
        <input
          type="text"
          placeholder="write a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          required
        />
        <button type="submit">reply</button>
      </form>

      {comments
        .filter((c) => !c.parent)
        .map((comment) => {
          const loggedInUser = JSON.parse(localStorage.getItem("user"));
          const canDelete = loggedInUser && (comment.user._id === loggedInUser.id || postAuthorId === loggedInUser.id);

          return (
            <div key={comment._id} className={styles.comment}>
              <div className={styles.commentHeader}>
                <Link href={`/profile?username=${comment.user.username}`} className={styles.commentAuthor}>
                  <strong>{comment.user.username}</strong>
                </Link>
                <small>{new Date(comment.createdAt).toLocaleString()}</small>
              </div>

              <p>{renderCommentText(comment.text)}</p>

              <div className={styles.commentActions}>
                <div className={styles.voteContainer}>
                  <span>{comment.likes.length - comment.dislikes.length}</span>
                  <button
                    className={`${styles.voteButton} ${comment.userLiked ? styles.liked : ""}`}
                    onClick={() => handleVote(comment._id, "like")}
                  >
                    ▲
                  </button>

                  <button
                    className={`${styles.voteButton} ${comment.userDisliked ? styles.disliked : ""}`}
                    onClick={() => handleVote(comment._id, "dislike")}
                  >
                    ▼
                  </button>
                </div>

                <div className={styles.commentButtons}>
                  <button onClick={() => setReplyingTo(comment._id)} className={styles.replyButton}>
                    reply
                  </button>

                  {canDelete && (
                    <button className={styles.deleteCommentButton} onClick={() => handleDeleteComment(comment._id)}>
                      delete
                    </button>
                  )}
                </div>
              </div>

              {replyingTo === comment._id && (
                <form onSubmit={(e) => handleCommentSubmit(e, comment._id)} className={styles.replyForm}>
                  <input
                    type="text"
                    placeholder="write a reply..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    required
                  />
                  <button type="submit">reply</button>
                </form>
              )}

              {comments
                .filter((c) => c.parent === comment._id)
                .map((reply) => {
                  const canDeleteReply =
                    loggedInUser && (reply.user._id === loggedInUser.id || postAuthorId === loggedInUser.id);

                  return (
                    <div key={reply._id} className={styles.reply}>
                      <div className={styles.commentHeader}>
                        <Link href={`/profile?username=${reply.user.username}`} className={styles.commentAuthor}>
                          <strong>{reply.user.username}</strong>
                        </Link>
                        <small>{new Date(reply.createdAt).toLocaleString()}</small>
                      </div>

                      <p>{renderCommentText(reply.text)}</p>

                      <div className={styles.commentActions}>
                        <div className={styles.voteContainer}>
                          <span>{reply.likes.length - reply.dislikes.length}</span>
                          <button
                            className={`${styles.voteButton} ${reply.userLiked ? styles.liked : ""}`}
                            onClick={() => handleVote(reply._id, "like", true)}
                          >
                            ▲
                          </button>
                          <button
                            className={`${styles.voteButton} ${reply.userDisliked ? styles.disliked : ""}`}
                            onClick={() => handleVote(reply._id, "dislike", true)}
                          >
                            ▼
                          </button>
                        </div>

                        {canDeleteReply && (
                          <button className={styles.deleteCommentButton} onClick={() => handleDeleteComment(reply._id)}>
                            delete
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          );
        })}
    </div>
  );
};

export default Comments;
