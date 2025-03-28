import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useSwipeable } from "react-swipeable";
import api from "../utils/api";
import Navbar from "../components/Navbar";
import Post from "../components/Post";
import styles from "../styles/PostCreation.module.css";

const CreatePost = () => {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [files, setFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const [group, setGroup] = useState("");
  const [groups, setGroups] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [posts, setPosts] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const router = useRouter();

  useEffect(() => {
    fetchUserPosts();
    fetchUserGroups();
  }, []);

  const fetchUserPosts = async () => {
    try {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      if (storedUser) {
        const res = await api.get(`/api/users/${storedUser.id}/posts`);
        setPosts(res.data);
      }
    } catch (err) {
      console.error("Error fetching user posts:", err.response?.data || err.message);
    }
  };

  const fetchUserGroups = async () => {
    try {
      const res = await api.get("/api/groups/user/groups");
      setGroups(res.data);
    } catch (err) {
      console.error("Error fetching user groups:", err.response?.data || err.message);
    }
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const newFiles = [...files, ...selectedFiles];
    setFiles(newFiles);

    const previews = [...filePreviews];
    selectedFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        previews.push({ url: reader.result, type: file.type });
        if (previews.length === newFiles.length) {
          setFilePreviews(previews);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveFile = (index) => {
    const updatedFiles = [...files];
    const updatedPreviews = [...filePreviews];
    updatedFiles.splice(index, 1);
    updatedPreviews.splice(index, 1);
    setFiles(updatedFiles);
    setFilePreviews(updatedPreviews);
    setCurrentImageIndex(0);
  };

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser) {
      alert("Session expired. Please log in again.");
      router.push("/login");
      return;
    }

    if (!title.trim()) {
      setError("A title is required.");
      return;
    }

    if (!text.trim() && files.length === 0) {
      setError("Please provide either body text or at least one file.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("text", text.trim());
      files.forEach((f) => formData.append("files", f));
      if (group) formData.append("group", group);

      await api.post("/api/posts", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setSuccess("Post created successfully!");
      setTitle("");
      setText("");
      setFiles([]);
      setFilePreviews([]);
      setGroup("");
      setCurrentImageIndex(0);
      fetchUserPosts();
    } catch (err) {
      console.error("Error creating post:", err.response?.data || err.message);
      setError("Failed to create post.");
    }
  };

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => setCurrentImageIndex((prev) => (prev + 1) % filePreviews.length),
    onSwipedRight: () => setCurrentImageIndex((prev) => (prev - 1 + filePreviews.length) % filePreviews.length),
    trackMouse: true,
  });

  return (
    <div>
      <Navbar />
      <div className={styles.container}>
        <div className={styles.createPostBox}>
          <h2>create a post</h2>
          <form onSubmit={handlePostSubmit} className={styles.postForm}>
            <input
              type="text"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`${styles.input} ${styles.narrowInput}`}
            />
            <textarea
              placeholder="Text (Optional)"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className={styles.textarea}
            />
            <input
              type="file"
              accept="image/*,video/*,audio/*"
              multiple
              onChange={handleFileChange}
              className={styles.fileInput}
            />

            {filePreviews.length > 0 && (
              <div className={styles.imagePreviewContainer}>
                <div {...swipeHandlers}>
                  {filePreviews[currentImageIndex].type.startsWith("image") ? (
                    <img
                      src={filePreviews[currentImageIndex].url}
                      alt="Preview"
                      className={styles.filePreview}
                    />
                  ) : filePreviews[currentImageIndex].type.startsWith("video") ? (
                    <video controls className={styles.filePreview}>
                      <source src={filePreviews[currentImageIndex].url} type={filePreviews[currentImageIndex].type} />
                      your browser does not support the video tag.
                    </video>
                  ) : filePreviews[currentImageIndex].type.startsWith("audio") ? (
                    <audio controls>
                      <source src={filePreviews[currentImageIndex].url} type={filePreviews[currentImageIndex].type} />
                      your browser does not support the audio tag.
                    </audio>
                  ) : null}
                </div>
                <div className={styles.thumbnailPreviewContainer}>
                  {filePreviews.map((preview, index) => (
                    <div key={index} style={{ position: "relative" }}>
                      <img
                        src={preview.url}
                        alt={`preview ${index + 1}`}
                        className={styles.thumbnail}
                        onClick={() => setCurrentImageIndex(index)}
                      />
                      <button
                        type="button"
                        className={styles.removeThumbnail}
                        onClick={() => handleRemoveFile(index)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {groups.length > 0 && (
              <select value={group} onChange={(e) => setGroup(e.target.value)} className={`${styles.input} ${styles.narrowDropdown}`}>
                <option value="">post to personal feed</option>
                {groups.map((g) => (
                  <option key={g._id} value={g._id}>{g.name}</option>
                ))}
              </select>
            )}

            <button type="submit" className={styles.postButton}>post</button>
          </form>

          {error && <p className={styles.error}>{error}</p>}
          {success && <p className={styles.success}>{success}</p>}
        </div>

        <div style={{ maxWidth: "600px", margin: "auto", marginTop: "30px" }}>
          <div className={styles.postsContainer}>
            <h3>my posts</h3>
            {posts.length === 0 ? (
              <p className={styles.noPosts}>you haven't posted anything yet.</p>
            ) : (
              posts.map((post) => <Post key={post._id} post={post} />)
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePost;
