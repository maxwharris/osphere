import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import api from "../utils/api"; 
import Link from "next/link";
import Navbar from "../components/Navbar";
import Comments from "../components/Comments";
import styles from "../styles/Post.module.css";

const PostPage = () => {
    const router = useRouter();
    const { id } = router.query;
    const [post, setPost] = useState(null);
    const [likes, setLikes] = useState(0);
    const [dislikes, setDislikes] = useState(0);
    const [userLiked, setUserLiked] = useState(false);
    const [userDisliked, setUserDisliked] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isPostOwner, setIsPostOwner] = useState(false);
    const [recentChats, setRecentChats] = useState([]);
    const [showShareOverlay, setShowShareOverlay] = useState(false);
    const [selectedChat, setSelectedChat] = useState("");

    useEffect(() => {
        if (id) {
            fetchPost();
            fetchRecentChats();
        }
    }, [id]);



    const fetchPost = async () => {
        try {
            const res = await api.get(`/api/posts/${id}`);
            const userData = await api.get("/api/auth/me");
            const loggedInUser = userData.data;

            if (loggedInUser) {
                setUserLiked(res.data.likes?.includes(loggedInUser.id));
                setUserDisliked(res.data.dislikes?.includes(loggedInUser.id));
                setIsPostOwner(loggedInUser.id === res.data.user._id);
            }

            setPost(res.data);
            setLikes(res.data.likes.length);
            setDislikes(res.data.dislikes.length);
            setLoading(false);
        } catch (err) {
            setError("Post not found or an error occurred.");
            setLoading(false);
        }
    };

    const fetchRecentChats = async () => {
        try {
            const res = await api.get("/api/messages/recent");
            setRecentChats(res.data);
        } catch (err) {
            console.error("Error fetching recent chats:", err.response?.data || err.message);
        }
    };

    const handleCopyLink = () => {
        const postUrl = `https://osphere.io/p?id=${id}`;
        navigator.clipboard.writeText(postUrl);
        alert("Post link copied to clipboard!");
    };

    const handleSendMessage = async () => {
        if (!selectedChat) return alert("Select a user to send the post to.");

        try {
            await api.post("/api/messages", {
                recipient: selectedChat,
                content: `Check out this post: https://osphere.io/p?id=${id}`,
            });

            alert("Post sent successfully!");
            setShowShareOverlay(false);
        } catch (err) {
            console.error("Error sending post:", err.response?.data || err.message);
            alert("Failed to send the post.");
        }
    };

    const handleDeletePost = async () => {
        if (!confirm("Are you sure you want to delete this post?")) return;

        try {
            await api.delete(`/api/posts/${id}`);
            router.push("/"); // ✅ Redirect user to home after deletion
        } catch (err) {
            console.error("Error deleting post:", err.response?.data || err.message);
            alert("Failed to delete the post.");
        }
    };

    if (loading) return <p>Loading post...</p>;
    if (error) return <p>{error}</p>;

    return (
        <div>
            <Navbar />
            <div>
                 <div className={`${styles.post} ${styles.postContainer}`}>


                    <div className={styles.header}>
                        {/* ✅ Author Name (Far Left) */}
                        <Link href={`/profile?username=${post.user.username}`} className={styles.authorLink}>
                            <strong>{post.user.username}</strong>
                        </Link>

                        {/* ✅ Delete Button (Far Right) */}
                        {isPostOwner && (
                            <button className={styles.deleteButton} onClick={handleDeletePost}>
                                Delete
                            </button>
                        )}
                    </div>

                    <div className={styles.postInfo}>

                        <h2 className={styles.postTitle}>{post.title}</h2>
                        {/* ✅ Share Button */}
                        <button onClick={() => setShowShareOverlay(true)} className={styles.shareButton}>
                            Share
                        </button>

                        {/* ✅ Updated Share Overlay */}
                        {showShareOverlay && (
                            <div className={styles.overlay}>
                                <div className={styles.overlayContent}>
                                    <h3>Share Post</h3>

                                    {/* ✅ Copy Link Button */}
                                    <button onClick={handleCopyLink} className={styles.shareOption}>Copy Link</button>

                                    {/* ✅ Dropdown Selection for Sending Post */}
                                    <select value={selectedChat} onChange={(e) => setSelectedChat(e.target.value)} className={styles.shareDropdown}>
                                        <option value="">Send to Recent Chat</option>
                                        {recentChats.map((chat) => (
                                            <option key={chat._id} value={chat._id}>
                                                {chat.username}
                                            </option>
                                        ))}
                                    </select>

                                    {/* ✅ Send Button */}
                                    <button onClick={handleSendMessage} className={styles.shareOption}>Send</button>

                                    {/* ✅ Close Button (properly spaced) */}
                                    <button onClick={() => setShowShareOverlay(false)} className={styles.overlayCloseButton}>
                                        Close
                                    </button>
                                </div>
                            </div>
                        )}

                    </div>
                    <p className={styles.postText}>{post.text}</p>
                    {/* ✅ Check if the post contains a file and display accordingly */}
                    {post.file && (
                        post.fileType === "image" ? (
                            <img
                                src={`https://api.osphere.io${post.file}`}
                                alt="Post Image"
                                className={styles.postImage}
                            />
                        ) : post.fileType === "video" ? (
                            <video controls className={styles.postVideo}>
                                <source src={`https://api.osphere.io${post.file}`} type="video/mp4" />
                                Your browser does not support the video tag.
                            </video>
                        ) : null
                    )}

                    {/* ✅ Like & Dislike Section */}
                    <div className={styles.voteContainer}>
                        <span className={styles.likeCount}>{likes - dislikes}</span>
                        <button className={`${styles.voteButton} ${userLiked ? styles.liked : ""}`} onClick={() => handleVote("like")}>
                            ▲
                        </button>
                        <button className={`${styles.voteButton} ${userDisliked ? styles.disliked : ""}`} onClick={() => handleVote("dislike")}>
                            ▼
                        </button>
                    </div>

                    {/* ✅ Comment Section */}
                    <Comments postId={id} postAuthorId={post.user._id} />
                </div></div>
        </div>
    );
};

export default PostPage;
