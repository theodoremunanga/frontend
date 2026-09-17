// ============================================================
// CHAT SOCKET
// ============================================================
//
// RESPONSABILITÉ UNIQUE :
// - connexion Socket.IO de la messagerie
// - authentification JWT
// - présence
// - conversations
// - messages temps réel
// - accusés de lecture
//
// AUCUN JSX
// AUCUNE logique d'interface
//
// CONTRAT BACKEND :
// - users.id                 -> INTEGER
// - conversations.id         -> INTEGER
// - messages.id              -> INTEGER
// - messages.user_id         -> INTEGER
// - messages.conversation_id -> INTEGER
//
// ============================================================

import { io } from "socket.io-client";

// ============================================================
// CONFIGURATION
// ============================================================

const API_URL = import.meta.env.VITE_API_URL || "";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  API_URL.replace(/\/api\/?$/, "");

// ============================================================
// ÉTAT
// ============================================================

let socket = null;

// ============================================================
// HELPERS
// ============================================================

function normalizeId(value) {
  const id = Number(value);

  return Number.isInteger(id) && id > 0
    ? id
    : null;
}

function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    null
  );
}

// ============================================================
// CONNEXION
// ============================================================

export function connectChatSocket() {
  const token = getToken();

  if (!token) {
    console.warn(
      "💬 CHAT SOCKET: aucun token."
    );

    return null;
  }

  // ----------------------------------------------------------
  // Réutiliser la connexion existante
  // ----------------------------------------------------------

  if (socket?.connected) {
    return socket;
  }

  // ----------------------------------------------------------
  // Si une ancienne instance existe mais n'est plus connectée,
  // on la ferme proprement avant d'en créer une nouvelle.
  // ----------------------------------------------------------

  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  // ----------------------------------------------------------
  // Créer Socket.IO
  //
  // CONTRAT BACKEND :
  //
  // socket.handshake.auth.token
  // ----------------------------------------------------------

  socket = io(SOCKET_URL, {
    auth: {
      token,
    },

    transports: ["websocket"],

    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  // ==========================================================
  // CONNEXION
  // ==========================================================

  socket.on("connect", () => {
    console.log(
      "💬 CHAT SOCKET CONNECTED:",
      socket.id
    );
  });

  // ==========================================================
  // DÉCONNEXION
  // ==========================================================

  socket.on("disconnect", (reason) => {
    console.log(
      "💬 CHAT SOCKET DISCONNECTED:",
      reason
    );
  });

  // ==========================================================
  // ERREUR DE CONNEXION / AUTHENTIFICATION
  // ==========================================================

  socket.on("connect_error", (error) => {
    console.error(
      "💬 CHAT SOCKET ERROR:",
      error?.message || error
    );
  });

  return socket;
}

// ============================================================
// GET SOCKET
// ============================================================

export function getChatSocket() {
  return socket;
}

// ============================================================
// DÉCONNEXION
// ============================================================

export function disconnectChatSocket() {
  if (!socket) {
    return;
  }

  socket.removeAllListeners();
  socket.disconnect();

  socket = null;
}

// ============================================================
// CONVERSATION : JOIN
// ============================================================
//
// BACKEND :
// socket.on("conversation:join", ({ conversationId }) => ...)
//
// ============================================================

export function joinConversation(conversationId) {
  const id = normalizeId(conversationId);

  if (!socket || !id) {
    return false;
  }

  socket.emit("conversation:join", {
    conversationId: id,
  });

  return true;
}

// ============================================================
// CONVERSATION : LEAVE
// ============================================================
//
// BACKEND :
// socket.on("conversation:leave", ({ conversationId }) => ...)
//
// ============================================================

export function leaveConversation(conversationId) {
  const id = normalizeId(conversationId);

  if (!socket || !id) {
    return false;
  }

  socket.emit("conversation:leave", {
    conversationId: id,
  });

  return true;
}

// ============================================================
// MESSAGE : SEND
// ============================================================
//
// BACKEND :
// socket.on("message:send", ({ conversationId, content }) => ...)
//
// Le backend limite le message à 5000 caractères.
// ============================================================

export function sendMessage(conversationId, content) {
  const id = normalizeId(conversationId);

  if (!socket) {
    console.warn(
      "💬 CHAT SOCKET: socket non initialisé."
    );

    return false;
  }

  if (!id) {
    console.warn(
      "💬 CHAT SOCKET: conversationId invalide."
    );

    return false;
  }

  const cleanContent =
    typeof content === "string"
      ? content.trim()
      : "";

  if (!cleanContent) {
    return false;
  }

  if (cleanContent.length > 5000) {
    console.warn(
      "💬 CHAT SOCKET: message trop long."
    );

    return false;
  }

  socket.emit("message:send", {
    conversationId: id,
    content: cleanContent,
  });

  return true;
}

// ============================================================
// MESSAGES : READ
// ============================================================
//
// BACKEND :
// socket.on("messages:read", ({ conversationId }) => ...)
//
// ============================================================

export function markMessagesAsRead(conversationId) {
  const id = normalizeId(conversationId);

  if (!socket || !id) {
    return false;
  }

  socket.emit("messages:read", {
    conversationId: id,
  });

  return true;
}

// ============================================================
// PRESENCE : CHECK
// ============================================================
//
// BACKEND :
// socket.on("presence:check", ({ userId }) => ...)
//
// ============================================================

export function checkUserPresence(userId) {
  const id = normalizeId(userId);

  if (!socket || !id) {
    return false;
  }

  socket.emit("presence:check", {
    userId: id,
  });

  return true;
}

// ============================================================
// LISTENERS GÉNÉRIQUES
// ============================================================

export function onChatEvent(event, callback) {
  if (
    !socket ||
    typeof event !== "string" ||
    typeof callback !== "function"
  ) {
    return () => {};
  }

  socket.on(event, callback);

  // ----------------------------------------------------------
  // Nettoyage React
  // ----------------------------------------------------------

  return () => {
    socket?.off(event, callback);
  };
}

// ============================================================
// LISTENERS : CONVERSATION
// ============================================================

export function onConversationJoined(callback) {
  return onChatEvent(
    "conversation:joined",
    callback
  );
}

export function onConversationError(callback) {
  return onChatEvent(
    "conversation:error",
    callback
  );
}

// ============================================================
// LISTENERS : MESSAGES
// ============================================================

export function onNewMessage(callback) {
  return onChatEvent(
    "message:new",
    callback
  );
}

export function onMessageSent(callback) {
  return onChatEvent(
    "message:sent",
    callback
  );
}

export function onMessageError(callback) {
  return onChatEvent(
    "message:error",
    callback
  );
}

// ============================================================
// NOTIFICATION MESSAGE DESTINATAIRE
// ============================================================

export function onConversationMessage(callback) {
  return onChatEvent(
    "conversation:message",
    callback
  );
}

// ============================================================
// LISTENERS : READ
// ============================================================

export function onMessagesRead(callback) {
  return onChatEvent(
    "messages:read",
    callback
  );
}

// ============================================================
// LISTENERS : PRÉSENCE
// ============================================================

export function onUserOnline(callback) {
  return onChatEvent(
    "user:online",
    callback
  );
}

export function onUserOffline(callback) {
  return onChatEvent(
    "user:offline",
    callback
  );
}

export function onPresenceReady(callback) {
  return onChatEvent(
    "presence:ready",
    callback
  );
}

export function onPresenceResult(callback) {
  return onChatEvent(
    "presence:result",
    callback
  );
}

// ============================================================
// EXPORT DEFAULT
// ============================================================

export default {
  connectChatSocket,
  getChatSocket,
  disconnectChatSocket,

  joinConversation,
  leaveConversation,

  sendMessage,

  markMessagesAsRead,

  checkUserPresence,

  onChatEvent,

  onConversationJoined,
  onConversationError,

  onNewMessage,
  onMessageSent,
  onMessageError,
  onConversationMessage,

  onMessagesRead,

  onUserOnline,
  onUserOffline,
  onPresenceReady,
  onPresenceResult,
};
