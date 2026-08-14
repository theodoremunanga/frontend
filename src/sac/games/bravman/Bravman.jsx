// ==========================================================
// BRAVMAN
// Système d'Arbitrage Centralisé (SAC)
// ==========================================================

import "./Bravman.css";

import {
    useState,
    useEffect,
    useRef,
    useCallback,
    useMemo
} from "react";

import {
    createSacMatch,
    joinSacMatch,
    getSacMatch,
    getSacMatches
} from "../../sacApi";

import bravmanSocket from "./bravmanSocket";


// ==========================================================
// CONFIGURATION
// ==========================================================

const GAME_ID = "bravman";

const GAME_DURATION = 45;
const COUNTDOWN_DURATION = 3;

const MATCH_REFRESH = 3000;
const MAX_ARM_ROTATION = 45;
const MAX_PROGRESS = 200;

const TAP_ANIMATION = 120;


// ==========================================================
// STATUTS UI
// ==========================================================

const STATUS = {

    MENU: "menu",

    CREATING: "creating",

    WAITING: "waiting",

    READY: "ready",

    COUNTDOWN: "countdown",

    PLAYING: "playing",

    FINISHED: "finished",

    ERROR: "error"

};


// ==========================================================
// UTILITAIRE AUTHENTIFICATION
// ==========================================================

const normalizeId = (value) => {

    const id = Number(value);

    return Number.isFinite(id) && id > 0
        ? id
        : null;
};


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

        // JWT utilise du base64url, pas toujours du base64 classique.
        const base64Payload =
            parts[1]
                .replace(/-/g, "+")
                .replace(/_/g, "/")
                .padEnd(
                    Math.ceil(parts[1].length / 4) * 4,
                    "="
                );

        const payload =
            JSON.parse(
                atob(base64Payload)
            );

        return normalizeId(
            payload?.id ??
            payload?.userId ??
            payload?.user_id ??
            payload?.sub
        );

    } catch (error) {

        console.error(
            "BRAVMAN AUTH TOKEN ERROR:",
            error
        );

        return null;
    }
};


// ==========================================================
// COMPOSANT
// ==========================================================

export default function Bravman() {


    // ======================================================
    // SOCKET
    // ======================================================

    const currentMatchIdRef =
        useRef(null);

    const currentUserIdRef =
        useRef(null);


    // ======================================================
    // TIMERS
    // ======================================================

    const refreshTimerRef =
        useRef(null);

    const tapAnimationTimerRef =
        useRef(null);

    const opponentTapAnimationTimerRef =
        useRef(null);

    const lastOpponentTapsRef =
        useRef(0);


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
    // MOTEUR
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
    // SOCKET
    // ======================================================

    const [connected, setConnected] =
        useState(false);

    const [ping, setPing] =
        useState("--");


    // ======================================================
    // TEMPS
    // ======================================================

    const [timer, setTimer] =
        useState(GAME_DURATION);

    const [countdown, setCountdown] =
        useState(COUNTDOWN_DURATION);


    // ======================================================
    // RESULTAT
    // ======================================================

    const [winner, setWinner] =
        useState(null);


    // ======================================================
    // TAPS
    // ======================================================

    const [myTaps, setMyTaps] =
        useState(0);

    const [opponentTaps, setOpponentTaps] =
        useState(0);


    // ======================================================
    // BRAS
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
    // MISE
    // ======================================================

    const [stake, setStake] =
        useState(200);


    // ======================================================
    // MATCH ID
    // ======================================================

    const matchId =
        currentMatch?.id ??
        currentMatch?.matchId ??
        null;


    // ======================================================
    // SYNCHRONISATION REFS
    // ======================================================

    useEffect(() => {

        currentMatchIdRef.current =
            matchId
                ? Number(matchId)
                : null;

    }, [matchId]);


    useEffect(() => {

        currentUserIdRef.current =
            normalizeId(me?.id);

    }, [me?.id]);


    // ======================================================
    // STATUTS DERIVES
    // ======================================================

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
        isPlaying &&
        Boolean(matchId) &&
        Boolean(me?.id);


    // ======================================================
    // INFORMATIONS MATCH
    // ======================================================

    const currentCreatorId =
        Number(
            currentMatch?.players?.creator ??
            currentMatch?.creatorId ??
            currentMatch?.creator_id
        );

    const currentOpponentId =
        Number(
            currentMatch?.players?.opponent ??
            currentMatch?.opponentId ??
            currentMatch?.opponent_id
        );

    const hasOpponent =
        Number.isFinite(
            currentOpponentId
        );


    // ======================================================
    // UTILISATEUR
    // ======================================================

    const currentUserId =
        normalizeId(me?.id);


    // ======================================================
    // DIFFERENCE
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
    // GAGNANT
    // ======================================================

    const iWon =
        Number.isFinite(winner) &&
        Number.isFinite(currentUserId) &&
        Number(winner) === currentUserId;


    const opponentWon =
        Number.isFinite(winner) &&
        Number.isFinite(currentUserId) &&
        Number(winner) !== currentUserId;


    const resultTitle =
        iWon
            ? "🏆 Victoire !"
            : opponentWon
                ? "Défaite"
                : "Match terminé";


    const resultMessage =
        iWon
            ? "Tu as remporté le bras de fer."
            : opponentWon
                ? "Ton adversaire a remporté le bras de fer."
                : "Le match est terminé.";


    // ======================================================
    // RESET ARENA
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

            lastOpponentTapsRef.current = 0;

            if (opponentTapAnimationTimerRef.current) {
                clearTimeout(
                    opponentTapAnimationTimerRef.current
                );

                opponentTapAnimationTimerRef.current = null;
            }

        }, []);


    // ======================================================
    // CHARGER LES MATCHS
    // ======================================================

    const loadMatches =
        useCallback(async () => {

            try {

                const response =
                    await getSacMatches(
                        GAME_ID
                    );

                if (!response?.success) {

                    console.error(
                        "BRAVMAN LOAD MATCHES RESPONSE:",
                        response
                    );

                    return;
                }

                const list =
                    Array.isArray(
                        response.matches
                    )
                        ? response.matches
                        : [];

                const currentUser =
                    getCurrentUserId();

                // Sans utilisateur identifié, ne jamais afficher
                // des défis potentiellement rejouables par erreur.
                if (!Number.isFinite(currentUser)) {
                    setMatches([]);
                    return;
                }

                const available =
                    list.filter(
                        match => {

                            const matchId =
                                normalizeId(
                                    match?.id ??
                                    match?.matchId
                                );

                            const creator =
                                normalizeId(
                                    match?.players?.creator ??
                                    match?.creatorId ??
                                    match?.creator_id
                                );

                            const opponent =
                                normalizeId(
                                    match?.players?.opponent ??
                                    match?.opponentId ??
                                    match?.opponent_id
                                );

                            const matchStatus =
                                String(
                                    match?.status ?? ""
                                ).toLowerCase();

                            return (
                                Number.isFinite(matchId) &&
                                Number.isFinite(creator) &&
                                creator !== currentUser &&
                                !Number.isFinite(opponent) &&
                                (
                                    !matchStatus ||
                                    matchStatus === "waiting" ||
                                    matchStatus === "waiting_opponent" ||
                                    matchStatus === "open"
                                )
                            );
                        }
                    );

                setMatches(
                    available
                );

            } catch (error) {

                console.error(
                    "BRAVMAN LOAD MATCHES ERROR:",
                    error
                );

            }

        }, []);


    // ======================================================
    // CHARGER UN MATCH
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


                setCurrentMatch(
                    match
                );


                // ----------------------------------------------
                // IDENTIFICATION
                // ----------------------------------------------

                const userId =
                    getCurrentUserId();

                const creatorId =
                    normalizeId(
                        match?.players?.creator ??
                        match?.creatorId ??
                        match?.creator_id
                    );

                const opponentId =
                    normalizeId(
                        match?.players?.opponent ??
                        match?.opponentId ??
                        match?.opponent_id
                    );

                // Le REST peut être reçu avant le premier événement Socket.
                // Il faut donc synchroniser l'écran immédiatement.
                const matchStatus =
                    String(
                        match?.status ?? ""
                    ).toLowerCase();

                if (matchStatus === "countdown") {
                    setStatus(STATUS.COUNTDOWN);
                }
                else if (
                    matchStatus === "running" ||
                    matchStatus === "playing"
                ) {
                    setStatus(STATUS.PLAYING);
                }
                else if (matchStatus === "finished") {
                    setStatus(STATUS.FINISHED);
                }
                else if (
                    matchStatus === "matched" ||
                    matchStatus === "ready"
                ) {
                    setStatus(STATUS.READY);
                }
                else if (
                    matchStatus === "waiting" ||
                    matchStatus === "waiting_opponent" ||
                    matchStatus === "open"
                ) {
                    setStatus(STATUS.WAITING);
                }


                if (
                    Number.isFinite(userId) &&
                    Number.isFinite(creatorId) &&
                    userId === creatorId
                ) {

                    setMe({
                        id: creatorId
                    });

                    setOpponent(
                        Number.isFinite(opponentId)
                            ? {
                                id: opponentId
                            }
                            : null
                    );

                }

                else if (
                    Number.isFinite(userId) &&
                    Number.isFinite(opponentId) &&
                    userId === opponentId
                ) {

                    setMe({
                        id: opponentId
                    });

                    setOpponent(
                        Number.isFinite(creatorId)
                            ? {
                                id: creatorId
                            }
                            : null
                    );

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
    // CREER UN MATCH
    // ======================================================

    const createMatch =
        useCallback(async (amount) => {

            if (loading) {
                return;
            }

            const numericStake =
                Number(amount);

            if (
                !Number.isFinite(
                    numericStake
                ) ||
                numericStake < 200
            ) {

                setError(
                    "La mise minimale est de 200."
                );

                return;
            }


            try {

                setLoading(true);

                setError("");

                resetArena();

                setStatus(
                    STATUS.CREATING
                );


                console.log(
                    "BRAVMAN CREATE:",
                    {
                        game: GAME_ID,
                        stake: numericStake
                    }
                );


                const response =
                    await createSacMatch({

                        game:
                            GAME_ID,

                        stake:
                            numericStake

                    });


                console.log(
                    "BRAVMAN CREATE RESPONSE:",
                    response
                );


                if (!response?.success) {

                    throw new Error(
                        response?.message ||
                        "Création du match impossible."
                    );
                }


                const match =
                    response.match;

                if (!match) {

                    throw new Error(
                        "Le SAC n'a retourné aucun match."
                    );
                }


                setCurrentMatch(
                    match
                );


                const userId =
                    getCurrentUserId();

                const creatorId =
                    normalizeId(
                        match?.players?.creator ??
                        match?.creatorId ??
                        match?.creator_id
                    );


                if (
                    Number.isFinite(userId)
                ) {

                    setMe({
                        id: userId
                    });

                }
                else if (
                    Number.isFinite(creatorId)
                ) {

                    setMe({
                        id: creatorId
                    });

                }


                setOpponent(null);

                setStatus(
                    STATUS.WAITING
                );


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
            resetArena,
            loadMatches
        ]);


    // ======================================================
    // REJOINDRE UN MATCH
    // ======================================================

    const joinMatch =
        useCallback(async (id) => {

            if (
                loading ||
                !id
            ) {
                return;
            }

            const numericMatchId =
                Number(id);

            if (
                !Number.isFinite(
                    numericMatchId
                )
            ) {

                setError(
                    "Identifiant de match invalide."
                );

                return;
            }


            try {

                setLoading(true);

                setError("");

                resetArena();


                console.log(
                    "BRAVMAN JOIN:",
                    numericMatchId
                );


                const response =
                    await joinSacMatch({

                        game:
                            GAME_ID,

                        matchId:
                            numericMatchId

                    });


                console.log(
                    "BRAVMAN JOIN RESPONSE:",
                    response
                );


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


                setCurrentMatch(
                    response.match
                );


                const userId =
                    getCurrentUserId();

                const creatorId =
                    normalizeId(
                        response.match?.players?.creator ??
                        response.match?.creatorId ??
                        response.match?.creator_id
                    );

                const opponentId =
                    normalizeId(
                        response.match?.players?.opponent ??
                        response.match?.opponentId ??
                        response.match?.opponent_id
                    );


                if (
                    Number.isFinite(userId)
                ) {

                    setMe({
                        id: userId
                    });

                    if (
                        Number.isFinite(
                            creatorId
                        ) &&
                        userId === creatorId
                    ) {

                        setOpponent(
                            Number.isFinite(opponentId)
                                ? {
                                    id: opponentId
                                }
                                : null
                        );

                    }

                    else if (
                        Number.isFinite(
                            opponentId
                        ) &&
                        userId === opponentId
                    ) {

                        setOpponent(
                            Number.isFinite(creatorId)
                                ? {
                                    id: creatorId
                                }
                                : null
                        );

                    }

                }


                setStatus(
                    STATUS.READY
                );


                await loadCurrentMatch(
                    numericMatchId
                );

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
            resetArena,
            loadCurrentMatch,
            loadMatches
        ]);


    // ======================================================
    // RESET COMPLET
    // ======================================================

    const resetGame =
        useCallback(() => {

            console.log(
                "BRAVMAN RESET GAME"
            );


            if (
                tapAnimationTimerRef.current
            ) {

                clearTimeout(
                    tapAnimationTimerRef.current
                );

                tapAnimationTimerRef.current =
                    null;

            }


            setCurrentMatch(null);

            setGameState(null);

            setMe(null);

            setOpponent(null);

            setWinner(null);

            setMyTaps(0);

            setOpponentTaps(0);

            setTimer(
                GAME_DURATION
            );

            setCountdown(
                COUNTDOWN_DURATION
            );

            setArmRotation(0);

            setArmProgress(50);

            setMyPunch(false);

            setOpponentPunch(false);

            lastOpponentTapsRef.current = 0;

            if (opponentTapAnimationTimerRef.current) {
                clearTimeout(
                    opponentTapAnimationTimerRef.current
                );

                opponentTapAnimationTimerRef.current = null;
            }

            setPing("--");

            setError("");

            setStatus(
                STATUS.MENU
            );

        }, []);


    // ======================================================
    // INITIALISATION
    // ======================================================

    useEffect(() => {

        loadMatches();

    }, [
        loadMatches
    ]);


    // ======================================================
    // REFRESH DES DEFIS
    // ======================================================

    useEffect(() => {

        refreshTimerRef.current =
            setInterval(
                () => {

                    if (
                        status ===
                        STATUS.MENU
                    ) {

                        loadMatches();

                    }

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
        status,
        loadMatches
    ]);


    // ======================================================
    // CHARGER MATCH COURANT
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
    // SOCKET — CONNEXION SAC
    // ======================================================

    useEffect(() => {

        // ----------------------------------------------
        // CONNECT
        // ----------------------------------------------

        const handleConnect =
            () => {

                console.log(
                    "BRAVMAN SOCKET CONNECTED:",
                    bravmanSocket.getSocket()?.id
                );

                setConnected(true);

            };


        // ----------------------------------------------
        // DISCONNECT
        // ----------------------------------------------

        const handleDisconnect =
            (reason) => {

                console.warn(
                    "BRAVMAN SOCKET DISCONNECTED:",
                    reason
                );

                setConnected(false);

            };


        // ----------------------------------------------
        // ERROR
        // ----------------------------------------------

        const handleConnectError =
            (socketError) => {

                console.error(
                    "BRAVMAN SOCKET CONNECT ERROR:",
                    socketError
                );

                setConnected(false);

            };


        // ----------------------------------------------
        // MATCH READY
        // ----------------------------------------------
        // Le backend SAC/Bravman utilise cet événement pour
        // prévenir le challenger ET le créateur que le second
        // joueur est arrivé. Sans ce listener, le créateur peut
        // rester bloqué sur "En attente".

        const handleMatchReady =
            (payload) => {

                console.log(
                    "BRAVMAN MATCH READY:",
                    payload
                );

                const receivedMatchId =
                    normalizeId(
                        payload?.matchId ??
                        payload?.match_id
                    );

                const expectedMatchId =
                    normalizeId(
                        currentMatchIdRef.current
                    );

                if (
                    Number.isFinite(receivedMatchId) &&
                    Number.isFinite(expectedMatchId) &&
                    receivedMatchId !== expectedMatchId
                ) {
                    return;
                }

                const opponentId =
                    normalizeId(
                        payload?.opponentId ??
                        payload?.opponent_id
                    );

                if (Number.isFinite(opponentId)) {
                    setOpponent({
                        id: opponentId
                    });
                }

                setStatus(STATUS.READY);

                if (currentMatchIdRef.current) {
                    loadCurrentMatch(
                        currentMatchIdRef.current
                    );
                }
            };


        // ----------------------------------------------
        // FINISHED
        // ----------------------------------------------

        const handleFinished =
            (payload) => {

                console.log(
                    "BRAVMAN FINISHED:",
                    payload
                );


                const receivedMatchId =
                    Number(
                        payload?.matchId
                    );

                const expectedMatchId =
                    Number(
                        currentMatchIdRef.current
                    );


                if (
                    Number.isFinite(
                        receivedMatchId
                    ) &&
                    Number.isFinite(
                        expectedMatchId
                    ) &&
                    receivedMatchId !==
                    expectedMatchId
                ) {

                    return;
                }


                const receivedWinner =
                    Number(
                        payload?.winnerId ??
                        payload?.winner_id
                    );


                if (
                    Number.isFinite(
                        receivedWinner
                    )
                ) {

                    setWinner(
                        receivedWinner
                    );

                }


                setStatus(
                    STATUS.FINISHED
                );


                if (
                    currentMatchIdRef.current
                ) {

                    loadCurrentMatch(
                        currentMatchIdRef.current
                    );

                }

                loadMatches();

            };


        // ----------------------------------------------
        // JOINED
        // ----------------------------------------------

        const handleJoined =
            (payload) => {

                console.log(
                    "BRAVMAN JOINED:",
                    payload
                );


                const receivedMatchId =
                    Number(
                        payload?.matchId
                    );

                const expectedMatchId =
                    Number(
                        currentMatchIdRef.current
                    );


                if (
                    Number.isFinite(
                        receivedMatchId
                    ) &&
                    Number.isFinite(
                        expectedMatchId
                    ) &&
                    receivedMatchId !==
                    expectedMatchId
                ) {

                    return;
                }


                if (
                    Number.isFinite(
                        Number(
                            payload?.opponentId
                        )
                    )
                ) {

                    setOpponent({
                        id:
                            Number(
                                payload.opponentId
                            )
                    });

                }


                const joinedStatus =
                    String(
                        payload?.status ?? ""
                    ).toLowerCase();

                if (
                    joinedStatus === "ready" ||
                    joinedStatus === "matched"
                ) {

                    setStatus(
                        STATUS.READY
                    );

                }


                if (
                    currentMatchIdRef.current
                ) {

                    loadCurrentMatch(
                        currentMatchIdRef.current
                    );

                }

            };


        // ----------------------------------------------
        // UPDATE
        // ----------------------------------------------

        const handleUpdate =
            (payload) => {

                console.log(
                    "BRAVMAN UPDATE:",
                    payload
                );


                const incoming =
                    payload?.gameState ??
                    payload?.state ??
                    payload;


                if (!incoming) {
                    return;
                }


                const receivedMatchId =
                    Number(
                        incoming?.matchId ??
                        payload?.matchId
                    );

                const expectedMatchId =
                    Number(
                        currentMatchIdRef.current
                    );


                if (
                    Number.isFinite(
                        receivedMatchId
                    ) &&
                    Number.isFinite(
                        expectedMatchId
                    ) &&
                    receivedMatchId !==
                    expectedMatchId
                ) {

                    return;
                }


                // ------------------------------------------
                // ETAT MOTEUR
                // ------------------------------------------

                setGameState(
                    incoming
                );


                // ------------------------------------------
                // JOUEURS
                // ------------------------------------------

                const creatorId =
                    normalizeId(
                        incoming?.creatorId ??
                        incoming?.creator_id
                    );

                const opponentId =
                    normalizeId(
                        incoming?.opponentId ??
                        incoming?.opponent_id
                    );


                const userId =
                    normalizeId(
                        currentUserIdRef.current
                    );


                if (
                    Number.isFinite(
                        creatorId
                    ) &&
                    Number.isFinite(
                        opponentId
                    ) &&
                    Number.isFinite(
                        userId
                    )
                ) {

                    if (
                        userId ===
                        creatorId
                    ) {

                        setOpponent({
                            id:
                                opponentId
                        });

                    }

                    else if (
                        userId ===
                        opponentId
                    ) {

                        setOpponent({
                            id:
                                creatorId
                        });

                    }

                }


                // ------------------------------------------
                // TAPS
                // ------------------------------------------

                const creatorTaps =
                    Number(
                        incoming?.creatorTaps ??
                        incoming?.creator_taps
                    ) || 0;

                const opponentTaps =
                    Number(
                        incoming?.opponentTaps ??
                        incoming?.opponent_taps
                    ) || 0;

                // Le serveur envoie les taps cumulés. Si le compteur
                // adverse augmente, on déclenche l'animation locale.
                const previousOpponentTaps =
                    lastOpponentTapsRef.current;

                if (
                    opponentTaps > previousOpponentTaps &&
                    previousOpponentTaps >= 0
                ) {
                    setOpponentPunch(true);

                    if (opponentTapAnimationTimerRef.current) {
                        clearTimeout(
                            opponentTapAnimationTimerRef.current
                        );
                    }

                    opponentTapAnimationTimerRef.current =
                        setTimeout(() => {
                            setOpponentPunch(false);
                        }, TAP_ANIMATION);
                }

                lastOpponentTapsRef.current =
                    opponentTaps;


                if (
                    Number.isFinite(
                        userId
                    )
                ) {

                    if (
                        userId ===
                        creatorId
                    ) {

                        setMyTaps(
                            creatorTaps
                        );

                        setOpponentTaps(
                            opponentTaps
                        );

                    }

                    else if (
                        userId ===
                        opponentId
                    ) {

                        setMyTaps(
                            opponentTaps
                        );

                        setOpponentTaps(
                            creatorTaps
                        );

                    }

                }


                // ------------------------------------------
                // TEMPS
                // ------------------------------------------

                const remaining =
                    Number(
                        incoming?.remaining
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


                // ------------------------------------------
                // COUNTDOWN
                // ------------------------------------------

                const incomingCountdown =
                    Number(
                        incoming?.countdown
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


                // ------------------------------------------
                // POSITION DU BRAS
                // ------------------------------------------

                const arm =
                    Number(
                        incoming?.armPosition ??
                        incoming?.arm_position
                    );


                if (
                    Number.isFinite(
                        arm
                    )
                ) {

                    const safeArm =
                        Math.max(
                            -MAX_ARM_ROTATION,
                            Math.min(
                                MAX_ARM_ROTATION,
                                arm
                            )
                        );


                    setArmRotation(
                        safeArm
                    );


                    const normalized =
                        (
                            safeArm +
                            MAX_ARM_ROTATION
                        ) /
                        (
                            MAX_ARM_ROTATION * 2
                        );


                    setArmProgress(
                        Math.max(
                            0,
                            Math.min(
                                200,
                                normalized * 200
                            )
                        )
                    );

                }


                // ------------------------------------------
                // GAGNANT
                // ------------------------------------------

                const winnerId =
                    Number(
                        incoming?.winnerId ??
                        incoming?.winner_id
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


                // ------------------------------------------
                // STATUS
                // ------------------------------------------

                const engineStatus =
                    String(
                        incoming?.status ??
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

                else if (
                    engineStatus ===
                    "ready" ||
                    engineStatus ===
                    "matched"
                ) {

                    setStatus(
                        STATUS.READY
                    );

                }

            };


        // ----------------------------------------------
        // ERROR
        // ----------------------------------------------

        const handleGameError =
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



        const unsubscribeConnect =
            bravmanSocket.onConnect(
                handleConnect
            );

        const unsubscribeDisconnect =
            bravmanSocket.onDisconnect(
                handleDisconnect
            );

        const unsubscribeConnectError =
            bravmanSocket.onConnectError(
                handleConnectError
            );

        const unsubscribeUpdate =
            bravmanSocket.onUpdate(
                handleUpdate
            );

        const unsubscribeMatchReady =
            bravmanSocket.onMatchReady(
                handleMatchReady
            );

        const unsubscribeJoined =
            bravmanSocket.onJoined(
                handleJoined
            );

        const unsubscribeFinished =
            bravmanSocket.onFinished(
                handleFinished
            );

        const unsubscribeError =
            bravmanSocket.onError(
                handleGameError
            );

        bravmanSocket.connect();

        return () => {

            unsubscribeConnect();
            unsubscribeDisconnect();
            unsubscribeConnectError();
            unsubscribeUpdate();
            unsubscribeMatchReady();
            unsubscribeJoined();
            unsubscribeFinished();
            unsubscribeError();

            bravmanSocket.disconnect();

            setConnected(false);

        };

    }, [
        loadCurrentMatch,
        loadMatches
    ]);


    // ======================================================
    // JOIN SOCKET ROOM
    // ======================================================

    useEffect(() => {

        if (
            !connected ||
            !matchId ||
            !me?.id
        ) {
            return;
        }

        const numericMatchId =
            Number(matchId);

        const numericUserId =
            Number(me.id);

        if (
            !Number.isFinite(numericMatchId) ||
            !Number.isFinite(numericUserId)
        ) {
            return;
        }

        currentMatchIdRef.current =
            numericMatchId;

        currentUserIdRef.current =
            numericUserId;

        bravmanSocket.setMatch(
            numericMatchId,
            numericUserId
        );

        console.log(
            "BRAVMAN SAC SOCKET JOIN:",
            {
                matchId: numericMatchId,
                userId: numericUserId
            }
        );

        bravmanSocket.join(
            numericMatchId,
            numericUserId
        );

    }, [
        connected,
        matchId,
        me?.id
    ]);


    // ======================================================
    // PING
    // ======================================================

    useEffect(() => {

        if (!connected) {
            setPing("--");
            return;
        }

        // Le backend BraVMan actuel ne déclare pas
        // d'événement bravman:ping. On conserve l'indicateur
        // dans l'UI sans émettre un événement non supporté.
        setPing("--");

    }, [
        connected
    ]);


    // ======================================================
    // TAP
    // ======================================================

    const tap =
        useCallback(() => {

            if (!canTap) {
                return;
            }


            const numericMatchId =
                Number(matchId);

            const numericUserId =
                normalizeId(me?.id);


            if (
                !Number.isFinite(
                    numericMatchId
                ) ||
                !Number.isFinite(
                    numericUserId
                )
            ) {

                return;
            }


            // ------------------------------------------
            // ANIMATION
            // ------------------------------------------

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


            // ------------------------------------------
            // ENVOI SERVEUR
            // ------------------------------------------

            bravmanSocket.tap(
                numericMatchId,
                numericUserId
            );

        }, [
            canTap,
            matchId,
            me?.id
        ]);


    // ======================================================
    // FIN DE PARTIE
    // ======================================================

    useEffect(() => {

        if (!gameState) {
            return;
        }


        const finished =
            gameState?.finished === true ||
            String(
                gameState?.status ??
                ""
            ).toLowerCase() ===
            "finished";


        if (!finished) {
            return;
        }


        const winnerId =
            Number(
                gameState?.winnerId ??
                gameState?.winner_id
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
        else {

            const creatorId =
                Number(
                    gameState?.creatorId
                );

            const opponentId =
                Number(
                    gameState?.opponentId
                );

            const creatorTaps =
                Number(
                    gameState?.creatorTaps
                ) || 0;

            const opponentTaps =
                Number(
                    gameState?.opponentTaps
                ) || 0;


            if (
                creatorTaps >
                opponentTaps &&
                Number.isFinite(
                    creatorId
                )
            ) {

                setWinner(
                    creatorId
                );

            }

            else if (
                opponentTaps >
                creatorTaps &&
                Number.isFinite(
                    opponentId
                )
            ) {

                setWinner(
                    opponentId
                );

            }

        }


        setStatus(
            STATUS.FINISHED
        );

    }, [
        gameState
    ]);


    // ======================================================
    // NETTOYAGE TAP
    // ======================================================

    useEffect(() => {

        return () => {

            if (
                tapAnimationTimerRef.current
            ) {

                clearTimeout(
                    tapAnimationTimerRef.current
                );

            }

            if (
                opponentTapAnimationTimerRef.current
            ) {

                clearTimeout(
                    opponentTapAnimationTimerRef.current
                );

            }

        };

    }, []);


    // ======================================================
    // PROTECTION TIMER
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
                         {ping} 
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
                MENU
            ================================================== */}

            {isMenu && !error && (

                <main className="bravman-menu">


                    {/* ==================================================
                        CREATION
                    ================================================== */}

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

                                createMatch(
                                    stake
                                );

                            }}
                        >

                            <label htmlFor="bravman-stake">

                                Mise du match

                            </label>


                            <input
                                id="bravman-stake"
                                type="number"
                                min="200"
                                step="200"
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
                                    Number(stake) < 200
                                }
                            >

                                {loading
                                    ? "Création..."
                                    : "Créer le match"
                                }

                            </button>

                        </form>

                    </section>


                    {/* ==================================================
                        DEFIS DISPONIBLES
                    ================================================== */}

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

                                        const numericId =
                                            normalizeId(id);

                                        const matchStake =
                                            match?.stake ??
                                            match?.bet_amount ??
                                            match?.betAmount ??
                                            0;

                                        const creator =
                                            match?.players?.creator ??
                                            match?.creatorId ??
                                            match?.creator_id ??
                                            "—";


                                        return (

                                            <article
                                                className="match-card"
                                                key={numericId ?? id}
                                            >

                                                <div>

                                                    <strong>
                                                        💪 Match #{numericId ?? id}
                                                    </strong>

                                                    <span>
                                                        Mise : {matchStake}
                                                    </span>

                                                    <span>
                                                        Joueur : {creator}
                                                    </span>

                                                </div>


                                                <button
                                                    type="button"
                                                    disabled={
                                                        loading ||
                                                        !numericId
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
                                        {
                                            currentMatch?.stake ??
                                            currentMatch?.bet_amount ??
                                            currentMatch?.betAmount ??
                                            "—"
                                        }
                                    </strong>

                                </div>

                            </div>

                        )}


                        <div className="players-preview">

                            <div className="player-side">

                                <span className="player-icon">
                                    👤
                                </span>

                                <strong>
                                    Toi
                                </strong>

                                <small>
                                    {
                                        Number.isFinite(
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
                                        Le moteur BraVMan va lancer
                                        le compte à rebours.
                                    </small>
                                </>

                            )}

                        </div>


                        {isWaiting && (

                            <button
                                type="button"
                                className="secondary-button"
                                onClick={
                                    resetGame
                                }
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
                ARENE
            ================================================== */}

            {isPlaying && !error && (

                <main className="bravman-arena">


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


                    <section className="arena-players">

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


                        <div className="arena-vs">

                            <span>
                                VS
                            </span>

                        </div>


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
                                        `${Math.max(
                                            0,
                                            Math.min(
                                                200,
                                                50 + advantage / 2
                                            )
                                        )}%`
                                }}
                            />

                        </div>

                    </section>


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
                            disabled={
                                !canTap
                            }
                            onClick={
                                tap
                            }
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
                RESULTAT
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


                        <p className="result-match">
                            Match #{matchId}
                        </p>


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
                LOADING
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

} 