// frontend/src/games/bravman/hooks/useBravman.js


import {
    useState,
    useEffect,
    useCallback
} from "react"; 


import {
    createBravmanMatch,
    joinBravmanMatch,
    getOpenBravmanMatches,
    getBravmanMatch
} from "../api/bravmanApi";



import {
    connectBravmanSocket,
    disconnectBravmanSocket,
    joinBravmanRoom,
    requestBravmanState,
    sendBravmanTap,
    onBravmanJoined,
    onBravmanUpdate,
    onBravmanRunning,
    onBravmanFinished,
    onBravmanError,
    removeBravmanListeners
} from "../sockets/bravmanSocket";



// ==========================================
// HOOK PRINCIPAL
// ==========================================

const useBravman = (userId)=>{


    const [matches,setMatches] =
        useState([]);


    const [match,setMatch] =
        useState(null);


    const [game,setGame] =
        useState(null);



    const [error,setError] =
        useState(null);



    const [loading,setLoading] =
        useState(false);




    // ======================================
    // LOAD OPEN MATCHES
    // ======================================

    const loadMatches =
    useCallback(async()=>{


        try {


            setLoading(true);


            const response =
                await getOpenBravmanMatches();
                
                console.log(
                    "JOIN RESPONSE",
                    response
                );

            setMatches(
                response.matches || []
            );


        }
        catch(err){

            setError(
                err.message
            );

        }
        finally{

            setLoading(false);

        }


    },[]);

    // ======================================
    // CREATE MATCH
    // ======================================

    const createMatch =
    async(stake)=>{


        try{


            setLoading(true);


            const response =
                await createBravmanMatch(
                    stake
                );


            setMatch(
                response.match
            );

            connectGame(
                response.match.id
            );

            return response.match;


        }
        catch(err){

            setError(
                err.message
            );


            throw err;

        }
        finally{

            setLoading(false);

        }


    };

    // ======================================
    // JOIN MATCH
    // ======================================

    const joinMatch =
    async(matchId)=>{


        try{


            setLoading(true);



            const response =
                await joinBravmanMatch(
                    matchId
                );


            setMatch(
                response.match
            );

            connectGame(
                response.match.id
            );


            return response.match;


        }
        catch(err){

            setError(
                err.message
            );


            throw err;

        }
        finally{

            setLoading(false);

        }


    };

    // ======================================
    // LOAD MATCH DETAIL
    // ======================================

    const loadMatch =
    async(matchId)=>{


        try{


            const response =
                await getBravmanMatch(
                    matchId
                );


            setMatch(
                response.match
            );


            return response.match;


        }
        catch(err){

            setError(
                err.message
            );

        }


    };

    // ======================================
    // SOCKET INIT
    // ======================================

    const connectGame =
    useCallback(
    (matchId)=>{
         console.log("CONNECT GAME", matchId);


        connectBravmanSocket();



        onBravmanJoined(()=>{
            console.log("ROOM OK");

            requestBravmanState();
        });



    },
    [userId]
    );









    // ======================================
    // SEND TAP
    // ======================================

    const tap =
    ()=>{


        sendBravmanTap();


    };

    // ======================================
    // SOCKET EVENTS
    // ======================================


    useEffect(()=>{


        connectBravmanSocket();



        onBravmanJoined(
            ()=>{
                console.log(
                    "BraVMan socket rejoint"
                );
            }
        );



        onBravmanUpdate(
            (data)=>{


                setGame(
                    prev=>({

                        ...prev,

                        ...data

                    })
                );


            }
        );




        onBravmanRunning(
            (data)=>{

                console.log("UPDATE", data);

                setGame(
                    prev=>({

                        ...prev,

                        status:"running",

                        duration:
                            data.duration

                    })
                );


            }
        );





        onBravmanFinished(
            (data)=>{

                console.log("FINISHED", data);

                setGame(
                    prev=>({

                        ...prev,

                        ...data,

                        status:
                            "finished"

                    })
                );


            }
        );





        onBravmanError(
            (data)=>{


                setError(
                    data.message
                );


            }
        );





        return ()=>{


            removeBravmanListeners();


            disconnectBravmanSocket();


        };


    },[]);







    return {


        // données

        matches,

        match,

        game,

        error,

        loading,



        // actions

        loadMatches,

        createMatch,

        joinMatch,

        loadMatch,

        connectGame,

        tap


    };


};

export default useBravman;