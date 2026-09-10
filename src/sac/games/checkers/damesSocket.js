// ============================================================
// src/sac/games/checkers/damesSocket.js
// ============================================================
//
// RESPONSABILITÉ UNIQUE :
// - connexion Socket.IO du jeu de dames
// - authentification par JWT
// - rejoindre un match
// - envoyer les coups
// - chat
// - écoute des événements serveur
//
// IMPORTANT :
// Ce fichier ne contient AUCUN JSX.
// Ce fichier n'est PAS un composant React.
// Toute l'interface est dans Dames.jsx.
//
// ============================================================

import { io } from "socket.io-client";

// ============================================================
// CONFIGURATION
// ============================================================

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_API_SOCKET_URL ||
  "https://backend-ad3t.onrender.com";

// ============================================================
// ÉTAT INTERNE
// ============================================================

let socket = null;
let currentMatchId = null;

// ============================================================
// TOKEN
// ============================================================

function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    ""
  );
}

// ============================================================
// CRÉER / RÉCUPÉRER LE SOCKET
// ============================================================

export function connectDamesSocket() {
  // Déjà connecté
  if (socket?.connected) {
    return socket;
  }

  const token = getToken();

  if (!token) {
    console.error("❌ DAMES SOCKET : token manquant");
    return null;
  }

  // Si un ancien socket existe mais n'est plus connecté,
  // on le ferme proprement avant d'en créer un nouveau.
  if (socket) {
    try {
      socket.removeAllListeners();
      socket.disconnect();
    } catch (error) {
      console.error(
        "❌ ERREUR FERMETURE ANCIEN SOCKET :",
        error
      );
    }

    socket = null;
  }

  socket = io(SOCKET_URL, {
    transports: ["websocket", "polling"],

    withCredentials: true,

    auth: {
      token,
    },

    autoConnect: true,

    reconnection: true,

    reconnectionAttempts: Infinity,

    reconnectionDelay: 1000,

    reconnectionDelayMax: 5000,
  });

  // ==========================================================
  // LOG CONNEXION
  // ==========================================================

  socket.on("connect", () => {
    console.log(
      "♟️ DAMES SOCKET CONNECTÉ :",
      socket.id
    );

    // Si un match était déjà connu, on le rejoint après
    // reconnexion.
    if (currentMatchId) {
      console.log(
        "♟️ REJOIN MATCH APRÈS RECONNEXION :",
        currentMatchId
      );

      socket.emit("joinMatch", {
        matchId: currentMatchId,
      });
    }
  });

  // ==========================================================
  // ERREUR DE CONNEXION
  // ==========================================================

  socket.on("connect_error", (error) => {
    console.error(
      "❌ DAMES SOCKET CONNECT ERROR :",
      error?.message || error
    );
  });

  // ==========================================================
  // DÉCONNEXION
  // ==========================================================

  socket.on("disconnect", (reason) => {
    console.log(
      "❌ DAMES SOCKET DISCONNECT :",
      reason
    );
  });

  return socket;
}

// ============================================================
// GET SOCKET
// ============================================================

export function getDamesSocket() {
  if (!socket) {
    return connectDamesSocket();
  }

  return socket;
}

// ============================================================
// ÉTAT CONNEXION
// ============================================================

export function isDamesSocketConnected() {
  return Boolean(
    socket &&
    socket.connected
  );
}

// ============================================================
// JOIN MATCH
// ============================================================
//
// Correspond exactement au backend :
//
// socket.on("joinMatch", async (payload) => {})
//
// Payload accepté par le backend :
// { matchId }
//
// ============================================================

export function joinDamesMatch(matchId) {
  if (!matchId) {
    console.warn(
      "⚠️ JOIN DAMES : matchId manquant"
    );

    return false;
  }

  const s = getDamesSocket();

  if (!s) {
    console.error(
      "❌ JOIN DAMES : socket indisponible"
    );

    return false;
  }

  currentMatchId = Number(matchId);

  console.log(
    "📤 DAMES JOIN MATCH :",
    currentMatchId
  );

  s.emit("joinMatch", {
    matchId: currentMatchId,
  });

  return true;
}

// ============================================================
// MOVE
// ============================================================
//
// Correspond exactement au backend :
//
// socket.on("move", async ({ matchId, move }) => {})
//
// Le backend accepte :
// {
//   matchId,
//   move
// }
//
// Le move peut notamment contenir :
// {
//   id,
//   from: { r, c },
//   path: [
//     { r, c },
//     ...
//   ]
// }
//
// ============================================================

export function sendDamesMove(
  matchId,
  move
) {
  if (!matchId) {
    console.warn(
      "⚠️ MOVE DAMES : matchId manquant"
    );

    return false;
  }

  if (!move) {
    console.warn(
      "⚠️ MOVE DAMES : move manquant"
    );

    return false;
  }

  const s = getDamesSocket();

  if (!s) {
    console.error(
      "❌ MOVE DAMES : socket indisponible"
    );

    return false;
  }

  console.log(
    "📤 DAMES MOVE :",
    {
      matchId,
      move,
    }
  );

  s.emit("move", {
    matchId: Number(matchId),
    move,
  });

  return true;
}

// ============================================================
// CHAT MESSAGE
// ============================================================
//
// Correspond exactement au backend :
//
// socket.on(
//   "chat:message",
//   async ({ matchId, text }) => {}
// )
//
// ============================================================

export function sendDamesChat(
  matchId,
  text
) {
  if (!matchId) {
    return false;
  }

  if (
    typeof text !== "string" ||
    !text.trim()
  ) {
    return false;
  }

  const s = getDamesSocket();

  if (!s) {
    return false;
  }

  s.emit("chat:message", {
    matchId: Number(matchId),
    text: text.trim(),
  });

  return true;
}

// ============================================================
// CHAT TYPING
// ============================================================
//
// Correspond exactement au backend :
//
// socket.on(
//   "chat:typing",
//   ({ matchId }) => {}
// )
//
// ============================================================

export function sendDamesTyping(
  matchId
) {
  if (!matchId) {
    return false;
  }

  const s = getDamesSocket();

  if (!s) {
    return false;
  }

  s.emit("chat:typing", {
    matchId: Number(matchId),
  });

  return true;
}

// ============================================================
// PING
// ============================================================
//
// Backend :
//
// socket.on("ping:test", (start) => {
//   socket.emit("pong:test", start);
// });
//
// ============================================================

export function pingDamesSocket(
  value = Date.now()
) {
  const s = getDamesSocket();

  if (!s) {
    return false;
  }

  s.emit(
    "ping:test",
    value
  );

  return true;
}

// ============================================================
// ÉCOUTE GÉNÉRIQUE
// ============================================================

export function onDames(
  event,
  callback
) {
  const s = getDamesSocket();

  if (
    !s ||
    typeof callback !== "function"
  ) {
    return () => {};
  }

  s.on(
    event,
    callback
  );

  // Permet à Dames.jsx de nettoyer
  // exactement ce listener.
  return () => {
    s.off(
      event,
      callback
    );
  };
}

// ============================================================
// SUPPRIMER UN LISTENER
// ============================================================

export function offDames(
  event,
  callback
) {
  if (!socket) {
    return;
  }

  if (callback) {
    socket.off(
      event,
      callback
    );
  } else {
    socket.off(event);
  }
}

// ============================================================
// ÉVÉNEMENTS MATCH
// ============================================================

export function onDamesMatchInit(
  callback
) {
  return onDames(
    "match:init",
    callback
  );
}

export function onDamesMatchUpdate(
  callback
) {
  return onDames(
    "match:update",
    callback
  );
}

export function onDamesMatchEnd(
  callback
) {
  return onDames(
    "match:end",
    callback
  );
}

// ============================================================
// CHRONOMÈTRE
// ============================================================

export function onDamesTurnTimer(
  callback
) {
  return onDames(
    "turn:timer",
    callback
  );
}

// ============================================================
// CHAT
// ============================================================

export function onDamesChatMessage(
  callback
) {
  return onDames(
    "chat:message",
    callback
  );
}

export function onDamesChatTyping(
  callback
) {
  return onDames(
    "chat:typing",
    callback
  );
}

export function onDamesChatError(
  callback
) {
  return onDames(
    "chat:error",
    callback
  );
}

// ============================================================
// ERREUR SERVEUR
// ============================================================
//
// Le backend utilise :
//
// socket.emit("error", "...")
//
// ============================================================

export function onDamesError(
  callback
) {
  return onDames(
    "error",
    callback
  );
}

// ============================================================
// PONG
// ============================================================

export function onDamesPong(
  callback
) {
  return onDames(
    "pong:test",
    callback
  );
}

// ============================================================
// DÉCONNEXION SOCKET
// ============================================================
//
// IMPORTANT :
//
// Cette fonction déconnecte le socket.
// Elle ne dit PAS au backend que le joueur abandonne.
//
// Ton backend actuel ne possède aucun événement
// "abandon" / "leaveMatch".
//
// ============================================================

export function disconnectDamesSocket() {
  if (!socket) {
    return;
  }

  console.log(
    "♟️ DAMES SOCKET : déconnexion"
  );

  socket.removeAllListeners();

  socket.disconnect();

  socket = null;
  currentMatchId = null;
}

export function acceptDamesConditions(matchId) {
  console.warn(
    "⚠️ acceptDamesConditions : événement non implémenté par le socket backend actuel",
    matchId
  );
}

// ============================================================
// MATCH COURANT
// ============================================================

export function getCurrentDamesMatchId() {
  return currentMatchId;
}

export function setCurrentDamesMatchId(
  matchId
) {
  currentMatchId =
    matchId
      ? Number(matchId)
      : null;
}

// ============================================================
// EXPORT DEFAULT
// ============================================================

export default {
  connectDamesSocket,
  getDamesSocket,
  isDamesSocketConnected,

  joinDamesMatch,

  sendDamesMove,

  sendDamesChat,
  sendDamesTyping,

  pingDamesSocket,

  onDames,
  offDames,

  onDamesMatchInit,
  onDamesMatchUpdate,
  onDamesMatchEnd,

  onDamesTurnTimer,

  onDamesChatMessage,
  onDamesChatTyping,
  onDamesChatError,

  onDamesError,

  onDamesPong,

  disconnectDamesSocket,

  getCurrentDamesMatchId,
  setCurrentDamesMatchId,
};