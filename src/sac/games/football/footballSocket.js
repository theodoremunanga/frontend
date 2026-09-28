// frontend/src/sac/games/football/footballSocket.js

import { io } from "socket.io-client";

/**
 * ============================================================
 * 6BETBALL — FOOTBALL SOCKET CLIENT
 * ============================================================
 *
 * Socket frontend dédié EXCLUSIVEMENT au football.
 *
 * Contrat backend :
 *
 *   football:join
 *   football:leave
 *   football:get_state
 *   football:command
 *
 * Réceptions :
 *
 *   football:joined
 *   football:join_success
 *   football:state
 *   football:event
 *   football:finished
 *   football:player_joined
 *   football:player_left
 *   football:player_disconnected
 *   football:command_result
 *   football:command_error
 *   football:error
 *
 * IMPORTANT :
 * - Aucun accès API ici.
 * - Aucune logique de simulation ici.
 * - Aucun accès à matches.
 * - L'identifiant est football_matches.id.
 */

// ============================================================
// CONFIGURATION
// ============================================================

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") ||
  "http://localhost:5000";
  
// ============================================================
// SOCKET SINGLETON
// ============================================================

let socket = null;

/**
 * Retourne l'instance Socket.IO football.
 *
 * On utilise un singleton pour éviter de créer plusieurs
 * connexions lorsque le composant React est remonté.
 */
export function getFootballSocket() {
    if (socket) {
        return socket;
    }

    socket = io(SOCKET_URL, {
        autoConnect: false,

        /**
         * L'authentification existante du projet peut être
         * récupérée côté backend via socket.auth.userId.
         *
         * Si le projet utilise déjà un middleware JWT Socket.IO,
         * les credentials existants restent prioritaires.
         */
        withCredentials: true,
    });

    return socket;
}

// ============================================================
// CONNEXION
// ============================================================

export function connectFootballSocket() {
    const instance = getFootballSocket();

    if (!instance.connected) {
        instance.connect();
    }

    return instance;
}

// ============================================================
// DÉCONNEXION
// ============================================================

export function disconnectFootballSocket() {
    if (!socket) {
        return;
    }

    if (socket.connected) {
        socket.disconnect();
    }
}

// ============================================================
// JOIN
// ============================================================

export function joinFootballMatch(footballMatchId) {
    const id = Number(footballMatchId);

    if (!Number.isInteger(id) || id <= 0) {
        throw new Error(
            "footballMatchId invalide"
        );
    }

    const instance = connectFootballSocket();

    instance.emit("football:join", {
        footballMatchId: id,
    });
}

// ============================================================
// LEAVE
// ============================================================

export function leaveFootballMatch() {
    if (!socket) {
        return;
    }

    socket.emit("football:leave");
}

// ============================================================
// GET STATE
// ============================================================

export function requestFootballState() {
    if (!socket) {
        return;
    }

    socket.emit("football:get_state");
}

// ============================================================
// COMMANDES
// ============================================================

/**
 * Envoie une direction.
 *
 * Backend :
 *
 * {
 *   command: "DIRECTION",
 *   direction: "UP",
 *   playerId?: number
 * }
 */
export function sendFootballDirection(
    direction,
    playerId = null
) {
    const normalizedDirection = String(
        direction || ""
    ).toUpperCase();

    const allowed = [
        "UP",
        "DOWN",
        "LEFT",
        "RIGHT",
    ];

    if (!allowed.includes(normalizedDirection)) {
        throw new Error(
            `Direction football invalide: ${direction}`
        );
    }

    if (!socket) {
        return;
    }

    socket.emit("football:command", {
        command: "DIRECTION",
        direction: normalizedDirection,
        playerId,
    });
}

/**
 * Bouton X.
 *
 * Selon l'engine :
 * - passe si possession
 * - attaque / pression sinon
 */
export function sendFootballX(
    playerId = null
) {
    if (!socket) {
        return;
    }

    socket.emit("football:command", {
        command: "X",
        playerId,
    });
}

/**
 * Bouton A.
 *
 * Selon l'engine :
 * - tir si possession
 * - tacle / défense sinon
 */
export function sendFootballA(
    playerId = null
) {
    if (!socket) {
        return;
    }

    socket.emit("football:command", {
        command: "A",
        playerId,
    });
}

// ============================================================
// ÉCOUTEURS
// ============================================================

/**
 * Enregistre tous les listeners football.
 *
 * Retourne une fonction cleanup.
 */
export function subscribeFootballSocket({
    onJoined,
    onJoinSuccess,
    onState,
    onEvent,
    onFinished,
    onPlayerJoined,
    onPlayerLeft,
    onPlayerDisconnected,
    onCommandResult,
    onCommandError,
    onError,
    onConnect,
    onDisconnect,
} = {}) {
    const instance = getFootballSocket();

    const handlers = [];

    const register = (
        event,
        callback
    ) => {
        if (typeof callback !== "function") {
            return;
        }

        instance.on(event, callback);

        handlers.push({
            event,
            callback,
        });
    };

    register(
        "connect",
        onConnect
    );

    register(
        "disconnect",
        onDisconnect
    );

    register(
        "football:joined",
        onJoined
    );

    register(
        "football:join_success",
        onJoinSuccess
    );

    register(
        "football:state",
        onState
    );

    register(
        "football:event",
        onEvent
    );

    register(
        "football:finished",
        onFinished
    );

    register(
        "football:player_joined",
        onPlayerJoined
    );

    register(
        "football:player_left",
        onPlayerLeft
    );

    register(
        "football:player_disconnected",
        onPlayerDisconnected
    );

    register(
        "football:command_result",
        onCommandResult
    );

    register(
        "football:command_error",
        onCommandError
    );

    register(
        "football:error",
        onError
    );

    /**
     * Nettoyage React.
     */
    return () => {
        handlers.forEach(
            ({
                event,
                callback,
            }) => {
                instance.off(
                    event,
                    callback
                );
            }
        );
    };
}

// ============================================================
// EXPORT SOCKET
// ============================================================

export default getFootballSocket;
