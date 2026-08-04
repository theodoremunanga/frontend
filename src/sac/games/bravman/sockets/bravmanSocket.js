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

    socket.on("connect", () => {
        console.log("🟢 BRAVMAN SOCKET", socket.id);
    });

    socket.on("disconnect", (reason) => {
        console.log("🔴 BRAVMAN SOCKET", reason);
    });

    socket.on("connect_error", (err) => {
        console.error("❌ BRAVMAN CONNECT ERROR", err);
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

    console.log(
        "JOIN ROOM",
        matchId,
        userId
    );
    
    socket.emit(
        "bravman:join",
        {
            matchId,
            userId
        }
    );

    console.log(
        "EMIT bravman:join"
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
        (game)=>{
            console.log(
                "UPDATE",
                game
            );
            callback
        }
    );


};


export const onBravmanRunning = (callback)=>{
    socket?.on(
        "bravman:running",
        (game)=>{
            console.log(
                "RUNNING",
                game
            );
            callback
        }

    );
};



export const onBravmanFinished = (
    callback
)=>{


    socket?.on(
        "bravman:finished",
        (game)=>{
            console.log(
                "FINISHED",
                game
            );
            callback
        }
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
        "bravman:running"
    );

    socket.off(
        "bravman:update"
    );


    socket.off(
        "bravman:finished"
    );


    socket.off(
        "bravman:error"
    );


};