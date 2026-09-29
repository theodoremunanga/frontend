// ============================================================
// 6BETBALL — SAC / LUDO SOCKET
// frontend/src/sac/games/ludo/ludoSocket.js
//
// RESPONSABILITÉS
// ------------------------------------------------------------
// - Connexion Socket.IO dédiée au Ludo
// - Authentification par JWT
// - Join / leave d'une partie
// - Demande d'état serveur
// - Restore d'une partie
// - Start d'une partie
// - Lancer le dé
// - Déplacer un pion
// - Exposition du socket brut pour Ludo.jsx
// - Nettoyage propre de la connexion
//
// ARCHITECTURE
// ------------------------------------------------------------
// SAC REST = argent / mise / création / join / settlement
// Socket    = temps réel / état de jeu / actions de jeu
// Engine    = règles Ludo côté backend
//
// IMPORTANT
// ------------------------------------------------------------
// Le frontend NE CALCULE PAS :
// - la valeur réelle du dé
// - les déplacements
// - les pions légaux
// - le changement de tour
// - la victoire
// - le timeout
// - le gain financier
//
// Toutes ces décisions viennent du backend.
//
// Le socket utilise la NAMESPACE ROOT.
// Il ne faut PAS utiliser io("/ludo") ici :
// cela provoquerait "Invalid namespace" si le backend
// n'expose pas explicitement cette namespace.
// ============================================================

import { io } from "socket.io-client";


// ============================================================
// CONFIGURATION
// ============================================================

const GAME = "ludo";

const DEFAULT_SOCKET_OPTIONS = Object.freeze({
    transports: [
        "websocket",
        "polling",
    ],

    autoConnect: false,

    reconnection: true,

    reconnectionAttempts: Infinity,

    reconnectionDelay: 1000,

    reconnectionDelayMax: 5000,

    timeout: 10000,
});


// ============================================================
// URL SOCKET
// ============================================================
//
// Exemple développement :
//
// VITE_API_URL=http://localhost:3000
//
// Exemple production :
//
// VITE_API_URL=https://backend-ad3t.onrender.com
//
// Si VITE_API_URL contient /api, on le retire.
// Socket.IO se connecte au serveur HTTP principal.
// ============================================================

function normalizeSocketUrl(value) {

    if (!value) {
        return "";
    }

    return String(value)
        .trim()
        .replace(/\/+$/, "")
        .replace(/\/api$/i, "");
}


function getSocketUrl() {

    const envUrl =
        normalizeSocketUrl(
            import.meta?.env?.VITE_API_URL
        );

    if (envUrl) {
        return envUrl;
    }

    if (
        typeof window !== "undefined" &&
        window.location?.origin
    ) {
        return window.location.origin;
    }

    return "";
}


// ============================================================
// TOKEN
// ============================================================

function getStoredToken() {

    if (
        typeof localStorage ===
        "undefined"
    ) {
        return "";
    }

    return (
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken") ||
        ""
    );
}


// ============================================================
// NORMALISATION ID
// ============================================================

function normalizeId(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return null;
    }

    const numeric =
        Number(value);

    return Number.isFinite(numeric)
        ? numeric
        : null;
}


function normalizeMatchId(value) {

    const id =
        normalizeId(value);

    if (
        id === null ||
        id <= 0
    ) {
        return null;
    }

    return id;
}


function normalizeUserId(value) {

    const id =
        normalizeId(value);

    if (
        id === null ||
        id <= 0
    ) {
        return null;
    }

    return id;
}


function normalizePawnId(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return null;
    }

    return String(value);
}


// ============================================================
// SOCKET SINGLETON
// ============================================================

let socket = null;

let socketUrl = "";

let currentToken = "";


// ============================================================
// CRÉATION DU SOCKET
// ============================================================

function createSocket() {

    if (socket) {
        return socket;
    }

    socketUrl =
        getSocketUrl();

    socket = io(
        socketUrl,
        {
            ...DEFAULT_SOCKET_OPTIONS,

            auth: {
                token:
                    currentToken ||
                    getStoredToken(),
            },

            // ROOT NAMESPACE
            //
            // Pas de :
            // io("/ludo")
            //
            // Les événements sont préfixés :
            // ludo:join
            // ludo:rollDice
            // ludo:movePawn
            // etc.
            forceNew: false,
        }
    );

    registerInternalSocketLogs(
        socket
    );

    return socket;
}


// ============================================================
// LOGS INTERNES
// ============================================================

function registerInternalSocketLogs(
    instance
) {

    if (!instance) {
        return;
    }


    instance.on(
        "connect",
        () => {

            console.log(
                "🟢 LUDO SOCKET CONNECTED:",
                instance.id
            );

        }
    );


    instance.on(
        "disconnect",
        reason => {

            console.log(
                "🟡 LUDO SOCKET DISCONNECTED:",
                reason
            );

        }
    );


    instance.on(
        "connect_error",
        error => {

            console.error(
                "🔴 LUDO SOCKET CONNECT ERROR:",
                error?.message ||
                error
            );

        }
    );


    instance.io?.on(
        "reconnect",
        attempt => {

            console.log(
                "🔄 LUDO SOCKET RECONNECTED:",
                attempt
            );

        }
    );


    instance.io?.on(
        "reconnect_error",
        error => {

            console.warn(
                "⚠️ LUDO SOCKET RECONNECT ERROR:",
                error?.message ||
                error
            );

        }
    );
}


// ============================================================
// GET SOCKET
// ============================================================

export function getLudoSocket() {

    return createSocket();
}


// Alias générique

export function getSocket() {

    return getLudoSocket();
}


// ============================================================
// CONNEXION
// ============================================================

export function connectLudoSocket(
    options = {}
) {

    const instance =
        createSocket();

    const token =
        options?.token ||
        getStoredToken();


    if (token) {

        currentToken =
            String(token);

        instance.auth = {
            token:
                currentToken,
        };
    }


    if (!instance.connected) {

        instance.connect();

    }


    return instance;
}


// Alias

export function connectSocket(
    options = {}
) {

    return connectLudoSocket(
        options
    );
}


export function connect(
    options = {}
) {

    return connectLudoSocket(
        options
    );
}


// ============================================================
// DÉCONNEXION
// ============================================================

export function disconnectLudoSocket() {

    if (!socket) {
        return;
    }


    try {

        socket.disconnect();

    } catch (error) {

        console.warn(
            "Ludo socket disconnect:",
            error
        );

    }
}


export function disconnectSocket() {

    return disconnectLudoSocket();

}


export function disconnect() {

    return disconnectLudoSocket();

}


// ============================================================
// DESTROY SOCKET
// ============================================================

export function destroyLudoSocket() {

    if (!socket) {
        return;
    }


    try {

        socket.removeAllListeners();

        socket.disconnect();

    } catch (error) {

        console.warn(
            "Ludo socket destroy:",
            error
        );

    }


    socket = null;

    currentToken = "";

    socketUrl = "";
}


// ============================================================
// EMIT
// ============================================================

function emit(
    event,
    payload = {},
    callback
) {

    const instance =
        getLudoSocket();


    if (
        !instance ||
        typeof instance.emit !==
        "function"
    ) {

        return false;

    }


    if (
        typeof callback ===
        "function"
    ) {

        instance.emit(
            event,
            payload,
            callback
        );

    } else {

        instance.emit(
            event,
            payload
        );

    }


    return true;
}


// ============================================================
// EMIT AVEC ACK
// ============================================================

export function emitWithAck(
    event,
    payload = {},
    timeout = 10000
) {

    const instance =
        getLudoSocket();


    if (
        !instance ||
        typeof instance.timeout !==
        "function"
    ) {

        return Promise.resolve(
            emit(
                event,
                payload
            )
        );

    }


    return new Promise(
        resolve => {

            instance
                .timeout(timeout)
                .emit(
                    event,
                    payload,
                    (
                        error,
                        response
                    ) => {

                        if (error) {

                            resolve({
                                ok: false,
                                error,
                            });

                            return;
                        }


                        resolve({
                            ok: true,
                            response,
                        });

                    }
                );

        }
    );
}


// ============================================================
// JOIN LUDO
// ============================================================

export function joinLudoMatch(
    matchId,
    userId
) {

    const normalizedMatchId =
        normalizeMatchId(
            matchId
        );


    const normalizedUserId =
        normalizeUserId(
            userId
        );


    if (
        !normalizedMatchId ||
        !normalizedUserId
    ) {

        console.error(
            "❌ LUDO JOIN: identifiants invalides",
            {
                matchId,
                userId,
            }
        );

        return false;
    }


    connectLudoSocket();


    return emit(
        "ludo:join",
        {
            game: GAME,

            matchId:
                normalizedMatchId,

            userId:
                normalizedUserId,

            playerId:
                normalizedUserId,
        }
    );
}


// Alias

export function joinMatch(
    matchId,
    userId
) {

    return joinLudoMatch(
        matchId,
        userId
    );

}


// ============================================================
// LEAVE LUDO
// ============================================================

export function leaveLudoMatch(
    matchId,
    userId
) {

    const normalizedMatchId =
        normalizeMatchId(
            matchId
        );


    const normalizedUserId =
        normalizeUserId(
            userId
        );


    if (
        !normalizedMatchId
    ) {

        return false;

    }


    return emit(
        "ludo:leave",
        {
            game: GAME,

            matchId:
                normalizedMatchId,

            userId:
                normalizedUserId,

            playerId:
                normalizedUserId,
        }
    );
}


// Alias

export function leaveMatch(
    matchId,
    userId
) {

    return leaveLudoMatch(
        matchId,
        userId
    );

}


// ============================================================
// DEMANDER L'ÉTAT
// ============================================================

export function requestLudoState(
    matchId
) {

    const normalizedMatchId =
        normalizeMatchId(
            matchId
        );


    if (
        !normalizedMatchId
    ) {

        return false;

    }


    connectLudoSocket();


    return emit(
        "ludo:state",
        {
            game: GAME,

            matchId:
                normalizedMatchId,
        }
    );
}


// Alias

export function requestState(
    matchId
) {

    return requestLudoState(
        matchId
    );

}


export function getLudoState(
    matchId
) {

    return requestLudoState(
        matchId
    );

}


// ============================================================
// RESTORE
// ============================================================

export function restoreLudoMatch(
    matchId,
    userId
) {

    const normalizedMatchId =
        normalizeMatchId(
            matchId
        );


    const normalizedUserId =
        normalizeUserId(
            userId
        );


    if (
        !normalizedMatchId
    ) {

        return false;

    }


    connectLudoSocket();


    return emit(
        "ludo:restore",
        {
            game: GAME,

            matchId:
                normalizedMatchId,

            userId:
                normalizedUserId,

            playerId:
                normalizedUserId,
        }
    );
}


// Alias

export function restoreMatch(
    matchId,
    userId
) {

    return restoreLudoMatch(
        matchId,
        userId
    );

}


export function restore(
    matchId,
    userId
) {

    return restoreLudoMatch(
        matchId,
        userId
    );

}


// ============================================================
// START LUDO
// ============================================================

export function startLudoMatch(
    matchId,
    userId
) {

    const normalizedMatchId =
        normalizeMatchId(
            matchId
        );


    const normalizedUserId =
        normalizeUserId(
            userId
        );


    if (
        !normalizedMatchId
    ) {

        return false;

    }


    connectLudoSocket();


    return emit(
        "ludo:start",
        {
            game: GAME,

            matchId:
                normalizedMatchId,

            userId:
                normalizedUserId,

            playerId:
                normalizedUserId,
        }
    );
}


// Alias

export function startMatch(
    matchId,
    userId
) {

    return startLudoMatch(
        matchId,
        userId
    );

}


// ============================================================
// LANCER LE DÉ
// ============================================================
//
// IMPORTANT :
// Le frontend ne transmet jamais la valeur du dé.
//
// Le serveur génère le résultat.
// ============================================================

export function rollLudoDice(
    matchId,
    userId
) {

    const normalizedMatchId =
        normalizeMatchId(
            matchId
        );


    const normalizedUserId =
        normalizeUserId(
            userId
        );


    if (
        !normalizedMatchId ||
        !normalizedUserId
    ) {

        console.error(
            "❌ LUDO ROLL: identifiants invalides",
            {
                matchId,
                userId,
            }
        );

        return false;
    }


    connectLudoSocket();


    return emit(
        "ludo:rollDice",
        {
            game: GAME,

            matchId:
                normalizedMatchId,

            playerId:
                normalizedUserId,

            userId:
                normalizedUserId,
        }
    );
}


// Alias

export function sendLudoRoll(
    matchId,
    userId
) {

    return rollLudoDice(
        matchId,
        userId
    );

}


export function rollDice(
    matchId,
    userId
) {

    return rollLudoDice(
        matchId,
        userId
    );

}


// ============================================================
// DÉPLACER UN PION
// ============================================================

export function moveLudoPawn(
    matchId,
    userId,
    pawnId
) {

    const normalizedMatchId =
        normalizeMatchId(
            matchId
        );


    const normalizedUserId =
        normalizeUserId(
            userId
        );


    const normalizedPawnId =
        normalizePawnId(
            pawnId
        );


    if (
        !normalizedMatchId ||
        !normalizedUserId ||
        !normalizedPawnId
    ) {

        console.error(
            "❌ LUDO MOVE: paramètres invalides",
            {
                matchId,
                userId,
                pawnId,
            }
        );

        return false;
    }


    connectLudoSocket();


    return emit(
        "ludo:movePawn",
        {
            game: GAME,

            matchId:
                normalizedMatchId,

            playerId:
                normalizedUserId,

            userId:
                normalizedUserId,

            pawnId:
                normalizedPawnId,
        }
    );
}


// Alias

export function sendLudoMove(
    matchId,
    userId,
    pawnId
) {

    return moveLudoPawn(
        matchId,
        userId,
        pawnId
    );

}


export function movePawn(
    matchId,
    userId,
    pawnId
) {

    return moveLudoPawn(
        matchId,
        userId,
        pawnId
    );

}


// ============================================================
// ABONNEMENT AUX ÉVÉNEMENTS LUDO
// ============================================================
//
// Événements prévus par Ludo.jsx :
//
// ludo:stateUpdate
// ludo:state
// ludo:joined
// ludo:gameStarted
// ludo:rollResult
// ludo:moveResult
// ludo:gameFinished
// ludo:timeout
// ludo:botResult
// ludo:error
// ludo:playerLeft
// ============================================================

export function subscribeLudoSocket(
    handlers = {}
) {

    const instance =
        getLudoSocket();


    const subscriptions = [

        [
            "ludo:stateUpdate",
            handlers.state ||
            handlers.stateUpdate,
        ],

        [
            "ludo:state",
            handlers.stateRequest,
        ],

        [
            "ludo:joined",
            handlers.joined,
        ],

        [
            "ludo:gameStarted",
            handlers.gameStarted ||
            handlers.started,
        ],

        [
            "ludo:rollResult",
            handlers.roll ||
            handlers.rollResult,
        ],

        [
            "ludo:moveResult",
            handlers.move ||
            handlers.moveResult,
        ],

        [
            "ludo:gameFinished",
            handlers.finished ||
            handlers.gameFinished,
        ],

        [
            "ludo:timeout",
            handlers.timeout,
        ],

        [
            "ludo:botResult",
            handlers.bot ||
            handlers.botResult,
        ],

        [
            "ludo:error",
            handlers.error,
        ],

        [
            "ludo:playerLeft",
            handlers.playerLeft,
        ],

    ];


    const registered = [];


    for (
        const [
            event,
            handler,
        ] of subscriptions
    ) {

        if (
            typeof handler !==
            "function"
        ) {

            continue;

        }


        instance.on(
            event,
            handler
        );


        registered.push({
            event,
            handler,
        });

    }


    // Fonction de nettoyage

    return () => {

        for (
            const item of registered
        ) {

            instance.off(
                item.event,
                item.handler
            );

        }

    };
}


// ============================================================
// ON LUDO EVENT
// ============================================================

export function onLudoEvent(
    event,
    handler
) {

    const instance =
        getLudoSocket();


    if (
        !event ||
        typeof handler !==
        "function"
    ) {

        return () => {};

    }


    instance.on(
        event,
        handler
    );


    return () => {

        instance.off(
            event,
            handler
        );

    };
}


// ============================================================
// OFF LUDO EVENT
// ============================================================

export function offLudoEvent(
    event,
    handler
) {

    const instance =
        getLudoSocket();


    if (!event) {
        return;
    }


    if (
        typeof handler ===
        "function"
    ) {

        instance.off(
            event,
            handler
        );

        return;
    }


    instance.off(
        event
    );
}


// ============================================================
// ÉTAT DU SOCKET
// ============================================================

export function isLudoSocketConnected() {

    return Boolean(
        socket?.connected
    );

}


export function getLudoSocketId() {

    return socket?.id || null;

}


export function getLudoSocketUrl() {

    return (
        socketUrl ||
        getSocketUrl()
    );

}


// ============================================================
// EXPORT PAR DÉFAUT
// ============================================================

const ludoSocket = {

    getLudoSocket,

    getSocket,

    connectLudoSocket,

    connectSocket,

    connect,

    disconnectLudoSocket,

    disconnectSocket,

    disconnect,

    destroyLudoSocket,

    joinLudoMatch,

    joinMatch,

    leaveLudoMatch,

    leaveMatch,

    requestLudoState,

    requestState,

    getLudoState,

    restoreLudoMatch,

    restoreMatch,

    restore,

    startLudoMatch,

    startMatch,

    rollLudoDice,

    sendLudoRoll,

    rollDice,

    moveLudoPawn,

    sendLudoMove,

    movePawn,

    subscribeLudoSocket,

    onLudoEvent,

    offLudoEvent,

    isLudoSocketConnected,

    getLudoSocketId,

    getLudoSocketUrl,

    emitWithAck,

};


export default ludoSocket;