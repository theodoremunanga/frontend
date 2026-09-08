import { io } from "socket.io-client";

// ======================================================
// CONFIG
// ======================================================

const API_URL =
  import.meta.env.VITE_API_URL || "";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  API_URL.replace(/\/api\/?$/, "");

// ======================================================
// TOKEN
// ======================================================

function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("jwt") ||
    null
  );
}

// ======================================================
// SOCKET
// ======================================================

export const checkersSocket = io(
  SOCKET_URL,
  {
    autoConnect: false,

    transports: [
      "websocket",
      "polling",
    ],

    auth: {
      token: getToken(),
    },

    reconnection: true,

    reconnectionAttempts: Infinity,

    reconnectionDelay: 1000,

    reconnectionDelayMax: 5000,
  }
);

// ======================================================
// CONNECT
// ======================================================

export function connectCheckers() {
  const token = getToken();

  checkersSocket.auth = {
    token,
  };

  if (!checkersSocket.connected) {
    checkersSocket.connect();
  }

  return checkersSocket;
}

// ======================================================
// DISCONNECT
// ======================================================

export function disconnectCheckers() {
  if (checkersSocket.connected) {
    checkersSocket.disconnect();
  }
}

// ======================================================
// JOIN MATCH
// ======================================================

export function joinCheckersMatch(matchId) {
  if (!matchId) {
    console.warn(
      "[CHECKERS SOCKET] matchId manquant pour match:join"
    );

    return;
  }

  checkersSocket.emit(
    "match:join",
    {
      matchId: Number(matchId),
    }
  );
}

// ======================================================
// MOVE
// ======================================================

export function sendCheckersMove(
  matchId,
  move
) {
  if (!matchId || !move) {
    console.warn(
      "[CHECKERS SOCKET] move invalide"
    );

    return;
  }

  checkersSocket.emit(
    "checkers:move",
    {
      matchId: Number(matchId),
      move,
    }
  );
}

// ======================================================
// CHAT
// ======================================================

export function sendCheckersMessage(
  matchId,
  text
) {
  const message = String(text || "").trim();

  if (!matchId || !message) {
    return;
  }

  checkersSocket.emit(
    "chat:send",
    {
      matchId: Number(matchId),
      text: message,
    }
  );
}

// ======================================================
// TYPING
// ======================================================

export function sendCheckersTyping(
  matchId
) {
  if (!matchId) {
    return;
  }

  checkersSocket.emit(
    "chat:typing",
    {
      matchId: Number(matchId),
    }
  );
}

// ======================================================
// CONDITIONS
// ======================================================

export function acceptCheckersConditions(
  matchId
) {
  if (!matchId) {
    return;
  }

  checkersSocket.emit(
    "match:conditions:accept",
    {
      matchId: Number(matchId),
    }
  );
}

// ======================================================
// FORFEIT
// ======================================================
//
// IMPORTANT :
// Ceci n'est PAS utilisé pour le timeout.
//
// Le timeout de 90 secondes est entièrement
// géré par le serveur.
//
// Cette fonction sert uniquement lorsque le joueur
// décide volontairement d'abandonner.
// ======================================================

export function forfeitCheckersMatch(
  matchId
) {
  if (!matchId) {
    return;
  }

  checkersSocket.emit(
    "match:forfeit",
    {
      matchId: Number(matchId),
    }
  );
}

// ======================================================
// REPORT
// ======================================================

export function reportCheckersMatch(
  matchId,
  report
) {
  if (!matchId || !report) {
    return;
  }

  checkersSocket.emit(
    "match:report",
    {
      matchId: Number(matchId),
      ...report,
    }
  );
}

// ======================================================
// SERVER EVENT HELPERS
// ======================================================
//
// Ces fonctions ne créent PAS de nouveaux événements.
//
// Elles permettent simplement à Dames.jsx,
// DamesModeration.jsx, etc. de s'abonner
// proprement au contrat serveur.
// ======================================================

export function onCheckersMatchInit(
  handler
) {
  checkersSocket.on(
    "match:init",
    handler
  );

  return () => {
    checkersSocket.off(
      "match:init",
      handler
    );
  };
}

export function onCheckersMatchUpdate(
  handler
) {
  checkersSocket.on(
    "match:update",
    handler
  );

  return () => {
    checkersSocket.off(
      "match:update",
      handler
    );
  };
}

export function onCheckersTurnTimer(
  handler
) {
  checkersSocket.on(
    "turn:timer",
    handler
  );

  return () => {
    checkersSocket.off(
      "turn:timer",
      handler
    );
  };
}

export function onCheckersMatchEnd(
  handler
) {
  checkersSocket.on(
    "match:end",
    handler
  );

  return () => {
    checkersSocket.off(
      "match:end",
      handler
    );
  };
}

// ======================================================
// CHAT EVENTS
// ======================================================

export function onCheckersChatMessage(
  handler
) {
  checkersSocket.on(
    "chat:message",
    handler
  );

  return () => {
    checkersSocket.off(
      "chat:message",
      handler
    );
  };
}

export function onCheckersChatTyping(
  handler
) {
  checkersSocket.on(
    "chat:typing",
    handler
  );

  return () => {
    checkersSocket.off(
      "chat:typing",
      handler
    );
  };
}

// ======================================================
// SOCKET ERRORS
// ======================================================

export function onCheckersSocketError(
  handler
) {
  checkersSocket.on(
    "connect_error",
    handler
  );

  return () => {
    checkersSocket.off(
      "connect_error",
      handler
    );
  };
}

// ======================================================
// CONNECTION EVENTS
// ======================================================

export function onCheckersConnect(
  handler
) {
  checkersSocket.on(
    "connect",
    handler
  );

  return () => {
    checkersSocket.off(
      "connect",
      handler
    );
  };
}

export function onCheckersDisconnect(
  handler
) {
  checkersSocket.on(
    "disconnect",
    handler
  );

  return () => {
    checkersSocket.off(
      "disconnect",
      handler
    );
  };
}

// ======================================================
// DEFAULT EXPORT
// ======================================================

export default checkersSocket;