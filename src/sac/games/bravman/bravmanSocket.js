// ==========================================================
// BRAVMAN — SOCKET FRONTEND
// Système d'Arbitrage Centralisé (SAC)
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


// ==========================================================
// TOKEN
// ==========================================================

const getAuthToken = () => {

    if (
        typeof window ===
        "undefined"
    ) {

        return null;

    }


    const storageKeys = [

        "token",

        "accessToken",

        "authToken",

        "jwt"

    ];


    for (
        const key of storageKeys
    ) {

        const localValue =
            window.localStorage.getItem(
                key
            );

        if (localValue) {

            return localValue;

        }


        const sessionValue =
            window.sessionStorage.getItem(
                key
            );

        if (sessionValue) {

            return sessionValue;

        }

    }


    return null;

};


// ==========================================================
// SOCKET.IO
// ==========================================================

const socket = io(
    SOCKET_URL || undefined,
    {

        autoConnect: false,

        transports: [
            "websocket",
            "polling"
        ],

        reconnection: true,

        reconnectionAttempts:
            Infinity,

        reconnectionDelay:
            1000,

        reconnectionDelayMax:
            5000,

        auth: (callback) => {

            const token =
                getAuthToken();


            console.log(
                "BRAVMAN SOCKET AUTH:",
                token
                    ? "TOKEN PRÉSENT"
                    : "TOKEN ABSENT"
            );


            callback({

                token

            });

        }

    }
);


// ==========================================================
// ETAT LOCAL DU SOCKET
// ==========================================================

let currentMatchId = null;

let currentUserId = null;


// ==========================================================
// NORMALISATION
// ==========================================================

const normalizeId = (
    value
) => {

    const id =
        Number(value);

    return Number.isFinite(id) &&
        id > 0
        ? id
        : null;

};


// ==========================================================
// NORMALISER MATCH ID
// ==========================================================

const normalizeMatchId = (
    value
) => {

    return normalizeId(
        value
    );

};


// ==========================================================
// NORMALISER USER ID
// ==========================================================

const normalizeUserId = (
    value
) => {

    return normalizeId(
        value
    );

};


// ==========================================================
// DEFINIR LA PARTIE COURANTE
// ==========================================================

const setMatch = (
    matchId,
    userId
) => {

    currentMatchId =
        normalizeMatchId(
            matchId
        );

    currentUserId =
        normalizeUserId(
            userId
        );

};


// ==========================================================
// OBTENIR LE SOCKET
// ==========================================================

const getSocket = () => {

    return socket;

};


// ==========================================================
// ETAT DE CONNEXION
// ==========================================================

const isConnected = () => {

    return socket.connected;

};


// ==========================================================
// CONNECT
// ==========================================================

const connect = () => {

    const token =
        getAuthToken();


    console.log(
        "BRAVMAN SOCKET CONNECT",
        {
            hasToken:
                Boolean(token),

            socketConnected:
                socket.connected,

            socketActive:
                socket.active
        }
    );


    if (!token) {

        console.error(
            "BRAVMAN SOCKET CONNECT BLOCKED: TOKEN ABSENT"
        );

        return false;

    }


    /*
     * Important :
     *
     * On réactualise explicitement auth
     * avant socket.connect().
     *
     * Cela évite que le socket ait été
     * créé avant l'authentification.
     */

    socket.auth = {
        token
    };


    if (
        !socket.connected
    ) {

        socket.connect();

    }


    return true;

};


// ==========================================================
// DISCONNECT
// ==========================================================

const disconnect = () => {

    if (
        socket.connected
    ) {

        console.log(
            "BRAVMAN SOCKET DISCONNECT"
        );


        socket.disconnect();

    }

};


// ==========================================================
// JOIN MATCH
// ==========================================================

const join = (
    matchId = currentMatchId,
    userId = currentUserId
) => {

    const numericMatchId =
        normalizeMatchId(
            matchId
        );

    const numericUserId =
        normalizeUserId(
            userId
        );


    if (
        !numericMatchId ||
        !numericUserId
    ) {

        console.error(
            "BRAVMAN SOCKET JOIN INVALID",
            {
                matchId,
                userId
            }
        );

        return false;

    }


    setMatch(
        numericMatchId,
        numericUserId
    );


    if (
        !socket.connected
    ) {

        console.warn(
            "BRAVMAN SOCKET JOIN WAITING FOR CONNECTION"
        );

        const connectHandler =
            () => {

                socket.off(
                    "connect",
                    connectHandler
                );


                join(
                    numericMatchId,
                    numericUserId
                );

            };


        socket.once(
            "connect",
            connectHandler
        );


        connect();


        return true;

    }


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
        socket.id
    );

    console.log(
        "================================="
    );


    socket.emit(
        "bravman:join",
        {

            game:
                GAME_ID,

            matchId:
                numericMatchId,

            userId:
                numericUserId

        }
    );


    return true;

};


// ==========================================================
// TAP
// ==========================================================

const tap = (
    matchId = currentMatchId,
    userId = currentUserId
) => {

    const numericMatchId =
        normalizeMatchId(
            matchId
        );

    const numericUserId =
        normalizeUserId(
            userId
        );


    if (
        !numericMatchId ||
        !numericUserId
    ) {

        console.error(
            "BRAVMAN SOCKET TAP INVALID",
            {
                matchId,
                userId
            }
        );

        return false;

    }


    if (
        !socket.connected
    ) {

        console.warn(
            "BRAVMAN SOCKET TAP BLOCKED: DISCONNECTED"
        );

        return false;

    }


    setMatch(
        numericMatchId,
        numericUserId
    );


    socket.emit(
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
    matchId = currentMatchId,
    userId = currentUserId
) => {

    const numericMatchId =
        normalizeMatchId(
            matchId
        );

    const numericUserId =
        normalizeUserId(
            userId
        );


    if (
        !numericMatchId ||
        !numericUserId
    ) {

        return false;

    }


    if (
        !socket.connected
    ) {

        return false;

    }


    setMatch(
        numericMatchId,
        numericUserId
    );


    socket.emit(
        "bravman:state",
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
// LISTENER CONNECT
// ==========================================================

const onConnect = (
    callback
) => {

    const handler = () => {

        console.log(
            "================================="
        );

        console.log(
            "🟢 BRAVMAN SOCKET CONNECTED"
        );

        console.log(
            "socket:",
            socket.id
        );

        console.log(
            "================================="
        );


        if (
            typeof callback ===
            "function"
        ) {

            callback();

        }

    };


    socket.on(
        "connect",
        handler
    );


    return () => {

        socket.off(
            "connect",
            handler
        );

    };

};


// ==========================================================
// LISTENER DISCONNECT
// ==========================================================

const onDisconnect = (
    callback
) => {

    const handler = (
        reason
    ) => {

        console.warn(
            "BRAVMAN SOCKET DISCONNECTED:",
            reason
        );


        if (
            typeof callback ===
            "function"
        ) {

            callback(
                reason
            );

        }

    };


    socket.on(
        "disconnect",
        handler
    );


    return () => {

        socket.off(
            "disconnect",
            handler
        );

    };

};


// ==========================================================
// LISTENER CONNECT ERROR
// ==========================================================

const onConnectError = (
    callback
) => {

    const handler = (
        error
    ) => {

        console.error(
            "BRAVMAN SOCKET CONNECT ERROR:",
            error
        );


        if (
            typeof callback ===
            "function"
        ) {

            callback(
                error
            );

        }

    };


    socket.on(
        "connect_error",
        handler
    );


    return () => {

        socket.off(
            "connect_error",
            handler
        );

    };

};


// ==========================================================
// LISTENER UPDATE
// ==========================================================

const onUpdate = (
    callback
) => {

    const handler = (
        payload
    ) => {

        if (
            typeof callback ===
            "function"
        ) {

            callback(
                payload
            );

        }

    };


    socket.on(
        "bravman:update",
        handler
    );


    return () => {

        socket.off(
            "bravman:update",
            handler
        );

    };

};


// ==========================================================
// LISTENER MATCH READY
// ==========================================================

const onMatchReady = (
    callback
) => {

    const handler = (
        payload
    ) => {

        console.log(
            "BRAVMAN MATCH READY:",
            payload
        );


        if (
            typeof callback ===
            "function"
        ) {

            callback(
                payload
            );

        }

    };


    socket.on(
        "bravman:matchReady",
        handler
    );


    return () => {

        socket.off(
            "bravman:matchReady",
            handler
        );

    };

};


// ==========================================================
// LISTENER JOINED
// ==========================================================

const onJoined = (
    callback
) => {

    const handler = (
        payload
    ) => {

        console.log(
            "BRAVMAN JOINED:",
            payload
        );


        if (
            typeof callback ===
            "function"
        ) {

            callback(
                payload
            );

        }

    };


    socket.on(
        "bravman:joined",
        handler
    );


    return () => {

        socket.off(
            "bravman:joined",
            handler
        );

    };

};


// ==========================================================
// LISTENER TAP REJECTED
// ==========================================================

const onTapRejected = (
    callback
) => {

    const handler = (
        payload
    ) => {

        console.warn(
            "BRAVMAN TAP REJECTED:",
            payload
        );


        if (
            typeof callback ===
            "function"
        ) {

            callback(
                payload
            );

        }

    };


    socket.on(
        "bravman:tapRejected",
        handler
    );


    return () => {

        socket.off(
            "bravman:tapRejected",
            handler
        );

    };

};


// ==========================================================
// LISTENER FINISHED
// ==========================================================

const onFinished = (
    callback
) => {

    const handler = (
        payload
    ) => {

        console.log(
            "================================="
        );

        console.log(
            "🏁 BRAVMAN FINISHED"
        );

        console.log(
            payload
        );

        console.log(
            "================================="
        );


        if (
            typeof callback ===
            "function"
        ) {

            callback(
                payload
            );

        }

    };


    socket.on(
        "bravman:finished",
        handler
    );


    return () => {

        socket.off(
            "bravman:finished",
            handler
        );

    };

};


// ==========================================================
// LISTENER ERROR
// ==========================================================

const onError = (
    callback
) => {

    const handler = (
        payload
    ) => {

        console.error(
            "BRAVMAN SOCKET ERROR:",
            payload
        );


        if (
            typeof callback ===
            "function"
        ) {

            callback(
                payload
            );

        }

    };


    socket.on(
        "bravman:error",
        handler
    );


    return () => {

        socket.off(
            "bravman:error",
            handler
        );

    };

};


// ==========================================================
// LISTENER DISCONNECT RESULT
// ==========================================================

const onDisconnectResult = (
    callback
) => {

    const handler = (
        payload
    ) => {

        console.log(
            "BRAVMAN DISCONNECT RESULT:",
            payload
        );


        if (
            typeof callback ===
            "function"
        ) {

            callback(
                payload
            );

        }

    };


    socket.on(
        "bravman:disconnectResult",
        handler
    );


    return () => {

        socket.off(
            "bravman:disconnectResult",
            handler
        );

    };

};


// ==========================================================
// LISTENER GENERIQUE
// ==========================================================

const on = (
    event,
    callback
) => {

    if (
        typeof event !==
        "string" ||
        !event
    ) {

        return () => {};

    }


    if (
        typeof callback !==
        "function"
    ) {

        return () => {};

    }


    socket.on(
        event,
        callback
    );


    return () => {

        socket.off(
            event,
            callback
        );

    };

};


// ==========================================================
// ETAT COURANT
// ==========================================================

const getCurrentMatch = () => {

    return currentMatchId;

};


const getCurrentUser = () => {

    return currentUserId;

};


// ==========================================================
// CLEAR MATCH
// ==========================================================

const clearMatch = () => {

    currentMatchId = null;

    currentUserId = null;

};


// ==========================================================
// API
// ==========================================================

const bravmanSocket = {

    getSocket,

    connect,

    disconnect,

    isConnected,

    setMatch,

    getCurrentMatch,

    getCurrentUser,

    clearMatch,

    join,

    tap,

    requestState,

    onConnect,

    onDisconnect,

    onConnectError,

    onUpdate,

    onMatchReady,

    onJoined,

    onTapRejected,

    onFinished,

    onError,

    onDisconnectResult,

    on

};


export default bravmanSocket;