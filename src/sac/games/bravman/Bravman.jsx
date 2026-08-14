// ==========================================================
// BRAVMAN
// Système d'Arbitrage Centralisé (SAC)
// ==========================================================

import "./Bravman.css";

import {
    useState,
    useEffect,
    useRef,
    useMemo,
    useCallback
} from "react";

import { io } from "socket.io-client";

import {
    createSacMatch,
    joinSacMatch,
    getSacMatch,
    getSacMatches
} from "../../sacApi";


// ==========================================================
// CONFIGURATION
// ==========================================================

const API =
    import.meta.env.VITE_API_URL;

const SOCKET_URL =
    import.meta.env.VITE_SOCKET_URL ||
    API?.replace(/\/api$/, "");

const GAME_ID =
    "bravman";

const GAME_DURATION =
    45;

const COUNTDOWN_DURATION =
    3;

const MATCH_REFRESH =
    3000;

const SOCKET_TIMEOUT =
    15000;

const MAX_ARM_ROTATION =
    45;

const MAX_PROGRESS =
    100;

const TAP_ANIMATION =
    120;


// ==========================================================
// CYCLE DE VIE DU MATCH
// ==========================================================

const STATUS = {

    MENU:
        "menu",

    CREATING:
        "creating",

    WAITING:
        "waiting",

    READY:
        "ready",

    COUNTDOWN:
        "countdown",

    PLAYING:
        "playing",

    FINISHED:
        "finished",

    ERROR:
        "error"

};


// ==========================================================
// AUTHENTIFICATION
// ==========================================================

const getCurrentUserId = () => {

    const token =
        localStorage.getItem("token");

    if (!token) {
        return null;
    }

    try {

        const parts =
            token.split(".");

        if (parts.length < 2) {
            return null;
        }

        const payload =
            JSON.parse(
                atob(parts[1])
            );

        const userId =
            Number(payload?.id);

        return Number.isFinite(userId)
            ? userId
            : null;

    } catch (error) {

        console.error(
            "BRAVMAN AUTH TOKEN ERROR:",
            error
        );

        return null;
    }
};


// ==========================================================
// COMPOSANT PRINCIPAL
// ==========================================================

export default function Bravman() {


    // ======================================================
    // SOCKET
    // ======================================================

    const socketRef =
        useRef(null);


    // ======================================================
    // TIMERS
    // ======================================================

    const refreshTimerRef =
        useRef(null);

    const tapAnimationTimerRef =
        useRef(null);


    // ======================================================
    // ÉTAT GÉNÉRAL
    // ======================================================

    const [status, setStatus] =
        useState(STATUS.MENU);

    const [loading, setLoading] =
        useState(false);

    const [error, setError] =
        useState("");


    // ======================================================
    // MATCH
    // ======================================================

    const [matches, setMatches] =
        useState([]);

    const [currentMatch, setCurrentMatch] =
        useState(null);


    // ======================================================
    // ÉTAT DU MOTEUR
    // ======================================================

    const [gameState, setGameState] =
        useState(null);


    // ======================================================
    // JOUEURS
    // ======================================================

    const [me, setMe] =
        useState(null);

    const [opponent, setOpponent] =
        useState(null);


    // ======================================================
    // CONNEXION SOCKET
    // ======================================================

    const [connected, setConnected] =
        useState(false);

    const [ping, setPing] =
        useState("--");


    // ======================================================
    // MATCH / TEMPS
    // ======================================================

    const [timer, setTimer] =
        useState(GAME_DURATION);

    const [countdown, setCountdown] =
        useState(COUNTDOWN_DURATION);


    // ======================================================
    // RÉSULTAT
    // ======================================================

    const [winner, setWinner] =
        useState(null);


    // ======================================================
    // TAPS
    // ======================================================

    const [myTaps, setMyTaps] =
        useState(0);

    const [opponentTaps] =
        useState(0);


    // ======================================================
    // BRAS DE FER
    // ======================================================

    const [armRotation, setArmRotation] =
        useState(0);

    const [armProgress, setArmProgress] =
        useState(50);


    // ======================================================
    // ANIMATION
    // ======================================================

    const [myPunch, setMyPunch] =
        useState(false);

    const [opponentPunch, setOpponentPunch] =
        useState(false);


    // ======================================================
    // VALEURS DÉRIVÉES
    // ======================================================

    const matchId =
        currentMatch?.id ??
        currentMatch?.matchId ??
        null;


    const hasMatch =
        Boolean(matchId);


    const isMenu =
        status === STATUS.MENU;


    const isCreating =
        status === STATUS.CREATING;


    const isWaiting =
        status === STATUS.WAITING;


    const isReady =
        status === STATUS.READY;


    const isCountdown =
        status === STATUS.COUNTDOWN;


    const isPlaying =
        status === STATUS.PLAYING;


    const isFinished =
        status === STATUS.FINISHED;


    const canTap =
        connected &&
        isPlaying;


    // ======================================================
    // DIFFÉRENCE DE TAPS
    // ======================================================

    const tapDifference =
        useMemo(() => {

            return (
                myTaps -
                opponentTaps
            );

        }, [
            myTaps,
            opponentTaps
        ]);


    // ======================================================
    // AVANTAGE
    // ======================================================

    const advantage =
        useMemo(() => {

            return Math.max(
                -MAX_PROGRESS,
                Math.min(
                    MAX_PROGRESS,
                    tapDifference
                )
            );

        }, [
            tapDifference
        ]);


    // ======================================================
    // RESET DE L'ARÈNE
    // Ne détruit PAS le match
    // ======================================================

    const resetArena =
        useCallback(() => {

            setWinner(null);

            setTimer(
                GAME_DURATION
            );

            setCountdown(
                COUNTDOWN_DURATION
            );

            setMyTaps(0);

            setOpponentTaps(0);

            setArmRotation(0);

            setArmProgress(50);

            setMyPunch(false);

            setOpponentPunch(false);

        }, []);


      // ======================================================
    // LOAD MATCHES
    // ======================================================

    const loadMatches =
        useCallback(async () => {

            try {

                const response =
                    await getSacMatches(
                        GAME_ID
                    );

                if (!response?.success) {
                    return;
                }

                const list =
                    Array.isArray(
                        response.matches
                    )
                        ? response.matches
                        : [];

                setMatches(list);

            } catch (error) {

                console.error(
                    "BRAVMAN LOAD MATCHES ERROR:",
                    error
                );

            }

        }, []);


    // ======================================================
    // LOAD CURRENT MATCH
    // ======================================================

    const loadCurrentMatch =
        useCallback(async (id) => {

            if (!id) {
                return null;
            }

            try {

                const response =
                    await getSacMatch(id);

                if (!response?.success) {

                    console.error(
                        "BRAVMAN CURRENT MATCH ERROR:",
                        response
                    );

                    return null;
                }

                const match =
                    response.match;

                if (!match) {

                    console.error(
                        "BRAVMAN MATCH ABSENT:",
                        response
                    );

                    return null;
                }


                // ------------------------------------------
                // Sauvegarde du match
                // ------------------------------------------

                setCurrentMatch(match);


                // ------------------------------------------
                // Le match HTTP ne doit pas écraser
                // l'état temps réel du moteur.
                // ------------------------------------------

                const currentUserId =
                    getCurrentUserId();


                const creatorId =
                    Number(
                        match.players?.creator
                    );


                const opponentId =
                    Number(
                        match.players?.opponent
                    );


                console.log(
                    "BRAVMAN MATCH PLAYERS:",
                    {
                        matchId: match.id,
                        currentUserId,
                        creatorId,
                        opponentId,
                        status: match.status
                    }
                );


                // ------------------------------------------
                // Vérification des IDs
                // ------------------------------------------

                if (
                    !Number.isFinite(
                        currentUserId
                    )
                ) {

                    console.error(
                        "BRAVMAN USER ID INVALID:",
                        currentUserId
                    );

                    setMe(null);
                    setOpponent(null);

                    return match;
                }


                // ------------------------------------------
                // Créateur
                // ------------------------------------------

                if (
                    Number.isFinite(creatorId) &&
                    currentUserId === creatorId
                ) {

                    setMe({
                        id: creatorId
                    });


                    setOpponent(
                        Number.isFinite(
                            opponentId
                        )
                            ? {
                                id: opponentId
                            }
                            : null
                    );

                }


                // ------------------------------------------
                // Adversaire
                // ------------------------------------------

                else if (
                    Number.isFinite(opponentId) &&
                    currentUserId === opponentId
                ) {

                    setMe({
                        id: opponentId
                    });


                    setOpponent(
                        Number.isFinite(
                            creatorId
                        )
                            ? {
                                id: creatorId
                            }
                            : null
                    );

                }


                // ------------------------------------------
                // Utilisateur absent du match
                // ------------------------------------------

                else {

                    console.error(
                        "BRAVMAN USER NOT IN MATCH:",
                        {
                            currentUserId,
                            creatorId,
                            opponentId,
                            match
                        }
                    );

                    setMe(null);
                    setOpponent(null);

                }


                return match;

            } catch (error) {

                console.error(
                    "BRAVMAN LOAD CURRENT MATCH ERROR:",
                    error
                );

                return null;
            }

        }, []);


    // ======================================================
    // CREATE MATCH
    // ======================================================

    const createMatch =
        useCallback(async (stake) => {

            if (loading) {
                return;
            }


            try {

                setLoading(true);

                setError("");


                // ------------------------------------------
                // État transitoire
                // ------------------------------------------

                setStatus(
                    STATUS.CREATING
                );


                // ------------------------------------------
                // Création via SAC
                // ------------------------------------------

                const response =
                    await createSacMatch({

                        game:
                            GAME_ID,

                        stake

                    });


                if (!response?.success) {

                    throw new Error(
                        response?.message ||
                        "Création du match impossible."
                    );

                }


                if (!response.match) {

                    throw new Error(
                        "Le SAC n'a retourné aucun match."
                    );

                }


                // ------------------------------------------
                // Nouveau match
                // ------------------------------------------

                setCurrentMatch(
                    response.match
                );


                // ------------------------------------------
                // Déterminer immédiatement
                // l'utilisateur courant
                // ------------------------------------------

                const currentUserId =
                    getCurrentUserId();


                const creatorId =
                    Number(
                        response.match
                            ?.players
                            ?.creator
                    );


                if (
                    Number.isFinite(
                        currentUserId
                    ) &&
                    currentUserId === creatorId
                ) {

                    setMe({
                        id: creatorId
                    });

                }


                setOpponent(null);


                // ------------------------------------------
                // Un match nouvellement créé
                // attend l'adversaire.
                // ------------------------------------------

                setStatus(
                    STATUS.WAITING
                );


                // ------------------------------------------
                // Actualiser la liste
                // ------------------------------------------

                await loadMatches();


            } catch (error) {

                console.error(
                    "BRAVMAN CREATE MATCH ERROR:",
                    error
                );


                setError(
                    error?.message ||
                    "Impossible de créer le match."
                );


                setStatus(
                    STATUS.ERROR
                );


            } finally {

                setLoading(false);

            }

        }, [
            loading,
            loadMatches
        ]);


    // ======================================================
    // JOIN MATCH
    // ======================================================

    const joinMatch =
        useCallback(async (id) => {

            if (
                loading ||
                !id
            ) {
                return;
            }


            try {

                setLoading(true);

                setError("");


                // ------------------------------------------
                // Rejoindre via SAC
                // ------------------------------------------

                const response =
                    await joinSacMatch({

                        game:
                            GAME_ID,

                        matchId:
                            id

                    });


                if (!response?.success) {

                    throw new Error(
                        response?.message ||
                        "Impossible de rejoindre le match."
                    );

                }


                if (!response.match) {

                    throw new Error(
                        "Le SAC n'a retourné aucun match après join."
                    );

                }


                // ------------------------------------------
                // Sauvegarde immédiate
                // ------------------------------------------

                setCurrentMatch(
                    response.match
                );


                // ------------------------------------------
                // Le joueur vient de rejoindre.
                // On passe temporairement à READY.
                // Le moteur/socket déterminera ensuite
                // COUNTDOWN ou PLAYING.
                // ------------------------------------------

                setStatus(
                    STATUS.READY
                );


                // ------------------------------------------
                // Recharger depuis le SAC
                // pour obtenir les deux joueurs.
                // ------------------------------------------

                await loadCurrentMatch(id);


                // ------------------------------------------
                // Actualiser les défis disponibles
                // ------------------------------------------

                await loadMatches();


            } catch (error) {

                console.error(
                    "BRAVMAN JOIN MATCH ERROR:",
                    error
                );


                setError(
                    error?.message ||
                    "Impossible de rejoindre le match."
                );


                setStatus(
                    STATUS.ERROR
                );


            } finally {

                setLoading(false);

            }

        }, [
            loading,
            loadCurrentMatch,
            loadMatches
        ]);


    // ======================================================
    // INITIAL LOAD
    // ======================================================

    useEffect(() => {

        loadMatches();

    }, [
        loadMatches
    ]);


    // ======================================================
    // AUTO REFRESH DES DÉFIS
    // ======================================================

    useEffect(() => {

        refreshTimerRef.current =
            setInterval(
                () => {

                    loadMatches();

                },
                MATCH_REFRESH
            );


        return () => {

            if (
                refreshTimerRef.current
            ) {

                clearInterval(
                    refreshTimerRef.current
                );

                refreshTimerRef.current =
                    null;

            }

        };

    }, [
        loadMatches
    ]);


    // ======================================================
    // RECHARGEMENT DU MATCH COURANT
    // ======================================================

    useEffect(() => {

        if (!matchId) {
            return;
        }

        loadCurrentMatch(
            matchId
        );

    }, [
        matchId,
        loadCurrentMatch
    ]);

        // ======================================================
    // SOCKET — CONNEXION
    // ======================================================

    useEffect(() => {

        if (!SOCKET_URL) {

            console.error(
                "BRAVMAN SOCKET URL ABSENTE"
            );

            setError(
                "Configuration Socket BraVMan absente."
            );

            return;
        }


        // --------------------------------------------------
        // Création d'une seule connexion
        // --------------------------------------------------

        const socket =
            io(SOCKET_URL, {

                transports: [
                    "websocket",
                    "polling"
                ],

                autoConnect: true,

                reconnection: true,

                reconnectionAttempts: 10,

                reconnectionDelay: 1000,

                timeout:
                    SOCKET_TIMEOUT

            });


        socketRef.current =
            socket;


        // --------------------------------------------------
        // CONNECT
        // --------------------------------------------------

        const handleConnect =
            () => {

                console.log(
                    "BRAVMAN SOCKET CONNECTED:",
                    socket.id
                );

                setConnected(true);

                setError("");
            };


        // --------------------------------------------------
        // DISCONNECT
        // --------------------------------------------------

        const handleDisconnect =
            (reason) => {

                console.log(
                    "BRAVMAN SOCKET DISCONNECTED:",
                    reason
                );

                setConnected(false);
            };


        // --------------------------------------------------
        // CONNECT ERROR
        // --------------------------------------------------

        const handleConnectError =
            (error) => {

                console.error(
                    "BRAVMAN SOCKET CONNECT ERROR:",
                    error
                );

                setConnected(false);

            };


        // --------------------------------------------------
        // PING
        // --------------------------------------------------

        const handlePing =
            () => {

                const started =
                    Date.now();


                socket.emit(
                    "bravman:ping",
                    () => {

                        setPing(
                            Date.now() -
                            started
                        );

                    }
                );

            };


        socket.on(
            "connect",
            handleConnect
        );

        socket.on(
            "disconnect",
            handleDisconnect
        );

        socket.on(
            "connect_error",
            handleConnectError
        );


        // --------------------------------------------------
        // Nettoyage
        // --------------------------------------------------

        return () => {

            socket.off(
                "connect",
                handleConnect
            );

            socket.off(
                "disconnect",
                handleDisconnect
            );

            socket.off(
                "connect_error",
                handleConnectError
            );

            socket.disconnect();

            if (
                socketRef.current === socket
            ) {

                socketRef.current =
                    null;

            }

            setConnected(false);

        };

    }, []);


    // ======================================================
    // SOCKET — JOIN DU MATCH
    // ======================================================

    useEffect(() => {

        if (!connected) {
            return;
        }

        if (!matchId) {
            return;
        }

        if (!socketRef.current) {
            return;
        }

        if (!me?.id) {

            console.warn(
                "BRAVMAN SOCKET JOIN ATTEND USER:",
                {
                    matchId,
                    me
                }
            );

            return;
        }


        const socket =
            socketRef.current;


        const numericMatchId =
            Number(matchId);

        const numericUserId =
            Number(me.id);


        if (
            !Number.isFinite(
                numericMatchId
            )
        ) {

            console.error(
                "BRAVMAN INVALID MATCH ID:",
                matchId
            );

            return;
        }


        if (
            !Number.isFinite(
                numericUserId
            )
        ) {

            console.error(
                "BRAVMAN INVALID USER ID:",
                me.id
            );

            return;
        }


        console.log(
            "BRAVMAN JOIN SOCKET:",
            {
                matchId:
                    numericMatchId,

                userId:
                    numericUserId
            }
        );


        // --------------------------------------------------
        // ACK
        // --------------------------------------------------

        let acknowledged =
            false;


        const joinPayload = {

            matchId:
                numericMatchId,

            userId:
                numericUserId

        };


        socket.emit(
            "bravman:join",
            joinPayload,
            (ack) => {

                acknowledged =
                    true;


                console.log(
                    "BRAVMAN JOIN ACK:",
                    ack
                );


                if (
                    ack?.success === false
                ) {

                    setError(
                        ack.message ||
                        "Impossible de rejoindre la partie BraVMan."
                    );

                }

            }
        );


        // --------------------------------------------------
        // Sécurité : certains backends peuvent ne pas
        // retourner d'ACK.
        // --------------------------------------------------

        const ackTimer =
            setTimeout(() => {

                if (!acknowledged) {

                    console.warn(
                        "BRAVMAN JOIN ACK NON REÇU"
                    );

                }

            }, SOCKET_TIMEOUT);


        return () => {

            clearTimeout(
                ackTimer
            );

        };

    }, [
        connected,
        matchId,
        me?.id
    ]);


    // ======================================================
    // SOCKET — UPDATE DU MOTEUR
    // ======================================================

    useEffect(() => {

        if (!socketRef.current) {
            return;
        }


        const socket =
            socketRef.current;


        const handleUpdate =
            (payload) => {

                console.log(
                    "BRAVMAN UPDATE:",
                    payload
                );


                // ------------------------------------------------
                // Certains backends peuvent envoyer directement
                // l'état, d'autres sous { gameState }.
                // ------------------------------------------------

                const incoming =
                    payload?.gameState ||
                    payload?.state ||
                    payload;


                if (!incoming) {

                    console.warn(
                        "BRAVMAN UPDATE VIDE:",
                        payload
                    );

                    return;
                }


                const incomingMatchId =
                    Number(
                        incoming.matchId ??
                        payload?.matchId
                    );


                // ------------------------------------------------
                // Ne jamais appliquer l'état d'un autre match.
                // ------------------------------------------------

                if (
                    Number.isFinite(
                        incomingMatchId
                    ) &&
                    Number.isFinite(
                        Number(matchId)
                    ) &&
                    incomingMatchId !==
                        Number(matchId)
                ) {

                    console.warn(
                        "BRAVMAN UPDATE IGNORE — AUTRE MATCH:",
                        {
                            expected:
                                Number(matchId),

                            received:
                                incomingMatchId
                        }
                    );

                    return;
                }


                // ------------------------------------------------
                // IDs joueurs
                // ------------------------------------------------

                const incomingCreatorId =
                    Number(
                        incoming.creatorId
                    );


                const incomingOpponentId =
                    Number(
                        incoming.opponentId
                    );


                // ------------------------------------------------
                // IMPORTANT :
                // Ne pas remplacer un ID valide par NaN.
                // ------------------------------------------------

                if (
                    Number.isFinite(
                        incomingCreatorId
                    ) &&
                    Number.isFinite(
                        incomingOpponentId
                    )
                ) {

                    setOpponent(
                        currentOpponent => {

                            const currentUserId =
                                Number(
                                    me?.id
                                );


                            if (
                                !Number.isFinite(
                                    currentUserId
                                )
                            ) {

                                return currentOpponent;
                            }


                            if (
                                currentUserId ===
                                incomingCreatorId
                            ) {

                                return {
                                    id:
                                        incomingOpponentId
                                };

                            }


                            if (
                                currentUserId ===
                                incomingOpponentId
                            ) {

                                return {
                                    id:
                                        incomingCreatorId
                                };

                            }


                            return currentOpponent;

                        }
                    );

                }
                else {

                    console.warn(
                        "BRAVMAN ENGINE IDS INVALIDES:",
                        {
                            creatorId:
                                incoming.creatorId,

                            opponentId:
                                incoming.opponentId
                        }
                    );

                }


                // ------------------------------------------------
                // État moteur
                // ------------------------------------------------

                setGameState(
                    incoming
                );


                // ------------------------------------------------
                // TAPS
                // ------------------------------------------------

                const creatorTaps =
                    Number(
                        incoming.creatorTaps
                    ) || 0;


                const opponentTaps =
                    Number(
                        incoming.opponentTaps
                    ) || 0;


                const currentUserId =
                    Number(
                        me?.id
                    );


                if (
                    Number.isFinite(
                        currentUserId
                    )
                ) {

                    if (
                        currentUserId ===
                        incomingCreatorId
                    ) {

                        setMyTaps(
                            creatorTaps
                        );

                        setOpponentTaps(
                            opponentTaps
                        );

                    }
                    else if (
                        currentUserId ===
                        incomingOpponentId
                    ) {

                        setMyTaps(
                            opponentTaps
                        );

                        setOpponentTaps(
                            creatorTaps
                        );

                    }

                }


                // ------------------------------------------------
                // TEMPS RESTANT
                // ------------------------------------------------

                const remaining =
                    Number(
                        incoming.remaining
                    );


                if (
                    Number.isFinite(
                        remaining
                    )
                ) {

                    setTimer(
                        Math.max(
                            0,
                            remaining
                        )
                    );

                }


                // ------------------------------------------------
                // COUNTDOWN
                // ------------------------------------------------

                const incomingCountdown =
                    Number(
                        incoming.countdown
                    );


                if (
                    Number.isFinite(
                        incomingCountdown
                    )
                ) {

                    setCountdown(
                        Math.max(
                            0,
                            incomingCountdown
                        )
                    );

                }


                // ------------------------------------------------
                // ARM POSITION
                // ------------------------------------------------

                const incomingArm =
                    Number(
                        incoming.armPosition
                    );


                if (
                    Number.isFinite(
                        incomingArm
                    )
                ) {

                    setArmRotation(
                        Math.max(
                            -MAX_ARM_ROTATION,
                            Math.min(
                                MAX_ARM_ROTATION,
                                incomingArm
                            )
                        )
                    );


                    const normalized =
                        (
                            incomingArm +
                            MAX_ARM_ROTATION
                        ) /
                        (
                            MAX_ARM_ROTATION * 2
                        );


                    setArmProgress(
                        Math.max(
                            0,
                            Math.min(
                                100,
                                normalized * 100
                            )
                        )
                    );

                }


                // ------------------------------------------------
                // STATUS MOTEUR
                // ------------------------------------------------

                const engineStatus =
                    String(
                        incoming.status ||
                        ""
                    ).toLowerCase();


                if (
                    engineStatus ===
                    "countdown"
                ) {

                    setStatus(
                        STATUS.COUNTDOWN
                    );

                }
                else if (
                    engineStatus ===
                    "running"
                ) {

                    setStatus(
                        STATUS.PLAYING
                    );

                }
                else if (
                    engineStatus ===
                    "finished"
                ) {

                    setStatus(
                        STATUS.FINISHED
                    );

                }
                else if (
                    engineStatus ===
                    "waiting"
                ) {

                    setStatus(
                        STATUS.WAITING
                    );

                }

            };


        socket.on(
            "bravman:update",
            handleUpdate
        );


        return () => {

            socket.off(
                "bravman:update",
                handleUpdate
            );

        };

    }, [
        matchId,
        me?.id
    ]);


    // ======================================================
    // SOCKET — MATCH JOINED
    // ======================================================

    useEffect(() => {

        if (!socketRef.current) {
            return;
        }


        const socket =
            socketRef.current;


        const handleJoined =
            (payload) => {

                console.log(
                    "BRAVMAN JOINED:",
                    payload
                );


                if (
                    payload?.matchId &&
                    matchId &&
                    Number(
                        payload.matchId
                    ) !==
                    Number(matchId)
                ) {

                    return;
                }


                setError("");


                // --------------------------------------------
                // Si le backend confirme que le match est prêt,
                // on laisse le moteur décider de la suite.
                // --------------------------------------------

                if (
                    payload?.status ===
                    "ready"
                ) {

                    setStatus(
                        STATUS.READY
                    );

                }

            };


        socket.on(
            "bravman:joined",
            handleJoined
        );


        return () => {

            socket.off(
                "bravman:joined",
                handleJoined
            );

        };

    }, [
        matchId
    ]);


    // ======================================================
    // SOCKET — ERREUR
    // ======================================================

    useEffect(() => {

        if (!socketRef.current) {
            return;
        }


        const socket =
            socketRef.current;


        const handleError =
            (payload) => {

                console.error(
                    "BRAVMAN SOCKET ERROR:",
                    payload
                );


                setError(
                    payload?.message ||
                    payload?.error ||
                    "Erreur Socket BraVMan."
                );


                setStatus(
                    STATUS.ERROR
                );

            };


        socket.on(
            "bravman:error",
            handleError
        );


        return () => {

            socket.off(
                "bravman:error",
                handleError
            );

        };

    }, []);


    // ======================================================
    // PING RÉSEAU
    // ======================================================

    useEffect(() => {

        if (!connected) {
            return;
        }


        const interval =
            setInterval(() => {

                if (
                    !socketRef.current
                ) {
                    return;
                }


                const started =
                    Date.now();


                socketRef.current.emit(
                    "bravman:ping",
                    () => {

                        setPing(
                            Date.now() -
                            started
                        );

                    }
                );

            }, 5000);


        return () => {

            clearInterval(
                interval
            );

        };

    }, [
        connected
    ]);

        // ======================================================
    // TAP — ACTION PRINCIPALE DU JOUEUR
    // ======================================================

    const tap =
        useCallback(() => {

            // ------------------------------------------------
            // Protection cycle de vie
            // ------------------------------------------------

            if (!canTap) {

                return;
            }


            // ------------------------------------------------
            // Vérifications Socket
            // ------------------------------------------------

            if (!socketRef.current) {

                console.warn(
                    "BRAVMAN TAP : SOCKET ABSENTE"
                );

                return;
            }


            if (!matchId) {

                console.warn(
                    "BRAVMAN TAP : MATCH ABSENT"
                );

                return;
            }


            if (!me?.id) {

                console.warn(
                    "BRAVMAN TAP : JOUEUR ABSENT"
                );

                return;
            }


            const numericMatchId =
                Number(matchId);

            const numericUserId =
                Number(me.id);


            if (
                !Number.isFinite(
                    numericMatchId
                )
            ) {

                console.error(
                    "BRAVMAN TAP : MATCH ID INVALIDE",
                    matchId
                );

                return;
            }


            if (
                !Number.isFinite(
                    numericUserId
                )
            ) {

                console.error(
                    "BRAVMAN TAP : USER ID INVALIDE",
                    me.id
                );

                return;
            }


            // ------------------------------------------------
            // Animation locale immédiate
            // ------------------------------------------------

            setMyPunch(true);


            if (
                tapAnimationTimerRef.current
            ) {

                clearTimeout(
                    tapAnimationTimerRef.current
                );

            }


            tapAnimationTimerRef.current =
                setTimeout(() => {

                    setMyPunch(false);

                }, TAP_ANIMATION);


            // ------------------------------------------------
            // Mise à jour locale du compteur
            //
            // Le serveur reste l'autorité du véritable état.
            // ------------------------------------------------

            setMyTaps(
                previous =>
                    previous + 1
            );


            // ------------------------------------------------
            // Envoi au moteur
            // ------------------------------------------------

            socketRef.current.emit(
                "bravman:tap",
                {
                    matchId:
                        numericMatchId,

                    userId:
                        numericUserId
                }
            );


        }, [
            canTap,
            matchId,
            me?.id
        ]);


    // ======================================================
    // FIN DE PARTIE — DÉTERMINATION DU GAGNANT
    // ======================================================

    useEffect(() => {

        if (!gameState) {
            return;
        }


        const finished =
            gameState.finished === true ||
            String(
                gameState.status || ""
            ).toLowerCase() ===
                "finished";


        if (!finished) {
            return;
        }


        // --------------------------------------------------
        // Le serveur est l'autorité.
        // On cherche d'abord un éventuel winnerId.
        // --------------------------------------------------

        const serverWinnerId =
            Number(
                gameState.winnerId
            );


        const currentUserId =
            Number(
                me?.id
            );


        if (
            Number.isFinite(
                serverWinnerId
            )
        ) {

            setWinner(
                serverWinnerId
            );

        }

        else if (
            Number.isFinite(
                currentUserId
            )
        ) {

            // ----------------------------------------------
            // Fallback uniquement si le moteur ne fournit
            // pas winnerId.
            //
            // On utilise les taps reçus du moteur.
            // ----------------------------------------------

            const creatorId =
                Number(
                    gameState.creatorId
                );

            const opponentId =
                Number(
                    gameState.opponentId
                );

            const creatorTaps =
                Number(
                    gameState.creatorTaps
                ) || 0;

            const opponentTaps =
                Number(
                    gameState.opponentTaps
                ) || 0;


            if (
                Number.isFinite(
                    creatorId
                ) &&
                Number.isFinite(
                    opponentId
                )
            ) {

                if (
                    creatorTaps >
                    opponentTaps
                ) {

                    setWinner(
                        creatorId
                    );

                }

                else if (
                    opponentTaps >
                    creatorTaps
                ) {

                    setWinner(
                        opponentId
                    );

                }

                else {

                    setWinner(
                        null
                    );

                }

            }

        }


        setStatus(
            STATUS.FINISHED
        );


    }, [
        gameState,
        me?.id
    ]);


    // ======================================================
    // SOCKET — ÉVÉNEMENT FIN DE PARTIE
    // ======================================================

    useEffect(() => {

        if (!socketRef.current) {
            return;
        }


        const socket =
            socketRef.current;


        const handleFinished =
            (payload) => {

                console.log(
                    "BRAVMAN FINISHED:",
                    payload
                );


                // --------------------------------------------
                // Vérifier le match concerné
                // --------------------------------------------

                if (
                    payload?.matchId &&
                    matchId &&
                    Number(
                        payload.matchId
                    ) !==
                    Number(matchId)
                ) {

                    return;
                }


                // --------------------------------------------
                // Mettre à jour le winnerId si fourni
                // --------------------------------------------

                const winnerId =
                    Number(
                        payload?.winnerId
                    );


                if (
                    Number.isFinite(
                        winnerId
                    )
                ) {

                    setWinner(
                        winnerId
                    );

                }


                // --------------------------------------------
                // Le résultat doit être affiché.
                // --------------------------------------------

                setStatus(
                    STATUS.FINISHED
                );


                // --------------------------------------------
                // Actualiser une dernière fois le match SAC.
                // --------------------------------------------

                if (matchId) {

                    loadCurrentMatch(
                        matchId
                    );

                }


                loadMatches();

            };


        socket.on(
            "bravman:finished",
            handleFinished
        );


        return () => {

            socket.off(
                "bravman:finished",
                handleFinished
            );

        };

    }, [
        matchId,
        loadCurrentMatch,
        loadMatches
    ]);


    // ======================================================
    // RECONNEXION SOCKET
    // ======================================================

    useEffect(() => {

        if (!socketRef.current) {
            return;
        }


        const socket =
            socketRef.current;


        const handleReconnect =
            () => {

                console.log(
                    "BRAVMAN SOCKET RECONNECTED:",
                    socket.id
                );


                setConnected(true);


                // --------------------------------------------
                // Si un match est déjà en cours,
                // recharger son état SAC avant de rejoindre
                // à nouveau la room Socket.
                // --------------------------------------------

                if (
                    matchId
                ) {

                    loadCurrentMatch(
                        matchId
                    );

                }

            };


        socket.on(
            "connect",
            handleReconnect
        );


        return () => {

            socket.off(
                "connect",
                handleReconnect
            );

        };

    }, [
        matchId,
        loadCurrentMatch
    ]);


    // ======================================================
    // NETTOYAGE DE L'ANIMATION
    // ======================================================

    useEffect(() => {

        return () => {

            if (
                tapAnimationTimerRef.current
            ) {

                clearTimeout(
                    tapAnimationTimerRef.current
                );

                tapAnimationTimerRef.current =
                    null;

            }

        };

    }, []);


    // ======================================================
    // SYNCHRONISATION DE L'ÉTAT DE L'ARENE
    // ======================================================

    useEffect(() => {

        if (!gameState) {
            return;
        }


        // --------------------------------------------------
        // Si le moteur passe en countdown
        // --------------------------------------------------

        if (
            String(
                gameState.status || ""
            ).toLowerCase() ===
            "countdown"
        ) {

            const value =
                Number(
                    gameState.countdown
                );


            if (
                Number.isFinite(
                    value
                )
            ) {

                setCountdown(
                    Math.max(
                        0,
                        value
                    )
                );

            }


            setStatus(
                STATUS.COUNTDOWN
            );

            return;
        }


        // --------------------------------------------------
        // Si le moteur passe en running
        // --------------------------------------------------

        if (
            String(
                gameState.status || ""
            ).toLowerCase() ===
            "running"
        ) {

            const value =
                Number(
                    gameState.remaining
                );


            if (
                Number.isFinite(
                    value
                )
            ) {

                setTimer(
                    Math.max(
                        0,
                        value
                    )
                );

            }


            setStatus(
                STATUS.PLAYING
            );

            return;
        }


        // --------------------------------------------------
        // Si le moteur passe en finished
        // --------------------------------------------------

        if (
            String(
                gameState.status || ""
            ).toLowerCase() ===
            "finished"
        ) {

            setStatus(
                STATUS.FINISHED
            );

        }

    }, [
        gameState
    ]);

        // ======================================================
    // MISE
    // ======================================================

    const [stake, setStake] =
        useState(100);


    // ======================================================
    // INFORMATIONS MATCH COURANT
    // ======================================================

    const currentCreatorId =
        Number(
            currentMatch?.players?.creator
        );


    const currentOpponentId =
        Number(
            currentMatch?.players?.opponent
        );


    const hasOpponent =
        Number.isFinite(
            currentOpponentId
        );


    // ======================================================
    // UTILISATEUR COURANT
    // ======================================================

    const currentUserId =
        Number(
            me?.id
        );


    // ======================================================
    // DÉTERMINATION DU GAGNANT
    // ======================================================

    const iWon =
        Number.isFinite(
            winner
        ) &&
        Number.isFinite(
            currentUserId
        ) &&
        Number(winner) ===
            currentUserId;


    const opponentWon =
        Number.isFinite(
            winner
        ) &&
        Number.isFinite(
            currentUserId
        ) &&
        Number(winner) !==
            currentUserId;


    // ======================================================
    // TITRE DU RÉSULTAT
    // ======================================================

    const resultTitle =
        iWon
            ? "🏆 Victoire !"
            : opponentWon
                ? "Défaite"
                : "Match terminé";


    // ======================================================
    // SOUS-TITRE DU RÉSULTAT
    // ======================================================

    const resultMessage =
        iWon
            ? "Tu as remporté le bras de fer."
            : opponentWon
                ? "Ton adversaire a remporté le bras de fer."
                : "Le match est terminé.";


    // ======================================================
    // RENDU
    // ======================================================

    return (

        <div className="bravman-page">


            {/* ==================================================
                HEADER
            ================================================== */}

            <header className="bravman-header">

                <div>

                    <h1>
                        💪 BraVMan
                    </h1>

                    <p>
                        Affrontez un adversaire dans un
                        duel de bras de fer en temps réel.
                    </p>

                </div>


                <div className="connection">

                    <span
                        className={
                            connected
                                ? "online"
                                : "offline"
                        }
                    />

                    <span>

                        {connected
                            ? "Connecté"
                            : "Déconnecté"
                        }

                    </span>


                    {connected && (

                        <small>
                            Ping : {ping} ms
                        </small>

                    )}

                </div>

            </header>



            {/* ==================================================
                ERREUR
            ================================================== */}

            {error && (

                <section className="bravman-error">

                    <div>

                        <strong>
                            ⚠️ BraVMan
                        </strong>

                        <p>
                            {error}
                        </p>

                    </div>


                    <button
                        type="button"
                        onClick={() => {

                            setError("");

                            setStatus(
                                STATUS.MENU
                            );

                        }}
                    >
                        Retour
                    </button>

                </section>

            )}



            {/* ==================================================
                MENU PRINCIPAL
            ==================================================
            
                IMPORTANT :
                Le MENU contient uniquement :
                - création
                - matchs disponibles

                Il ne contient PAS :
                - waiting room
                - countdown
                - arena
                - result
            ================================================== */}

            {isMenu && !error && (

                <main className="bravman-menu">


                    {/* ==========================================
                        CRÉER UN MATCH
                    ========================================== */}

                    <section className="bravman-create">

                        <div className="section-title">

                            <h2>
                                💪 Créer un défi
                            </h2>

                            <p>
                                Lance un défi et attends
                                qu'un adversaire te rejoigne.
                            </p>

                        </div>


                        <form
                            onSubmit={(event) => {

                                event.preventDefault();

                                if (
                                    loading
                                ) {
                                    return;
                                }

                                createMatch(
                                    Number(stake)
                                );

                            }}
                        >

                            <label htmlFor="bravman-stake">

                                Mise du match

                            </label>


                            <input
                                id="bravman-stake"
                                type="number"
                                min="100"
                                step="100"
                                value={stake}
                                disabled={loading}
                                onChange={(event) => {

                                    setStake(
                                        event.target.value
                                    );

                                }}
                            />


                            <button
                                type="submit"
                                disabled={
                                    loading ||
                                    !stake ||
                                    Number(stake) <= 0
                                }
                            >

                                {loading
                                    ? "Création..."
                                    : "Créer le match"
                                }

                            </button>

                        </form>

                    </section>



                    {/* ==========================================
                        MATCHS DISPONIBLES
                    ========================================== */}

                    <section className="bravman-matches">

                        <div className="section-title">

                            <h2>
                                ⚔️ Défis disponibles
                            </h2>

                            <p>
                                Rejoins un joueur qui
                                attend un adversaire.
                            </p>

                        </div>


                        {matches.length === 0 && (

                            <div className="empty-state">

                                <span>
                                    💪
                                </span>

                                <p>
                                    Aucun défi BraVMan disponible
                                    pour le moment.
                                </p>

                            </div>

                        )}


                        {matches.length > 0 && (

                            <div className="matches-list">

                                {matches.map(
                                    (match) => {

                                        const id =
                                            match?.id ??
                                            match?.matchId;


                                        const matchStake =
                                            match?.stake ??
                                            match?.bet_amount ??
                                            match?.betAmount ??
                                            0;


                                        const creator =
                                            match?.players?.creator ??
                                            match?.creatorId ??
                                            match?.creator_id ??
                                            null;


                                        return (

                                            <article
                                                className="match-card"
                                                key={id}
                                            >

                                                <div>

                                                    <strong>
                                                        💪 Match #{id}
                                                    </strong>


                                                    <span>
                                                        Mise : {matchStake}
                                                    </span>


                                                    <span>
                                                        Joueur : {creator ?? "—"}
                                                    </span>

                                                </div>


                                                <button
                                                    type="button"
                                                    disabled={
                                                        loading ||
                                                        !id
                                                    }
                                                    onClick={() => {

                                                        joinMatch(
                                                            id
                                                        );

                                                    }}
                                                >

                                                    {loading
                                                        ? "Connexion..."
                                                        : "Rejoindre"
                                                    }

                                                </button>

                                            </article>

                                        );

                                    }
                                )}

                            </div>

                        )}

                    </section>

                </main>

            )}



            {/* ==================================================
                WAITING ROOM
            ================================================== */}

            {(isCreating ||
              isWaiting ||
              isReady) &&
            !error && (

                <main className="bravman-waiting">

                    <section className="waiting-card">


                        <div className="waiting-icon">
                            💪
                        </div>


                        <h2>

                            {isCreating
                                ? "Création du match..."
                                : isWaiting
                                    ? "En attente d'un adversaire"
                                    : "Adversaire trouvé !"
                            }

                        </h2>


                        {currentMatch && (

                            <div className="match-information">

                                <div>

                                    <span>
                                        Match
                                    </span>

                                    <strong>
                                        #{currentMatch.id}
                                    </strong>

                                </div>


                                <div>

                                    <span>
                                        Mise
                                    </span>

                                    <strong>
                                        {currentMatch.stake ??
                                         currentMatch.bet_amount ??
                                         currentMatch.betAmount ??
                                         "—"}
                                    </strong>

                                </div>

                            </div>

                        )}



                        {/* ======================================
                            JOUEUR 1
                        ====================================== */}

                        <div className="players-preview">

                            <div className="player-side">

                                <span className="player-icon">
                                    👤
                                </span>

                                <strong>
                                    Toi
                                </strong>

                                <small>

                                    {Number.isFinite(
                                        currentUserId
                                    )
                                        ? `Joueur #${currentUserId}`
                                        : "Identification..."
                                    }

                                </small>

                            </div>


                            <div className="versus">
                                VS
                            </div>


                            {/* ==================================
                                JOUEUR 2
                            ================================== */}

                            <div className="player-side">

                                <span className="player-icon">
                                    {hasOpponent
                                        ? "👤"
                                        : "❓"
                                    }
                                </span>


                                <strong>

                                    {hasOpponent
                                        ? "Adversaire"
                                        : "En attente..."
                                    }

                                </strong>


                                <small>

                                    {hasOpponent
                                        ? `Joueur #${currentOpponentId}`
                                        : "Recherche d'un adversaire"
                                    }

                                </small>

                            </div>

                        </div>



                        {/* ======================================
                            ÉTAT
                        ====================================== */}

                        <div className="waiting-status">

                            {isCreating && (

                                <>
                                    <span>
                                        ⏳
                                    </span>

                                    <p>
                                        Création du match...
                                    </p>
                                </>

                            )}


                            {isWaiting && (

                                <>
                                    <span>
                                        🔎
                                    </span>

                                    <p>
                                        En attente du deuxième joueur...
                                    </p>
                                </>

                            )}


                            {isReady && (

                                <>
                                    <span>
                                        ✅
                                    </span>

                                    <p>
                                        Les deux joueurs sont prêts.
                                    </p>

                                    <small>
                                        Le lancement sera contrôlé
                                        par le moteur BraVMan.
                                    </small>
                                </>

                            )}

                        </div>



                        {/* ======================================
                            RETOUR MENU
                        ====================================== */}

                        {isWaiting && (

                            <button
                                type="button"
                                className="secondary-button"
                                onClick={() => {

                                    resetGame();

                                }}
                            >

                                Retour aux défis

                            </button>

                        )}

                    </section>

                </main>

            )}



            {/* ==================================================
                COUNTDOWN
            ================================================== */}

            {isCountdown && !error && (

                <main className="bravman-countdown">

                    <section className="countdown-card">

                        <span>
                            💪
                        </span>


                        <p>
                            Le duel commence dans
                        </p>


                        <strong>
                            {countdown}
                        </strong>


                        <small>
                            Prépare-toi !
                        </small>

                    </section>

                </main>

            )}



            {/* ==================================================
                ARENA
            ================================================== */}

            {isPlaying && !error && (

                <main className="bravman-arena">


                    {/* ==========================================
                        INFORMATIONS MATCH
                    ========================================== */}

                    <section className="arena-header">

                        <div>

                            <strong>
                                💪 BraVMan
                            </strong>

                            <span>
                                Match #{matchId}
                            </span>

                        </div>


                        <div className="arena-timer">

                            <span>
                                Temps
                            </span>

                            <strong>
                                {timer}s
                            </strong>

                        </div>

                    </section>



                    {/* ==========================================
                        JOUEURS
                    ========================================== */}

                    <section className="arena-players">


                        {/* ======================================
                            MOI
                        ====================================== */}

                        <div
                            className={
                                "arena-player " +
                                (
                                    myPunch
                                        ? "punch"
                                        : ""
                                )
                            }
                        >

                            <div className="player-avatar">
                                👤
                            </div>


                            <h2>
                                Toi
                            </h2>


                            <span>
                                {myTaps} taps
                            </span>

                        </div>



                        {/* ======================================
                            VS
                        ====================================== */}

                        <div className="arena-vs">

                            <span>
                                VS
                            </span>

                        </div>



                        {/* ======================================
                            ADVERSAIRE
                        ====================================== */}

                        <div
                            className={
                                "arena-player " +
                                (
                                    opponentPunch
                                        ? "punch"
                                        : ""
                                )
                            }
                        >

                            <div className="player-avatar">
                                👤
                            </div>


                            <h2>
                                Adversaire
                            </h2>


                            <span>
                                {opponentTaps} taps
                            </span>

                        </div>

                    </section>



                    {/* ==========================================
                        BARRE DE PUISSANCE
                    ========================================== */}

                    <section className="power-section">

                        <div className="power-labels">

                            <span>
                                Toi
                            </span>

                            <span>
                                Adversaire
                            </span>

                        </div>


                        <div className="power-bar">

                            <div
                                className="power-fill"
                                style={{
                                    width:
                                        `${armProgress}%`
                                }}
                            />

                        </div>

                    </section>



                    {/* ==========================================
                        BRAS DE FER
                    ========================================== */}

                    <section className="arm-section">

                        <div
                            className="arm"
                            style={{
                                transform:
                                    `rotate(${armRotation}deg)`
                            }}
                        >
                            💪
                        </div>

                    </section>



                    {/* ==========================================
                        BOUTON TAP
                    ========================================== */}

                    <section className="tap-section">

                        <button
                            type="button"
                            className={
                                "tap-button " +
                                (
                                    myPunch
                                        ? "active"
                                        : ""
                                )
                            }
                            disabled={!canTap}
                            onClick={tap}
                            onTouchStart={(event) => {

                                event.preventDefault();

                                tap();

                            }}
                        >

                            💪

                            <strong>
                                TAP !
                            </strong>

                            <small>
                                Tape le plus vite possible
                            </small>

                        </button>

                    </section>



                    {/* ==========================================
                        STATISTIQUES
                    ========================================== */}

                    <section className="arena-stats">

                        <div>

                            <span>
                                Tes taps
                            </span>

                            <strong>
                                {myTaps}
                            </strong>

                        </div>


                        <div>

                            <span>
                                Adversaire
                            </span>

                            <strong>
                                {opponentTaps}
                            </strong>

                        </div>


                        <div>

                            <span>
                                Différence
                            </span>

                            <strong>
                                {tapDifference > 0
                                    ? `+${tapDifference}`
                                    : tapDifference
                                }
                            </strong>

                        </div>

                    </section>

                </main>

            )}



            {/* ==================================================
                FIN DE MATCH
            ================================================== */}

            {isFinished && !error && (

                <main className="bravman-result">

                    <section className="result-card">


                        <div className="result-icon">

                            {iWon
                                ? "🏆"
                                : opponentWon
                                    ? "💪"
                                    : "🤝"
                            }

                        </div>


                        <h2>
                            {resultTitle}
                        </h2>


                        <p>
                            {resultMessage}
                        </p>



                        {/* ======================================
                            SCORE FINAL
                        ====================================== */}

                        <div className="final-score">

                            <div>

                                <span>
                                    Tes taps
                                </span>

                                <strong>
                                    {myTaps}
                                </strong>

                            </div>


                            <div className="score-separator">
                                -
                            </div>


                            <div>

                                <span>
                                    Adversaire
                                </span>

                                <strong>
                                    {opponentTaps}
                                </strong>

                            </div>

                        </div>



                        {/* ======================================
                            MATCH
                        ====================================== */}

                        <p className="result-match">

                            Match #{matchId}

                        </p>



                        {/* ======================================
                            RETOUR
                        ====================================== */}

                        <button
                            type="button"
                            onClick={() => {

                                resetGame();

                                loadMatches();

                            }}
                        >

                            Retour à BraVMan

                        </button>

                    </section>

                </main>

            )}



            {/* ==================================================
                CHARGEMENT GLOBAL
            ================================================== */}

            {loading && !isMenu && (

                <div className="bravman-loading">

                    <span>
                        ⏳
                    </span>

                    <p>
                        Traitement en cours...
                    </p>

                </div>

            )}

        </div>

    );

    // ======================================================
    // RESET COMPLET DU MATCH
    // ======================================================

    const resetGame =
        useCallback(() => {

            console.log(
                "BRAVMAN RESET GAME"
            );


            // ------------------------------------------------
            // Timers locaux
            // ------------------------------------------------

            if (
                tapAnimationTimerRef.current
            ) {

                clearTimeout(
                    tapAnimationTimerRef.current
                );

                tapAnimationTimerRef.current =
                    null;

            }


            if (
                refreshTimerRef.current
            ) {

                clearInterval(
                    refreshTimerRef.current
                );

                refreshTimerRef.current =
                    null;

            }


            // ------------------------------------------------
            // État du match
            // ------------------------------------------------

            setCurrentMatch(null);

            setGameState(null);


            // ------------------------------------------------
            // Joueurs
            // ------------------------------------------------

            setMe(null);

            setOpponent(null);


            // ------------------------------------------------
            // Score
            // ------------------------------------------------

            setMyTaps(0);

            setOpponentTaps(0);

            setWinner(null);


            // ------------------------------------------------
            // Temps
            // ------------------------------------------------

            setTimer(
                GAME_DURATION
            );

            setCountdown(0);


            // ------------------------------------------------
            // Arène
            // ------------------------------------------------

            setArmRotation(0);

            setArmProgress(50);

            setMyPunch(false);

            setOpponentPunch(false);


            // ------------------------------------------------
            // Réseau
            // ------------------------------------------------

            setPing(null);


            // ------------------------------------------------
            // Erreur
            // ------------------------------------------------

            setError("");


            // ------------------------------------------------
            // Retour au menu
            // ------------------------------------------------

            setStatus(
                STATUS.MENU
            );


        }, []);


    // ======================================================
    // QUITTER PROPREMENT LE MATCH
    // ======================================================

    const leaveMatch =
        useCallback(() => {

            console.log(
                "BRAVMAN LEAVE MATCH:",
                matchId
            );


            // ------------------------------------------------
            // IMPORTANT :
            // On ne détruit PAS la connexion Socket.
            //
            // On quitte uniquement le contexte React
            // du match courant.
            // ------------------------------------------------

            resetGame();


        }, [
            matchId,
            resetGame
        ]);


    // ======================================================
    // PROTECTION CONTRE UN MATCH INVALIDE
    // ======================================================

    useEffect(() => {

        if (!matchId) {
            return;
        }


        const numericMatchId =
            Number(matchId);


        if (
            !Number.isFinite(
                numericMatchId
            )
        ) {

            console.error(
                "BRAVMAN MATCH ID INVALID:",
                matchId
            );


            setError(
                "Identifiant de match BraVMan invalide."
            );


            setStatus(
                STATUS.ERROR
            );

        }

    }, [
        matchId
    ]);


    // ======================================================
    // MATCH TERMINÉ → RAFRAÎCHIR LE SAC
    // ======================================================

    useEffect(() => {

        if (
            status !==
            STATUS.FINISHED
        ) {

            return;
        }


        // ------------------------------------------------
        // Le résultat reste affiché.
        //
        // On actualise seulement les données du match
        // et la liste des défis.
        // ------------------------------------------------

        if (matchId) {

            loadCurrentMatch(
                matchId
            );

        }


        loadMatches();


    }, [
        status,
        matchId,
        loadCurrentMatch,
        loadMatches
    ]);


    // ======================================================
    // SÉCURITÉ : NE PAS TAPER HORS MATCH
    // ======================================================

    useEffect(() => {

        if (
            status !==
            STATUS.PLAYING
        ) {

            setMyPunch(false);

        }

    }, [
        status
    ]);


    // ======================================================
    // SÉCURITÉ : FIN DU TIMER LOCAL
    // ======================================================

    useEffect(() => {

        if (
            status !==
            STATUS.PLAYING
        ) {

            return;
        }


        if (
            timer <= 0
        ) {

            setTimer(0);

        }

    }, [
        status,
        timer
    ]);


    // ======================================================
    // RAFRAÎCHISSEMENT DES MATCHS APRÈS RETOUR MENU
    // ======================================================

    useEffect(() => {

        if (
            status !==
            STATUS.MENU
        ) {

            return;
        }


        loadMatches();

    }, [
        status,
        loadMatches
    ]);


    // ======================================================
    // NETTOYAGE FINAL DU COMPOSANT
    // ======================================================

    useEffect(() => {

        return () => {

            console.log(
                "BRAVMAN COMPONENT UNMOUNT"
            );


            // ----------------------------------------------
            // Timer TAP
            // ----------------------------------------------

            if (
                tapAnimationTimerRef.current
            ) {

                clearTimeout(
                    tapAnimationTimerRef.current
                );

                tapAnimationTimerRef.current =
                    null;

            }


            // ----------------------------------------------
            // Timer refresh
            // ----------------------------------------------

            if (
                refreshTimerRef.current
            ) {

                clearInterval(
                    refreshTimerRef.current
                );

                refreshTimerRef.current =
                    null;

            }


            // ----------------------------------------------
            // Socket
            //
            // Le useEffect de connexion Socket possède
            // déjà son propre cleanup.
            // ----------------------------------------------

            socketRef.current =
                null;

        };

    }, []);

    return (

        <div className="bravman-page">

            <header className="bravman-header">

                <div>

                    <h1>
                        💪 BraVMan
                    </h1>

                    <p>
                        Affrontez un adversaire dans un
                        duel de bras de fer en temps réel.
                    </p>

                </div>

                <div className="connection">

                    <span
                        className={
                            connected
                                ? "online"
                                : "offline"
                        }
                    />

                    {connected
                        ? "Connecté"
                        : "Déconnecté"
                    }

                </div>

            </header>

        </div>

    );

}