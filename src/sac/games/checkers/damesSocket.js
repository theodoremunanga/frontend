// ============================================================
// src/sac/games/checkers/damesSocket.js
// ============================================================
//
// RESPONSABILITÉ UNIQUE :
// - connexion Socket.IO du jeu de dames
// - authentification JWT
// - rejoindre un match
// - reconnexion automatique au match
// - envoyer les coups
// - chat
// - exposer les événements serveur
//
// IMPORTANT :
// - AUCUN JSX
// - AUCUNE logique de plateau
// - AUCUN calcul de résultat
// - AUCUN chrono local de 90 secondes
// - AUCUNE décision de victoire/défaite
//
// SOURCE DE VÉRITÉ : BACKEND
//
// Flux officiel :
//
//   match:init
//       ↓
//   match:update
//       ↓
//   turn:timer
//       ↓
//   match:end
//       ↓
//   Dames.jsx passe vers gameOver puis result
//
// Le socket transporte uniquement les événements.
// Dames.jsx interprète leur payload pour l'affichage.
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
// ÉVÉNEMENTS OFFICIELS DAMES
// ============================================================
//
// IMPORTANT :
// Ces noms constituent le contrat frontend/backend.
//
// Ne pas créer ici :
// - gameOver
// - result
// - game:over
// - match:finished
// - dames:end
//
// La fin officielle est UNIQUEMENT :
//     match:end
//
// ============================================================

export const DAMES_EVENTS = Object.freeze({
    CONNECT: "connect",
    CONNECT_ERROR: "connect_error",
    DISCONNECT: "disconnect",

    MATCH_INIT: "match:init",
    MATCH_UPDATE: "match:update",
    MATCH_END: "match:end",

    TURN_TIMER: "turn:timer",

    JOIN_MATCH: "joinMatch",
    MOVE: "move",

    CHAT_MESSAGE: "chat:message",
    CHAT_TYPING: "chat:typing",
    CHAT_ERROR: "chat:error",

    ERROR: "error",

    PING_TEST: "ping:test",
    PONG_TEST: "pong:test",
});

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
        localStorage.getItem("jwt") ||
        ""
    );
}

// ============================================================
// NORMALISATION MATCH ID
// ============================================================

function normalizeMatchId(matchId) {
    const id = Number(matchId);

    if (!Number.isFinite(id) || id <= 0) {
        return null;
    }

    return id;
}

// ============================================================
// CRÉER / RÉCUPÉRER LE SOCKET
// ============================================================

export function connectDamesSocket() {
    // --------------------------------------------------------
    // SOCKET DÉJÀ CONNECTÉ
    // --------------------------------------------------------

    if (socket && socket.connected) {
        return socket;
    }

    const token = getToken();

    if (!token) {
        console.error(
            "❌ DAMES SOCKET : token JWT manquant"
        );

        return null;
    }

    // --------------------------------------------------------
    // ANCIEN SOCKET EXISTANT MAIS DÉCONNECTÉ
    // --------------------------------------------------------

    if (socket) {
        try {
            socket.removeAllListeners();
            socket.disconnect();
        } catch (error) {
            console.error(
                "❌ DAMES SOCKET : erreur fermeture ancien socket",
                error
            );
        }

        socket = null;
    }

    // --------------------------------------------------------
    // CRÉATION SOCKET
    // --------------------------------------------------------

    socket = io(SOCKET_URL, {
        transports: [
            "websocket",
            "polling",
        ],

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

    // ========================================================
    // CONNEXION
    // ========================================================

    socket.on(
        DAMES_EVENTS.CONNECT,
        () => {
            console.log(
                "♟️ DAMES SOCKET CONNECTÉ :",
                socket.id
            );

            // ------------------------------------------------
            // REJOIN AUTOMATIQUE
            // ------------------------------------------------
            //
            // Après :
            // - perte réseau
            // - changement Wi-Fi
            // - reconnexion Render
            // - réveil du navigateur
            //
            // currentMatchId est volontairement conservé.
            //
            // Le backend reste la source de vérité.
            // Le frontend rejoint simplement sa room.
            // ------------------------------------------------

            if (currentMatchId) {
                console.log(
                    "♻️ DAMES REJOIN MATCH :",
                    currentMatchId
                );

                socket.emit(
                    DAMES_EVENTS.JOIN_MATCH,
                    {
                        matchId: currentMatchId,
                    }
                );
            }
        }
    );

    // ========================================================
    // ERREUR CONNEXION
    // ========================================================

    socket.on(
        DAMES_EVENTS.CONNECT_ERROR,
        (error) => {
            console.error(
                "❌ DAMES SOCKET CONNECT ERROR :",
                error?.message || error
            );
        }
    );

    // ========================================================
    // DÉCONNEXION
    // ========================================================

    socket.on(
        DAMES_EVENTS.DISCONNECT,
        (reason) => {
            console.warn(
                "⚠️ DAMES SOCKET DISCONNECT :",
                reason
            );

            // IMPORTANT :
            //
            // NE PAS supprimer currentMatchId ici.
            //
            // Socket.IO va tenter une reconnexion.
            //
            // À la reconnexion :
            //
            // socket.emit("joinMatch", {
            //     matchId: currentMatchId
            // });
            //
            // Le backend reste responsable du match.
        }
    );

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
        socket && socket.connected
    );
}

// ============================================================
// JOIN MATCH
// ============================================================
//
// BACKEND :
//
// socket.on("joinMatch", async ({ matchId }) => {})
//
// ============================================================

export function joinDamesMatch(matchId) {
    const id = normalizeMatchId(matchId);

    if (!id) {
        console.warn(
            "⚠️ DAMES JOIN : matchId invalide",
            matchId
        );

        return false;
    }

    const s = getDamesSocket();

    if (!s) {
        console.error(
            "❌ DAMES JOIN : socket indisponible"
        );

        return false;
    }

    // --------------------------------------------------------
    // Toujours mémoriser le match courant.
    //
    // Cela permet le rejoin automatique après reconnexion.
    // --------------------------------------------------------

    currentMatchId = id;

    console.log(
        "📤 DAMES JOIN MATCH :",
        id
    );

    // --------------------------------------------------------
    // Si pas encore connecté :
    // le handler "connect" fera le join.
    // --------------------------------------------------------

    if (!s.connected) {
        console.log(
            "⏳ DAMES JOIN : attente connexion socket"
        );

        return true;
    }

    s.emit(
        DAMES_EVENTS.JOIN_MATCH,
        {
            matchId: id,
        }
    );

    return true;
}

// ============================================================
// MOVE
// ============================================================
//
// BACKEND :
//
// socket.on(
//     "move",
//     async ({ matchId, move }) => {}
// )
//
// IMPORTANT :
// Le socket ne valide pas le mouvement.
// Le moteur backend décide si le coup est valide.
//
// ============================================================

export function sendDamesMove(matchId, move) {
    const id = normalizeMatchId(matchId);

    if (!id) {
        console.warn(
            "⚠️ DAMES MOVE : matchId invalide"
        );

        return false;
    }

    if (
        !move ||
        typeof move !== "object"
    ) {
        console.warn(
            "⚠️ DAMES MOVE : move invalide"
        );

        return false;
    }

    const s = getDamesSocket();

    if (!s || !s.connected) {
        console.error(
            "❌ DAMES MOVE : socket non connecté"
        );

        return false;
    }

    console.log(
        "📤 DAMES MOVE :",
        {
            matchId: id,
            move,
        }
    );

    s.emit(
        DAMES_EVENTS.MOVE,
        {
            matchId: id,
            move,
        }
    );

    return true;
}

// ============================================================
// CHAT MESSAGE
// ============================================================

export function sendDamesChat(matchId, text) {
    const id = normalizeMatchId(matchId);

    if (!id) {
        return false;
    }

    if (
        typeof text !== "string" ||
        !text.trim()
    ) {
        return false;
    }

    const s = getDamesSocket();

    if (!s || !s.connected) {
        return false;
    }

    s.emit(
        DAMES_EVENTS.CHAT_MESSAGE,
        {
            matchId: id,
            text: text.trim(),
        }
    );

    return true;
}

// ============================================================
// CHAT TYPING
// ============================================================

export function sendDamesTyping(matchId) {
    const id = normalizeMatchId(matchId);

    if (!id) {
        return false;
    }

    const s = getDamesSocket();

    if (!s || !s.connected) {
        return false;
    }

    s.emit(
        DAMES_EVENTS.CHAT_TYPING,
        {
            matchId: id,
        }
    );

    return true;
}

// ============================================================
// PING
// ============================================================

export function pingDamesSocket(
    value = Date.now()
) {
    const s = getDamesSocket();

    if (!s || !s.connected) {
        return false;
    }

    s.emit(
        DAMES_EVENTS.PING_TEST,
        value
    );

    return true;
}

// ============================================================
// LISTENER GÉNÉRIQUE
// ============================================================

export function onDames(event, callback) {
    const s = getDamesSocket();

    if (
        !s ||
        typeof callback !== "function"
    ) {
        return () => {};
    }

    s.on(event, callback);

    return () => {
        s.off(event, callback);
    };
}

// ============================================================
// REMOVE LISTENER
// ============================================================

export function offDames(event, callback) {
    if (!socket) {
        return;
    }

    if (typeof callback === "function") {
        socket.off(event, callback);
    } else {
        socket.off(event);
    }
}

// ============================================================
// MATCH INIT
// ============================================================
//
// État frontend :
//     waiting → playing
//
// Le socket ne change PAS l'état.
// Il transmet simplement "match:init".
//
// ============================================================

export function onDamesMatchInit(callback) {
    return onDames(
        DAMES_EVENTS.MATCH_INIT,
        callback
    );
}

// ============================================================
// MATCH UPDATE
// ============================================================
//
// État frontend :
//     waiting → playing
//     playing → playing
//
// ============================================================

export function onDamesMatchUpdate(callback) {
    return onDames(
        DAMES_EVENTS.MATCH_UPDATE,
        callback
    );
}

// ============================================================
// MATCH END
// ============================================================
//
// FIN OFFICIELLE DU MATCH.
//
// Flux :
//
//     backend
//        ↓
//     settleMatch()
//        ↓
//     match:end
//        ↓
//     damesSocket
//        ↓
//     Dames.jsx
//        ↓
//     gameOver
//        ↓
//     result
//
// Le socket :
// - ne décide pas du gagnant
// - ne calcule pas le résultat
// - ne déclenche pas lui-même la fin
//
// Il transmet exactement le payload backend.
//
// ============================================================

export function onDamesMatchEnd(callback) {
    return onDames(
        DAMES_EVENTS.MATCH_END,
        callback
    );
}

// ============================================================
// CHRONOMÈTRE SERVEUR
// ============================================================
//
// IMPORTANT :
// Aucun chrono local de 90 secondes.
//
// Le backend envoie :
//
// {
//     matchId,
//     player,
//     seconds
// }
//
// ou éventuellement :
//
// {
//     matchId,
//     turn,
//     remaining
// }
//
// Dames.jsx affiche la valeur reçue.
//
// Lorsque le serveur arrive à zéro :
//
//     backend
//         ↓
//     décision moteur
//         ↓
//     settleMatch()
//         ↓
//     match:end
//
// Le frontend ne transforme JAMAIS seconds === 0
// directement en gameOver.
//
// ============================================================

export function onDamesTurnTimer(callback) {
    return onDames(
        DAMES_EVENTS.TURN_TIMER,
        callback
    );
}

// ============================================================
// CHAT MESSAGE
// ============================================================

export function onDamesChatMessage(callback) {
    return onDames(
        DAMES_EVENTS.CHAT_MESSAGE,
        callback
    );
}

// ============================================================
// CHAT TYPING
// ============================================================

export function onDamesChatTyping(callback) {
    return onDames(
        DAMES_EVENTS.CHAT_TYPING,
        callback
    );
}

// ============================================================
// CHAT ERROR
// ============================================================

export function onDamesChatError(callback) {
    return onDames(
        DAMES_EVENTS.CHAT_ERROR,
        callback
    );
}

// ============================================================
// ERREUR SERVEUR
// ============================================================

export function onDamesError(callback) {
    return onDames(
        DAMES_EVENTS.ERROR,
        callback
    );
}

// ============================================================
// PONG
// ============================================================

export function onDamesPong(callback) {
    return onDames(
        DAMES_EVENTS.PONG_TEST,
        callback
    );
}

// ============================================================
// DÉCONNEXION SOCKET
// ============================================================
//
// IMPORTANT :
//
// Cette fonction signifie :
// "fermer volontairement la connexion frontend".
//
// Elle ne signifie PAS :
// "abandonner le match".
//
// Aucun événement d'abandon n'est envoyé.
//
// ============================================================

export function disconnectDamesSocket() {
    if (!socket) {
        currentMatchId = null;
        return;
    }

    console.log(
        "♟️ DAMES SOCKET : fermeture"
    );

    try {
        socket.removeAllListeners();
        socket.disconnect();
    } catch (error) {
        console.error(
            "❌ DAMES SOCKET : erreur déconnexion",
            error
        );
    }

    socket = null;

    // --------------------------------------------------------
    // Ici seulement on efface le match courant.
    //
    // Une simple perte réseau passe par "disconnect"
    // et conserve currentMatchId.
    // --------------------------------------------------------

    currentMatchId = null;
}

// ============================================================
// CONDITIONS
// ============================================================
//
// Aucun événement backend identifié actuellement
// pour l'acceptation des conditions.
//
// On ne simule donc rien.
//
// ============================================================

export function acceptDamesConditions(matchId) {
    console.warn(
        "⚠️ DAMES CONDITIONS : événement backend non implémenté",
        matchId
    );

    return false;
}

// ============================================================
// MATCH COURANT
// ============================================================

export function getCurrentDamesMatchId() {
    return currentMatchId;
}

export function setCurrentDamesMatchId(matchId) {
    currentMatchId =
        normalizeMatchId(matchId);
}

// ============================================================
// EXPORT DEFAULT
// ============================================================

export default {
    DAMES_EVENTS,

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

    acceptDamesConditions,

    getCurrentDamesMatchId,

    setCurrentDamesMatchId,
};