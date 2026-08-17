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
    getSacMatches,
    getBravmanRanking
} from "../../sacApi";

import bravmanSocket from "./bravmanSocket";


// ==========================================================
// CONFIGURATION
// ==========================================================

const GAME_ID = "bravman";

// Le moteur BraVMan utilise 45 secondes.
const GAME_DURATION = 45;

const COUNTDOWN_DURATION = 3;

const MATCH_REFRESH = 3000;

const MAX_ARM_ROTATION = 45;

const MAX_PROGRESS = 200;

const TAP_ANIMATION = 120;


// ==========================================================
// STOCKAGE LOCAL
// ==========================================================
//
// Le stockage local ne remplace JAMAIS le SAC.
// Il sert uniquement à mémoriser quel match l'utilisateur
// avait ouvert afin de pouvoir le récupérer après avoir
// quitté l'écran ou rechargé la page.
//

const STORAGE_KEYS = {
    ACTIVE_MATCH_ID: "bravman_active_match_id"
};


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
// UTILITAIRE ID
// ==========================================================

const normalizeId = (value) => {

    const id = Number(value);

    return Number.isFinite(id) && id > 0
        ? id
        : null;

};


// ==========================================================
// UTILITAIRE TEXTE
// ==========================================================

const normalizeText = (value) => {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    const text = String(value).trim();

    return text || "";

};


// ==========================================================
// AUTHENTIFICATION
// ==========================================================

const getTokenPayload = () => {

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

        const base64Payload =
            parts[1]
                .replace(/-/g, "+")
                .replace(/_/g, "/")
                .padEnd(
                    Math.ceil(parts[1].length / 4) * 4,
                    "="
                );

        return JSON.parse(
            atob(base64Payload)
        );

    } catch (error) {

        console.error(
            "BRAVMAN AUTH TOKEN ERROR:",
            error
        );

        return null;

    }

};


const getCurrentUserId = () => {

    const payload =
        getTokenPayload();

    if (!payload) {
        return null;
    }

    return normalizeId(
        payload?.id ??
        payload?.userId ??
        payload?.user_id ??
        payload?.sub
    );

};


// ==========================================================
// NOM UTILISATEUR COURANT
// ==========================================================

const getCurrentUserName = () => {

    const payload =
        getTokenPayload();

    if (!payload) {
        return "";
    }

    return normalizeText(
        payload?.name ??
        payload?.fullName ??
        payload?.full_name ??
        payload?.username ??
        payload?.displayName ??
        payload?.display_name ??
        payload?.pseudo ??
        payload?.nickname
    );

};


// ==========================================================
// EXTRACTION IDENTIFIANTS MATCH
// ==========================================================

const getMatchId = (match) => {

    return normalizeId(
        match?.id ??
        match?.matchId ??
        match?.match_id
    );

};


const getCreatorId = (match) => {

    return normalizeId(
        match?.players?.creator?.id ??
        match?.players?.creator?.userId ??
        match?.players?.creator?.user_id ??
        match?.players?.creator ??
        match?.creatorId ??
        match?.creator_id ??
        match?.creator?.id ??
        match?.creator?.userId ??
        match?.creator?.user_id
    );

};


const getOpponentId = (match) => {

    return normalizeId(
        match?.players?.opponent?.id ??
        match?.players?.opponent?.userId ??
        match?.players?.opponent?.user_id ??
        match?.players?.opponent ??
        match?.opponentId ??
        match?.opponent_id ??
        match?.opponent?.id ??
        match?.opponent?.userId ??
        match?.opponent?.user_id
    );

};


// ==========================================================
// EXTRACTION NOM JOUEUR
// ==========================================================
//
// Le SAC peut évoluer dans la structure de sa réponse.
// On accepte plusieurs formes sans casser le frontend.
//

const extractPlayerName = (
    player,
    fallback = ""
) => {

    if (
        player === null ||
        player === undefined
    ) {
        return fallback;
    }

    if (
        typeof player === "string"
    ) {

        const value =
            normalizeText(player);

        return value || fallback;

    }

    if (
        typeof player !== "object"
    ) {
        return fallback;
    }

    return normalizeText(
        player.name ??
        player.fullName ??
        player.full_name ??
        player.username ??
        player.displayName ??
        player.display_name ??
        player.pseudo ??
        player.nickname ??
        player.label
    ) || fallback;

};


const getCreatorName = (
    match,
    currentUserId = null
) => {

    const creatorId =
        getCreatorId(match);

    const creator =
        match?.players?.creator ??
        match?.creator ??
        match?.creatorUser ??
        match?.creator_user ??
        match?.creatorPlayer ??
        match?.creator_player;

    const directName =
        extractPlayerName(
            creator
        );

    if (directName) {
        return directName;
    }

    const name =
        normalizeText(
            match?.creatorName ??
            match?.creator_name ??
            match?.creatorUsername ??
            match?.creator_username ??
            match?.creatorDisplayName ??
            match?.creator_display_name
        );

    if (name) {
        return name;
    }

    if (
        Number.isFinite(currentUserId) &&
        creatorId === currentUserId
    ) {

        const currentName =
            getCurrentUserName();

        if (currentName) {
            return currentName;
        }

    }

    return Number.isFinite(creatorId)
        ? `Joueur #${creatorId}`
        : "Joueur";
};


const getOpponentName = (
    match,
    currentUserId = null
) => {

    const opponentId =
        getOpponentId(match);

    const opponent =
        match?.players?.opponent ??
        match?.opponent ??
        match?.opponentUser ??
        match?.opponent_user ??
        match?.opponentPlayer ??
        match?.opponent_player;

    const directName =
        extractPlayerName(
            opponent
        );

    if (directName) {
        return directName;
    }

    const name =
        normalizeText(
            match?.opponentName ??
            match?.opponent_name ??
            match?.opponentUsername ??
            match?.opponent_username ??
            match?.opponentDisplayName ??
            match?.opponent_display_name
        );

    if (name) {
        return name;
    }

    if (
        Number.isFinite(currentUserId) &&
        opponentId === currentUserId
    ) {

        const currentName =
            getCurrentUserName();

        if (currentName) {
            return currentName;
        }

    }

    return Number.isFinite(opponentId)
        ? `Joueur #${opponentId}`
        : "";
};


// ==========================================================
// MISE
// ==========================================================

const getMatchStake = (match) => {

    const value =
        match?.stake ??
        match?.amount ??
        match?.bet_amount ??
        match?.betAmount ??
        match?.entry_fee ??
        match?.entryFee ??
        match?.wager ??
        0;

    const numeric =
        Number(value);

    return Number.isFinite(numeric)
        ? numeric
        : 0;

};


// ==========================================================
// STATUT MATCH
// ==========================================================

const getMatchStatus = (match) => {

    return String(
        match?.status ??
        match?.matchStatus ??
        match?.match_status ??
        ""
    )
        .trim()
        .toUpperCase();

};


// ==========================================================
// MATCH ACTIF / RECUPERABLE
// ==========================================================

const isRecoverableStatus = (match) => {

    const status =
        getMatchStatus(match);

    return [

        "CREATED",

        "WAITING_OPPONENT",

        "WAITING",

        "READY",

        "STARTING",

        "COUNTDOWN",

        "RUNNING",

        "PLAYING"

    ].includes(status);

};


const isFinishedStatus = (match) => {

    const status =
        getMatchStatus(match);

    return [

        "FINISHED",

        "SETTLED",

        "CLOSED"

    ].includes(status);

};


const statusPhase = (status) => {

    return {
        CREATED: 0,
        WAITING: 0,
        WAITING_OPPONENT: 0,
        OPEN: 0,
        READY: 1,
        MATCHED: 1,
        STARTING: 2,
        COUNTDOWN: 2,
        RUNNING: 3,
        PLAYING: 3,
        FINISHED: 4,
        SETTLED: 4,
        CLOSED: 4
    }[
        String(
            status || ""
        )
            .trim()
            .toUpperCase()
    ];

};


// ==========================================================
// TRADUCTION STATUS SAC -> UI
// ==========================================================

const uiStatusFromMatch = (
    match
) => {

    const status =
        getMatchStatus(match);

    switch (status) {

        case "CREATED":

        case "WAITING":

        case "WAITING_OPPONENT":

        case "OPEN":

            return STATUS.WAITING;


        case "READY":

        case "MATCHED":

            return STATUS.READY;


        case "STARTING":

        case "COUNTDOWN":

            return STATUS.COUNTDOWN;


        case "RUNNING":

        case "PLAYING":

            return STATUS.PLAYING;


        case "FINISHED":

        case "SETTLED":

        case "CLOSED":

            return STATUS.FINISHED;


        default:

            return null;

    }

};


// ==========================================================
// STOCKAGE MATCH ACTIF
// ==========================================================

const saveActiveMatchId = (
    id
) => {

    const numericId =
        normalizeId(id);

    if (!numericId) {
        return;
    }

    try {

        localStorage.setItem(
            STORAGE_KEYS.ACTIVE_MATCH_ID,
            String(numericId)
        );

    } catch (error) {

        console.warn(
            "BRAVMAN STORAGE SAVE ERROR:",
            error
        );

    }

};


const getStoredActiveMatchId = () => {

    try {

        return normalizeId(
            localStorage.getItem(
                STORAGE_KEYS.ACTIVE_MATCH_ID
            )
        );

    } catch (error) {

        console.warn(
            "BRAVMAN STORAGE READ ERROR:",
            error
        );

        return null;

    }

};


const clearStoredActiveMatchId = () => {

    try {

        localStorage.removeItem(
            STORAGE_KEYS.ACTIVE_MATCH_ID
        );

    } catch (error) {

        console.warn(
            "BRAVMAN STORAGE CLEAR ERROR:",
            error
        );

    }

};


// ==========================================================
// COMPOSANT
// ==========================================================

export default function Bravman() {


    // ======================================================
    // REFS
    // ======================================================

    const currentMatchIdRef =
        useRef(null);

    const currentUserIdRef =
        useRef(null);

    const hasRecoveredMatchRef =
        useRef(false);

    const loadingCurrentMatchRef =
        useRef(false);

    // Refs autoritaires : les handlers Socket ne doivent jamais
    // dépendre d'un ancien render React.
    const currentMatchRef =
        useRef(null);

    const gameStateRef =
        useRef(null);

    // Empêche les joins Socket multiples pour le même match.
    const joinedSocketKeyRef =
        useRef(null);

    // Phase moteur monotone : un ancien paquet WAITING/READY ne
    // doit jamais faire revenir une partie déjà en COUNTDOWN/RUNNING.
    const enginePhaseRef =
        useRef(-1);


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
    // ETAT GENERAL
    // ======================================================

    const [status, setStatus] =
        useState(STATUS.MENU);

    const [loading, setLoading] =
        useState(false);

    const [error, setError] =
        useState("");


    // ======================================================
    // MATCHS PUBLICS
    // ======================================================

    const [matches, setMatches] =
        useState([]);


    // ======================================================
    // MES MATCHS
    // ======================================================

    const [myMatches, setMyMatches] =
        useState([]);

    // ======================================================
    // CLASSEMENT BRAVMAN
    // ======================================================

    const [ranking, setRanking] =
        useState([]);

    const [rankingLoading, setRankingLoading] =
        useState(false);

    const [rankingError, setRankingError] =
        useState("");
    // ======================================================
    // MATCH COURANT
    // ======================================================

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

    const [settlement, setSettlement] =
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
        getMatchId(currentMatch);


    // ======================================================
    // SYNCHRONISATION REFS
    // ======================================================

    useEffect(() => {

        const numericMatchId =
            normalizeId(matchId);

        currentMatchIdRef.current =
            numericMatchId;

        currentMatchRef.current =
            currentMatch;

        // Nouveau match = nouvelle séquence moteur.
        joinedSocketKeyRef.current = null;
        enginePhaseRef.current = -1;

    }, [matchId]);


    useEffect(() => {

        currentMatchRef.current =
            currentMatch;

    }, [currentMatch]);


    useEffect(() => {

        const numericUserId =
            normalizeId(me?.id) ??
            getCurrentUserId();

        currentUserIdRef.current =
            numericUserId;

    }, [me?.id]);


    useEffect(() => {

        gameStateRef.current =
            gameState;

    }, [gameState]);


    // ======================================================
    // UTILISATEUR COURANT
    // ======================================================

    const currentUserId =
        normalizeId(me?.id) ??
        getCurrentUserId();


    // ======================================================
    // JOUEURS COURANTS
    // ======================================================

    const currentCreatorId =
        getCreatorId(
            currentMatch
        );


    const currentOpponentId =
        getOpponentId(
            currentMatch
        );


    const hasOpponent =
        Number.isFinite(
            currentOpponentId
        );


    const myName =
        Number.isFinite(currentUserId) &&
        currentUserId === currentCreatorId
            ? (
                getCreatorName(
                    currentMatch,
                    currentUserId
                )
            )
            : Number.isFinite(currentUserId) &&
              currentUserId === currentOpponentId
                ? (
                    getOpponentName(
                        currentMatch,
                        currentUserId
                    )
                )
                : (
                    getCurrentUserName() ||
                    (
                        Number.isFinite(currentUserId)
                            ? `Joueur #${currentUserId}`
                            : "Toi"
                    )
                );


    const opponentName =
        Number.isFinite(currentUserId) &&
        currentUserId === currentCreatorId
            ? (
                getOpponentName(
                    currentMatch,
                    currentUserId
                ) ||
                "En attente..."
            )
            : Number.isFinite(currentUserId) &&
              currentUserId === currentOpponentId
                ? (
                    getCreatorName(
                        currentMatch,
                        currentUserId
                    )
                )
                : (
                    hasOpponent
                        ? (
                            getOpponentName(
                                currentMatch,
                                currentUserId
                            )
                        )
                        : "En attente..."
                );


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


    // ======================================================
    // TAP AUTORISE
    // ======================================================

    const engineStatus =
        String(
            gameState?.status ??
            ""
        )
            .trim()
            .toUpperCase();

    const canTap =
        connected &&
        isPlaying &&
        engineStatus === "RUNNING" &&
        Boolean(matchId) &&
        Boolean(currentUserId);


    // ======================================================
    // DIFFERENCE TAPS
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
    // AVANTAGE VISUEL
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
    // RESULTAT
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
            ? (
                settlement?.winnerAmount
                    ? `Félicitations, vous avez remporté la victoire au BraVMan. Votre compte a été crédité de ${settlement.winnerAmount}.`
                    : "Félicitations, vous avez remporté la victoire au BraVMan. Le règlement de votre gain est en cours."
            )
            : opponentWon
                ? "Cette partie est complètement terminée. Vous pouvez récupérer un nouveau match."
                : "Le match est terminé.";


    // ======================================================
    // RESET ARENA UNIQUEMENT
    // ======================================================

    const resetArena =
        useCallback(() => {

            setWinner(null);

            setSettlement(null);

            setGameState(null);

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


            if (
                opponentTapAnimationTimerRef.current
            ) {

                clearTimeout(
                    opponentTapAnimationTimerRef.current
                );

                opponentTapAnimationTimerRef.current =
                    null;

            }

        }, []);


    // ======================================================
    // SETTLEMENT
    // ======================================================

    const applySettlement =
        useCallback((data) => {

            if (!data) {
                return;
            }

            console.log(
                "BRAVMAN SETTLEMENT:",
                data
            );

            setSettlement(data);

            const settledWinnerId =
                normalizeId(
                    data?.winnerId ??
                    data?.winner_id ??
                    data?.winner
                );

            if (
                Number.isFinite(
                    settledWinnerId
                )
            ) {

                setWinner(
                    settledWinnerId
                );

            }

        }, []);


    // ======================================================
    // IDENTIFICATION JOUEURS
    // ======================================================

    const syncPlayersFromMatch =
        useCallback((
            match,
            userId
        ) => {

            const creatorId =
                getCreatorId(match);

            const opponentId =
                getOpponentId(match);

            const numericUserId =
                normalizeId(userId);

            if (
                !Number.isFinite(
                    numericUserId
                )
            ) {
                return;
            }


            if (
                Number.isFinite(creatorId) &&
                numericUserId === creatorId
            ) {

                setMe({
                    id: creatorId,
                    name: getCreatorName(
                        match,
                        numericUserId
                    )
                });

                setOpponent(
                    Number.isFinite(opponentId)
                        ? {
                            id: opponentId,
                            name: getOpponentName(
                                match,
                                numericUserId
                            )
                        }
                        : null
                );

                return;

            }


            if (
                Number.isFinite(opponentId) &&
                numericUserId === opponentId
            ) {

                setMe({
                    id: opponentId,
                    name: getOpponentName(
                        match,
                        numericUserId
                    )
                });

                setOpponent(
                    Number.isFinite(creatorId)
                        ? {
                            id: creatorId,
                            name: getCreatorName(
                                match,
                                numericUserId
                            )
                        }
                        : null
                );

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


                if (
                    !Number.isFinite(
                        currentUser
                    )
                ) {

                    setMatches([]);

                    setMyMatches([]);

                    return;

                }


                // ==================================================
                // MES MATCHS
                // ==================================================

                const mine =
                    list.filter(
                        (match) => {

                            const creator =
                                getCreatorId(
                                    match
                                );

                            const opponent =
                                getOpponentId(
                                    match
                                );

                            const isMine =
                                creator === currentUser ||
                                opponent === currentUser;

                            if (!isMine) {
                                return false;
                            }

                            return isRecoverableStatus(
                                match
                            );

                        }
                    );


                setMyMatches(
                    mine
                );


                // ==================================================
                // MATCHS DES AUTRES
                // ==================================================

                const available =
                    list.filter(
                        (match) => {

                            const id =
                                getMatchId(
                                    match
                                );

                            const creator =
                                getCreatorId(
                                    match
                                );

                            const opponent =
                                getOpponentId(
                                    match
                                );


                            if (
                                !Number.isFinite(
                                    id
                                )
                            ) {
                                return false;
                            }


                            // Le créateur ne voit pas son
                            // propre match dans les défis publics.

                            if (
                                creator ===
                                currentUser
                            ) {
                                return false;
                            }


                            // Match déjà pris.

                            if (
                                Number.isFinite(
                                    opponent
                                )
                            ) {
                                return false;
                            }


                            const status =
                                getMatchStatus(
                                    match
                                );


                            return [

                                "CREATED",

                                "WAITING",

                                "WAITING_OPPONENT",

                                "OPEN"

                            ].includes(
                                status
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
    // CHARGER MATCH COURANT
    // ======================================================

    const loadCurrentMatch =
        useCallback(async (
            id,
            options = {}
        ) => {

            const numericMatchId =
                normalizeId(id);

            if (
                !numericMatchId
            ) {
                return null;
            }


            if (
                loadingCurrentMatchRef.current &&
                !options.force
            ) {
                return null;
            }


            loadingCurrentMatchRef.current =
                true;


            try {

                const response =
                    await getSacMatch(
                        numericMatchId
                    );


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


                const userId =
                    getCurrentUserId();


                setCurrentMatch(
                    match
                );


                currentMatchIdRef.current =
                    numericMatchId;


                saveActiveMatchId(
                    numericMatchId
                );


                syncPlayersFromMatch(
                    match,
                    userId
                );


                // ==================================================
                // STATUS
                // ==================================================

                const nextStatus =
                    uiStatusFromMatch(
                        match
                    );


                if (nextStatus) {

                    const dbPhase =
                        statusPhase(
                            getMatchStatus(
                                match
                            )
                        );

                    /*
                     * Le SAC peut encore retourner MATCHED/READY alors
                     * que le moteur a déjà avancé vers COUNTDOWN/RUNNING.
                     * Dans ce cas le moteur gagne : on ne recule jamais.
                     */
                    if (
                        Number.isFinite(dbPhase) &&
                        dbPhase <
                        enginePhaseRef.current
                    ) {

                        console.warn(
                            "BRAVMAN SAC STATUS STALE IGNORED:",
                            {
                                dbStatus:
                                    getMatchStatus(match),
                                dbPhase,
                                enginePhase:
                                    enginePhaseRef.current
                            }
                        );

                    }
                    else {

                        setStatus(
                            nextStatus
                        );

                    }

                }


                // ==================================================
                // MATCH FINI
                // ==================================================

                if (
                    isFinishedStatus(
                        match
                    )
                ) {

                    setStatus(
                        STATUS.FINISHED
                    );

                }


                return match;


            } catch (error) {

                console.error(
                    "BRAVMAN LOAD CURRENT MATCH ERROR:",
                    error
                );

                return null;

            } finally {

                loadingCurrentMatchRef.current =
                    false;

            }

        }, [
            syncPlayersFromMatch
        ]);


    // ======================================================
    // RECUPERATION AUTOMATIQUE
    // ======================================================

    const recoverActiveMatch =
        useCallback(async () => {

            if (
                hasRecoveredMatchRef.current
            ) {
                return null;
            }

            hasRecoveredMatchRef.current =
                true;

            /*
             * IMPORTANT :
             * On ne cherche PLUS arbitrairement le "dernier match
             * récupérable" dans le SAC.
             *
             * Cette logique pouvait rouvrir un ancien match WAITING/
             * READY et mélanger son état avec le moteur courant.
             *
             * Le seul match récupérable automatiquement est celui
             * explicitement mémorisé par l'utilisateur.
             */

            const storedId =
                getStoredActiveMatchId();

            if (!storedId) {
                return null;
            }

            const recovered =
                await loadCurrentMatch(
                    storedId,
                    {
                        force: true
                    }
                );

            if (
                recovered &&
                isRecoverableStatus(
                    recovered
                )
            ) {

                return recovered;

            }

            // FINISHED / SETTLED / CLOSED = plus aucune récupération.
            clearStoredActiveMatchId();

            return null;

        }, [
            loadCurrentMatch
        ]);


    // ======================================================
    // CREER MATCH
    // ======================================================

    const createMatch =
        useCallback(async (
            amount
        ) => {

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


                const numericMatchId =
                    getMatchId(
                        match
                    );


                if (!numericMatchId) {

                    throw new Error(
                        "Le SAC a créé le match mais n'a retourné aucun identifiant."
                    );

                }


                const userId =
                    getCurrentUserId();


                setCurrentMatch(
                    match
                );


                currentMatchIdRef.current =
                    numericMatchId;


                saveActiveMatchId(
                    numericMatchId
                );


                setMe({
                    id:
                        Number.isFinite(userId)
                            ? userId
                            : getCreatorId(match),

                    name:
                        getCreatorName(
                            match,
                            userId
                        )
                });


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
    // REJOINDRE MATCH
    // ======================================================

    const joinMatch =
        useCallback(async (
            id
        ) => {

            if (
                loading ||
                !id
            ) {
                return;
            }


            const numericMatchId =
                normalizeId(id);


            if (
                !numericMatchId
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


                saveActiveMatchId(
                    numericMatchId
                );


                setCurrentMatch(
                    response.match
                );


                const userId =
                    getCurrentUserId();


                syncPlayersFromMatch(
                    response.match,
                    userId
                );


                const nextStatus =
                    uiStatusFromMatch(
                        response.match
                    );


                setStatus(
                    nextStatus ||
                    STATUS.READY
                );


                await loadCurrentMatch(
                    numericMatchId,
                    {
                        force: true
                    }
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
            syncPlayersFromMatch,
            loadCurrentMatch,
            loadMatches
        ]);


    // ======================================================
    // REPRENDRE MATCH
    // ======================================================

    const resumeMatch =
        useCallback(async (
            id
        ) => {

            const numericMatchId =
                normalizeId(id);

            if (
                !numericMatchId
            ) {
                return;
            }


            try {

                setLoading(true);

                setError("");

                resetArena();


                const match =
                    await loadCurrentMatch(
                        numericMatchId,
                        {
                            force: true
                        }
                    );


                if (!match) {

                    throw new Error(
                        "Cette partie n'est plus récupérable."
                    );

                }


                if (
                    isFinishedStatus(
                        match
                    )
                ) {

                    clearStoredActiveMatchId();

                    setStatus(
                        STATUS.FINISHED
                    );

                    return;

                }


                saveActiveMatchId(
                    numericMatchId
                );


                // Le socket sera rejoint automatiquement
                // par l'effet connecté + matchId + me.id.


            } catch (error) {

                console.error(
                    "BRAVMAN RESUME MATCH ERROR:",
                    error
                );

                setError(
                    error?.message ||
                    "Impossible de reprendre cette partie."
                );

                setStatus(
                    STATUS.ERROR
                );

            } finally {

                setLoading(false);

            }

        }, [
            resetArena,
            loadCurrentMatch
        ]);


    // ======================================================
    // QUITTER L'ARENE SANS ABANDONNER LE MATCH
    // ======================================================

    const leaveCurrentMatchView =
        useCallback(() => {

            console.log(
                "BRAVMAN LEAVE VIEW — MATCH CONSERVE:",
                currentMatchIdRef.current
            );


            // IMPORTANT :
            // On ne supprime PAS currentMatch du SAC.
            // On retourne seulement au menu.

            setStatus(
                STATUS.MENU
            );


            setGameState(null);

            setError("");

            setPing("--");


            // Le match reste mémorisé localement.

            if (
                currentMatchIdRef.current
            ) {

                saveActiveMatchId(
                    currentMatchIdRef.current
                );

            }


            // Le polling du menu reprendra automatiquement parce que
            // status passe à MENU.
        }, []);


    // ======================================================
    // RESET COMPLET
    // ======================================================
    //
    // Ce reset est réservé au retour après une partie terminée.
    // Il ne doit PAS être utilisé pour simplement quitter
    // l'écran d'attente ou l'arène.

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


            if (
                opponentTapAnimationTimerRef.current
            ) {

                clearTimeout(
                    opponentTapAnimationTimerRef.current
                );

                opponentTapAnimationTimerRef.current =
                    null;

            }


            setCurrentMatch(null);

            setGameState(null);

            setMe(null);

            setOpponent(null);

            setWinner(null);

            setSettlement(null);

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


            lastOpponentTapsRef.current =
                0;


            currentMatchIdRef.current =
                null;

            currentMatchRef.current =
                null;

            currentUserIdRef.current =
                null;

            gameStateRef.current =
                null;

            joinedSocketKeyRef.current =
                null;

            enginePhaseRef.current =
                -1;


            clearStoredActiveMatchId();


            setPing("--");

            setError("");

            setStatus(
                STATUS.MENU
            );


            loadMatches();

        }, [
            loadMatches
        ]);
        
    // ======================================================
    // CHARGER LE CLASSEMENT BRAVMAN
    // ======================================================

    const loadRanking =
        useCallback(async () => {

            try {

                setRankingLoading(true);
                setRankingError("");

                const response =
                    await getBravmanRanking();

                if (!response?.success) {

                    console.error(
                        "BRAVMAN RANKING RESPONSE:",
                        response
                    );

                    setRanking([]);
                    setRankingError(
                        "Impossible de charger le classement."
                    );

                    return;
                }

                const list =
                    Array.isArray(
                        response.ranking
                    )
                        ? response.ranking
                        : [];

                setRanking(list);

            } catch (err) {

                console.error(
                    "BRAVMAN RANKING ERROR:",
                    err
                );

                setRanking([]);
                setRankingError(
                    "Impossible de charger le classement."
                );

            } finally {

                setRankingLoading(false);

            }

        }, []);


    // ======================================================
    // INITIALISATION
    // ======================================================

    useEffect(() => {

        let cancelled = false;


        const initialize =
            async () => {

                await Promise.all([
                    loadMatches(),
                    loadRanking()
                ]);

                if (cancelled) {
                    return;
                }

                await recoverActiveMatch();
            };


        initialize();


        return () => {

            cancelled = true;

        };

    }, [
        loadMatches,
        loadRanking,
        recoverActiveMatch
    ]);


    // ======================================================
    // REFRESH DES MATCHS PUBLICS
    // ======================================================

    useEffect(() => {

        // Le moteur Socket devient la source temps réel dès qu'un
        // match est ouvert. Le polling SAC ne doit pas tourner en
        // parallèle pendant COUNTDOWN/RUNNING.
        if (
            status !== STATUS.MENU
        ) {
            return undefined;
        }

        const refresh =
            () => {
                loadMatches();
            };

        refresh();

        refreshTimerRef.current =
            setInterval(
                refresh,
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
    // SOCKET — CONNEXION UNIQUE
    // ======================================================

    useEffect(() => {

        const acceptMatchEvent =
            (payload) => {

                const receivedMatchId =
                    normalizeId(
                        payload?.matchId ??
                        payload?.match_id ??
                        payload?.gameState?.matchId ??
                        payload?.gameState?.match_id ??
                        payload?.state?.matchId ??
                        payload?.state?.match_id
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
                    return false;
                }

                return true;
            };


        const handleConnect =
            () => {

                console.log(
                    "BRAVMAN SOCKET CONNECTED:",
                    bravmanSocket.getSocket()?.id
                );

                setConnected(true);

                // Après une reconnexion, le room join doit être rejoué
                // exactement une fois.
                joinedSocketKeyRef.current = null;

            };


        const handleDisconnect =
            (reason) => {

                console.warn(
                    "BRAVMAN SOCKET DISCONNECTED:",
                    reason
                );

                setConnected(false);
                joinedSocketKeyRef.current = null;

            };


        const handleConnectError =
            (socketError) => {

                console.error(
                    "BRAVMAN SOCKET CONNECT ERROR:",
                    socketError
                );

                setConnected(false);
                joinedSocketKeyRef.current = null;

            };


        // ==================================================
        // MATCH READY
        // ==================================================

        const handleMatchReady =
            (payload) => {

                if (!acceptMatchEvent(payload)) {
                    return;
                }

                console.log(
                    "BRAVMAN MATCH READY:",
                    payload
                );

                const opponentId =
                    normalizeId(
                        payload?.opponentId ??
                        payload?.opponent_id
                    );

                if (
                    Number.isFinite(opponentId)
                ) {

                    setOpponent({
                        id: opponentId,
                        name:
                            payload?.opponentName ??
                            payload?.opponent_name ??
                            `Joueur #${opponentId}`
                    });

                }

                /*
                 * READY est un événement métier, pas une raison de
                 * refaire un GET /sac/matches/:id.
                 *
                 * Le GET ici était une des causes du va-et-vient :
                 * le moteur envoyait COUNTDOWN/RUNNING puis le GET SAC
                 * remettait le statut DB à READY/MATCHED.
                 */
                // Si le moteur est déjà en COUNTDOWN/RUNNING,
                // l'ancien événement READY est obsolète.
                if (
                    enginePhaseRef.current < 2
                ) {

                    enginePhaseRef.current =
                        Math.max(
                            enginePhaseRef.current,
                            1
                        );

                    setStatus(
                        STATUS.READY
                    );

                }

            };


        // ==================================================
        // JOINED
        // ==================================================

        const handleJoined =
            (payload) => {

                if (!acceptMatchEvent(payload)) {
                    return;
                }

                console.log(
                    "BRAVMAN JOINED:",
                    payload
                );

                const opponentId =
                    normalizeId(
                        payload?.opponentId ??
                        payload?.opponent_id
                    );

                if (
                    Number.isFinite(opponentId)
                ) {

                    setOpponent(
                        (previous) => ({
                            id: opponentId,
                            name:
                                payload?.opponentName ??
                                payload?.opponent_name ??
                                previous?.name ??
                                `Joueur #${opponentId}`
                        })
                    );

                }

                /*
                 * Ne pas charger le match SAC ici.
                 * Le moteur va envoyer son vrai état.
                 */
            };


        // ==================================================
        // UPDATE MOTEUR
        // ==================================================

        const handleUpdate =
            (payload) => {

                const incoming =
                    payload?.gameState ??
                    payload?.state ??
                    payload;

                if (!incoming) {
                    return;
                }

                if (!acceptMatchEvent(payload)) {
                    return;
                }

                const receivedMatchId =
                    normalizeId(
                        incoming?.matchId ??
                        incoming?.match_id ??
                        payload?.matchId ??
                        payload?.match_id
                    );

                if (
                    Number.isFinite(receivedMatchId)
                ) {

                    currentMatchIdRef.current =
                        receivedMatchId;

                    saveActiveMatchId(
                        receivedMatchId
                    );

                }

                const engineStatus =
                    String(
                        incoming?.status ??
                        ""
                    )
                        .trim()
                        .toUpperCase();

                /*
                 * Le moteur est monotone :
                 *
                 * WAITING -> READY -> COUNTDOWN -> RUNNING -> FINISHED
                 *
                 * Un paquet ancien ne peut donc plus faire revenir
                 * l'interface en arrière.
                 */
                const phase =
                    {
                        WAITING: 0,
                        WAITING_OPPONENT: 0,
                        CREATED: 0,
                        READY: 1,
                        STARTING: 2,
                        COUNTDOWN: 2,
                        RUNNING: 3,
                        PLAYING: 3,
                        FINISHED: 4,
                        SETTLED: 4,
                        CLOSED: 4
                    }[engineStatus];

                if (
                    Number.isFinite(phase) &&
                    phase < enginePhaseRef.current
                ) {

                    console.warn(
                        "BRAVMAN STALE ENGINE UPDATE IGNORED:",
                        {
                            status: engineStatus,
                            phase,
                            lastPhase:
                                enginePhaseRef.current
                        }
                    );

                    return;

                }

                if (
                    Number.isFinite(phase)
                ) {

                    enginePhaseRef.current =
                        phase;

                }

                gameStateRef.current =
                    incoming;

                setGameState(
                    incoming
                );


                // ==================================================
                // SETTLEMENT
                // ==================================================

                const settlementData =
                    incoming?.settlement ??
                    incoming?.financialResult ??
                    incoming?.settlementResult ??
                    null;

                if (settlementData) {
                    applySettlement(
                        settlementData
                    );
                }


                // ==================================================
                // JOUEURS
                // ==================================================

                const creatorId =
                    normalizeId(
                        incoming?.creatorId ??
                        incoming?.creator_id ??
                        getCreatorId(
                            currentMatchRef.current
                        )
                    );

                const opponentId =
                    normalizeId(
                        incoming?.opponentId ??
                        incoming?.opponent_id ??
                        getOpponentId(
                            currentMatchRef.current
                        )
                    );

                const userId =
                    normalizeId(
                        currentUserIdRef.current ??
                        getCurrentUserId()
                    );

                const matchForNames =
                    currentMatchRef.current;

                if (
                    Number.isFinite(creatorId) &&
                    Number.isFinite(opponentId) &&
                    Number.isFinite(userId)
                ) {

                    if (
                        userId === creatorId
                    ) {

                        setMe({
                            id: creatorId,
                            name:
                                getCreatorName(
                                    matchForNames,
                                    userId
                                )
                        });

                        setOpponent({
                            id: opponentId,
                            name:
                                getOpponentName(
                                    matchForNames,
                                    userId
                                )
                        });

                    }
                    else if (
                        userId === opponentId
                    ) {

                        setMe({
                            id: opponentId,
                            name:
                                getOpponentName(
                                    matchForNames,
                                    userId
                                )
                        });

                        setOpponent({
                            id: creatorId,
                            name:
                                getCreatorName(
                                    matchForNames,
                                    userId
                                )
                        });

                    }

                }


                // ==================================================
                // TAPS
                // ==================================================

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

                const previousOpponentTaps =
                    lastOpponentTapsRef.current;

                if (
                    opponentTaps >
                    previousOpponentTaps &&
                    previousOpponentTaps >= 0
                ) {

                    setOpponentPunch(
                        true
                    );

                    if (
                        opponentTapAnimationTimerRef.current
                    ) {

                        clearTimeout(
                            opponentTapAnimationTimerRef.current
                        );

                    }

                    opponentTapAnimationTimerRef.current =
                        setTimeout(() => {

                            setOpponentPunch(
                                false
                            );

                        }, TAP_ANIMATION);

                }

                lastOpponentTapsRef.current =
                    opponentTaps;

                if (
                    Number.isFinite(userId)
                ) {

                    if (
                        userId === creatorId
                    ) {

                        setMyTaps(
                            creatorTaps
                        );

                        setOpponentTaps(
                            opponentTaps
                        );

                    }
                    else if (
                        userId === opponentId
                    ) {

                        setMyTaps(
                            opponentTaps
                        );

                        setOpponentTaps(
                            creatorTaps
                        );

                    }

                }


                // ==================================================
                // TEMPS SERVEUR
                // ==================================================

                const remaining =
                    Number(
                        incoming?.remaining
                    );

                if (
                    Number.isFinite(remaining)
                ) {

                    setTimer(
                        Math.max(
                            0,
                            remaining
                        )
                    );

                }


                // ==================================================
                // COUNTDOWN
                // ==================================================

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


                // ==================================================
                // BRAS
                // ==================================================

                const arm =
                    Number(
                        incoming?.armPosition ??
                        incoming?.arm_position
                    );

                if (
                    Number.isFinite(arm)
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


                // ==================================================
                // GAGNANT
                // ==================================================

                const winnerId =
                    normalizeId(
                        incoming?.winnerId ??
                        incoming?.winner_id
                    );

                if (
                    Number.isFinite(winnerId)
                ) {

                    setWinner(
                        winnerId
                    );

                }


                // ==================================================
                // STATUS UI
                // ==================================================

                if (
                    engineStatus === "COUNTDOWN" ||
                    engineStatus === "STARTING"
                ) {

                    setStatus(
                        STATUS.COUNTDOWN
                    );

                }
                else if (
                    engineStatus === "RUNNING" ||
                    engineStatus === "PLAYING"
                ) {

                    setError("");

                    setStatus(
                        STATUS.PLAYING
                    );

                }
                else if (
                    engineStatus === "FINISHED" ||
                    engineStatus === "SETTLED" ||
                    engineStatus === "CLOSED"
                ) {

                    setStatus(
                        STATUS.FINISHED
                    );

                }
                else if (
                    engineStatus === "WAITING" ||
                    engineStatus === "WAITING_OPPONENT" ||
                    engineStatus === "CREATED"
                ) {

                    setStatus(
                        STATUS.WAITING
                    );

                }
                else if (
                    engineStatus === "READY"
                ) {

                    setStatus(
                        STATUS.READY
                    );

                }

            };


        // ==================================================
        // FINISHED
        // ==================================================

        const handleFinished =
            (payload) => {

                if (!acceptMatchEvent(payload)) {
                    return;
                }

                console.log(
                    "BRAVMAN FINISHED:",
                    payload
                );

                const result =
                    payload?.result ??
                    payload;

                const receivedWinner =
                    normalizeId(
                        result?.winnerId ??
                        result?.winner_id ??
                        payload?.winnerId ??
                        payload?.winner_id
                    );

                if (
                    Number.isFinite(receivedWinner)
                ) {

                    setWinner(
                        receivedWinner
                    );

                }

                const settlementData =
                    payload?.settlement ??
                    payload?.financialResult ??
                    payload?.settlementResult ??
                    result?.settlement ??
                    null;

                if (settlementData) {

                    applySettlement(
                        settlementData
                    );

                }

                const finalCreatorTaps =
                    Number(
                        result?.creatorTaps ??
                        result?.creator_taps
                    );

                const finalOpponentTaps =
                    Number(
                        result?.opponentTaps ??
                        result?.opponent_taps
                    );

                const userId =
                    normalizeId(
                        currentUserIdRef.current
                    );

                const creatorId =
                    normalizeId(
                        result?.creatorId ??
                        result?.creator_id ??
                        getCreatorId(
                            currentMatchRef.current
                        )
                    );

                const opponentId =
                    normalizeId(
                        result?.opponentId ??
                        result?.opponent_id ??
                        getOpponentId(
                            currentMatchRef.current
                        )
                    );

                if (
                    Number.isFinite(userId)
                ) {

                    if (
                        userId === creatorId
                    ) {

                        if (
                            Number.isFinite(
                                finalCreatorTaps
                            )
                        ) {

                            setMyTaps(
                                finalCreatorTaps
                            );

                        }

                        if (
                            Number.isFinite(
                                finalOpponentTaps
                            )
                        ) {

                            setOpponentTaps(
                                finalOpponentTaps
                            );

                        }

                    }
                    else if (
                        userId === opponentId
                    ) {

                        if (
                            Number.isFinite(
                                finalOpponentTaps
                            )
                        ) {

                            setMyTaps(
                                finalOpponentTaps
                            );

                        }

                        if (
                            Number.isFinite(
                                finalCreatorTaps
                            )
                        ) {

                            setOpponentTaps(
                                finalCreatorTaps
                            );

                        }

                    }

                }

                enginePhaseRef.current = 4;

                setTimer(0);

                setStatus(
                    STATUS.FINISHED
                );

                clearStoredActiveMatchId();

                /*
                 * Un seul GET final est acceptable : il sert à
                 * récupérer le règlement financier définitif après
                 * la fin du jeu. Il n'est jamais utilisé pendant
                 * COUNTDOWN/RUNNING.
                 */
                if (
                    currentMatchIdRef.current
                ) {

                    loadCurrentMatch(
                        currentMatchIdRef.current,
                        {
                            force: true
                        }
                    );

                }

                loadMatches();

            };


        // ==================================================
        // ERROR
        // ==================================================

        const handleGameError =
            (payload) => {

                console.error(
                    "BRAVMAN SOCKET ERROR:",
                    payload
                );

                /*
                 * Une erreur Socket n'est PAS une raison de relire
                 * le match SAC immédiatement.
                 *
                 * Sinon :
                 *   tap -> erreur -> GET SAC -> statut DB ancien
                 *   -> UI revient en arrière -> nouveau join -> ...
                 *
                 * C'est précisément le type de boucle que l'on veut
                 * supprimer.
                 */
                setError(
                    payload?.message ||
                    payload?.error ||
                    "Erreur Socket BraVMan."
                );

            };


        // ==================================================
        // LISTENERS
        // ==================================================

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

            /*
             * Le composant est démonté : ici seulement on ferme
             * réellement la connexion.
             */
            bravmanSocket.disconnect();

            joinedSocketKeyRef.current =
                null;

            setConnected(false);

        };

    }, [
        loadCurrentMatch,
        loadMatches,
        applySettlement
    ]);


    // ======================================================
    // JOIN SOCKET ROOM — UNE SEULE FOIS PAR MATCH
    // ======================================================

    useEffect(() => {

        if (
            !connected ||
            !matchId ||
            !currentUserId
        ) {
            return;
        }

        const numericMatchId =
            normalizeId(matchId);

        const numericUserId =
            normalizeId(currentUserId);

        if (
            !Number.isFinite(numericMatchId) ||
            !Number.isFinite(numericUserId)
        ) {
            return;
        }

        const currentStatus =
            getMatchStatus(
                currentMatchRef.current
            );

        if (
            [
                "FINISHED",
                "SETTLED",
                "CLOSED"
            ].includes(currentStatus)
        ) {
            return;
        }

        currentMatchIdRef.current =
            numericMatchId;

        currentUserIdRef.current =
            numericUserId;

        saveActiveMatchId(
            numericMatchId
        );

        bravmanSocket.setMatch(
            numericMatchId,
            numericUserId
        );

        const socketJoinKey =
            `${numericMatchId}:${numericUserId}`;

        if (
            joinedSocketKeyRef.current ===
            socketJoinKey
        ) {
            return;
        }

        joinedSocketKeyRef.current =
            socketJoinKey;

        console.log(
            "BRAVMAN SOCKET JOIN:",
            {
                matchId:
                    numericMatchId,
                userId:
                    numericUserId,
                status:
                    currentStatus
            }
        );

        bravmanSocket.join(
            numericMatchId,
            numericUserId
        );

    }, [
        connected,
        matchId,
        currentUserId
    ]);


    // ======================================================
    // PING
    // ======================================================

    useEffect(() => {

        if (!connected) {

            setPing("--");

            return;

        }


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
                normalizeId(
                    currentUserId
                );


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


            setMyPunch(
                true
            );


            if (
                tapAnimationTimerRef.current
            ) {

                clearTimeout(
                    tapAnimationTimerRef.current
                );

            }


            tapAnimationTimerRef.current =
                setTimeout(() => {

                    setMyPunch(
                        false
                    );

                }, TAP_ANIMATION);


            bravmanSocket.tap(
                numericMatchId,
                numericUserId
            );


        }, [
            canTap,
            matchId,
            currentUserId
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
            [
                "finished",
                "settled",
                "closed"
            ].includes(
                String(
                    gameState?.status ??
                    ""
                ).toLowerCase()
            );


        if (!finished) {
            return;
        }


        const winnerId =
            normalizeId(
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
            timer < 0
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
                        {
                            connected
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

                            loadMatches();

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

                                {
                                    loading
                                        ? "Création..."
                                        : "Créer le match"
                                }

                            </button>

                        </form>

                    </section>


                    {/* ==================================================
                        MES PARTIES EN COURS
                    ================================================== */}

                    <section className="bravman-matches">

                        <div className="section-title">

                            <h2>
                                🎮 Mes parties en cours
                            </h2>

                            <p>
                                Tes matchs restent récupérables
                                même si tu quittes cet écran.
                            </p>

                        </div>


                        {myMatches.length === 0 && (

                            <div className="empty-state">

                                <span>
                                    🎮
                                </span>

                                <p>
                                    Aucune partie en cours.
                                </p>

                            </div>

                        )}


                        {myMatches.length > 0 && (

                            <div className="matches-list">

                                {myMatches.map(
                                    (match) => {

                                        const id =
                                            getMatchId(
                                                match
                                            );

                                        const creatorId =
                                            getCreatorId(
                                                match
                                            );

                                        const opponentId =
                                            getOpponentId(
                                                match
                                            );

                                        const matchStatus =
                                            getMatchStatus(
                                                match
                                            );

                                        const matchStake =
                                            getMatchStake(
                                                match
                                            );

                                        const creatorName =
                                            getCreatorName(
                                                match,
                                                currentUserId
                                            );

                                        const opponentName =
                                            getOpponentName(
                                                match,
                                                currentUserId
                                            );


                                        const statusLabel =
                                            matchStatus ===
                                            "RUNNING"
                                                ? "En cours"
                                                : matchStatus ===
                                                  "READY"
                                                    ? "Prêt"
                                                    : matchStatus ===
                                                      "STARTING"
                                                        ? "Démarrage"
                                                        : "En attente";


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
                                                        {
                                                            creatorId ===
                                                            currentUserId
                                                                ? (
                                                                    opponentId
                                                                        ? `${creatorName} vs ${opponentName}`
                                                                        : `${creatorName} vs En attente`
                                                                )
                                                                : (
                                                                    opponentId
                                                                        ? `${creatorName} vs ${opponentName}`
                                                                        : `${creatorName} vs En attente`
                                                                )
                                                        }
                                                    </span>

                                                    <span>
                                                        État : {statusLabel}
                                                    </span>

                                                </div>


                                                <button
                                                    type="button"
                                                    disabled={
                                                        loading ||
                                                        !id
                                                    }
                                                    onClick={() => {

                                                        resumeMatch(
                                                            id
                                                        );

                                                    }}
                                                >

                                                    {
                                                        loading
                                                            ? "Récupération..."
                                                            : "Reprendre"
                                                    }

                                                </button>

                                            </article>

                                        );

                                    }
                                )}

                            </div>

                        )}

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

                        {/* ==================================================
                                CLASSEMENT BRAVMAN
                            ================================================== */}

                            <section className="bravman-ranking">

                                <div className="bravman-ranking-header">

                                    <div className="bravman-ranking-trophy">
                                        🏆
                                    </div>

                                    <div>

                                        <h2>
                                            Classement BraVMan
                                        </h2>

                                        <p>
                                            Les meilleurs combattants de l'arène
                                        </p>

                                    </div>

                                </div>


                                {rankingLoading && (

                                    <div className="bravman-ranking-state">
                                        <span>⏳</span>
                                        <p>Chargement du classement...</p>
                                    </div>

                                )}


                                {!rankingLoading &&
                                    rankingError && (

                                    <div className="bravman-ranking-state">
                                        <span>⚠️</span>
                                        <p>{rankingError}</p>
                                    </div>

                                )}


                                {!rankingLoading &&
                                    !rankingError &&
                                    ranking.length === 0 && (

                                    <div className="bravman-ranking-state">
                                        <span>🏆</span>
                                        <p>
                                            Aucun combattant n'a encore
                                            participé à BraVMan.
                                        </p>
                                    </div>

                                )}


                                {!rankingLoading &&
                                    !rankingError &&
                                    ranking.length > 0 && (

                                    <div className="bravman-ranking-list">

                                        {ranking.map((player, index) => {

                                            const stars =
                                                Number(player.stars || 1);

                                            const position =
                                                index + 1;

                                            return (

                                                <article
                                                    key={player.id}
                                                    className={`
                                                        bravman-ranking-player
                                                        rank-${position}
                                                    `}
                                                >

                                                    {/* POSITION */}

                                                    <div className="ranking-medal">

                                                        {position === 1 && "🥇"}

                                                        {position === 2 && "🥈"}

                                                        {position === 3 && "🥉"}

                                                        {position > 3 &&
                                                            `#${position}`}

                                                    </div>


                                                    {/* JOUEUR */}

                                                    <div className="ranking-main">

                                                        <strong className="ranking-name">
                                                            {player.username}
                                                        </strong>


                                                        <div className="ranking-level">

                                                            <span className="ranking-stars">
                                                                {"★".repeat(stars)}
                                                                {"☆".repeat(5 - stars)}
                                                            </span>

                                                        </div>

                                                    </div>


                                                    {/* STATISTIQUES */}

                                                    <div className="ranking-stat">

                                                        <strong>
                                                            {player.matchesPlayed}
                                                        </strong>

                                                        <span>
                                                            MATCHS
                                                        </span>

                                                    </div>


                                                    <div className="ranking-stat ranking-win">

                                                        <strong>
                                                            {player.wins}
                                                        </strong>

                                                        <span>
                                                            VICTOIRES
                                                        </span>

                                                    </div>


                                                    <div className="ranking-stat ranking-loss">

                                                        <strong>
                                                            {player.losses}
                                                        </strong>

                                                        <span>
                                                            DÉFAITES
                                                        </span>

                                                    </div>

                                                </article>

                                            );

                                        })}

                                    </div>

                                )}

                            </section>


                        {matches.length > 0 && (

                            <div className="matches-list">

                                {matches.map(
                                    (match) => {

                                        const id =
                                            getMatchId(
                                                match
                                            );

                                        const numericId =
                                            normalizeId(
                                                id
                                            );

                                        const matchStake =
                                            getMatchStake(
                                                match
                                            );

                                        const creatorName =
                                            getCreatorName(
                                                match,
                                                currentUserId
                                            );


                                        return (

                                            <article
                                                className="match-card"
                                                key={
                                                    numericId ??
                                                    id
                                                }
                                            >

                                                <div>

                                                    <strong>
                                                        💪 Match #{numericId ?? id}
                                                    </strong>

                                                    <span>
                                                        Créateur : {creatorName}
                                                    </span>

                                                    <span>
                                                        Mise : {matchStake}
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
                                                            numericId
                                                        );

                                                    }}
                                                >

                                                    {
                                                        loading
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

            {(
                isCreating ||
                isWaiting ||
                isReady
            ) &&
            !error && (

                <main className="bravman-waiting">

                    <section className="waiting-card">

                        <div className="waiting-icon">
                            💪
                        </div>


                        <h2>

                            {
                                isCreating
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
                                        #{matchId}
                                    </strong>

                                </div>


                                <div>

                                    <span>
                                        Mise
                                    </span>

                                    <strong>
                                        {
                                            getMatchStake(
                                                currentMatch
                                            )
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
                                    {
                                        myName
                                    }
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

                                    {
                                        hasOpponent
                                            ? "👤"
                                            : "❓"
                                    }

                                </span>


                                <strong>

                                    {
                                        hasOpponent
                                            ? opponentName
                                            : "En attente..."
                                    }

                                </strong>


                                <small>

                                    {
                                        hasOpponent
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

                                    <small>
                                        Tu peux quitter cet écran.
                                        Ta partie restera disponible
                                        dans « Mes parties en cours ».
                                    </small>
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


                        {/* ==================================================
                            QUITTER SANS ABANDONNER
                        ================================================== */}

                        <button
                            type="button"
                            className="secondary-button"
                            onClick={
                                leaveCurrentMatchView
                            }
                        >
                            Retour aux défis
                        </button>

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


                        <button
                            type="button"
                            className="secondary-button"
                            onClick={
                                leaveCurrentMatchView
                            }
                        >
                            Quitter l'écran
                        </button>

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


                    {/* ==================================================
                        NOMS REELS
                    ================================================== */}

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
                                {myName}
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
                                {
                                    opponentName ||
                                    "Adversaire"
                                }
                            </h2>

                            <span>
                                {opponentTaps} taps
                            </span>

                        </div>

                    </section>


                    {/* ==================================================
                        POWER
                    ================================================== */}

                    <section className="power-section">

                        <div className="power-labels">

                            <span>
                                {myName}
                            </span>

                            <span>
                                {
                                    opponentName ||
                                    "Adversaire"
                                }
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
                                                100,
                                                50 +
                                                advantage / 2
                                            )
                                        )}%`
                                }}
                            />

                        </div>

                    </section>


                    {/* ==================================================
                        BRAS
                    ================================================== */}

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


                    {/* ==================================================
                        TAP
                    ================================================== */}

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


                    {/* ==================================================
                        STATS
                    ================================================== */}

                    <section className="arena-stats">

                        <div>

                            <span>
                                {myName}
                            </span>

                            <strong>
                                {myTaps}
                            </strong>

                        </div>


                        <div>

                            <span>
                                {
                                    opponentName ||
                                    "Adversaire"
                                }
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
                                {
                                    tapDifference > 0
                                        ? `+${tapDifference}`
                                        : tapDifference
                                }
                            </strong>

                        </div>

                    </section>


                    {/* ==================================================
                        QUITTER SANS ABANDONNER
                    ================================================== */}

                    <button
                        type="button"
                        className="secondary-button"
                        onClick={
                            leaveCurrentMatchView
                        }
                    >
                        Quitter l'écran
                    </button>

                </main>

            )}


            {/* ==================================================
                RESULTAT
            ================================================== */}

            {isFinished && !error && (

                <main className="bravman-result">

                    <section className="result-card">

                        <div className="result-icon">

                            {
                                iWon
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


                        {iWon &&
                            settlement?.winnerAmount && (

                            <div className="settlement-success">

                                <strong>
                                    Gain :
                                    {" "}
                                    {settlement.winnerAmount}
                                </strong>

                            </div>

                        )}


                        <div className="final-score">

                            <div>

                                <span>
                                    {myName}
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
                                    {
                                        opponentName ||
                                        "Adversaire"
                                    }
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
                            onClick={
                                resetGame
                            }
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