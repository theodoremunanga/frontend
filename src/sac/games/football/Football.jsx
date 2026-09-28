 /* ============================================================*
  6BETBALL — FOOTBALL
 * Football.jsx
 *
 * RESPONSABILITÉS
 * ------------------------------------------------------------
 * - Cycle de vie SAC d'une partie
 * - Création avec mise
 * - Lobby / parties disponibles
 * - Rejoindre une partie
 * - Reprendre une partie existante
 * - Connexion au socket football dédié
 * - Réception de l'état temps réel
 * - Réception des événements football
 * - Contrôle du joueur
 * - Affichage du terrain
 * - Affichage des 22 joueurs
 * - Affichage du ballon 3D
 * - Score / chronomètre
 * - Résultat
 * - Règlement SAC
 * - Nettoyage
 * - Retour accueil
 *
 * SOURCE DE VÉRITÉ
 * ------------------------------------------------------------
 * Le moteur backend est maître de :
 *
 *   joueurs
 *   positions
 *   ballon
 *   score
 *   possession
 *   temps
 *   événements
 *   phase
 *   résultat
 *
 * Football.jsx ne simule PAS le football.
 * ============================================================ */

import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import {
    connectFootballSocket,
    disconnectFootballSocket,
    getFootballSocket,
    joinFootballMatch,
    leaveFootballMatch,
    requestFootballState,
    sendFootballDirection,
    sendFootballX,
    sendFootballA,
    subscribeFootballSocket,
} from "./footballSocket";

import {
    getFootballData,
} from "./FootballPlayers";

import "./Football.css";


/* ============================================================
 * CONFIGURATION
 * ============================================================ */

const GAME = "football";

const DEFAULT_STAKE = 500;

const MIN_STAKE = 200;



/*
 * Le moteur utilise :
 *
 * FIELD_LENGTH = 105
 * FIELD_WIDTH  = 68
 *
 * On conserve ces dimensions côté frontend afin que
 * la projection visuelle reste cohérente.
 */

const FIELD_LENGTH = 105;

const FIELD_WIDTH = 68;


/* ============================================================
 * ÉCRANS
 * ============================================================ */

const SCREENS = Object.freeze({
    LOBBY: "LOBBY",
    WAITING: "WAITING",
    PLAYING: "PLAYING",
    RESULT: "RESULT",
});


/* ============================================================
 * OUTILS GÉNÉRAUX
 * ============================================================ */

function normalizeId(value) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return null;
    }

    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : null;
}


function normalizeString(value, fallback = "") {
    if (
        value === null ||
        value === undefined
    ) {
        return fallback;
    }

    const text = String(value).trim();

    return text || fallback;
}


function clamp(value, min, max) {
    return Math.max(
        min,
        Math.min(max, value)
    );
}


function formatMoney(value) {
    const amount = Number(value) || 0;

    return new Intl.NumberFormat(
        "fr-FR"
    ).format(amount);
}


function formatTime(minute, second) {
    const m = String(
        Number(minute) || 0
    ).padStart(2, "0");

    const s = String(
        Number(second) || 0
    ).padStart(2, "0");

    return `${m}:${s}`;
}


/* ============================================================
 * UTILISATEUR
 * ============================================================ */

function getStoredUser() {
    try {
        const raw =
            localStorage.getItem("user") ||
            localStorage.getItem("currentUser");

        if (!raw) {
            return null;
        }

        return JSON.parse(raw);
    } catch {
        return null;
    }
}


function getToken() {
    return (
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken") ||
        ""
    );
}


function getUserId(user) {
    return normalizeId(
        user?.id ??
        user?.userId ??
        user?.user_id
    );
}


function getUserName(user) {
    return normalizeString(
        user?.name ??
        user?.username ??
        user?.fullName ??
        user?.displayName ??
        user?.email,
        "Joueur"
    );
}


/* ============================================================
 * API SAC
 *
 * Le socket ne doit PAS gérer la création financière.
 * ============================================================ */

function getApiBaseUrl() {
    return (
        import.meta.env.VITE_API_URL ||
        "https://backend-ad3t.onrender.com/api" 
    ); 
} 
 
 
async function apiRequest( 
    path, 
    options = {} 
) { 
    const token = getToken(); 
 
    const response = 
        await fetch( 
            `${getApiBaseUrl()}${path}`, 
            { 
                ...options, 
 
                headers: { 
                    "Content-Type": 
                        "application/json", 
 
                    ...(token 
                        ? { 
                              Authorization: 
                                  `Bearer ${token}`, 
                          } 
                        : {}), 
 
                    ...(options.headers || {}), 
                }, 
            } 
        ); 
 
    let data = null; 
 
    try { 
        data = 
            await response.json(); 
    } catch { 
        data = null; 
    } 
 
    if (!response.ok) { 
      console.error( 
          "❌ API ERROR", 
          { 
              status: response.status, 
              path, 
              data, 
          } 
      ); 
 
      const message = 
          data?.message || 
          data?.error || 
          data?.code || 
          `Erreur HTTP ${response.status}`; 
 
      const error = new Error(message); 
 
      error.status = response.status; 
      error.data = data; 
 
      throw error; 
  } 
 
    return data; 
} 
 
 
/* ============================================================ 
 * EXTRACTION LISTE MATCHS 
 * ============================================================ */ 
 
function extractMatchList(data) { 
    if (Array.isArray(data)) { 
        return data; 
    } 
 
    if ( 
        Array.isArray( 
            data?.matches 
        ) 
    ) { 
        return data.matches; 
    } 
 
    if ( 
        Array.isArray( 
            data?.data 
        ) 
    ) { 
        return data.data; 
    } 
 
    if ( 
        Array.isArray( 
            data?.data?.matches 
        ) 
    ) { 
        return data.data.matches; 
    } 
 
    return []; 
} 
 
 
/* ============================================================ 
 * NORMALISATION MATCH 
 * ============================================================ */ 
 
function normalizeMatch(match) { 
    if (!match) { 
        return null; 
    } 
 
    const matchId = 
        normalizeId( 
            match.matchId ?? 
            match.match_id ?? 
            match.id 
        ); 
 
    return { 
        ...match, 
 
        matchId, 
 
        id: 
            match.id ?? 
            matchId, 
 
        stake: 
            Number( 
                match.stake ?? 
                match.amount ?? 
                match.bet_amount ?? 
                0 
            ) || 0, 
 
        status: 
            String( 
                match.status ?? 
                match.matchStatus ?? 
                "WAITING" 
            ).toUpperCase(), 
 
        score: { 
            home: 
                Number( 
                    match.score?.home 
                ) || 0, 
 
            away: 
                Number( 
                    match.score?.away 
                ) || 0, 
        }, 
 
        clock: 
            match.clock || { 
                minute: 0, 
                second: 0, 
            }, 
 
        teams: 
            match.teams || { 
                home: { 
                    name: 
                        match.homeTeam?.name || 
                        "HOME", 
 
                    players: [], 
                }, 
 
                away: { 
                    name: 
                        match.awayTeam?.name || 
                        "AWAY", 
 
                    players: [], 
                }, 
            }, 
 
        ball: 
            match.ball || null, 
    }; 
} 
 
 
/* ============================================================ 
 * EXTRACTION DE L'ÉTAT SOCKET 
 * ============================================================ */ 
 
function extractSocketState(payload) { 
    if (!payload) { 
        return null; 
    } 
 
    return ( 
        payload?.state || 
        payload?.gameState || 
        payload?.matchState || 
        payload 
    ); 
} 
 
 
/* ============================================================ 
 * MATCH ID DEPUIS PAYLOAD 
 * ============================================================ */ 
 
function extractPayloadMatchId(payload) { 
    return normalizeId( 
        payload?.matchId ?? 
        payload?.match_id ?? 
        payload?.id ?? 
        payload?.state?.matchId ?? 
        payload?.gameState?.matchId 
    ); 
} 
 
 
/* ============================================================ 
 * PHASE 
 * ============================================================ */ 
 
function isPlayingState(state) { 
    const status = 
        String( 
            state?.status || "" 
        ).toUpperCase(); 
 
    const phase = 
        String( 
            state?.phase || "" 
        ).toUpperCase(); 
 
    return ( 
        status === "PLAYING" || 
        status === "RUNNING" || 
        phase === "FIRST_HALF" || 
        phase === "SECOND_HALF" || 
        phase === "EXTRA_TIME_FIRST" || 
        phase === "EXTRA_TIME_SECOND" || 
        phase === "PENALTIES" 
    ); 
} 
 
 
function isFinishedState(state) { 
    const status = 
        String( 
            state?.status || "" 
        ).toUpperCase(); 
 
    const phase = 
        String( 
            state?.phase || "" 
        ).toUpperCase(); 
 
    return ( 
        status === "FINISHED" || 
        status === "SETTLED" || 
        status === "CLOSED" || 
        phase === "FINISHED" || 
        state?.finished === true 
    ); 
} 
 
 
/* ============================================================ 
 * PROJECTION TERRAIN 
 * 
 * Backend : 
 * 
 * X = 0 -> 105 
 * Y = 0 -> 68 
 * 
 * Frontend : 
 * 
 * left = 0 -> 100% 
 * top  = 0 -> 100% 
 * ============================================================ */ 
 
function projectX(x) { 
    const value = 
        Number(x); 
 
    if (!Number.isFinite(value)) { 
        return 50; 
    } 
 
    return ( 
        clamp( 
            value, 
            0, 
            FIELD_LENGTH 
        ) / 
        FIELD_LENGTH 
    ) * 
        100; 
} 
 
 
function projectY(y) { 
    const value = 
        Number(y); 
 
    if (!Number.isFinite(value)) { 
        return 50; 
    } 
 
    return ( 
        clamp( 
            value, 
            0, 
            FIELD_WIDTH 
        ) / 
        FIELD_WIDTH 
    ) * 
        100; 
} 
 
 
/* ============================================================ 
 * POSITION JOUEUR 
 * ============================================================ */ 
 
function getPlayerPosition(player) { 
    return ( 
        player?.position || 
        player?.pos || 
        { 
            x: 
                player?.x ?? 
                52.5, 
 
            y: 
                player?.y ?? 
                34, 
        } 
    ); 
} 
 
 
/* ============================================================ 
 * POSITION BALLON 
 * ============================================================ */ 
 
function getBallPosition(ball) { 
    return { 
        x: 
            Number(ball?.x) || 
            FIELD_LENGTH / 2, 
 
        y: 
            Number(ball?.y) || 
            FIELD_WIDTH / 2, 
 
        z: 
            Number(ball?.z) || 0, 
    }; 
} 
 
 
/* ============================================================ 
 * COMPONENT 
 * ============================================================ */ 
 
export default function Football({ 
    onBack, 
    onHome, 
}) { 
 
    /* ======================================================== 
     * USER 
     * ======================================================== */ 
 
    const user = useMemo( 
        () => getStoredUser(), 
        [] 
    ); 
 
    const userId = useMemo( 
        () => getUserId(user), 
        [user] 
    ); 
 
    const userName = useMemo( 
        () => getUserName(user), 
        [user] 
    ); 
 
 
    /* ======================================================== 
     * REFS 
     * ======================================================== */ 
 
    const mountedRef = 
        useRef(true); 
 
    const matchIdRef = 
        useRef(null); 
 
    const selectedMatchRef = 
        useRef(null); 
 
    const socketRef = 
        useRef(null); 
 
    const resultHandledRef = 
        useRef(false); 
 
 
    /* ======================================================== 
     * STATE 
     * ======================================================== */ 
 
    const [ 
        screen, 
        setScreen, 
    ] = useState( 
        SCREENS.LOBBY 
    ); 
 
 
    const [ 
        matches, 
        setMatches, 
    ] = useState([]); 
 
 
    const [ 
        selectedMatch, 
        setSelectedMatch, 
    ] = useState(null); 
 
 
    const [ 
        matchState, 
        setMatchState, 
    ] = useState(null); 
 
 
    const [ 
        stake, 
        setStake, 
    ] = useState( 
        DEFAULT_STAKE 
    ); 
 
 
    const [ 
        loading, 
        setLoading, 
    ] = useState(false); 
 
    const [ 
      initialLoading, 
      setInitialLoading, 
    ] = useState(true); 
 
 
    const [ 
        error, 
        setError, 
    ] = useState(null); 
 
 
    const [ 
        socketConnected, 
        setSocketConnected, 
    ] = useState(false); 
 
 
    const [ 
        socketMessage, 
        setSocketMessage, 
    ] = useState(null); 
 
 
    const [ 
        result, 
        setResult, 
    ] = useState(null); 
 
 
    const [ 
        resultSaved, 
        setResultSaved, 
    ] = useState(false); 
 
 
    const [ 
        settled, 
        setSettled, 
    ] = useState(false); 
 
 
    const [ 
        cleaned, 
        setCleaned, 
    ] = useState(false); 
 
 
    const [ 
        commandLocked, 
        setCommandLocked, 
    ] = useState(false); 
 
 
    /* ======================================================== 
     * DATA FOOTBALL 
     * ======================================================== */ 
 
    const footballData = 
        useMemo( 
            () => 
                getFootballData( 
                    matchState, 
                    userId 
                ), 
 
            [ 
                matchState, 
                userId, 
            ] 
        ); 
 
 
    const footballPlayers = footballData?.players ?? {}; 
 
    const players = Array.isArray(footballPlayers.all) 
        ? footballPlayers.all 
        : []; 
 
    const homePlayers = Array.isArray(footballPlayers.home) 
        ? footballPlayers.home 
        : []; 
 
    const awayPlayers = Array.isArray(footballPlayers.away) 
        ? footballPlayers.away 
        : []; 
 
   
 
 
    const controlledPlayer = 
        footballData?.controlledPlayer || 
        null; 
 
 
    const ballOwner = 
        footballData?.ballOwner || 
        null; 
 
 
    const myTeam = 
        footballData?.myTeam || 
        null; 
 
 
    /* ======================================================== 
     * SCORE 
     * ======================================================== */ 
 
    const homeScore = 
        Number( 
            matchState?.score?.home 
        ) || 0; 
 
 
    const awayScore = 
        Number( 
            matchState?.score?.away 
        ) || 0; 
 
 
    /* ======================================================== 
     * CLOCK 
     * ======================================================== */ 
 
    const minute = 
        Number( 
            matchState?.clock?.minute 
        ) || 0; 
 
 
    const second = 
        Number( 
            matchState?.clock?.second 
        ) || 0; 
 
 
    const matchTime = 
        formatTime( 
            minute, 
            second 
        ); 
 
 
    /* ======================================================== 
     * CLUBS 
     * ======================================================== */ 
 
    const homeTeamName = 
        normalizeString( 
            matchState?.teams?.home?.name ?? 
            matchState?.homeTeam?.name, 
            "HOME FC" 
        ); 
 
 
    const awayTeamName = 
        normalizeString( 
            matchState?.teams?.away?.name ?? 
            matchState?.awayTeam?.name, 
            "AWAY FC" 
        ); 
 
    const playersInMatch = 
        Array.isArray(matchState?.players) 
            ? matchState.players 
            : Array.isArray(matchState?.users) 
                ? matchState.users 
                : Array.isArray(selectedMatch?.players) 
                    ? selectedMatch.players 
                    : []; 
 
    const hasOpponent = playersInMatch.some((player) => { 
        const playerId = 
            player?.userId ?? 
            player?.id ?? 
            player?.playerId; 
 
        return ( 
            playerId != null && 
            String(playerId) !== String(userId) 
        ); 
    }); 
 
    const canStartMatch = 
        screen === SCREENS.WAITING && 
        Boolean(selectedMatch?.matchId) && 
        hasOpponent; 
 
 
    /* ======================================================== 
     * MISE 
     * ======================================================== */ 
 
    const currentStake = 
        Number( 
            matchState?.stake ?? 
            selectedMatch?.stake ?? 
            0 
        ) || 0; 
 
 
    /* ======================================================== 
     * INITIALISATION 
     * ======================================================== */ 
 
    useEffect(() => { 
 
        mountedRef.current = true; 
 
        return () => { 
            mountedRef.current = false; 
        }; 
 
    }, []); 
 
 
    /* ======================================================== 
     * SOCKET 
     * 
     * IMPORTANT : 
     * 
     * Aucun io() ici. 
     * 
     * On utilise exclusivement footballSocket.js. 
     * ======================================================== */ 
 
    useEffect(() => { 
 
        const socket = 
            getFootballSocket(); 
 
        socketRef.current = 
            socket; 
 
 
        const cleanup = 
            subscribeFootballSocket({ 
 
                /* -------------------------------------------- 
                 * CONNECT 
                 * -------------------------------------------- */ 
 
                onConnect: () => { 
 
                    if ( 
                        !mountedRef.current 
                    ) { 
                        return; 
                    } 
 
                    console.log( 
                        "⚽ Football socket connecté:", 
                        socket.id 
                    ); 
 
                    setSocketConnected(true); 
 
                    /* 
                     * Si React se reconnecte après une coupure, 
                     * on rejoint automatiquement le match courant. 
                     */ 
 
                    const activeMatchId = 
                        matchIdRef.current; 
 
                    if ( 
                        activeMatchId 
                    ) { 
                        try { 
 
                            joinFootballMatch( 
                                activeMatchId 
                            ); 
 
                            requestFootballState(); 
 
                        } catch (socketError) { 
 
                            console.error( 
                                "❌ Rejoin football:", 
                                socketError 
                            ); 
 
                        } 
                    } 
                }, 
 
 
                /* -------------------------------------------- 
                 * DISCONNECT 
                 * -------------------------------------------- */ 
 
                onDisconnect: ( 
                    reason 
                ) => { 
 
                    if ( 
                        !mountedRef.current 
                    ) { 
                        return; 
                    } 
 
                    console.warn( 
                        "⚠️ Football socket déconnecté:", 
                        reason 
                    ); 
 
                    setSocketConnected(false); 
                }, 
 
 
                /* -------------------------------------------- 
                 * JOINED 
                 * -------------------------------------------- */ 
 
                onJoined: ( 
                    payload 
                ) => { 
 
                    console.log( 
                        "⚽ football:joined", 
                        payload 
                    ); 
 
                    const incomingId = 
                        extractPayloadMatchId( 
                            payload 
                        ); 
 
                    const expectedId = 
                        matchIdRef.current; 
 
                    if ( 
                        incomingId && 
                        expectedId && 
                        incomingId !== expectedId 
                    ) { 
                        return; 
                    } 
 
                    setSocketMessage( 
                        "Connexion au match réussie." 
                    ); 
 
                    requestFootballState(); 
                }, 
 
 
                /* -------------------------------------------- 
                 * JOIN SUCCESS 
                 * -------------------------------------------- */ 
 
                onJoinSuccess: ( 
                    payload 
                ) => { 
 
                    console.log( 
                        "⚽ football:join_success", 
                        payload 
                    ); 
 
                    const incomingId = 
                        extractPayloadMatchId( 
                            payload 
                        ); 
 
                    const expectedId = 
                        matchIdRef.current; 
 
                    if ( 
                        incomingId && 
                        expectedId && 
                        incomingId !== expectedId 
                    ) { 
                        return; 
                    } 
 
                    const state = 
                        extractSocketState( 
                            payload 
                        ); 
 
                    if (state) { 
                        setMatchState( 
                            normalizeMatch( 
                                state 
                            ) 
                        ); 
                    } 
 
                    setSocketMessage( 
                        "Partie rejointe." 
                    ); 
                }, 
 
 
                /* -------------------------------------------- 
                 * STATE 
                 * -------------------------------------------- */ 
 
                onState: ( 
                    payload 
                ) => { 
 
                    const incoming = 
                        extractSocketState( 
                            payload 
                        ); 
 
                    if (!incoming) { 
                        return; 
                    } 
 
                    const incomingId = 
                        extractPayloadMatchId( 
                            incoming 
                        ) || 
                        extractPayloadMatchId( 
                            payload 
                        ); 
 
                    const expectedId = 
                        matchIdRef.current; 
 
                    if ( 
                        incomingId && 
                        expectedId && 
                        incomingId !== expectedId 
                    ) { 
                        return; 
                    } 
 
                    const normalized = 
                        normalizeMatch( 
                            incoming 
                        ); 
 
                    if ( 
                        !mountedRef.current 
                    ) { 
                        return; 
                    } 
 
                    setMatchState( 
                        normalized 
                    ); 
 
                    if ( 
                        normalized?.matchId 
                    ) { 
                        matchIdRef.current = 
                            normalized.matchId; 
                    } 
 
                    if ( 
                        isFinishedState( 
                            normalized 
                        ) 
                    ) { 
                        setScreen( 
                            SCREENS.RESULT 
                        ); 
                    } 
                    else if ( 
                        isPlayingState( 
                            normalized 
                        ) 
                    ) { 
                        setScreen( 
                            SCREENS.PLAYING 
                        ); 
                    } 
                    else { 
                        setScreen( 
                            SCREENS.WAITING 
                        ); 
                    } 
                }, 
 
 
                /* -------------------------------------------- 
                 * FOOTBALL EVENT 
                 * -------------------------------------------- */ 
 
                onEvent: ( 
                    payload 
                ) => { 
 
                    console.log( 
                        "⚽ FOOTBALL EVENT:", 
                        payload 
                    ); 
 
                    const incomingId = 
                        extractPayloadMatchId( 
                            payload 
                        ); 
 
                    const expectedId = 
                        matchIdRef.current; 
 
                    if ( 
                        incomingId && 
                        expectedId && 
                        incomingId !== expectedId 
                    ) { 
                        return; 
                    } 
 
                    const eventName = 
                        normalizeString( 
                            payload?.event ?? 
                            payload?.type ?? 
                            payload?.name 
                        ); 
 
                    if ( 
                        eventName 
                    ) { 
                        setSocketMessage( 
                            translateFootballEvent( 
                                eventName 
                            ) 
                        ); 
                    } 
 
                    /* 
                     * Certains backends peuvent inclure un nouvel 
                     * état dans football:event. 
                     */ 
 
                    const eventState = 
                        extractSocketState( 
                            payload?.state ?? 
                            payload?.gameState 
                        ); 
 
                    if ( 
                        eventState && 
                        typeof eventState === "object" 
                    ) { 
                        setMatchState( 
                            normalizeMatch( 
                                eventState 
                            ) 
                        ); 
                    } 
                }, 
 
 
                /* -------------------------------------------- 
                 * FINISHED 
                 * -------------------------------------------- */ 
 
                onFinished: ( 
                    payload 
                ) => { 
 
                    console.log( 
                        "🏁 FOOTBALL FINISHED:", 
                        payload 
                    ); 
 
                    const incoming = 
                        normalizeMatch( 
                            extractSocketState( 
                                payload 
                            ) 
                        ); 
 
                    if ( 
                        incoming 
                    ) { 
                        setMatchState( 
                            incoming 
                        ); 
 
                        buildResult( 
                            incoming 
                        ); 
                    } 
                    else { 
                        buildResult( 
                            matchState 
                        ); 
                    } 
 
                    setScreen( 
                        SCREENS.RESULT 
                    ); 
                }, 
 
 
                /* -------------------------------------------- 
                 * PLAYER JOINED 
                 * -------------------------------------------- */ 
 
                onPlayerJoined: ( 
                    payload 
                ) => { 
 
                    console.log( 
                        "👤 Football player joined:", 
                        payload 
                    ); 
 
                    setSocketMessage( 
                        "Un joueur a rejoint la partie." 
                    ); 
                }, 
 
 
                /* -------------------------------------------- 
                 * PLAYER LEFT 
                 * -------------------------------------------- */ 
 
                onPlayerLeft: ( 
                    payload 
                ) => { 
 
                    console.log( 
                        "👤 Football player left:", 
                        payload 
                    ); 
 
                    setSocketMessage( 
                        "Un joueur a quitté la partie." 
                    ); 
                }, 
 
 
                /* -------------------------------------------- 
                 * PLAYER DISCONNECTED 
                 * -------------------------------------------- */ 
 
                onPlayerDisconnected: ( 
                    payload 
                ) => { 
 
                    console.log( 
                        "⚠️ Football player disconnected:", 
                        payload 
                    ); 
 
                    setSocketMessage( 
                        "Votre adversaire est momentanément déconnecté." 
                    ); 
                }, 
 
 
                /* -------------------------------------------- 
                 * COMMAND RESULT 
                 * -------------------------------------------- */ 
 
                onCommandResult: ( 
                    payload 
                ) => { 
 
                    setCommandLocked(false); 
 
                    console.log( 
                        "🎮 Football command result:", 
                        payload 
                    ); 
                }, 
 
 
                /* -------------------------------------------- 
                 * COMMAND ERROR 
                 * -------------------------------------------- */ 
 
                onCommandError: ( 
                    payload 
                ) => { 
 
                    setCommandLocked(false); 
 
                    console.warn( 
                        "❌ Football command error:", 
                        payload 
                    ); 
 
                    setSocketMessage( 
                        payload?.message || 
                        payload?.error || 
                        "Commande refusée." 
                    ); 
                }, 
 
 
                /* -------------------------------------------- 
                 * FOOTBALL ERROR 
                 * -------------------------------------------- */ 
 
                onError: ( 
                    payload 
                ) => { 
 
                    console.error( 
                        "❌ Football socket error:", 
                        payload 
                    ); 
 
                    setError( 
                        payload?.message || 
                        payload?.error || 
                        "Erreur du serveur football." 
                    ); 
                }, 
 
            }); 
 
 
        /* 
         * On prépare le singleton mais on ne force pas 
         * automatiquement une connexion tant qu'on n'est 
         * pas dans une partie. 
         */ 
 
        return () => { 
 
            cleanup(); 
 
        }; 
 
    }, []); 
 
 
    /* ======================================================== 
     * CHARGER LES PARTIES SAC 
     * ======================================================== */ 
 
    const loadMatches = useCallback( 
      async (isInitial = false) => { 
          try { 
              setLoading(true); 
              setError(null); 
 
              const data = await apiRequest( 
                  `/sac/matches?game=${GAME}` 
              ); 
 
              const list = extractMatchList(data) 
                  .map(normalizeMatch) 
                  .filter(Boolean); 
 
              if (mountedRef.current) { 
                  setMatches(list); 
              } 
 
          } catch (requestError) { 
              console.error( 
                  "❌ LOAD FOOTBALL MATCHES:", 
                  requestError 
              ); 
 
              if (mountedRef.current) { 
                  setError(requestError.message); 
              } 
 
          } finally { 
              if (mountedRef.current) { 
                  setLoading(false); 
 
                  if (isInitial) { 
                      setInitialLoading(false); 
                  } 
              } 
          } 
      }, 
      [] 
  ); 
 
 
    /* ========================================================
 * CHARGEMENT DU LOBBY
 *
 * IMPORTANT :
 * - Aucun setInterval ici.
 * - Aucun rafraîchissement toutes les X secondes.
 * - Le Lobby est chargé uniquement lorsqu'on entre dedans.
 * - Les opérations importantes (création, retour, etc.)
 *   peuvent ensuite appeler loadMatches() explicitement.
 * ======================================================== */

useEffect(() => {
    if (screen !== SCREENS.LOBBY) {
        return;
    }

    loadMatches(true);
}, [
    screen,
    loadMatches,
]);
 
  /* 
   * IMPORTANT : aucun return conditionnel ici. 
   * Tous les hooks du composant doivent être exécutés à chaque render, 
   * dans exactement le même ordre. Le rendu de chargement est effectué 
   * plus bas, après tous les hooks. 
   */
 
 
    /* ======================================================== 
     * CRÉER UNE PARTIE 
     * ======================================================== */ 
 
    const createMatch = 
        useCallback( 
            async () => { 
 
                const numericStake = 
                    Number(stake); 
 
                if ( 
                    !Number.isFinite( 
                        numericStake 
                    ) || 
                    numericStake < 
                        MIN_STAKE 
                ) { 
 
                    setError( 
                        `La mise minimale est de ${formatMoney( 
                            MIN_STAKE 
                        )}.` 
                    ); 
 
                    return; 
                } 
 
                if (!userId) { 
 
                    setError( 
                        "Utilisateur non authentifié." 
                    ); 
 
                    return; 
                } 
 
                try { 
 
                    setLoading(true); 
 
                    setError(null); 
 
                    const data = await apiRequest( 
                        "/sac/matches", 
                        { 
                            method: "POST", 
 
                            body: JSON.stringify({ 
                                game: GAME, 
                                stake: numericStake, 
                                userId: userId, 
                            }), 
                        } 
                    ); 
 
                    const created = 
                        normalizeMatch( 
                            data?.match || 
                            data?.data || 
                            data 
                        ); 
 
                    if ( 
                        !created?.matchId 
                    ) { 
                        throw new Error( 
                            "Le serveur n'a pas retourné l'identifiant du match." 
                        ); 
                    } 
 
                    setSelectedMatch( 
                        created 
                    ); 
 
                    selectedMatchRef.current = 
                        created; 
 
                    matchIdRef.current = 
                        created.matchId; 
 
                    setMatchState( 
                        created 
                    ); 
 
                    setScreen( 
                        SCREENS.WAITING 
                    ); 
 
                    /* 
                     * Connexion socket puis JOIN. 
                     */ 
 
                    connectFootballSocket(); 
 
                    joinFootballMatch( 
                        created.matchId 
                    ); 
 
                    requestFootballState(); 
 
                    await loadMatches(); 
 
                } catch (requestError) { 
 
                    console.error( 
                        "❌ CREATE FOOTBALL MATCH:", 
                        requestError 
                    ); 
 
                    setError( 
                        requestError.message 
                    ); 
 
                } finally { 
 
                    setLoading(false); 
                } 
 
            }, 
            [ 
                stake, 
                userId, 
                userName, 
                loadMatches, 
            ] 
        ); 
 
 
    /* ======================================================== 
     * REJOINDRE UNE PARTIE 
     * ======================================================== */ 
 
    const joinMatch = 
        useCallback( 
            async ( 
                match 
            ) => { 
 
                const id = 
                    normalizeId( 
                        match?.matchId ?? 
                        match?.id 
                    ); 
 
                if (!id) { 
                    return; 
                } 
 
                if (!userId) { 
 
                    setError( 
                        "Utilisateur non authentifié." 
                    ); 
 
                    return; 
                } 
 
                try { 
 
                    setLoading(true); 
 
                    setError(null); 
 
                    /* 
                     * SAC : 
                     * le joueur rejoint financièrement la partie. 
                     */ 
 
                    const data = await apiRequest(
                        `/sac/matches/${id}/join`,
                        {
                            method: "POST",

                            body: JSON.stringify({
                                game: "football",
                                userId,
                                userName,
                            }),
                        }
                    );
 
                    const joined = 
                        normalizeMatch( 
                            data?.match || 
                            data?.data || 
                            data || 
                            match 
                        ); 
 
                    setSelectedMatch( 
                        joined 
                    ); 
 
                    selectedMatchRef.current = 
                        joined; 
 
                    matchIdRef.current = 
                        id; 
 
                    setMatchState( 
                        joined 
                    ); 
 
                    /* 
                     * Socket football : 
                     * JOIN + STATE. 
                     */ 
 
                    connectFootballSocket(); 
 
                    joinFootballMatch( 
                        id 
                    ); 
 
                    requestFootballState(); 
 
                    setScreen( 
                        isPlayingState( 
                            joined 
                        ) 
                            ? SCREENS.PLAYING 
                            : SCREENS.WAITING 
                    ); 
 
                } catch (requestError) { 
 
                    console.error( 
                        "❌ JOIN FOOTBALL MATCH:", 
                        requestError 
                    ); 
 
                    setError( 
                        requestError.message 
                    ); 
 
                } finally { 
 
                    setLoading(false); 
                } 
 
            }, 
            [ 
                userId, 
                userName, 
            ] 
        ); 
 
 
    /* ======================================================== 
     * REPRENDRE UNE PARTIE 
     * 
     * Pas de faux "resumeMatch()" : 
     * 
     * le contrat socket réel utilise : 
     * 
     * football:join 
     * football:get_state 
     * ======================================================== */ 
 
    const resumeMatch = 
        useCallback( 
            async ( 
                match 
            ) => { 
 
                const id = 
                    normalizeId( 
                        match?.matchId ?? 
                        match?.id 
                    ); 
 
                if (!id) { 
                    return; 
                } 
 
                try { 
 
                    setLoading(true); 
 
                    setError(null); 
 
                    setSelectedMatch( 
                        match 
                    ); 
 
                    selectedMatchRef.current = 
                        match; 
 
                    matchIdRef.current = 
                        id; 
 
                    connectFootballSocket(); 
 
                    joinFootballMatch( 
                        id 
                    ); 
 
                    requestFootballState(); 
 
                    setScreen( 
                        SCREENS.WAITING 
                    ); 
 
                } catch (requestError) { 
 
                    console.error( 
                        "❌ RESUME FOOTBALL MATCH:", 
                        requestError 
                    ); 
 
                    setError( 
                        requestError.message 
                    ); 
 
                } finally { 
 
                    setLoading(false); 
                } 
 
            }, 
            [] 
        ); 
 
 
    /* ======================================================== 
     * DÉMARRER LE MATCH 
     * 
     * Le contrat fourni ne contient PAS : 
     * 
     * football:start 
     * 
     * Donc le démarrage financier/engine reste une 
     * opération SAC/API. 
     * 
     * Ensuite le socket reçoit football:state. 
     * ======================================================== */ 
 
    const startMatch = 
        useCallback( 
            async () => { 
 
                const id = 
                    matchIdRef.current; 
 
                if (!id) { 
 
                    setError( 
                        "Aucun match sélectionné." 
                    ); 
 
                    return; 
                } 
 
                try { 
 
                    setLoading(true); 
 
                    setError(null); 
 
                    await apiRequest( 
                        `/sac/matches/${id}/start`, 
                        { 
                            method: 
                                "POST", 
                        } 
                    ); 
 
                    connectFootballSocket(); 
 
                    joinFootballMatch( 
                        id 
                    ); 
 
                    requestFootballState(); 
 
                    setScreen( 
                        SCREENS.PLAYING 
                    ); 
 
                } catch (requestError) { 
 
                    console.error( 
                        "❌ START FOOTBALL MATCH:", 
                        requestError 
                    ); 
 
                    setError( 
                        requestError.message 
                    ); 
 
                } finally { 
 
                    setLoading(false); 
                } 
 
            }, 
            [] 
        ); 
 
 
    /* ======================================================== 
     * BUILD RESULT 
     * ======================================================== */ 
 
    const buildResult = 
        useCallback( 
            state => { 
 
                if (!state) { 
                    return; 
                } 
 
                const currentUserId = 
                    normalizeId( 
                        userId 
                    ); 
 
                const creatorId = 
                    normalizeId( 
                        state?.creatorId ?? 
                        state?.creator_id ?? 
                        state?.players?.creator?.id 
                    ); 
 
                const opponentId = 
                    normalizeId( 
                        state?.opponentId ?? 
                        state?.opponent_id ?? 
                        state?.players?.opponent?.id 
                    ); 
 
                const homeScore = 
                    Number( 
                        state?.score?.home 
                    ) || 0; 
 
                const awayScore = 
                    Number( 
                        state?.score?.away 
                    ) || 0; 
 
                /* 
                 * Le moteur peut déterminer les équipes 
                 * autrement que creator/opponent. 
                 * 
                 * On utilise d'abord les identifiants SAC. 
                 */ 
 
                let isHome = 
                    currentUserId !== null && 
                    creatorId !== null && 
                    currentUserId === 
                        creatorId; 
 
                let isAway = 
                    currentUserId !== null && 
                    opponentId !== null && 
                    currentUserId === 
                        opponentId; 
 
                /* 
                 * Fallback avec controlledPlayers. 
                 */ 
 
                if ( 
                    !isHome && 
                    !isAway && 
                    state?.controlledPlayers 
                ) { 
 
                    const controlled = 
                        state.controlledPlayers; 
 
                    const playerId = 
                        controlled[ 
                            String( 
                                currentUserId 
                            ) 
                        ]; 
 
                    const playersFromHome = 
                        state?.teams?.home?.players || 
                        []; 
 
                    const playersFromAway = 
                        state?.teams?.away?.players || 
                        []; 
 
                    if ( 
                        playersFromHome.some( 
                            player => 
                                String( 
                                    player.id 
                                ) === 
                                String( 
                                    playerId 
                                ) 
                        ) 
                    ) { 
                        isHome = true; 
                    } 
 
                    if ( 
                        playersFromAway.some( 
                            player => 
                                String( 
                                    player.id 
                                ) === 
                                String( 
                                    playerId 
                                ) 
                        ) 
                    ) { 
                        isAway = true; 
                    } 
                } 
 
                let myScore = 
                    isHome 
                        ? homeScore 
                        : awayScore; 
 
                let opponentScore = 
                    isHome 
                        ? awayScore 
                        : homeScore; 
 
                /* 
                 * Si on ne peut pas déterminer le camp, 
                 * on ne prétend pas connaître le gagnant. 
                 */ 
 
                let outcome = 
                    "UNKNOWN"; 
 
                if ( 
                    isHome || 
                    isAway 
                ) { 
 
                    if ( 
                        myScore > 
                        opponentScore 
                    ) { 
                        outcome = 
                            "WIN"; 
                    } 
                    else if ( 
                        myScore < 
                        opponentScore 
                    ) { 
                        outcome = 
                            "LOSS"; 
                    } 
                    else { 
                        outcome = 
                            "DRAW"; 
                    } 
                } 
 
                const opponentName = 
                    isHome 
                        ? homeTeamName === 
                          awayTeamName 
                            ? "Adversaire" 
                            : awayTeamName 
                        : isAway 
                            ? homeTeamName 
                            : "Adversaire"; 
 
                const totalStake = 
                    Number( 
                        state?.stake ?? 
                        selectedMatch?.stake ?? 
                        0 
                    ) || 0; 
 
                setResult({ 
                    outcome, 
 
                    myScore, 
 
                    opponentScore, 
 
                    opponentName, 
 
                    totalStake, 
 
                    homeScore, 
 
                    awayScore, 
                }); 
 
                resultHandledRef.current = 
                    true; 
 
            }, 
            [ 
                userId, 
                selectedMatch, 
                homeTeamName, 
                awayTeamName, 
            ] 
        ); 
 
 
    /* ======================================================== 
     * FIN DE MATCH 
     * ======================================================== */ 
 
    useEffect(() => { 
 
        if ( 
            !matchState 
        ) { 
            return; 
        } 
 
        if ( 
            isFinishedState( 
                matchState 
            ) 
        ) { 
 
            buildResult( 
                matchState 
            ); 
 
            setScreen( 
                SCREENS.RESULT 
            ); 
        } 
 
    }, [ 
        matchState, 
        buildResult, 
    ]); 
 
 
    /* ======================================================== 
     * RÈGLEMENT SAC 
     * ======================================================== */ 
 
    const settleMatch = 
        useCallback( 
            async () => { 
 
                const id = 
                    matchIdRef.current; 
 
                if ( 
                    !id || 
                    settled 
                ) { 
                    return; 
                } 
 
                try { 
 
                    setLoading(true); 
 
                    setError(null); 
 
                    /* 
                     * Le résultat réel est calculé côté backend. 
                     * 
                     * Le frontend transmet uniquement l'identifiant 
                     * de la partie. 
                     */ 
 
                    await apiRequest( 
                        `/sac/matches/${id}/settle`, 
                        { 
                            method: 
                                "POST", 
 
                            body: 
                                JSON.stringify({ 
                                    userId, 
                                }), 
                        } 
                    ); 
 
                    setSettled( 
                        true 
                    ); 
 
                } catch (requestError) { 
 
                    console.error( 
                        "❌ FOOTBALL SETTLEMENT:", 
                        requestError 
                    ); 
 
                    setError( 
                        requestError.message 
                    ); 
 
                } finally { 
 
                    setLoading(false); 
                } 
 
            }, 
            [ 
                settled, 
                userId, 
            ] 
        ); 
 
 
    /* ======================================================== 
     * ENREGISTRER / CONFIRMER LE RÉSULTAT 
     * ======================================================== */ 
 
    const saveResult = 
        useCallback( 
            async () => { 
 
                if ( 
                    resultSaved 
                ) { 
                    return; 
                } 
 
                /* 
                 * Le moteur persiste déjà football_matches, 
                 * football_match_state et football_events. 
                 * 
                 * Cette étape déclenche le règlement SAC. 
                 */ 
 
                await settleMatch(); 
 
                setResultSaved( 
                    true 
                ); 
 
            }, 
            [ 
                resultSaved, 
                settleMatch, 
            ] 
        ); 
 
 
    /* ======================================================== 
     * NETTOYAGE 
     * ======================================================== */ 
 
    const cleanupMatch = 
        useCallback( 
            async () => { 
 
                const id = 
                    matchIdRef.current; 
 
                if ( 
                    !id || 
                    cleaned 
                ) { 
                    return; 
                } 
 
                try { 
 
                    setLoading(true); 
 
                    setError(null); 
 
                    await apiRequest( 
                        `/sac/matches/${id}/cleanup`, 
                        { 
                            method: 
                                "POST", 
 
                            body: 
                                JSON.stringify({ 
                                    userId, 
                                    game: GAME, 
                                }), 
                        } 
                    ); 
 
                    setCleaned( 
                        true 
                    ); 
 
                } catch (requestError) { 
 
                    console.error( 
                        "❌ FOOTBALL CLEANUP:", 
                        requestError 
                    ); 
 
                    setError( 
                        requestError.message 
                    ); 
 
                } finally { 
 
                    setLoading(false); 
                } 
 
            }, 
            [ 
                cleaned, 
                userId, 
            ] 
        ); 
 
 
    /* ======================================================== 
     * RETOUR ACCUEIL 
     * ======================================================== */ 
 
    const returnHome = 
        useCallback( 
            async () => { 
 
                try { 
 
                    leaveFootballMatch(); 
 
                } catch { 
                    // Socket déjà fermé : 
                    // rien à faire. 
                } 
 
                disconnectFootballSocket(); 
 
                matchIdRef.current = 
                    null; 
 
                selectedMatchRef.current = 
                    null; 
 
                setMatchState( 
                    null 
                ); 
 
                setSelectedMatch( 
                    null 
                ); 
 
                setResult( 
                    null 
                ); 
 
                setSettled( 
                    false 
                ); 
 
                setResultSaved( 
                    false 
                ); 
 
                setCleaned( 
                    false 
                ); 
 
                setSocketMessage( 
                    null 
                ); 
 
                setScreen( 
                    SCREENS.LOBBY 
                ); 
 
                await loadMatches(); 
 
                if ( 
                    typeof onHome === 
                    "function" 
                ) { 
                    onHome(); 
                } 
 
            }, 
            [ 
                loadMatches, 
                onHome, 
            ] 
        ); 
 
 
    /* ======================================================== 
     * QUITTER LA PARTIE 
     * ======================================================== */ 
 
    const handleBack = 
        useCallback( 
            () => { 
 
                try { 
                    leaveFootballMatch(); 
                } catch { 
                    // Rien. 
                } 
 
                if ( 
                    typeof onBack === 
                    "function" 
                ) { 
                    onBack(); 
                } 
 
            }, 
            [onBack] 
        ); 
 
 
    /* ======================================================== 
     * COMMANDES 
     * ======================================================== */ 
 
    const movePlayer = 
        useCallback( 
            direction => { 
 
                if ( 
                    commandLocked || 
                    screen !== 
                        SCREENS.PLAYING || 
                    !socketConnected 
                ) { 
                    return; 
                } 
 
                try { 
 
                    setCommandLocked( 
                        true 
                    ); 
 
                    sendFootballDirection( 
                        direction, 
                        controlledPlayer?.id ?? 
                        null 
                    ); 
 
                } catch ( 
                    commandError 
                ) { 
 
                    setCommandLocked( 
                        false 
                    ); 
 
                    setSocketMessage( 
                        commandError.message 
                    ); 
                } 
 
            }, 
            [ 
                commandLocked, 
                screen, 
                socketConnected, 
                controlledPlayer, 
            ] 
        ); 
 
 
    const pressX = 
        useCallback( 
            () => { 
 
                if ( 
                    commandLocked || 
                    screen !== 
                        SCREENS.PLAYING || 
                    !socketConnected 
                ) { 
                    return; 
                } 
 
                try { 
 
                    setCommandLocked( 
                        true 
                    ); 
 
                    sendFootballX( 
                        controlledPlayer?.id ?? 
                        null 
                    ); 
 
                } catch ( 
                    commandError 
                ) { 
 
                    setCommandLocked( 
                        false 
                    ); 
 
                    setSocketMessage( 
                        commandError.message 
                    ); 
                } 
 
            }, 
            [ 
                commandLocked, 
                screen, 
                socketConnected, 
                controlledPlayer, 
            ] 
        ); 
 
 
    const pressA = 
        useCallback( 
            () => { 
 
                if ( 
                    commandLocked || 
                    screen !== 
                        SCREENS.PLAYING || 
                    !socketConnected 
                ) { 
                    return; 
                } 
 
                try { 
 
                    setCommandLocked( 
                        true 
                    ); 
 
                    sendFootballA( 
                        controlledPlayer?.id ?? 
                        null 
                    ); 
 
                } catch ( 
                    commandError 
                ) { 
 
                    setCommandLocked( 
                        false 
                    ); 
 
                    setSocketMessage( 
                        commandError.message 
                    ); 
                } 
 
            }, 
            [ 
                commandLocked, 
                screen, 
                socketConnected, 
                controlledPlayer, 
            ] 
        ); 
 
 
    /* ======================================================== 
     * CLAVIER 
     * 
     * WASD + FLÈCHES 
     * X / A 
     * ======================================================== */ 
 
    useEffect(() => { 
 
        if ( 
            screen !== 
            SCREENS.PLAYING 
        ) { 
            return undefined; 
        } 
 
        const handleKeyDown = 
            event => { 
 
                const key = 
                    String( 
                        event.key || "" 
                    ).toLowerCase(); 
 
                let direction = 
                    null; 
 
                if ( 
                    key === "arrowup" || 
                    key === "w" 
                ) { 
                    direction = "UP"; 
                } 
                else if ( 
                    key === "arrowdown" || 
                    key === "s" 
                ) { 
                    direction = "DOWN"; 
                } 
                 
                else if ( 
                    key === "arrowright" || 
                    key === "d" 
                ) { 
                    direction = "RIGHT"; 
                } 
 
                if ( 
                    direction 
                ) { 
 
                    event.preventDefault(); 
 
                    movePlayer( 
                        direction 
                    ); 
 
                    return; 
                } 
 
                if ( 
                    key === "x" 
                ) { 
 
                    event.preventDefault(); 
 
                    pressX(); 
 
                    return; 
                } 
 
                if ( 
                    key === "a" 
                ) { 
 
                    event.preventDefault(); 
 
                    pressA(); 
                } 
            }; 
 
 
        window.addEventListener( 
            "keydown", 
            handleKeyDown 
        ); 
 
        return () => { 
 
            window.removeEventListener( 
                "keydown", 
                handleKeyDown 
            ); 
 
        }; 
 
    }, [ 
        screen, 
        movePlayer, 
        pressX, 
        pressA, 
    ]); 
 
 
    /* ======================================================== 
     * BALLON 
     * ======================================================== */ 
 
    const ball = 
        getBallPosition( 
            matchState?.ball 
        ); 
 
 
    const ballLeft = 
        projectX( 
            ball.x 
        ); 
 
 
    const ballTop = 
        projectY( 
            ball.y 
        ); 
 
 
    /* 
     * z du ballon : 
     * le moteur utilise le Z pour la hauteur. 
     * 
     * On convertit légèrement le Z en translation verticale 
     * pour donner une sensation de ballon aérien. 
     */ 
 
    const ballHeight = 
        clamp( 
            ball.z * 2, 
            0, 
            28 
        ); 
 
 
    /* ======================================================== 
     * ÉTAT JOUEUR 
     * ======================================================== */ 
 
    const renderPlayer = 
        useCallback( 
            player => { 
 
                const position = 
                    getPlayerPosition( 
                        player 
                    ); 
 
                const left = 
                    projectX( 
                        position.x 
                    ); 
 
                const top = 
                    projectY( 
                        position.y 
                    ); 
 
                const playerId = 
                    String( 
                        player?.id ?? 
                        player?.playerId ?? 
                        "" 
                    ); 
 
                const controlled = 
                    controlledPlayer && 
                    String( 
                        controlledPlayer.id 
                    ) === 
                    playerId; 
 
                const hasBall = 
                    ballOwner && 
                    String( 
                        ballOwner.id 
                    ) === 
                    playerId; 
 
                const team = 
                    String( 
                        player?.team || 
                        "" 
                    ).toUpperCase(); 
 
                const role = 
                    normalizeString( 
                        player?.role, 
                        "PLAYER" 
                    ); 
 
                const number = 
                    player?.number ?? 
                    player?.shirtNumber ?? 
                    ""; 
 
                const playerName = 
                    normalizeString( 
                        player?.name ?? 
                        player?.playerName, 
                        `Joueur ${number}` 
                    ); 
 
                const stamina = 
                    clamp( 
                        Number( 
                            player?.stamina ?? 
                            player?.energy ?? 
                            100 
                        ), 
                        0, 
                        100 
                    ); 
 
                const state = 
                    String( 
                        player?.state || 
                        "" 
                    ).toUpperCase(); 
 
                const classes = [ 
                    "football-player", 
 
                    team === "HOME" 
                        ? "home" 
                        : "", 
 
                    team === "AWAY" 
                        ? "away" 
                        : "", 
 
                    controlled 
                        ? "controlled" 
                        : "", 
 
                    hasBall 
                        ? "has-ball" 
                        : "", 
 
                    state === 
                        "EXHAUSTED" 
                        ? "exhausted" 
                        : "", 
 
                    state === 
                        "INJURED" 
                        ? "injured" 
                        : "", 
                ] 
                    .filter(Boolean) 
                    .join(" "); 
 
 
                return ( 
                    <div 
                        key={ 
                            playerId || 
                            `${team}-${number}-${role}` 
                        } 
 
                        className={ 
                            classes 
                        } 
 
                        style={{ 
                            left: 
                                `${left}%`, 
 
                            top: 
                                `${top}%`, 
                        }} 
                    > 
 
                        <div className="football-player-name"> 
                            {playerName} 
                        </div> 
 
 
                        <div className="football-player-stamina"> 
                            <span 
                                style={{ 
                                    width: 
                                        `${stamina}%`, 
                                }} 
                            /> 
                        </div> 
 
 
                        <div className="football-player-body"> 
 
                            <span className="player-number"> 
                                {number} 
                            </span> 
 
                        </div> 
 
 
                        <div className="player-shorts" /> 
 
                        <div className="player-legs" /> 
 
                    </div> 
                ); 
            }, 
            [ 
                controlledPlayer, 
                ballOwner, 
            ] 
        ); 
 
 
    /* ======================================================== 
     * LISTE JOUEURS 
     * ======================================================== */ 
 
    const renderedPlayers = 
        useMemo( 
            () => 
                players.map( 
                    renderPlayer 
                ), 
 
            [ 
                players, 
                renderPlayer, 
            ] 
        ); 
 
 
    /* ======================================================== 
     * MATCH STATUS 
     * ======================================================== */ 
 
    const matchStatus = 
        String( 
            matchState?.status || 
            selectedMatch?.status || 
            "WAITING" 
        ).toUpperCase(); 
 
 
    /* ======================================================== 
     * RÉSULTAT TEXTE 
     * ======================================================== */ 
 
    const resultTitle = 
        result?.outcome === "WIN" 
            ? "Félicitations !" 
            : result?.outcome === "LOSS" 
                ? "Partie terminée" 
                : result?.outcome === "DRAW" 
                    ? "Match nul" 
                    : "Match terminé"; 
 
 
    const resultMessage = 
        result?.outcome === "WIN" 
            ? `Félicitations, vous avez remporté ce match avec le score de ${result.myScore}:${result.opponentScore}. Vous avez gagné la totalité de la mise.` 
            : result?.outcome === "LOSS" 
                ? `Cette partie est complètement terminée. Votre adversaire l'emporte avec le score de ${result.opponentScore}:${result.myScore}.` 
                : result?.outcome === "DRAW" 
                    ? `Le match se termine sur un score nul de ${result.myScore}:${result.opponentScore}.` 
                    : `Le match est terminé sur le score de ${homeScore}:${awayScore}.`; 
 
 
    /* ======================================================== 
     * RENDER — LOADING INITIAL 
     * ======================================================== */ 
 
    if ( 
        screen === SCREENS.LOBBY && 
        ( 
            initialLoading || 
            (loading && matches.length === 0) 
        ) 
    ) { 
 
        return ( 
            <div className="football-loading"> 
 
                <div className="football-spinner" /> 
 
                <strong> 
                    Chargement du football... 
                </strong> 
 
                <span> 
                    Connexion au championnat 6BetBall 
                </span> 
 
            </div> 
        ); 
    } 
 
 
    /* ======================================================== 
     * RENDER — APPLICATION 
     * ======================================================== */ 
 
    return ( 
        <div className="football-app"> 
 
            <div className="football-stadium"> 
 
                {/* ================================================== 
                 * TRIBUNES 
                 * ================================================== */} 
 
                <div className="football-stands" /> 
 
                <div className="football-spectators" /> 
 
                <div className="football-atmosphere" /> 
 
 
                {/* ================================================== 
                 * HEADER 
                 * ================================================== */} 
 
                {( 
                    screen === SCREENS.WAITING || 
                    screen === SCREENS.PLAYING || 
                    screen === SCREENS.RESULT 
                ) && ( 
                    <> 
                        <div className="football-header"> 
                            <div className="football-scoreboard"> 
 
                                {/* Équipe domicile */} 
                                <div className="football-team home"> 
                                    <span className="football-team-name"> 
                                        {homeTeamName} 
                                    </span> 
 
                                    <span className="football-team-badge"> 
                                        HOME 
                                    </span> 
                                </div> 
 
                                {/* Score */} 
                                <div className="football-score"> 
                                    <span className="football-score-value"> 
                                        {homeScore} 
                                    </span> 
 
                                    <span className="football-score-separator"> 
                                        : 
                                    </span> 
 
                                    <span className="football-score-value"> 
                                        {awayScore} 
                                    </span> 
                                </div> 
 
                                {/* Équipe extérieure */} 
                                <div className="football-team away"> 
                                    <span className="football-team-badge"> 
                                        AWAY 
                                    </span> 
 
                                    <span className="football-team-name"> 
                                        {awayTeamName} 
                                    </span> 
                                </div> 
 
                                {/* Temps */} 
                                <div className="football-match-time"> 
                                    {matchTime} 
                                </div> 
 
                            </div> 
                        </div> 
 
                        <div 
                            className={`football-connection-status ${ 
                                socketConnected ? "" : "disconnected" 
                            }`} 
                        > 
                            {socketConnected 
                                ? "Serveur connecté" 
                                : "Connexion en attente"} 
                        </div> 
                    </> 
                )} 
 
 
                {/* ================================================== 
                 * CONNEXION 
                 * ================================================== */} 
 
                <div 
                    className={ 
                        `football-connection-status ${ 
                            socketConnected 
                                ? "" 
                                : "disconnected" 
                        }` 
                    } 
                > 
                    {socketConnected 
                        ? "Serveur connecté" 
                        : "Connexion en attente"} 
                </div> 
 
 
                {/* ================================================== 
                 * MESSAGE SOCKET 
                 * ================================================== */} 
 
                {socketMessage && ( 
                    <div 
                        className="football-error" 
                        style={{ 
                            background: 
                                "rgba(4,18,12,.78)", 
 
                            borderColor: 
                                "rgba(90,220,140,.25)", 
                        }} 
                    > 
                        {socketMessage} 
                    </div> 
                )} 
 
 
                {/* ================================================== 
                 * ERREUR 
                 * ================================================== */} 
 
                {error && ( 
                    <div className="football-error"> 
 
                        {error} 
 
                    </div> 
                )} 
 
 
                {/* ================================================== 
                 * LOBBY 
                 * ================================================== */} 
 
                {screen === 
                    SCREENS.LOBBY && ( 
 
                    <div className="football-lobby"> 
 
                        <h1> 
                            ⚽ 6BetBall Football 
                        </h1> 
 
                        <p> 
                            Entrez sur le terrain, 
                            affrontez un adversaire 
                            et remportez la mise. 
                        </p> 
 
 
                        {/* ------------------------------------------ 
                         * MISE 
                         * ------------------------------------------ */} 
 
                        <div 
                            style={{ 
                                marginTop: 24, 
                            }} 
                        > 
 
                            <label 
                                htmlFor="football-stake" 
                                style={{ 
                                    display: 
                                        "block", 
 
                                    marginBottom: 
                                        8, 
 
                                    fontSize: 
                                        11, 
 
                                    fontWeight: 
                                        800, 
 
                                    textTransform: 
                                        "uppercase", 
 
                                    letterSpacing: 
                                        ".08em", 
 
                                    color: 
                                        "rgba(255,255,255,.58)", 
                                }} 
                            > 
                                Montant de la mise 
                            </label> 
 
 
                            <input 
                                id="football-stake" 
 
                                type="number" 
 
                                min={ 
                                    MIN_STAKE 
                                } 
 
                                step="50" 
 
                                value={ 
                                    stake 
                                } 
 
                                onChange={ 
                                    event => 
                                        setStake( 
                                            event.target.value 
                                        ) 
                                } 
 
                                disabled={ 
                                    loading 
                                } 
 
                                style={{ 
                                    width: 
                                        "100%", 
 
                                    height: 
                                        48, 
 
                                    padding: 
                                        "0 15px", 
 
                                    borderRadius: 
                                        12, 
 
                                    border: 
                                        "1px solid rgba(255,255,255,.12)", 
 
                                    background: 
                                        "rgba(255,255,255,.06)", 
 
                                    color: 
                                        "#fff", 
 
                                    fontSize: 
                                        16, 
 
                                    fontWeight: 
                                        800, 
 
                                    outline: 
                                        "none", 
                                }} 
                            /> 
 
                        </div> 
 
 
                        <div 
                            style={{ 
                                marginTop: 16, 
 
                                display: 
                                    "flex", 
 
                                gap: 10, 
 
                                justifyContent: 
                                    "center", 
 
                                flexWrap: 
                                    "wrap", 
                            }} 
                        > 
 
                            {[200, 500, 1000, 2000].map( 
                                amount => ( 
                                    <button 
                                        key={ 
                                            amount 
                                        } 
 
                                        type="button" 
 
                                        className="football-button" 
 
                                        onClick={() => 
                                            setStake( 
                                                amount 
                                            ) 
                                        } 
 
                                        disabled={ 
                                            loading 
                                        } 
                                    > 
                                        {formatMoney( 
                                            amount 
                                        )} 
                                    </button> 
                                ) 
                            )} 
 
                        </div> 
 
 
                        <button 
                            type="button" 
 
                            className="football-button primary" 
 
                            style={{ 
                                width: 
                                    "100%", 
 
                                marginTop: 
                                    20, 
                            }} 
 
                            onClick={ 
                                createMatch 
                            } 
 
                            disabled={ 
                                loading 
                            } 
                        > 
                            {loading 
                                ? "Création..." 
                                : "Créer une partie"} 
                        </button> 
 
 
                        {/* ------------------------------------------ 
                         * PARTIES DISPONIBLES 
                         * ------------------------------------------ */} 
 
                        <div 
                            style={{ 
                                marginTop: 
                                    30, 
 
                                textAlign: 
                                    "left", 
                            }} 
                        > 
 
                            <div 
                                style={{ 
                                    display: 
                                        "flex", 
 
                                    justifyContent: 
                                        "space-between", 
 
                                    alignItems: 
                                        "center", 
 
                                    marginBottom: 
                                        10, 
                                }} 
                            > 
 
                                <strong> 
                                    Parties disponibles 
                                </strong> 
 
                                <button 
                                    type="button" 
 
                                    className="football-button" 
 
                                    onClick={ 
                                        loadMatches 
                                    } 
 
                                    disabled={ 
                                        loading 
                                    } 
 
                                    style={{ 
                                        minHeight: 
                                            34, 
 
                                        padding: 
                                            "0 11px", 
 
                                        fontSize: 
                                            10, 
                                    }} 
                                > 
                                    Actualiser 
                                </button> 
 
                            </div> 
 
 
                            {matches.length === 0 ? ( 
 
                                <div 
                                    style={{ 
                                        padding: 
                                            20, 
 
                                        borderRadius: 
                                            14, 
 
                                        background: 
                                            "rgba(255,255,255,.035)", 
 
                                        color: 
                                            "rgba(255,255,255,.48)", 
 
                                        fontSize: 
                                            12, 
 
                                        textAlign: 
                                            "center", 
                                    }} 
                                > 
                                    Aucune partie disponible. 
                                </div> 
 
                            ) : ( 
 
                                <div 
                                    style={{ 
                                        display: 
                                            "grid", 
 
                                        gap: 
                                            9, 
                                    }} 
                                > 
 
                                    {matches.map( 
                                        match => { 
 
                                            const id = 
                                                match.matchId; 
 
                                            const itemStake = 
                                                Number( 
                                                    match.stake 
                                                ) || 0; 
 
                                            const creatorName = 
                                                normalizeString( 
                                                    match.creatorName ?? 
                                                    match.creator_name ?? 
                                                    match.players?.creator?.name, 
                                                    "Joueur" 
                                                ); 
 
                                            return ( 
                                                <div 
                                                    key={ 
                                                        id 
                                                    } 
 
                                                    style={{ 
                                                        display: 
                                                            "flex", 
 
                                                        alignItems: 
                                                            "center", 
 
                                                        justifyContent: 
                                                            "space-between", 
 
                                                        gap: 
                                                            10, 
 
                                                        padding: 
                                                            "12px", 
 
                                                        borderRadius: 
                                                            13, 
 
                                                        background: 
                                                            "rgba(255,255,255,.045)", 
 
                                                        border: 
                                                            "1px solid rgba(255,255,255,.07)", 
                                                    }} 
                                                > 
 
                                                    <div> 
 
                                                        <strong 
                                                            style={{ 
                                                                display: 
                                                                    "block", 
 
                                                                fontSize: 
                                                                    12, 
                                                            }} 
                                                        > 
                                                            {creatorName} 
                                                        </strong> 
 
                                                        <span 
                                                            style={{ 
                                                                display: 
                                                                    "block", 
 
                                                                marginTop: 
                                                                    4, 
 
                                                                fontSize: 
                                                                    10, 
 
                                                                color: 
                                                                    "rgba(255,255,255,.48)", 
                                                            }} 
                                                        > 
                                                            Mise : 
                                                            {" "} 
                                                            {formatMoney( 
                                                                itemStake 
                                                            )} 
                                                        </span> 
 
                                                    </div> 
 
 
                                                    <button 
                                                        type="button" 
 
                                                        className="football-button success" 
 
                                                        onClick={() => 
                                                            joinMatch( 
                                                                match 
                                                            ) 
                                                        } 
 
                                                        disabled={ 
                                                            loading 
                                                        } 
 
                                                        style={{ 
                                                            minHeight: 
                                                                36, 
 
                                                            padding: 
                                                                "0 13px", 
 
                                                            fontSize: 
                                                                10, 
                                                        }} 
                                                    > 
                                                        Rejoindre 
                                                    </button> 
 
                                                </div> 
                                            ); 
                                        } 
                                    )} 
 
                                </div> 
                            )} 
 
                        </div> 
 
 
                        {typeof onBack === 
                            "function" && ( 
                            <button 
                                type="button" 
 
                                className="football-button" 
 
                                onClick={ 
                                    handleBack 
                                } 
 
                                style={{ 
                                    width: 
                                        "100%", 
 
                                    marginTop: 
                                        12, 
                                }} 
                            > 
                                Retour 
                            </button> 
                        )} 
 
                    </div> 
                )} 
 
 
                {/* ================================================== 
                 * WAITING 
                 * ================================================== */} 
 
                {screen === 
                    SCREENS.WAITING && ( 
 
                    <div className="football-lobby"> 
 
                        <div 
                            style={{ 
                                fontSize: 
                                    52, 
 
                                marginBottom: 
                                    10, 
                            }} 
                        > 
                            🏟️ 
                        </div> 
 
                        <h1> 
                            Match en attente 
                        </h1> 
 
                        <p> 
                            {hasOpponent 
                                ? "Votre adversaire est prêt. Vous pouvez démarrer le match." 
                                : "En attente d'un adversaire..."} 
                        </p> 
 
 
                        <div 
                            style={{ 
                                display: 
                                    "grid", 
 
                                gridTemplateColumns: 
                                    "1fr 1fr", 
 
                                gap: 
                                    10, 
 
                                marginTop: 
                                    22, 
                            }} 
                        > 
 
                            <div className="football-stat"> 
 
                                <span className="football-stat-value"> 
                                    {formatMoney( 
                                        currentStake 
                                    )} 
                                </span> 
 
                                <span className="football-stat-label"> 
                                    Mise 
                                </span> 
 
                            </div> 
 
 
                            <div className="football-stat"> 
 
                                <span className="football-stat-value"> 
                                    {socketConnected 
                                        ? "OK" 
                                        : "..."} 
                                </span> 
 
                                <span className="football-stat-label"> 
                                    Socket 
                                </span> 
 
                            </div> 
 
                        </div> 
 
 
                        <div 
                            style={{ 
                                marginTop: 
                                    22, 
 
                                display: 
                                    "grid", 
 
                                gap: 
                                    10, 
                            }} 
                        > 
 
                            {hasOpponent ? ( 
                                <button 
                                    type="button" 
                                    className="football-button primary" 
                                    onClick={startMatch} 
                                > 
                                    Démarrer le match 
                                </button> 
                            ) : ( 
                                <div className="football-waiting-indicator"> 
                                    En attente de l'adversaire... 
                                </div> 
                            )} 
 
 
                            <button 
                                type="button" 
 
                                className="football-button" 
 
                                onClick={() => 
                                    resumeMatch( 
                                        selectedMatch 
                                    ) 
                                } 
 
                                disabled={ 
                                    loading || 
                                    !selectedMatch 
                                } 
                            > 
                                Reprendre la partie 
                            </button> 
 
 
                            <button 
                                type="button" 
 
                                className="football-button" 
 
                                onClick={ 
                                    returnHome 
                                } 
 
                                disabled={ 
                                    loading 
                                } 
                            > 
                                Retour au lobby 
                            </button> 
 
                        </div> 
 
                    </div> 
                )} 
 
 
                {/* ================================================== 
                 * TERRAIN 
                 * ================================================== */} 
 
                {( 
                    screen === 
                        SCREENS.PLAYING || 
                    screen === 
                        SCREENS.RESULT 
                ) && ( 
 
                    <div className="football-field-wrapper"> 
 
                        <div className="football-camera"> 
 
                            <div className="football-field"> 
 
                                {/* ---------------------------------- 
                                 * LIGNES 
                                 * ---------------------------------- */} 
 
                                <div 
                                    className="football-center-line" 
                                /> 
 
                                <div 
                                    className="football-center-circle" 
                                /> 
 
                                <div 
                                    className="football-center-dot" 
                                /> 
 
 
                                <div 
                                    className="football-penalty-area home" 
                                /> 
 
                                <div 
                                    className="football-penalty-area away" 
                                /> 
 
 
                                <div 
                                    className="football-goal-area home" 
                                /> 
 
                                <div 
                                    className="football-goal-area away" 
                                /> 
 
 
                                {/* ---------------------------------- 
                                 * BUTS 
                                 * ---------------------------------- */} 
 
                                <div 
                                    className="football-goal home" 
                                /> 
 
                                <div 
                                    className="football-goal away" 
                                /> 
 
 
                                {/* ---------------------------------- 
                                 * ÉCLAIRAGE 
                                 * ---------------------------------- */} 
 
                                <div 
                                    className="football-field-light" 
                                /> 
 
 
                                {/* ---------------------------------- 
                                 * JOUEURS 
                                 * ---------------------------------- */} 
 
                                {renderedPlayers} 
 
 
                                {/* ---------------------------------- 
                                 * BALLON 
                                 * ---------------------------------- */} 
 
                                <div 
                                    className="football-ball" 
 
                                    style={{ 
                                        left: 
                                            `${ballLeft}%`, 
 
                                        top: 
                                            `${ballTop}%`, 
 
                                        transform: 
                                            `translate(-50%, -50%) translateY(-${ballHeight}px)`, 
                                    }} 
                                /> 
 
 
                                {/* ---------------------------------- 
                                 * PANNEAUX LED 
                                 * ---------------------------------- */} 
 
                                <div 
                                    className="football-ad-boards" 
                                /> 
 
                            </div> 
 
                        </div> 
 
                    </div> 
                )} 
 
 
                {/* ================================================== 
                 * COMMANDES 
                 * ================================================== */} 
 
                {screen === 
                    SCREENS.PLAYING && ( 
 
                    <> 
                        <div className="football-controls"> 
 
                            <button 
                                type="button" 
 
                                className="football-control" 
 
                                onClick={() => 
                                    movePlayer( 
                                        "UP" 
                                    ) 
                                } 
                            > 
                                ↑ 
                            </button> 
 
                            <button 
                                type="button" 
 
                                className="football-control" 
 
                                onClick={() => 
                                    movePlayer( 
                                        "LEFT" 
                                    ) 
                                } 
                            > 
                                ← 
                            </button> 
 
                            <button 
                                type="button" 
 
                                className="football-control primary" 
 
                                onClick={ 
                                    pressX 
                                } 
                            > 
                                X 
                            </button> 
 
                            <button 
                                type="button" 
 
                                className="football-control primary" 
 
                                onClick={ 
                                    pressA 
                                } 
                            > 
                                A 
                            </button> 
 
                            <button 
                                type="button" 
 
                                className="football-control" 
 
                                onClick={() => 
                                    movePlayer( 
                                        "RIGHT" 
                                    ) 
                                } 
                            > 
                                → 
                            </button> 
 
                            <button 
                                type="button" 
 
                                className="football-control" 
 
                                onClick={() => 
                                    movePlayer( 
                                        "DOWN" 
                                    ) 
                                } 
                            > 
                                ↓ 
                            </button> 
 
                        </div> 
 
 
                        {/* ------------------------------------------ 
                         * MANETTE MOBILE 
                         * ------------------------------------------ */} 
 
                        <div className="football-mobile-controls"> 
 
                            <button 
                                type="button" 
                                className="up" 
                                onClick={() => 
                                    movePlayer( 
                                        "UP" 
                                    ) 
                                } 
                            > 
                                ↑ 
                            </button> 
 
                            <button 
                                type="button" 
                                className="down" 
                                onClick={() => 
                                    movePlayer( 
                                        "DOWN" 
                                    ) 
                                } 
                            > 
                                ↓ 
                            </button> 
 
                            <button 
                                type="button" 
                                className="left" 
                                onClick={() => 
                                    movePlayer( 
                                        "LEFT" 
                                    ) 
                                } 
                            > 
                                ← 
                            </button> 
 
                            <button 
                                type="button" 
                                className="right" 
                                onClick={() => 
                                    movePlayer( 
                                        "RIGHT" 
                                    ) 
                                } 
                            > 
                                → 
                            </button> 
 
                        </div> 
 
                    </> 
                )} 
 
 
                {/* ================================================== 
                 * RESULTAT 
                 * ================================================== */} 
 
                {screen === 
                    SCREENS.RESULT && ( 
 
                    <div className="football-overlay"> 
 
                        <div className="football-result"> 
 
                            <div 
                                style={{ 
                                    fontSize: 
                                        48, 
 
                                    marginBottom: 
                                        10, 
                                }} 
                            > 
                                {result?.outcome === 
                                "WIN" 
                                    ? "🏆" 
                                    : result?.outcome === 
                                      "LOSS" 
                                        ? "⚽" 
                                        : "🤝"} 
                            </div> 
 
 
                            <h1> 
                                {resultTitle} 
                            </h1> 
 
 
                            <p> 
                                {resultMessage} 
                            </p> 
 
 
                            <div className="football-result-score"> 
 
                                <strong> 
                                    {homeScore} 
                                </strong> 
 
                                <span> 
                                    : 
                                </span> 
 
                                <strong> 
                                    {awayScore} 
                                </strong> 
 
                            </div> 
 
 
                            <div className="football-match-stats"> 
 
                                <div className="football-stat"> 
 
                                    <span className="football-stat-value"> 
                                        {formatMoney( 
                                            result?.totalStake || 
                                            currentStake 
                                        )} 
                                    </span> 
 
                                    <span className="football-stat-label"> 
                                        Mise 
                                    </span> 
 
                                </div> 
 
 
                                <div className="football-stat"> 
 
                                    <span className="football-stat-value"> 
                                        {result?.myScore ?? 
                                            0} 
                                    </span> 
 
                                    <span className="football-stat-label"> 
                                        Votre score 
                                    </span> 
 
                                </div> 
 
 
                                <div className="football-stat"> 
 
                                    <span className="football-stat-value"> 
                                        {result?.opponentScore ?? 
                                            0} 
                                    </span> 
 
                                    <span className="football-stat-label"> 
                                        Adversaire 
                                    </span> 
 
                                </div> 
 
                            </div> 
 
 
                            {/* -------------------------------------- 
                             * RÈGLEMENT 
                             * -------------------------------------- */} 
 
                            {!resultSaved && ( 
                                <button 
                                    type="button" 
 
                                    className="football-button success" 
 
                                    style={{ 
                                        width: 
                                            "100%", 
 
                                        marginTop: 
                                            22, 
                                    }} 
 
                                    onClick={ 
                                        saveResult 
                                    } 
 
                                    disabled={ 
                                        loading 
                                    } 
                                > 
                                    {loading 
                                        ? "Traitement..." 
                                        : "Enregistrer le résultat et partager les fonds SAC"} 
                                </button> 
                            )} 
 
 
                            {resultSaved && 
                                !cleaned && ( 
                                <button 
                                    type="button" 
 
                                    className="football-button primary" 
 
                                    style={{ 
                                        width: 
                                            "100%", 
 
                                        marginTop: 
                                            12, 
                                    }} 
 
                                    onClick={ 
                                        cleanupMatch 
                                    } 
 
                                    disabled={ 
                                        loading 
                                    } 
                                > 
                                    {loading 
                                        ? "Nettoyage..." 
                                        : "Terminer et supprimer des matchs en cours"} 
                                </button> 
                            )} 
 
 
                            {cleaned && ( 
                                <div 
                                    className="football-waiting-indicator" 
                                    style={{ 
                                        marginTop: 
                                            15, 
                                    }} 
                                > 
                                    Partie clôturée 
                                </div> 
                            )} 
 
 
                            <button 
                                type="button" 
 
                                className="football-button" 
 
                                style={{ 
                                    width: 
                                        "100%", 
 
                                    marginTop: 
                                        12, 
                                }} 
 
                                onClick={ 
                                    returnHome 
                                } 
                            > 
                                Retour à l'accueil 
                            </button> 
 
                        </div> 
 
                    </div> 
                )} 
 
            </div> 
 
        </div> 
    ); 
} 
 
 
/* ============================================================ 
 * TRADUCTION ÉVÉNEMENTS FOOTBALL 
 * ============================================================ */ 
 
function translateFootballEvent( 
    eventName 
) { 
 
    const event = 
        String( 
            eventName || "" 
        ).toUpperCase(); 
 
    const labels = { 
        GOAL: 
            "⚽ BUT !", 
 
        SHOT: 
            "Tir !", 
 
        PASS: 
            "Passe", 
 
        DRIBBLE: 
            "Dribble", 
 
        TACKLE: 
            "Tacle", 
 
        INTERCEPTION: 
            "Interception", 
 
        FOUL: 
            "Faute", 
 
        CORNER: 
            "Corner", 
 
        OFFSIDE: 
            "Hors-jeu", 
 
        KICK_OFF: 
            "Coup d'envoi", 
 
        HALF_TIME: 
            "Mi-temps", 
 
        SECOND_HALF: 
            "Deuxième période", 
 
        FULL_TIME: 
            "🏁 Coup de sifflet final", 
 
        SAVE: 
            "Arrêt du gardien", 
 
        OUT: 
            "Sortie de balle", 
 
        THROW_IN: 
            "Touche", 
 
        FREE_KICK: 
            "Coup franc", 
 
        PENALTY: 
            "Penalty", 
 
        RED_CARD: 
            "🟥 Carton rouge", 
 
        YELLOW_CARD: 
            "🟨 Carton jaune", 
    }; 
 
    return ( 
        labels[event] || 
        `Événement : ${eventName}` 
    ); 
}