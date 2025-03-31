// client/hooks/useSocket.js
import { useEffect } from "react";
import { getSocket } from "../lib/socket";

/**
 * Hook to subscribe to socket events without creating duplicate connections.
 *
 * @param {string} userId - Current user ID
 * @param {function} onMessage - Handler for "new_message"
 * @param {function} onNotification - Handler for "new_notification"
 */
const useSocket = (userId, onMessage, onNotification) => {
  useEffect(() => {
    if (!userId) return;

    const socket = getSocket(userId);

    if (onMessage) {
      socket.on("new_message", onMessage);
    }

    if (onNotification) {
      socket.on("new_notification", onNotification);
    }

    return () => {
      if (onMessage) socket.off("new_message", onMessage);
      if (onNotification) socket.off("new_notification", onNotification);
    };
  }, [userId, onMessage, onNotification]);
};

export default useSocket;
