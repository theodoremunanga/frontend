// src/hooks/useBravman.js

import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import bravmanSocket from "../sockets/bravmanSocket";


// ======================================================
// INITIAL STATE
// ======================================================

const INITIAL_STATE = {

    status: "idle",

    countdown: null,

    duration: 0,

    remaining: 0,

    creatorTaps: 0,

    opponentTaps: 0,

    winnerId: null,

    draw: false,

    result: null,

    error: null,

    socketConnected: false,

    joined: false,

    lastTapAccepted: false,

};


// ======================================================
// HOOK
// ======================================================

const useBravman = ({
    matchId = null,
    userId = null,
    playerSide = null,
    autoJoin = true,
} = {}) => {


    const [
        state,
        setState
    ] = useState(
        INITIAL_STATE
    );


    // ==================================================
    // RESET
    // ==================================================

    const reset = useCallback(() => {

        setState(
            INITIAL_STATE
        );

    }, []);


    // ==================================================
    // JOIN ROOM
    // ==================================================

    const joinRoom = useCallback(() => {

        if (
            !matchId ||
            !userId
        ) {
            return;
        }

        setState(
            previous => ({
                ...previous,
                error: null,
            })
        );

        bravmanSocket.joinRoom(
            matchId,
            userId
        );

    }, [
        matchId,
        userId,
    ]);


    // ==================================================
    // TAP
    // ==================================================

    const tap = useCallback(() => {

        setState(
            previous => {

                if (
                    previous.status !==
                    "playing"
                ) {
                    return previous;
                }

                return {
                    ...previous,
                    lastTapAccepted: false,
                };

            }
        );

        bravmanSocket.tap();

    }, []);


    // ==================================================
    // FORCE FINISH
    // ==================================================

    const finish = useCallback(() => {

        bravmanSocket.finish();

    }, []);


    // ==================================================
    // SOCKET EVENTS
    // ==================================================

    useEffect(() => {

        bravmanSocket.connect();


        // ----------------------------------------------
        // CONNECT
        // ----------------------------------------------

        const removeConnect =
            bravmanSocket.onConnect(
                () => {

                    setState(
                        previous => ({
                            ...previous,
                            socketConnected: true,
                            error: null,
                        })
                    );

                }
            );


        // ----------------------------------------------
        // DISCONNECT
        // ----------------------------------------------

        const removeDisconnect =
            bravmanSocket.onDisconnect(
                () => {

                    setState(
                        previous => ({
                            ...previous,
                            socketConnected: false,
                        })
                    );

                }
            );


        // ----------------------------------------------
        // JOINED
        // ----------------------------------------------

        const removeJoined =
            bravmanSocket.onJoined(
                ({
                    matchId: joinedMatchId,
                    userId: joinedUserId,
                }) => {

                    if (
                        Number(joinedMatchId) !==
                        Number(matchId)
                    ) {
                        return;
                    }

                    setState(
                        previous => ({

                            ...previous,

                            joined: true,

                            error: null,

                            status:
                                previous.status ===
                                "idle"
                                    ? "matched"
                                    : previous.status,

                        })
                    );

                }
            );

            // ----------------------------------------------
            // MATCH READY
            // ----------------------------------------------

            const removeMatchReady =
                bravmanSocket.onMatchReady(
            ({
                matchId: readyMatchId
            }) => {

            if (
                Number(readyMatchId) !==
                Number(matchId)
            ) {
                return;
            }

            setState(
                previous => ({

                    ...previous,

                    status: "matched",

                    joined: true,

                    error: null,

                })
            );

            bravmanSocket.requestState();

        }
    );


        // ----------------------------------------------
        // COUNTDOWN
        // ----------------------------------------------

        const removeCountdown =
            bravmanSocket.onCountdown(
                ({
                    value
                }) => {

                    setState(
                        previous => ({

                            ...previous,

                            status:
                                "countdown",

                            countdown:
                                Number(value),

                            error: null,

                        })
                    );

                }
            );


        // ----------------------------------------------
        // GO
        // ----------------------------------------------

        const removeGo =
            bravmanSocket.onGo(
                () => {

                    setState(
                        previous => ({

                            ...previous,

                            countdown:
                                0,

                        })
                    );

                }
            );


        // ----------------------------------------------
        // START
        // ----------------------------------------------

        const removeStart =
            bravmanSocket.onStart(
                ({
                    duration
                }) => {

                    const gameDuration =
                        Number(
                            duration || 0
                        );

                    setState(
                        previous => ({

                            ...previous,

                            status:
                                "playing",

                            countdown:
                                null,

                            duration:
                                gameDuration,

                            remaining:
                                gameDuration,

                            error:
                                null,

                        })
                    );

                }
            );


        // ----------------------------------------------
        // UPDATE
        // ----------------------------------------------

        const removeUpdate =
            bravmanSocket.onUpdate(
                ({
                    creatorTaps,
                    opponentTaps,
                    remaining,
                }) => {

                    setState(
                        previous => ({

                            ...previous,

                            status:
                                "playing",

                            creatorTaps:
                                Number(
                                    creatorTaps || 0
                                ),

                            opponentTaps:
                                Number(
                                    opponentTaps || 0
                                ),

                            remaining:
                                Math.max(
                                    0,
                                    Number(
                                        remaining || 0
                                    )
                                ),

                            error:
                                null,

                        })
                    );

                }
            );


        // ----------------------------------------------
        // TAP ACCEPTED
        // ----------------------------------------------

        const removeTapAccepted =
            bravmanSocket.onTapAccepted(
                ({
                    creatorTaps,
                    opponentTaps,
                }) => {

                    setState(
                        previous => ({

                            ...previous,

                            creatorTaps:
                                Number(
                                    creatorTaps || 0
                                ),

                            opponentTaps:
                                Number(
                                    opponentTaps || 0
                                ),

                            lastTapAccepted:
                                true,

                        })
                    );

                }
            );


        // ----------------------------------------------
        // FINISHED
        // ----------------------------------------------

        const removeFinished =
            bravmanSocket.onFinished(
                ({
                    winnerId,
                    draw,
                    creatorTaps,
                    opponentTaps,
                    result,
                }) => {

                    setState(
                        previous => ({

                            ...previous,

                            status:
                                "finished",

                            remaining:
                                0,

                            winnerId:
                                winnerId ?? null,

                            draw:
                                Boolean(draw),

                            creatorTaps:
                                Number(
                                    creatorTaps || 0
                                ),

                            opponentTaps:
                                Number(
                                    opponentTaps || 0
                                ),

                            result:
                                result ?? null,

                            lastTapAccepted:
                                false,

                            error:
                                null,

                        })
                    );

                }
            );


        // ----------------------------------------------
        // ERROR
        // ----------------------------------------------

        const removeError =
            bravmanSocket.onError(
                ({
                    message
                } = {}) => {

                    setState(
                        previous => ({

                            ...previous,

                            error:
                                message ||
                                "Une erreur BraVMan est survenue.",

                        })
                    );

                }
            );


        // ----------------------------------------------
        // CLEANUP
        // ----------------------------------------------

        return () => {

            removeConnect();
            removeDisconnect();
            removeJoined();
            removeMatchReady();
            removeCountdown();
            removeGo();
            removeStart();
            removeUpdate();
            removeTapAccepted();
            removeFinished();
            removeError();

        };

    }, [matchId]);


    // ==================================================
    // AUTO JOIN
    // ==================================================

    useEffect(() => {

        if (!autoJoin) {
            return;
        }

        if (
            !matchId ||
            !userId
        ) {
            return;
        }

        joinRoom();

    }, [
        autoJoin,
        matchId,
        userId,
        joinRoom,
    ]);


    // ==================================================
    // MY TAPS
    // ==================================================

    const myTaps =
        useMemo(() => {

            if (
                playerSide ===
                "creator"
            ) {
                return state.creatorTaps;
            }

            if (
                playerSide ===
                "opponent"
            ) {
                return state.opponentTaps;
            }

            return 0;

        }, [
            playerSide,
            state.creatorTaps,
            state.opponentTaps,
        ]);


    // ==================================================
    // OPPONENT TAPS
    // ==================================================

    const opponentTaps =
        useMemo(() => {

            if (
                playerSide ===
                "creator"
            ) {
                return state.opponentTaps;
            }

            if (
                playerSide ===
                "opponent"
            ) {
                return state.creatorTaps;
            }

            return 0;

        }, [
            playerSide,
            state.creatorTaps,
            state.opponentTaps,
        ]);


    // ==================================================
    // ADVANTAGE
    // ==================================================

    const advantage =
        useMemo(() => {

            return (
                state.creatorTaps -
                state.opponentTaps
            );

        }, [
            state.creatorTaps,
            state.opponentTaps,
        ]);


    // ==================================================
    // MY ADVANTAGE
    // ==================================================

    const myAdvantage =
        useMemo(() => {

            if (
                playerSide ===
                "creator"
            ) {
                return advantage;
            }

            if (
                playerSide ===
                "opponent"
            ) {
                return -advantage;
            }

            return 0;

        }, [
            advantage,
            playerSide,
        ]);


    // ==================================================
    // ADVANTAGE PERCENTAGE
    // ==================================================

    const advantagePercent =
        useMemo(() => {

            const total =
                state.creatorTaps +
                state.opponentTaps;

            if (total <= 0) {
                return 50;
            }

            return (
                state.creatorTaps /
                total
            ) * 100;

        }, [
            state.creatorTaps,
            state.opponentTaps,
        ]);


    // ==================================================
    // MY ADVANTAGE PERCENTAGE
    // ==================================================

    const myAdvantagePercent =
        useMemo(() => {

            if (
                playerSide ===
                "creator"
            ) {
                return advantagePercent;
            }

            if (
                playerSide ===
                "opponent"
            ) {
                return 100 -
                    advantagePercent;
            }

            return 50;

        }, [
            playerSide,
            advantagePercent,
        ]);


    // ==================================================
    // WINNER
    // ==================================================

    const isWinner =
        useMemo(() => {

            if (
                state.status !==
                "finished"
            ) {
                return false;
            }

            if (
                state.draw
            ) {
                return false;
            }

            return (
                Number(state.winnerId) ===
                Number(userId)
            );

        }, [
            state.status,
            state.draw,
            state.winnerId,
            userId,
        ]);


    // ==================================================
    // LOSER
    // ==================================================

    const isLoser =
        useMemo(() => {

            if (
                state.status !==
                "finished"
            ) {
                return false;
            }

            if (
                state.draw
            ) {
                return false;
            }

            return !isWinner;

        }, [
            state.status,
            state.draw,
            isWinner,
        ]);


    // ==================================================
    // DRAW
    // ==================================================

    const isDraw =
        useMemo(() => {

            return (
                state.status ===
                "finished" &&
                state.draw
            );

        }, [
            state.status,
            state.draw,
        ]);


    // ==================================================
    // RETURN
    // ==================================================

    const {

        socketConnected,

        joined,

        status,

        countdown,

        duration,

        remaining,

        creatorTaps,

        winnerId,

        draw,

        result,

        lastTapAccepted,

        error,

    } = state;

    return {

        // Match
        matchId,
        userId,
        playerSide,

        // Connection
        socketConnected,
        joined,

        // State
        status,
        countdown,
        duration,
        remaining,

        // Scores
       
        creatorTaps: state.creatorTaps,
        opponentTaps: state.opponentTaps,
        myTaps,
        myOpponentTaps: opponentTaps,

        // Advantage
        advantage,
        myAdvantage,
        advantagePercent,
        myAdvantagePercent,

        // Result
        winnerId,
        draw,
        result,

        isWinner,
        isLoser,
        isDraw,

        // UI
        lastTapAccepted,
        error,

        // Actions
        joinRoom,
        tap,
        finish,
        reset,

    };

};


export default useBravman;