// client/lib/socket.js
import { io } from "socket.io-client";

let socket;

export const getSocket = (userId) => {
  if (!socket && userId) {
    socket = io("https://api.osphere.io", {
      withCredentials: true,
    });

    socket.on("connect", () => {
    //  console.log("✅ Shared socket connected:", socket.id);
      socket.emit("register", userId);
    });

    socket.on("disconnect", () => {
      //console.log("❌ Shared socket disconnected");
    });
  }

  return socket;
};
