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
//
// SOURCE DE VÉRITÉ : BACKEND
//
// Le backend contrôle :
//   turn:timer  -> affichage du chrono
//   match:end   -> fin officielle du match
//
// Le socket ne fait que transporter ces événements vers Dames.jsx.
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
        localStorage.getItem("jwt") ||
        ""
    );
}

// ============================================================
// NORMALISATION MATCH ID
// ============================================================

function normalizeMatchId(matchId) {
    const id = Number(matchId);

    if (
        !Number.isFinite(id) ||
        id <= 0
    ) {
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

    if (
        socket &&
        socket.connected
    ) {
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

    socket = io(
        SOCKET_URL,
        {
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

            reconnectionAttempts:
                Infinity,

            reconnectionDelay:
                1000,

            reconnectionDelayMax:
                5000,
        }
    );

    // ========================================================
    // CONNEXION
    // ========================================================

    socket.on(
        "connect",
        () => {
            console.log(
                "♟️ DAMES SOCKET CONNECTÉ :",
                socket.id
            );

            // ------------------------------------------------
            // REJOIN AUTOMATIQUE
            // ------------------------------------------------
            //
            // Important après :
            // - perte réseau
            // - changement Wi-Fi
            // - reconnexion Render
            // - réveil du navigateur
            //
            // Le match backend continue.
            // On rejoint simplement sa room.
            // ------------------------------------------------

            if (
                currentMatchId
            ) {
                console.log(
                    "♻️ DAMES REJOIN MATCH :",
                    currentMatchId
                );

                socket.emit(
                    "joinMatch",
                    {
                        matchId:
                            currentMatchId,
                    }
                );
            }
        }
    );

    // ========================================================
    // ERREUR CONNEXION
    // ========================================================

    socket.on(
        "connect_error",
        (error) => {
            console.error(
                "❌ DAMES SOCKET CONNECT ERROR :",
                error?.message ||
                    error
            );
        }
    );

    // ========================================================
    // DÉCONNEXION
    // ========================================================

    socket.on(
        "disconnect",
        (reason) => {
            console.warn(
                "⚠️ DAMES SOCKET DISCONNECT :",
                reason
            );

            // ------------------------------------------------
            // IMPORTANT
            // ------------------------------------------------
            //
            // NE PAS supprimer currentMatchId ici.
            //
            // Socket.IO va tenter de se reconnecter.
            // Une fois reconnecté, le handler "connect"
            // fera automatiquement :
            //
            // socket.emit("joinMatch", { matchId })
            //
            // ------------------------------------------------
        }
    );

    return socket;
}

// ============================================================
// GET SOCKET
// ============================================================

export function getDamesSocket() {
    if (
        !socket
    ) {
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
// BACKEND :
//
// socket.on("joinMatch", async ({ matchId }) => {})
//
// ============================================================

export function joinDamesMatch(
    matchId
) {
    const id =
        normalizeMatchId(
            matchId
        );

    if (!id) {
        console.warn(
            "⚠️ DAMES JOIN : matchId invalide",
            matchId
        );

        return false;
    }

    const s =
        getDamesSocket();

    if (!s) {
        console.error(
            "❌ DAMES JOIN : socket indisponible"
        );

        return false;
    }

    currentMatchId =
        id;

    console.log(
        "📤 DAMES JOIN MATCH :",
        id
    );

    // --------------------------------------------------------
    // Si le socket n'est pas encore connecté,
    // Socket.IO enverra automatiquement le join
    // depuis le handler "connect".
    // --------------------------------------------------------

    if (
        !s.connected
    ) {
        console.log(
            "⏳ DAMES JOIN : attente connexion socket"
        );

        return true;
    }

    s.emit(
        "joinMatch",
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
//   "move",
//   async ({ matchId, move }) => {}
// )
//
// ============================================================

export function sendDamesMove(
    matchId,
    move
) {
    const id =
        normalizeMatchId(
            matchId
        );

    if (!id) {
        console.warn(
            "⚠️ DAMES MOVE : matchId invalide"
        );

        return false;
    }

    if (
        !move ||
        typeof move !==
            "object"
    ) {
        console.warn(
            "⚠️ DAMES MOVE : move invalide"
        );

        return false;
    }

    const s =
        getDamesSocket();

    if (
        !s ||
        !s.connected
    ) {
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
        "move",
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
//
// BACKEND :
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
    const id =
        normalizeMatchId(
            matchId
        );

    if (!id) {
        return false;
    }

    if (
        typeof text !==
            "string" ||
        !text.trim()
    ) {
        return false;
    }

    const s =
        getDamesSocket();

    if (
        !s ||
        !s.connected
    ) {
        return false;
    }

    s.emit(
        "chat:message",
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
//
// BACKEND :
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
    const id =
        normalizeMatchId(
            matchId
        );

    if (!id) {
        return false;
    }

    const s =
        getDamesSocket();

    if (
        !s ||
        !s.connected
    ) {
        return false;
    }

    s.emit(
        "chat:typing",
        {
            matchId: id,
        }
    );

    return true;
}

// ============================================================
// PING
// ============================================================
//
// BACKEND :
//
// socket.on("ping:test", (start) => {
//     socket.emit("pong:test", start);
// });
//
// ============================================================

export function pingDamesSocket(
    value = Date.now()
) {
    const s =
        getDamesSocket();

    if (
        !s ||
        !s.connected
    ) {
        return false;
    }

    s.emit(
        "ping:test",
        value
    );

    return true;
}

// ============================================================
// LISTENER GÉNÉRIQUE
// ============================================================

export function onDames(
    event,
    callback
) {
    const s =
        getDamesSocket();

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

export function offDames(
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
// MATCH INIT
// ============================================================

export function onDamesMatchInit(
    callback
) {
    return onDames(
        "match:init",
        callback
    );
}

// ============================================================
// MATCH UPDATE
// ============================================================

export function onDamesMatchUpdate(
    callback
) {
    return onDames(
        "match:update",
        callback
    );
}

// ============================================================
// MATCH END
// ============================================================
//
// IMPORTANT :
// Cet événement est la FIN OFFICIELLE.
//
// Il peut être déclenché par :
// - victoire normale
// - absence de coups
// - défaite du joueur
// - timeout backend
// - IA qui termine la partie
// - toute autre règle du moteur
//
// Le socket NE DÉCIDE PAS du gagnant.
//
// Il transmet intégralement le payload
// reçu du backend à Dames.jsx.
//
// Dames.jsx doit alors :
//   gameOver = true
//   winnerSide = ...
//   draw = ...
//   resultReady = true
//   reviewOpen = true
//
// ============================================================

export function onDamesMatchEnd(
    callback
) {
    return onDames(
        "match:end",
        callback
    );
}

// ============================================================
// CHRONOMÈTRE SERVEUR
// ============================================================
//
// IMPORTANT :
// Aucun chrono local de 90 secondes ici.
//
// Le backend envoie :
//
// turn:timer
//
// avec par exemple :
//
// {
//     matchId,
//     player,
//     seconds
// }
//
// ou :
//
// {
//     matchId,
//     turn,
//     remaining
// }
//
// Dames.jsx affiche simplement la valeur reçue.
//
// Lorsque le chrono arrive à zéro,
// le backend doit déclencher "match:end".
//
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
// CHAT MESSAGE
// ============================================================

export function onDamesChatMessage(
    callback
) {
    return onDames(
        "chat:message",
        callback
    );
}

// ============================================================
// CHAT TYPING
// ============================================================

export function onDamesChatTyping(
    callback
) {
    return onDames(
        "chat:typing",
        callback
    );
}

// ============================================================
// CHAT ERROR
// ============================================================

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
// Cette fonction ne signifie PAS "abandon".
//
// Elle ferme uniquement la connexion frontend.
//
// Aucun événement d'abandon n'est envoyé au backend.
//
// ============================================================

export function disconnectDamesSocket() {
    if (!socket) {
        currentMatchId =
            null;

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
    currentMatchId =
        null;
}

// ============================================================
// CONDITIONS
// ============================================================
//
// Pour l'instant, le backend ne possède pas d'événement
// d'acceptation des conditions.
//
// On ne simule donc rien côté socket.
//
// ============================================================

export function acceptDamesConditions(
    matchId
) {
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

export function setCurrentDamesMatchId(
    matchId
) {
    currentMatchId =
        normalizeMatchId(
            matchId
        );
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

    acceptDamesConditions,

    getCurrentDamesMatchId,

    setCurrentDamesMatchId,
};