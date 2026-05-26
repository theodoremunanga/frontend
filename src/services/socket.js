import { io } from "socket.io-client";

// ======================================================
// BASE URL
// ======================================================

const API =
  (
    import.meta.env.VITE_API_URL ||
    "https://api.6betball.com/api"
  ).replace(/\/+$/, "");

// retire /api pour socket
const SOCKET_URL =
  API.replace(/\/api$/, "");

// ======================================================
// SOCKET INSTANCE
// ======================================================

let socket = null;

// ======================================================
// CONNECT
// ======================================================

export const connectSocket = (
  token
) => {
  if (!token) {
    console.warn(
      "⚠️ Socket token manquant"
    );

    return null;
  }

  // ======================================================
  // EXISTING CONNECTION
  // ======================================================

  if (socket?.connected) {
    return socket;
  }

  // ======================================================
  // CREATE SOCKET
  // ======================================================

  socket = io(SOCKET_URL, {
    auth: {
      token,
    },

    transports: [
      "websocket",
      "polling",
    ],

    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1500,
    reconnectionDelayMax: 10000,

    timeout: 20000,

    autoConnect: true,
  });

  // ======================================================
  // EVENTS
  // ======================================================

  socket.on("connect", () => {
    console.log(
      "✅ Socket connecté:",
      socket.id
    );
  });

  socket.on(
    "disconnect",
    (reason) => {
      console.warn(
        "❌ Socket déconnecté:",
        reason
      );
    }
  );

  socket.on(
    "connect_error",
    (err) => {
      console.error(
        "❌ Socket erreur connexion:",
        err?.message
      );
    }
  );

  socket.on(
    "reconnect_attempt",
    (attempt) => {
      console.log(
        `🔄 Reconnexion socket (${attempt})`
      );
    }
  );

  socket.on(
    "reconnect",
    () => {
      console.log(
        "✅ Socket reconnecté"
      );
    }
  );

  return socket;
};

// ======================================================
// GET SOCKET
// ======================================================

export const getSocket =
  () => socket;

// ======================================================
// DISCONNECT
// ======================================================

export const disconnectSocket =
  () => {
    if (!socket) return;

    console.log(
      "🔌 Fermeture socket"
    );

    socket.removeAllListeners();

    socket.disconnect();

    socket = null;
  };

// ======================================================
// SAFE EMIT
// ======================================================

export const emitSocket = (
  event,
  payload = {}
) => {
  if (!socket?.connected) {
    console.warn(
      `⚠️ Socket non connecté (${event})`
    );

    return false;
  }

  socket.emit(
    event,
    payload
  );

  return true;
};