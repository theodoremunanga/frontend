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

export const checkersSocket =
  io(SOCKET_URL, {
    autoConnect: false,

    transports: [
      "websocket",
      "polling",
    ],

    auth: {
      token: getToken(),
    },
  });

// ======================================================
// CONNECT
// ======================================================

export function connectCheckers() {

  const token =
    getToken();

  checkersSocket.auth = {
    token,
  };

  if (
    !checkersSocket.connected
  ) {
    checkersSocket.connect();
  }

  return checkersSocket;
}

// ======================================================
// JOIN
// ======================================================

export function joinCheckersMatch(
  matchId
) {

  checkersSocket.emit(
    "joinMatch",
    {
      matchId,
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

  checkersSocket.emit(
    "move",
    {
      matchId,
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

  checkersSocket.emit(
    "chat:message",
    {
      matchId,
      text,
    }
  );
}

// ======================================================
// TYPING
// ======================================================

export function sendCheckersTyping(
  matchId
) {

  checkersSocket.emit(
    "chat:typing",
    {
      matchId,
    }
  );
}

export default checkersSocket;