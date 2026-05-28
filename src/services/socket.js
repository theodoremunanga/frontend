import { io } from "socket.io-client";

// ======================================================
// ENV
// ======================================================

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  "https://backend-ad3t.onrender.com";

// safe dev check
const isDev =
  typeof import.meta !== "undefined" &&
  import.meta.env &&
  import.meta.env.DEV;

// ======================================================
// SOCKET INSTANCE
// ======================================================

let socket = null;

// ======================================================
// CONNECT SOCKET
// ======================================================

export const connectSocket = (token) => {
  try {
    // ==========================================
    // TOKEN CHECK
    // ==========================================

    if (!token) {
      console.error("❌ Missing socket token");
      return null;
    }

    // ==========================================
    // EXISTING SOCKET
    // ==========================================

    if (socket) {
      if (socket.connected) {
        return socket;
      }

      socket.disconnect();
      socket = null;
    }

    console.log(
      "🔌 Connecting socket:",
      SOCKET_URL
    );

    // ==========================================
    // SOCKET INIT
    // ==========================================

    socket = io(SOCKET_URL, {
      auth: {
        token,
      },

      withCredentials: true,

      transports: ["websocket"],

      reconnection: true,

      reconnectionAttempts: 5,

      reconnectionDelay: 2000,

      timeout: 20000,

      autoConnect: true,
    });

    // ==========================================
    // EVENTS
    // ==========================================

    socket.on("connect", () => {
      console.log(
        "✅ SOCKET CONNECTED:",
        socket.id
      );
    });

    socket.on("disconnect", (reason) => {
      console.warn(
        "❌ SOCKET DISCONNECTED:",
        reason
      );
    });

    socket.on("connect_error", (err) => {
      console.error(
        "❌ SOCKET CONNECT ERROR:"
      );

      console.error(
        err?.message || err
      );
    });

    socket.on("error", (err) => {
      console.error("❌ SOCKET ERROR:");

      console.error(err);
    });

    // ==========================================
    // DEV ONLY
    // ==========================================

    if (isDev && socket.io) {
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
      "❌ SOCKET INIT ERROR:"
    );

    console.error(err);

    return null;
  }
};

// ======================================================
// GET SOCKET
// ======================================================

export const getSocket = () => socket;

// ======================================================
// DISCONNECT SOCKET
// ======================================================

export const disconnectSocket = () => {
  try {
    if (socket) {
      console.log(
        "🔌 SOCKET DISCONNECTED"
      );

      socket.removeAllListeners();

      socket.disconnect();

      socket = null;
    }
  } catch (err) {
    console.error(
      "❌ SOCKET DISCONNECT ERROR:"
    );

    console.error(err);
  }
};