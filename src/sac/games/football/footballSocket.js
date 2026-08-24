// src/sac/games/football/footballSocket.js

import { io } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") ||
  "http://localhost:5000";

class FootballSocket {
  constructor() {
    this.socket = null;
  }

  /**
   * ==============================
   * CONNECT
   * ==============================
   */
  connect(token = null) {
    if (this.socket?.connected) {
      return this.socket;
    }

    const auth = token
      ? { token }
      : {};

    this.socket = io(SOCKET_URL, {
      auth,

      transports: ["websocket", "polling"],

      autoConnect: true,
    });

    this.socket.on("connect", () => {
      console.log(
        "⚽ FOOTBALL SOCKET CONNECTÉ :",
        this.socket.id
      );
    });

    this.socket.on("disconnect", (reason) => {
      console.log(
        "❌ FOOTBALL SOCKET DÉCONNECTÉ :",
        reason
      );
    });

    this.socket.on("connect_error", (error) => {
      console.error(
        "❌ FOOTBALL SOCKET ERROR :",
        error
      );
    });

    return this.socket;
  }

  /**
   * ==============================
   * DISCONNECT
   * ==============================
   */
  disconnect() {
    if (!this.socket) return;

    this.socket.disconnect();
    this.socket = null;
  }

  /**
   * ==============================
   * GET SOCKET
   * ==============================
   */
  getSocket() {
    return this.socket;
  }

  /**
   * ==============================
   * JOIN MATCH
   * ==============================
   */
  joinMatch(matchId, userId) {
    if (!this.socket) {
      console.error(
        "⚠️ Football socket non connecté"
      );
      return;
    }

    this.socket.emit("football:join", {
      matchId,
      userId,
    });
  }

  /**
   * ==============================
   * LEAVE MATCH
   * ==============================
   */
  leaveMatch(matchId, userId) {
    if (!this.socket) return;

    this.socket.emit("football:leave", {
      matchId,
      userId,
    });
  }

  /**
   * ==============================
   * GET CURRENT STATE
   * ==============================
   */
  getState(matchId) {
    if (!this.socket) return;

    this.socket.emit("football:getState", {
      matchId,
    });
  }

  /**
   * ==============================
   * START
   * ==============================
   */
  startMatch(matchId) {
    if (!this.socket) return;

    this.socket.emit("football:start", {
      matchId,
    });
  }

  /**
   * ==============================
   * PAUSE
   * ==============================
   */
  pauseMatch(matchId) {
    if (!this.socket) return;

    this.socket.emit("football:pause", {
      matchId,
    });
  }

  /**
   * ==============================
   * RESUME
   * ==============================
   */
  resumeMatch(matchId) {
    if (!this.socket) return;

    this.socket.emit("football:resume", {
      matchId,
    });
  }

  /**
   * ==============================
   * EVENTS
   * ==============================
   */

  on(event, callback) {
    if (!this.socket) return;

    this.socket.on(event, callback);
  }

  off(event, callback) {
    if (!this.socket) return;

    this.socket.off(event, callback);
  }

  /**
   * ==============================
   * FOOTBALL EVENTS
   * ==============================
   */

  onState(callback) {
    this.on(
      "football:state",
      callback
    );
  }

  offState(callback) {
    this.off(
      "football:state",
      callback
    );
  }

  onUpdate(callback) {
    this.on(
      "football:update",
      callback
    );
  }

  offUpdate(callback) {
    this.off(
      "football:update",
      callback
    );
  }

  onGoal(callback) {
    this.on(
      "football:goal",
      callback
    );
  }

  offGoal(callback) {
    this.off(
      "football:goal",
      callback
    );
  }

  onCard(callback) {
    this.on(
      "football:card",
      callback
    );
  }

  offCard(callback) {
    this.off(
      "football:card",
      callback
    );
  }

  onStarted(callback) {
    this.on(
      "football:started",
      callback
    );
  }

  offStarted(callback) {
    this.off(
      "football:started",
      callback
    );
  }

  onPaused(callback) {
    this.on(
      "football:paused",
      callback
    );
  }

  offPaused(callback) {
    this.off(
      "football:paused",
      callback
    );
  }

  onResumed(callback) {
    this.on(
      "football:resumed",
      callback
    );
  }

  offResumed(callback) {
    this.off(
      "football:resumed",
      callback
    );
  }

  onPlayerJoined(callback) {
    this.on(
      "football:playerJoined",
      callback
    );
  }

  offPlayerJoined(callback) {
    this.off(
      "football:playerJoined",
      callback
    );
  }

  onPlayerLeft(callback) {
    this.on(
      "football:playerLeft",
      callback
    );
  }

  offPlayerLeft(callback) {
    this.off(
      "football:playerLeft",
      callback
    );
  }

  onEnd(callback) {
    this.on(
      "football:end",
      callback
    );
  }

  offEnd(callback) {
    this.off(
      "football:end",
      callback
    );
  }

  onPenaltiesEnd(callback) {
    this.on(
      "football:penalties:end",
      callback
    );
  }

  offPenaltiesEnd(callback) {
    this.off(
      "football:penalties:end",
      callback
    );
  }

  onError(callback) {
    this.on(
      "football:error",
      callback
    );
  }

  offError(callback) {
    this.off(
      "football:error",
      callback
    );
  }
}

/**
 * Singleton
 *
 * Comme pour les autres jeux du SAC,
 * toute l'application utilise la même
 * instance FootballSocket.
 */
const footballSocket =
  new FootballSocket();

export default footballSocket;