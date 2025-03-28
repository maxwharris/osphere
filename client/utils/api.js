import axios from "axios";

// ✅ Create an Axios instance with cookie-based auth
const api = axios.create({
  baseURL: "https://api.osphere.io", // or "/api" for local testing
  withCredentials: true,             // ✅ Sends cookies with every request
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
