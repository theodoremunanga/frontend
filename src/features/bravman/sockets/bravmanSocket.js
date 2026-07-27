// src/sockets/bravmanSocket.js

import { io } from "socket.io-client";


// ======================================================
// CONFIGURATION
// ======================================================

const SOCKET_URL =
    import.meta.env.VITE_SOCKET_URL ||
    import.meta.env.VITE_API_URL ||
    "http://localhost:5000";


// ======================================================
// INSTANCE
// ======================================================

let socket = null;


// ======================================================
// CONNECT
// ======================================================

export const connectBravmanSocket = () => {

    if (socket?.connected) {
        return socket;
    }

    if (!socket) {

        socket = io(
            SOCKET_URL,
            {
                transports: [
                    "websocket",
                    "polling",
                ],

                withCredentials: true,

                autoConnect: true,
            }
        );

    }
    else {

        socket.connect();

    }

    return socket;

};


// ======================================================
// GET SOCKET
// ======================================================

export const getBravmanSocket = () => {

    if (!socket) {
        return connectBravmanSocket();
    }

    return socket;

};


// ======================================================
// DISCONNECT
// ======================================================

export const disconnectBravmanSocket = () => {

    if (!socket) {
        return;
    }

    socket.disconnect();

    socket = null;

};


// ======================================================
// JOIN MATCH
// ======================================================

export const joinBravmanRoom = (
    matchId,
    userId
) => {

    const currentSocket =
        getBravmanSocket();

    currentSocket.emit(
        "bravman:join",
        {
            matchId,
            userId,
        }
    );

};


// ======================================================
// TAP
// ======================================================

export const sendBravmanTap = () => {

    const currentSocket =
        getBravmanSocket();

    currentSocket.emit(
        "bravman:tap"
    );

};


// ======================================================
// FORCE FINISH
// ======================================================

export const finishBravmanGame = () => {

    const currentSocket =
        getBravmanSocket();

    currentSocket.emit(
        "bravman:finish"
    );

};


// ======================================================
// EVENT LISTENER HELPER
// ======================================================

const listen = (
    event,
    callback
) => {

    const currentSocket =
        getBravmanSocket();

    currentSocket.on(
        event,
        callback
    );

    return () => {

        currentSocket.off(
            event,
            callback
        );

    };

};


// ======================================================
// CONNECTION
// ======================================================

export const onBravmanConnect = (
    callback
) => {

    return listen(
        "connect",
        callback
    );

};


export const onBravmanDisconnect = (
    callback
) => {

    return listen(
        "disconnect",
        callback
    );

};


// ======================================================
// BRAVMAN EVENTS
// ======================================================

export const onBravmanJoined = (
    callback
) => {

    return listen(
        "bravman:joined",
        callback
    );

};


export const onBravmanCountdown = (
    callback
) => {

    return listen(
        "bravman:countdown",
        callback
    );

};


export const onBravmanGo = (
    callback
) => {

    return listen(
        "bravman:go",
        callback
    );

};


export const onBravmanStart = (
    callback
) => {

    return listen(
        "bravman:start",
        callback
    );

};


export const onBravmanUpdate = (
    callback
) => {

    return listen(
        "bravman:update",
        callback
    );

};


export const onBravmanTapAccepted = (
    callback
) => {

    return listen(
        "bravman:tap:accepted",
        callback
    );

};


export const onBravmanFinished = (
    callback
) => {

    return listen(
        "bravman:finished",
        callback
    );

};


export const onBravmanError = (
    callback
) => {

    return listen(
        "bravman:error",
        callback
    );

};


// ======================================================
// EXPORT
// ======================================================

const bravmanSocket = {

    connect:
        connectBravmanSocket,

    getSocket:
        getBravmanSocket,

    disconnect:
        disconnectBravmanSocket,

    joinRoom:
        joinBravmanRoom,

    tap:
        sendBravmanTap,

    finish:
        finishBravmanGame,

    onConnect:
        onBravmanConnect,

    onDisconnect:
        onBravmanDisconnect,

    onJoined:
        onBravmanJoined,

    onCountdown:
        onBravmanCountdown,

    onGo:
        onBravmanGo,

    onStart:
        onBravmanStart,

    onUpdate:
        onBravmanUpdate,

    onTapAccepted:
        onBravmanTapAccepted,

    onFinished:
        onBravmanFinished,

    onError:
        onBravmanError,

};

export default bravmanSocket;