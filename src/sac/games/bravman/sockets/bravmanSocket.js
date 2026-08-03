// frontend/src/games/bravman/socket/bravmanSocket.js


import { io } from "socket.io-client";



let socket = null;



// ==========================================
// CONNECTION
// ==========================================

export const connectBravmanSocket = () => {


    if(socket){
        return socket;
    }


    socket = io(import.meta.env.VITE_API_URL, {
        withCredentials: true,
        transports: ["websocket", "polling"],
        autoConnect: true
    });


    return socket;

};




// ==========================================
// DISCONNECT
// ==========================================

export const disconnectBravmanSocket = () => {


    if(socket){

        socket.disconnect();

        socket = null;

    }

};




// ==========================================
// JOIN ROOM
// ==========================================

export const joinBravmanRoom = ({
    matchId,
    userId
})=>{


    if(!socket){
        connectBravmanSocket();
    }


    socket.emit(
        "bravman:join",
        {
            matchId,
            userId
        }
    );


};




// ==========================================
// REQUEST STATE
// ==========================================

export const requestBravmanState = ()=>{


    if(!socket){
        return;
    }


    socket.emit(
        "bravman:state"
    );


};




// ==========================================
// SEND TAP
// ==========================================

export const sendBravmanTap = ()=>{


    if(!socket){
        return;
    }


    socket.emit(
        "bravman:tap"
    );


};




// ==========================================
// LISTENERS
// ==========================================


export const onBravmanJoined = (
    callback
)=>{


    socket?.on(
        "bravman:joined",
        callback
    );


};

export const onBravmanUpdate = (
    callback
)=>{


    socket?.on(
        "bravman:update",
        callback
    );


};


export const onBravmanRunning = (callback)=>{
    socket?.on(
        "bravman:running",
        callback
    );
};



export const onBravmanFinished = (
    callback
)=>{


    socket?.on(
        "bravman:finished",
        callback
    );


};



export const onBravmanError = (
    callback
)=>{


    socket?.on(
        "bravman:error",
        callback
    );


};




// ==========================================
// CLEAN LISTENERS
// ==========================================

export const removeBravmanListeners = ()=>{


    if(!socket){
        return;
    }


    socket.off(
        "bravman:joined"
    );


    socket.off(
        "bravman:matchReady"
    );


    socket.off(
        "bravman:update"
    );


    socket.off(
        "bravman:start"
    );


    socket.off(
        "bravman:finished"
    );


    socket.off(
        "bravman:error"
    );


};