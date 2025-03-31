import { useRef, useEffect, useState } from "react";
import api from "../utils/api";
import Navbar from "../components/Navbar";
import styles from "../styles/Messages.module.css";
import Link from "next/link";
import { getSocket } from "../lib/socket";

const Messages = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [users, setUsers] = useState([]);
  const [recentChats, setRecentChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [message, setMessage] = useState("");
  const chatWindowRef = useRef(null);
  const [loggedInUserId, setLoggedInUserId] = useState(null);

  const scrollToBottom = () => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get("/api/auth/me", { withCredentials: true });
        setLoggedInUserId(res.data._id);
      } catch (err) {
        console.error("Failed to fetch user:", err.response?.data || err.message);
      }
    };
    fetchUser();
    fetchUsers();
    fetchRecentChats();
  }, []);

  useEffect(() => {
    if (!loggedInUserId) return;

    const socket = getSocket(loggedInUserId);

    const handleIncoming = (incomingMsg) => {
      if (
        selectedUser &&
        (incomingMsg.senderId === selectedUser._id || incomingMsg.recipientId === selectedUser._id)
      ) {
        setMessages((prev) => [
          ...prev,
          {
            _id: Date.now().toString(),
            sender: incomingMsg.senderId,
            recipient: incomingMsg.recipientId,
            content: incomingMsg.content,
          },
        ]);
      } else {
        fetchRecentChats();
      }
    };

    socket.on("new_message", handleIncoming);
    return () => {
      socket.off("new_message", handleIncoming);
    };
  }, [loggedInUserId, selectedUser]);

  useEffect(() => {
    if (selectedUser) {
      fetchMessages(selectedUser);
    }
  }, [selectedUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchUsers = async () => {
    try {
      const res = await api.get("/api/messages/users", { withCredentials: true });
      setUsers(res.data);
    } catch (err) {
      console.error("Error fetching users:", err.response?.data || err.message);
    }
  };

  const fetchRecentChats = async () => {
    try {
      const res = await api.get("/api/messages/recent", { withCredentials: true });
      setRecentChats(res.data);
    } catch (err) {
      console.error("Error fetching recent chats:", err.response?.data || err.message);
    }
  };

  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const res = await api.get(`/api/search?q=${query}`);
      setSearchResults(res.data.users || []);
    } catch (err) {
      console.error("Error searching users:", err.response?.data || err.message);
    }
  };

  const fetchMessages = async (user) => {
    try {
      const res = await api.get(`/api/messages/${user._id}`);
      setMessages(res.data);
      setSelectedUser(user);
    } catch (err) {
      console.error("Error fetching messages:", err.response?.data || err.message);
    }
  };

  const sendMessage = async () => {
    if (!message.trim()) return;

    try {
      const res = await api.post("/api/messages", {
        recipient: selectedUser._id,
        content: message,
      });

      setMessages((prev) => [...prev, res.data]);
      setMessage("");
      fetchRecentChats();
    } catch (err) {
      console.error("Error sending message:", err.response?.data || err.message);
    }
  };

  const formatMessageContent = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.split(urlRegex).map((part, index) =>
      urlRegex.test(part) ? (
        <a key={index} href={part} target="_blank" rel="noopener noreferrer" className={styles.messageLink}>
          {part}
        </a>
      ) : (
        part
      )
    );
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div>
      <Navbar />
      <div className={styles.container}>
        <div className={styles.sidebar}>
          <h3>search users</h3>
          <input
            type="text"
            placeholder="Search for users..."
            value={searchQuery}
            onChange={handleSearch}
            className={styles.searchInput}
          />
          <div className={styles.searchResults}>
            {searchResults.map((user) => (
              <button key={user._id} onClick={() => fetchMessages(user)}>
                {user.username}
              </button>
            ))}
          </div>

          <h3>recent chats</h3>
          {recentChats.map((chat) => (
            <button key={chat._id} onClick={() => fetchMessages(chat)}>
              {chat.username}
            </button>
          ))}
        </div>

        <div className={styles.chatContainer}>
          {selectedUser ? (
            <>
              <h3>
                chat with {" "}
                <Link href={`/profile?username=${selectedUser.username}`} className={styles.profileLink}>
                  {selectedUser.username}
                </Link>
              </h3>
              <div className={styles.chatBox} ref={chatWindowRef}>
                {messages.map((msg) => (
                  <div
                    key={msg._id}
                    className={msg.sender === loggedInUserId ? styles.sent : styles.received}
                  >
                    {formatMessageContent(msg.content)}
                  </div>
                ))}
              </div>
              <div className={styles.inputContainer}>
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                />
                <button onClick={sendMessage}>send</button>
              </div>
            </>
          ) : (
            <p>select a user to start chatting.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;
