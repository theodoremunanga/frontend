// ============================================================
// src/services/ludoSocket.js
// ============================================================
//
// Socket.IO - LUDO
//
// Responsabilités :
// - Connexion Socket.IO
// - Authentification JWT
// - Reconnexion automatique
// - Reconnexion à la partie en cours
// - JOIN / LEAVE
// - START
// - ROLL DICE
// - MOVE PAWN
// - RESTORE STATE
// - Écoute des événements serveur
//
// IMPORTANT :
// Le socket ne contient PAS la logique du jeu.
// Le BACKEND reste la source de vérité.
// ============================================================

import { io } from "socket.io-client";

// ============================================================
// CONFIGURATION
// ============================================================

const SOCKET_URL =
    import.meta.env.VITE_LUDO_SOCKET_URL ||
    import.meta.env.VITE_SOCKET_URL ||
    import.meta.env.VITE_API_SOCKET_URL ||
    "https://backend-ad3t.onrender.com";

// ============================================================
// ÉVÉNEMENTS LUDO
// ============================================================

export const LUDO_EVENTS = Object.freeze({
    // Socket.IO
    CONNECT: "connect",
    CONNECT_ERROR: "connect_error",
    DISCONNECT: "disconnect",

    // Client -> Backend
    JOIN: "ludo:join",
    LEAVE: "ludo:leave",
    START: "ludo:start",
    ROLL: "ludo:rollDice",
    MOVE: "ludo:movePawn",
    STATE: "ludo:state",

    // Backend -> Client
    JOINED: "ludo:joined",
    STATE_UPDATE: "ludo:stateUpdate",
    ROLL_RESULT: "ludo:rollResult",
    MOVE_RESULT: "ludo:moveResult",
    GAME_STARTED: "ludo:gameStarted",
    GAME_FINISHED: "ludo:gameFinished",
    TIMEOUT: "ludo:timeout",
    BOT_RESULT: "ludo:botResult",
    PLAYER_LEFT: "ludo:playerLeft",
    ERROR: "ludo:error",
});

// ============================================================
// ÉTAT DU SOCKET
// ============================================================

let socket = null;
let currentMatchId = null;

// ============================================================
// TOKEN JWT
// ============================================================

function getToken() {
    return (
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken") ||
        localStorage.getItem("jwt") ||
        ""
    );
}

// ============================================================
// NORMALISATION MATCH ID
// ============================================================

function normalizeMatchId(matchId) {
    const id = Number(matchId);

    if (!Number.isInteger(id) || id <= 0) {
        return null;
    }

    return id;
}

// ============================================================
// CONNEXION SOCKET
// ============================================================

export function connectLudo() {
    // --------------------------------------------------------
    // Déjà connecté
    // --------------------------------------------------------

    if (socket && socket.connected) {
        return socket;
    }

    // --------------------------------------------------------
    // JWT
    // --------------------------------------------------------

    const token = getToken();

    if (!token) {
        console.error(
            "❌ LUDO SOCKET : token JWT absent."
        );

        return null;
    }

    // --------------------------------------------------------
    // Nettoyage ancien socket
    // --------------------------------------------------------

    if (socket) {
        try {
            socket.removeAllListeners();
            socket.disconnect();
        } catch (error) {
            console.error(
                "❌ LUDO SOCKET : erreur nettoyage :",
                error
            );
        }

        socket = null;
    }

    // --------------------------------------------------------
    // Création Socket.IO
    // --------------------------------------------------------

    socket = io(SOCKET_URL, {
        transports: [
            "websocket",
            "polling",
        ],

        withCredentials: true,

        // JWT transmis au handshake Socket.IO
        auth: {
            token,
        },

        autoConnect: true,

        reconnection: true,

        reconnectionAttempts: Infinity,

        reconnectionDelay: 1000,

        reconnectionDelayMax: 5000,
    });

    // ========================================================
    // CONNECT
    // ========================================================

    socket.on(
        LUDO_EVENTS.CONNECT,
        () => {
            console.log(
                "🎲 LUDO SOCKET CONNECTÉ :",
                socket.id
            );

            // Si une partie était active avant
            // une coupure réseau, on la rejoint.
            rejoinCurrentMatch();
        }
    );

    // ========================================================
    // CONNECT ERROR
    // ========================================================

    socket.on(
        LUDO_EVENTS.CONNECT_ERROR,
        error => {
            console.error(
                "❌ LUDO SOCKET CONNECT_ERROR :",
                error?.message || error
            );
        }
    );

    // ========================================================
    // DISCONNECT
    // ========================================================

    socket.on(
        LUDO_EVENTS.DISCONNECT,
        reason => {
            console.warn(
                "⚠️ LUDO SOCKET DÉCONNECTÉ :",
                reason
            );

            // IMPORTANT :
            // On ne supprime PAS currentMatchId ici.
            //
            // Socket.IO va tenter une reconnexion.
            // Le match sera rejoint automatiquement.
        }
    );

    return socket;
}

// ============================================================
// GET SOCKET
// ============================================================

export function getLudoSocket() {
    if (!socket) {
        return connectLudo();
    }

    return socket;
}

// ============================================================
// SOCKET CONNECTÉ ?
// ============================================================

export function isLudoSocketConnected() {
    return Boolean(
        socket &&
        socket.connected
    );
}

// ============================================================
// MATCH COURANT
// ============================================================

export function getCurrentLudoMatchId() {
    return currentMatchId;
}

export function setCurrentLudoMatchId(matchId) {
    currentMatchId =
        normalizeMatchId(matchId);
}

// ============================================================
// REJOIN AUTOMATIQUE
// ============================================================

function rejoinCurrentMatch() {
    if (
        !socket ||
        !socket.connected ||
        !currentMatchId
    ) {
        return;
    }

    console.log(
        "♻️ LUDO REJOIN MATCH :",
        currentMatchId
    );

    socket.emit(
        LUDO_EVENTS.JOIN,
        {
            matchId: currentMatchId,
        },
        response => {
            console.log(
                "♻️ LUDO REJOIN ACK :",
                response
            );

            if (!response?.success) {
                console.warn(
                    "⚠️ LUDO REJOIN REFUSÉ :",
                    response?.message
                );

                return;
            }

            // Demande de restauration
            // de l'état actuel.
            socket.emit(
                LUDO_EVENTS.STATE,
                {
                    matchId: currentMatchId,
                },
                stateResponse => {
                    console.log(
                        "♻️ LUDO STATE RESTORE ACK :",
                        stateResponse
                    );
                }
            );
        }
    );
}

// ============================================================
// JOIN
// ============================================================

export function joinLudoMatch(
    matchId,
    callback
) {
    const id =
        normalizeMatchId(matchId);

    if (!id) {
        console.warn(
            "⚠️ LUDO JOIN : matchId invalide :",
            matchId
        );

        return false;
    }

    const s =
        getLudoSocket();

    if (!s) {
        console.error(
            "❌ LUDO JOIN : socket indisponible."
        );

        return false;
    }

    // Mémoriser la partie
    // pour une éventuelle reconnexion.
    currentMatchId = id;

    const payload = {
        matchId: id,
    };

    console.log(
        "📤 LUDO JOIN :",
        payload
    );

    // Le socket n'est pas encore connecté.
    // Le handler CONNECT fera le JOIN.
    if (!s.connected) {
        console.log(
            "⏳ LUDO JOIN : attente connexion..."
        );

        return true;
    }

    if (
        typeof callback ===
        "function"
    ) {
        s.emit(
            LUDO_EVENTS.JOIN,
            payload,
            callback
        );
    } else {
        s.emit(
            LUDO_EVENTS.JOIN,
            payload
        );
    }

    return true;
}

// ============================================================
// LEAVE
// ============================================================

export function leaveLudoMatch(
    matchId = currentMatchId,
    callback
) {
    const id =
        normalizeMatchId(matchId);

    if (!id) {
        currentMatchId = null;

        return false;
    }

    const s =
        getLudoSocket();

    if (
        !s ||
        !s.connected
    ) {
        currentMatchId = null;

        return false;
    }

    console.log(
        "🚪 LUDO LEAVE :",
        id
    );

    const payload = {
        matchId: id,
    };

    if (
        typeof callback ===
        "function"
    ) {
        s.emit(
            LUDO_EVENTS.LEAVE,
            payload,
            callback
        );
    } else {
        s.emit(
            LUDO_EVENTS.LEAVE,
            payload
        );
    }

    if (
        Number(currentMatchId) ===
        id
    ) {
        currentMatchId = null;
    }

    return true;
}

// ============================================================
// START
// ============================================================

export function startLudoMatch(
    matchId,
    callback
) {
    const id =
        normalizeMatchId(matchId);

    if (!id) {
        console.warn(
            "⚠️ LUDO START : matchId invalide."
        );

        return false;
    }

    const s =
        getLudoSocket();

    if (
        !s ||
        !s.connected
    ) {
        console.error(
            "❌ LUDO START : socket non connecté."
        );

        return false;
    }

    currentMatchId = id;

    const payload = {
        matchId: id,
    };

    console.log(
        "🎮 LUDO START :",
        payload
    );

    if (
        typeof callback ===
        "function"
    ) {
        s.emit(
            LUDO_EVENTS.START,
            payload,
            callback
        );
    } else {
        s.emit(
            LUDO_EVENTS.START,
            payload
        );
    }

    return true;
}

// ============================================================
// ROLL DICE
// ============================================================

export function rollLudoDice(
    matchId,
    callback
) {
    const id =
        normalizeMatchId(matchId);

    if (!id) {
        console.warn(
            "⚠️ LUDO ROLL : matchId invalide."
        );

        return false;
    }

    const s =
        getLudoSocket();

    if (
        !s ||
        !s.connected
    ) {
        console.error(
            "❌ LUDO ROLL : socket non connecté."
        );

        return false;
    }

    currentMatchId = id;

    const payload = {
        matchId: id,
    };

    console.log(
        "🎲 LUDO ROLL :",
        payload
    );

    if (
        typeof callback ===
        "function"
    ) {
        s.emit(
            LUDO_EVENTS.ROLL,
            payload,
            callback
        );
    } else {
        s.emit(
            LUDO_EVENTS.ROLL,
            payload
        );
    }

    return true;
}

// ============================================================
// MOVE PAWN
// ============================================================

export function moveLudoPawn(
    matchId,
    pawnId,
    callback
) {
    const id =
        normalizeMatchId(matchId);

    if (!id) {
        console.warn(
            "⚠️ LUDO MOVE : matchId invalide."
        );

        return false;
    }

    if (
        pawnId === undefined ||
        pawnId === null ||
        String(pawnId).trim() === ""
    ) {
        console.warn(
            "⚠️ LUDO MOVE : pawnId invalide."
        );

        return false;
    }

    const s =
        getLudoSocket();

    if (
        !s ||
        !s.connected
    ) {
        console.error(
            "❌ LUDO MOVE : socket non connecté."
        );

        return false;
    }

    currentMatchId = id;

    const payload = {
        matchId: id,
        pawnId,
    };

    console.log(
        "♟️ LUDO MOVE :",
        payload
    );

    if (
        typeof callback ===
        "function"
    ) {
        s.emit(
            LUDO_EVENTS.MOVE,
            payload,
            callback
        );
    } else {
        s.emit(
            LUDO_EVENTS.MOVE,
            payload
        );
    }

    return true;
}

// ============================================================
// RESTORE STATE
// ============================================================

export function requestLudoState(
    matchId,
    callback
) {
    const id =
        normalizeMatchId(matchId);

    if (!id) {
        console.warn(
            "⚠️ LUDO STATE : matchId invalide."
        );

        return false;
    }

    const s =
        getLudoSocket();

    if (
        !s ||
        !s.connected
    ) {
        console.error(
            "❌ LUDO STATE : socket non connecté."
        );

        return false;
    }

    currentMatchId = id;

    const payload = {
        matchId: id,
    };

    console.log(
        "♻️ LUDO STATE :",
        payload
    );

    if (
        typeof callback ===
        "function"
    ) {
        s.emit(
            LUDO_EVENTS.STATE,
            payload,
            callback
        );
    } else {
        s.emit(
            LUDO_EVENTS.STATE,
            payload
        );
    }

    return true;
}

// ============================================================
// LISTENER GÉNÉRIQUE
// ============================================================

export function onLudo(
    event,
    callback
) {
    const s =
        getLudoSocket();

    if (
        !s ||
        typeof callback !==
            "function"
    ) {
        return () => {};
    }

    s.on(
        event,
        callback
    );

    // Fonction de nettoyage
    return () => {
        s.off(
            event,
            callback
        );
    };
}

// ============================================================
// REMOVE LISTENER
// ============================================================

export function offLudo(
    event,
    callback
) {
    if (!socket) {
        return;
    }

    if (
        typeof callback ===
        "function"
    ) {
        socket.off(
            event,
            callback
        );
    } else {
        socket.off(event);
    }
}

// ============================================================
// LISTENERS SPÉCIFIQUES
// ============================================================

export function onLudoJoined(
    callback
) {
    return onLudo(
        LUDO_EVENTS.JOINED,
        callback
    );
}

export function onLudoStateUpdate(
    callback
) {
    return onLudo(
        LUDO_EVENTS.STATE_UPDATE,
        callback
    );
}

export function onLudoRollResult(
    callback
) {
    return onLudo(
        LUDO_EVENTS.ROLL_RESULT,
        callback
    );
}

export function onLudoMoveResult(
    callback
) {
    return onLudo(
        LUDO_EVENTS.MOVE_RESULT,
        callback
    );
}

export function onLudoGameStarted(
    callback
) {
    return onLudo(
        LUDO_EVENTS.GAME_STARTED,
        callback
    );
}

export function onLudoGameFinished(
    callback
) {
    return onLudo(
        LUDO_EVENTS.GAME_FINISHED,
        callback
    );
}

export function onLudoTimeout(
    callback
) {
    return onLudo(
        LUDO_EVENTS.TIMEOUT,
        callback
    );
}

export function onLudoBotResult(
    callback
) {
    return onLudo(
        LUDO_EVENTS.BOT_RESULT,
        callback
    );
}

export function onLudoPlayerLeft(
    callback
) {
    return onLudo(
        LUDO_EVENTS.PLAYER_LEFT,
        callback
    );
}

export function onLudoError(
    callback
) {
    return onLudo(
        LUDO_EVENTS.ERROR,
        callback
    );
}

// ============================================================
// DISCONNECT
// ============================================================
//
// Utilisé uniquement lorsque le composant quitte réellement
// le jeu.
//
// Une simple perte réseau ne passe PAS ici :
// Socket.IO se reconnecte automatiquement.
//

export function disconnectLudo() {
    if (!socket) {
        currentMatchId = null;

        return;
    }

    console.log(
        "🔌 LUDO SOCKET : fermeture volontaire."
    );

    try {
        socket.removeAllListeners();
        socket.disconnect();
    } catch (error) {
        console.error(
            "❌ LUDO DISCONNECT :",
            error
        );
    }

    socket = null;

    currentMatchId = null;
}

// ============================================================
// ALIASES
// ============================================================

export const disconnectLudoSocket =
    disconnectLudo;

export const sendLudoMove =
    moveLudoPawn;

export const sendLudoRoll =
    rollLudoDice;

export const getLudoState =
    requestLudoState;

// ============================================================
// EXPORT DEFAULT
// ============================================================

export default {
    LUDO_EVENTS,

    connectLudo,
    getLudoSocket,
    isLudoSocketConnected,

    joinLudoMatch,
    leaveLudoMatch,
    startLudoMatch,

    rollLudoDice,
    moveLudoPawn,
    requestLudoState,

    sendLudoMove,
    sendLudoRoll,
    getLudoState,

    onLudo,
    offLudo,

    onLudoJoined,
    onLudoStateUpdate,
    onLudoRollResult,
    onLudoMoveResult,
    onLudoGameStarted,
    onLudoGameFinished,
    onLudoTimeout,
    onLudoBotResult,
    onLudoPlayerLeft,
    onLudoError,

    disconnectLudo,
    disconnectLudoSocket,

    getCurrentLudoMatchId,
    setCurrentLudoMatchId,
};