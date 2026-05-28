import { io } from "socket.io-client";

// ======================================================
// ENV
// ======================================================

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  "https://backend-ad3t.onrender.com";

const isDev =
  import.meta.env.DEV;

// ======================================================
// SOCKET INSTANCE
// ======================================================

let socket = null;

// ======================================================
// CONNECT SOCKET
// ======================================================

export const connectSocket = (
  token
) => {
  try {
    if (!token) {
      console.error(
        "❌ Missing socket token"
      );

      return null;
    }

    // avoid duplicate connection
    if (socket?.connected) {
      return socket;
    }

    console.log(
      "🔌 Connecting socket:",
      SOCKET_URL
    );

    socket = io(SOCKET_URL, {
      auth: {
        token,
      },

      withCredentials: true,

      transports: [
        "websocket",
        "polling",
      ],

      reconnection: true,

      reconnectionAttempts: 10,

      reconnectionDelay: 2000,

      timeout: 60000,
    });

    // ==================================================
    // EVENTS
    // ==================================================

    socket.on("connect", () => {
      console.log(
        "✅ SOCKET CONNECTED:",
        socket.id
      );
    });

    socket.on(
      "disconnect",
      (reason) => {
        console.warn(
          "❌ SOCKET DISCONNECTED:",
          reason
        );
      }
    );

    socket.on(
      "connect_error",
      (err) => {
        console.error(
          "❌ SOCKET CONNECT ERROR"
        );

        console.error(err.message);
      }
    );

    socket.on("error", (err) => {
      console.error(
        "❌ SOCKET ERROR"
      );

      console.error(err);
    });

    // DEV ONLY
    if (isDev) {
      socket.io.on(
        "reconnect_attempt",
        (attempt) => {
          console.log(
            `🔄 SOCKET RECONNECT ATTEMPT ${attempt}`
          );
        }
      );
    }

    return socket;
  } catch (err) {
    console.error(
      "❌ SOCKET INIT ERROR"
    );

    console.error(err);

    return null;
  }
};

// ======================================================
// GET SOCKET
// ======================================================

export const getSocket = () =>
  socket;

// ======================================================
// DISCONNECT SOCKET
// ======================================================

export const disconnectSocket =
  () => {
    if (socket) {
      console.log(
        "🔌 SOCKET DISCONNECTED"
      );

      socket.disconnect();

      socket = null;
    }
  };