// ==========================================================
// BRAVMAN SOCKET
// Système d'Arbitrage Centralisé (SAC)
// ==========================================================
//
// Responsabilités
//
// ✓ Connexion Socket.IO BraVMan
// ✓ Authentification JWT
// ✓ Gestion des événements BraVMan
// ✓ JOIN d'une partie
// ✓ Envoi des TAP
// ✓ Demande d'état
// ✓ Réception des mises à jour
// ✓ Réception du démarrage
// ✓ Réception de la fin de partie
// ✓ Gestion des erreurs
// ✓ Nettoyage propre
//
// Ne gère jamais
//
// ✗ API REST
// ✗ Création de match
// ✗ Join financier SAC
// ✗ PostgreSQL
// ✗ Logique du jeu
// ✗ Calcul du gagnant
//
// ==========================================================

import { io } from "socket.io-client";


// ==========================================================
// CONFIGURATION
// ==========================================================

const GAME_ID = "bravman";

const API_URL =
    import.meta.env.VITE_API_URL || "";

const SOCKET_URL =
    import.meta.env.VITE_SOCKET_URL ||
    API_URL.replace(/\/api\/?$/, "");

const SOCKET_TIMEOUT = 15000;


// ==========================================================
// NORMALISATION
// ==========================================================

const normalizeId = (value) => {

    const id = Number(value);

    return Number.isFinite(id) && id > 0
        ? id
        : null;

};


// ==========================================================
// TOKEN
// ==========================================================

const getToken = () => {

    const token =
        localStorage.getItem("token");

    if (!token) {

        console.error(
            "BRAVMAN SOCKET : TOKEN ABSENT"
        );

        return null;
    }

    return token;

};


// ==========================================================
// SOCKET INSTANCE
// ==========================================================

let socket = null;


// ==========================================================
// ÉTAT INTERNE
// ==========================================================

let currentMatchId = null;
let currentUserId = null;


// ==========================================================
// HANDLERS
// ==========================================================

const handlers = {

    connect: new Set(),

    disconnect: new Set(),

    connectError: new Set(),

    update: new Set(),

    matchReady: new Set(),

    joined: new Set(),

    running: new Set(),

    finished: new Set(),

    tapRejected: new Set(),

    error: new Set()

};


// ==========================================================
// UTILITAIRE HANDLERS
// ==========================================================

const notify = (
    collection,
    payload
) => {

    collection.forEach(
        (handler) => {

            try {

                handler(payload);

            }
            catch (error) {

                console.error(
                    "BRAVMAN SOCKET HANDLER ERROR:",
                    error
                );

            }

        }
    );

};


// ==========================================================
// INSTALLATION DES LISTENERS
// ==========================================================

const installListeners = (instance) => {

    // ------------------------------------------------------
    // CONNECT
    // ------------------------------------------------------

    instance.on(
        "connect",
        () => {

            console.log(
                "================================="
            );

            console.log(
                "🟢 BRAVMAN SOCKET CONNECTED"
            );

            console.log(
                "socket:",
                instance.id
            );

            console.log(
                "================================="
            );

            notify(
                handlers.connect,
                {
                    socketId:
                        instance.id
                }
            );

        }
    );


    // ------------------------------------------------------
    // DISCONNECT
    // ------------------------------------------------------

    instance.on(
        "disconnect",
        (reason) => {

            console.warn(
                "🔴 BRAVMAN SOCKET DISCONNECTED:",
                reason
            );

            notify(
                handlers.disconnect,
                reason
            );

        }
    );


    // ------------------------------------------------------
    // CONNECT ERROR
    // ------------------------------------------------------

    instance.on(
        "connect_error",
        (error) => {

            console.error(
                "BRAVMAN SOCKET CONNECT ERROR:",
                error
            );

            notify(
                handlers.connectError,
                error
            );

        }
    );


    // ------------------------------------------------------
    // UPDATE
    // ------------------------------------------------------

    instance.on(
        "bravman:update",
        (payload) => {

            console.log(
                "BRAVMAN SOCKET UPDATE:",
                payload
            );

            notify(
                handlers.update,
                payload
            );

        }
    );


    // ------------------------------------------------------
    // MATCH READY
    // ------------------------------------------------------

    instance.on(
        "bravman:matchReady",
        (payload) => {

            console.log(
                "🔥 BRAVMAN MATCH READY:",
                payload
            );

            notify(
                handlers.matchReady,
                payload
            );

        }
    );


    // ------------------------------------------------------
    // JOINED
    // ------------------------------------------------------

    instance.on(
        "bravman:joined",
        (payload) => {

            console.log(
                "BRAVMAN JOINED:",
                payload
            );

            notify(
                handlers.joined,
                payload
            );

        }
    );


    // ------------------------------------------------------
    // RUNNING
    // ------------------------------------------------------

    instance.on(
        "bravman:running",
        (payload) => {

            console.log(
                "BRAVMAN RUNNING:",
                payload
            );

            notify(
                handlers.running,
                payload
            );

        }
    );


    // ------------------------------------------------------
    // FINISHED
    // ------------------------------------------------------

    instance.on(
        "bravman:finished",
        (payload) => {

            console.log(
                "🏁 BRAVMAN FINISHED:",
                payload
            );

            notify(
                handlers.finished,
                payload
            );

        }
    );


    // ------------------------------------------------------
    // TAP REJECTED
    // ------------------------------------------------------

    instance.on(
        "bravman:tapRejected",
        (payload) => {

            console.warn(
                "BRAVMAN TAP REJECTED:",
                payload
            );

            notify(
                handlers.tapRejected,
                payload
            );

        }
    );


    // ------------------------------------------------------
    // ERROR
    // ------------------------------------------------------

    instance.on(
        "bravman:error",
        (payload) => {

            console.error(
                "BRAVMAN SOCKET ERROR:",
                payload
            );

            notify(
                handlers.error,
                payload
            );

        }
    );

};


// ==========================================================
// CONNEXION
// ==========================================================

const connect = () => {

    // ------------------------------------------------------
    // DÉJÀ CONNECTÉ
    // ------------------------------------------------------

    if (
        socket &&
        socket.connected
    ) {

        return socket;

    }


    // ------------------------------------------------------
    // URL
    // ------------------------------------------------------

    if (!SOCKET_URL) {

        const error =
            new Error(
                "VITE_SOCKET_URL est absent. Impossible de connecter BraVMan."
            );

        console.error(
            "BRAVMAN SOCKET URL ABSENTE"
        );

        notify(
            handlers.connectError,
            error
        );

        return null;

    }


    // ------------------------------------------------------
    // TOKEN
    // ------------------------------------------------------

    const token =
        getToken();

    if (!token) {

        const error =
            new Error(
                "Token manquant."
            );

        notify(
            handlers.connectError,
            error
        );

        return null;

    }


    // ------------------------------------------------------
    // CRÉATION SOCKET
    // ------------------------------------------------------

    console.log(
        "BRAVMAN SOCKET URL:",
        SOCKET_URL
    );


    socket =
        io(
            SOCKET_URL,
            {

                transports: [
                    "websocket",
                    "polling"
                ],

                auth: {
                    token
                },

                autoConnect: true,

                reconnection: true,

                reconnectionAttempts:
                    Infinity,

                reconnectionDelay:
                    1000,

                timeout:
                    SOCKET_TIMEOUT

            }
        );


    // ------------------------------------------------------
    // LISTENERS
    // ------------------------------------------------------

    installListeners(
        socket
    );


    return socket;

};


// ==========================================================
// DISCONNECTION
// ==========================================================

const disconnect = () => {

    if (!socket) {
        return;
    }


    console.log(
        "BRAVMAN SOCKET DISCONNECT"
    );


    socket.disconnect();

    socket = null;

    currentMatchId = null;
    currentUserId = null;

};


// ==========================================================
// SOCKET INSTANCE
// ==========================================================

const getSocket = () => {

    return socket;

};


// ==========================================================
// ÉTAT CONNEXION
// ==========================================================

const isConnected = () => {

    return Boolean(
        socket &&
        socket.connected
    );

};


// ==========================================================
// JOIN MATCH
// ==========================================================

const join = (
    matchId,
    userId
) => {

    const instance =
        socket || connect();

    if (!instance) {

        throw new Error(
            "Socket BraVMan non disponible."
        );

    }


    const numericMatchId =
        normalizeId(matchId);

    const numericUserId =
        normalizeId(userId);


    if (!numericMatchId) {

        throw new Error(
            "Identifiant de match BraVMan invalide."
        );

    }


    if (!numericUserId) {

        throw new Error(
            "Identifiant utilisateur BraVMan invalide."
        );

    }


    currentMatchId =
        numericMatchId;

    currentUserId =
        numericUserId;


    console.log(
        "================================="
    );

    console.log(
        "BRAVMAN SOCKET JOIN"
    );

    console.log(
        "game:",
        GAME_ID
    );

    console.log(
        "match:",
        numericMatchId
    );

    console.log(
        "user:",
        numericUserId
    );

    console.log(
        "socket:",
        instance.id
    );

    console.log(
        "================================="
    );


    instance.emit(
        "bravman:join",
        {

            matchId:
                numericMatchId,

            userId:
                numericUserId

        }
    );

};


// ==========================================================
// TAP
// ==========================================================

const tap = (
    matchId = currentMatchId,
    userId = currentUserId
) => {

    const instance =
        socket;

    if (!instance) {

        console.warn(
            "BRAVMAN TAP : socket absente."
        );

        return false;

    }


    if (!instance.connected) {

        console.warn(
            "BRAVMAN TAP : socket non connectée."
        );

        return false;

    }


    const numericMatchId =
        normalizeId(matchId);

    const numericUserId =
        normalizeId(userId);


    if (!numericMatchId) {

        console.warn(
            "BRAVMAN TAP : matchId invalide."
        );

        return false;

    }


    if (!numericUserId) {

        console.warn(
            "BRAVMAN TAP : userId invalide."
        );

        return false;

    }


    instance.emit(
        "bravman:tap",
        {

            matchId:
                numericMatchId,

            userId:
                numericUserId

        }
    );


    return true;

};


// ==========================================================
// REQUEST STATE
// ==========================================================

const requestState = (
    matchId = currentMatchId
) => {

    const instance =
        socket;

    if (!instance) {

        console.warn(
            "BRAVMAN STATE : socket absente."
        );

        return false;

    }


    if (!instance.connected) {

        console.warn(
            "BRAVMAN STATE : socket non connectée."
        );

        return false;

    }


    const numericMatchId =
        normalizeId(matchId);


    if (!numericMatchId) {

        console.warn(
            "BRAVMAN STATE : matchId invalide."
        );

        return false;

    }


    currentMatchId =
        numericMatchId;


    instance.emit(
        "bravman:state"
    );


    return true;

};


// ==========================================================
// MATCH COURANT
// ==========================================================

const setMatch = (
    matchId,
    userId
) => {

    currentMatchId =
        normalizeId(matchId);

    currentUserId =
        normalizeId(userId);

};


// ==========================================================
// GET MATCH COURANT
// ==========================================================

const getCurrentMatchId = () => {

    return currentMatchId;

};


// ==========================================================
// GET USER COURANT
// ==========================================================

const getCurrentUserId = () => {

    return currentUserId;

};


// ==========================================================
// SUBSCRIBE
// ==========================================================

const subscribe = (
    event,
    handler
) => {

    if (
        !handlers[event] ||
        typeof handler !== "function"
    ) {

        return () => {};

    }


    handlers[event].add(
        handler
    );


    return () => {

        handlers[event].delete(
            handler
        );

    };

};


// ==========================================================
// EVENT API
// ==========================================================

const onConnect = (
    handler
) => {

    return subscribe(
        "connect",
        handler
    );

};


const onDisconnect = (
    handler
) => {

    return subscribe(
        "disconnect",
        handler
    );

};


const onConnectError = (
    handler
) => {

    return subscribe(
        "connectError",
        handler
    );

};


const onUpdate = (
    handler
) => {

    return subscribe(
        "update",
        handler
    );

};


const onMatchReady = (
    handler
) => {

    return subscribe(
        "matchReady",
        handler
    );

};


const onJoined = (
    handler
) => {

    return subscribe(
        "joined",
        handler
    );

};


const onRunning = (
    handler
) => {

    return subscribe(
        "running",
        handler
    );

};


const onFinished = (
    handler
) => {

    return subscribe(
        "finished",
        handler
    );

};


const onTapRejected = (
    handler
) => {

    return subscribe(
        "tapRejected",
        handler
    );

};


const onError = (
    handler
) => {

    return subscribe(
        "error",
        handler
    );

};


// ==========================================================
// RESET
// ==========================================================

const reset = () => {

    currentMatchId = null;

    currentUserId = null;

};


// ==========================================================
// EXPORT
// ==========================================================

const bravmanSocket = {

    // Configuration

    GAME_ID,

    SOCKET_URL,


    // Connection

    connect,

    disconnect,

    getSocket,

    isConnected,


    // Match

    setMatch,

    getCurrentMatchId,

    getCurrentUserId,

    join,


    // Gameplay

    tap,

    requestState,


    // Events

    onConnect,

    onDisconnect,

    onConnectError,

    onUpdate,

    onMatchReady,

    onJoined,

    onRunning,

    onFinished,

    onTapRejected,

    onError,


    // Reset

    reset

};


export default bravmanSocket;