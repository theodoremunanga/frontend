// ======================================================
// BRAVMAN
// Système d'Arbitrage Centralisé (SAC)
// ======================================================

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



// ======================================================
// CONFIG
// ======================================================

const API =
    import.meta.env.VITE_API_URL;

const SOCKET_URL =
    import.meta.env.VITE_SOCKET_URL ||
    API?.replace(/\/api$/, "");

const GAME_ID = "bravman";

const MATCH_REFRESH = 3000;

const GAME_DURATION = 45;

const COUNTDOWN = 3;

const MAX_ARM_ROTATION = 45;

const MAX_PROGRESS = 100;

const TAP_ANIMATION = 120;

const SOCKET_TIMEOUT = 15000;



// ======================================================
// MATCH STATUS
// ======================================================

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



// ======================================================
// COMPONENT
// ======================================================

export default function Bravman() {

    // ==================================================
    // AUTH
    // ==================================================

    const token =
        localStorage.getItem("token");



    // ==================================================
    // SOCKET
    // ==================================================

    const socketRef =
        useRef(null);

    const refreshTimer =
        useRef(null);

    const countdownTimer =
        useRef(null);

    const tapAnimationTimer =
        useRef(null);



    // ==================================================
    // GENERAL
    // ==================================================

    const [status, setStatus] =
        useState(STATUS.MENU);

    const [loading, setLoading] =
        useState(false);

    const [error, setError] =
        useState("");



    // ==================================================
    // MATCHES
    // ==================================================

    const [matches, setMatches] =
        useState([]);

    const [currentMatch, setCurrentMatch] =
        useState(null);



    // ==================================================
    // PLAYERS
    // ==================================================

    const [me, setMe] =
        useState(null);

    const [opponent, setOpponent] =
        useState(null);



    // ==================================================
    // GAME
    // ==================================================

    const [timer, setTimer] =
        useState(GAME_DURATION);

    const [countdown, setCountdown] =
        useState(COUNTDOWN);

    const [winner, setWinner] =
        useState(null);



    // ==================================================
    // TAPS
    // ==================================================

    const [myTaps, setMyTaps] =
        useState(0);

    const [opponentTaps, setOpponentTaps] =
        useState(0);



    // ==================================================
    // ARM
    // ==================================================

    const [armRotation, setArmRotation] =
        useState(0);

    const [armProgress, setArmProgress] =
        useState(50);



    // ==================================================
    // EFFECTS
    // ==================================================

    const [myPunch, setMyPunch] =
        useState(false);

    const [opponentPunch, setOpponentPunch] =
        useState(false);



    // ==================================================
    // CONNECTION
    // ==================================================

    const [connected, setConnected] =
        useState(false);

    const [ping, setPing] =
        useState("--");



    // ==================================================
    // MEMOS
    // ==================================================

    const matchId =
        currentMatch?.id || null;

    const hasMatch =
        Boolean(matchId);

    const isPlaying =
        status === STATUS.PLAYING;

    const isWaiting =
        status === STATUS.WAITING;

    const canTap =
        connected &&
        isPlaying;



    // ==================================================
    // HELPERS
    // ==================================================

    const resetGame =
        useCallback(() => {

            setCurrentMatch(null);

            setOpponent(null);

            setWinner(null);

            setTimer(GAME_DURATION);

            setCountdown(COUNTDOWN);

            setMyTaps(0);

            setOpponentTaps(0);

            setArmRotation(0);

            setArmProgress(50);

            setStatus(STATUS.MENU);

            setError("");

        }, []);



    const resetArena =
        useCallback(() => {

            setWinner(null);

            setTimer(GAME_DURATION);

            setCountdown(COUNTDOWN);

            setMyTaps(0);

            setOpponentTaps(0);

            setArmRotation(0);

            setArmProgress(50);

        }, []);



    const difference =
        useMemo(() => {

            return myTaps -
                opponentTaps;

        }, [

            myTaps,

            opponentTaps

        ]);



    const advantage =
        useMemo(() => {

            return Math.max(

                -MAX_PROGRESS,

                Math.min(

                    MAX_PROGRESS,

                    difference

                )

            );

        }, [

            difference

        ]);



    // ==================================================
    // NEXT PART
    // ==================================================
    //
    // Partie 2 :
    //
    // - Charger les matchs SAC
    // - Rafraîchir la liste
    // - Créer un match
    // - Rejoindre un match
    // - Récupérer le match courant
    //
    // ==================================================

    // ==================================================
// RENDER
// ==================================================

return (

    <div className="bravman-page">

        {/* ==========================================
                HEADER
        ========================================== */}

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

                {

                    connected

                        ? "Connecté"

                        : "Déconnecté"

                }

            </div>

        </header>



        {/* ==========================================
                MENU
        ========================================== */}

        {

            status === STATUS.MENU && (

                <>

                    {/* ===============================
                            CREATE MATCH
                    =============================== */}

                    <section className="create-card">

                        <h2>

                            Nouveau défi

                        </h2>

                        <p>

                            Crée un défi BraVMan et
                            attends un adversaire.

                        </p>

                        <div className="stakes">

                            {

                                [

                                    100,

                                    250,

                                    500,

                                    1000,

                                    2500,

                                    5000

                                ].map(

                                    stake => (

                                        <button

                                            key={stake}

                                            className="stake-button"

                                            disabled={loading}

                                            onClick={() =>
                                                createMatch(
                                                    stake
                                                )
                                            }

                                        >

                                            {stake}

                                            {" "}FC

                                        </button>

                                    )

                                )

                            }

                        </div>

                    </section>



                    {/* ===============================
                            AVAILABLE MATCHES
                    =============================== */}

                    <section className="matches-card">

                        <div className="matches-title">

                            <h2>

                                Défis disponibles

                            </h2>

                            <button

                                className="refresh-button"

                                onClick={loadMatches}

                            >

                                Actualiser

                            </button>

                        </div>

                        {

                            matches.length === 0 ? (

                                <div className="empty">

                                    Aucun défi
                                    disponible.

                                </div>

                            ) : (

                                <div className="match-list">

                                    {

                                        matches.map(

                                            match => (

                                                <div

                                                    key={match.id}

                                                    className="match-item"

                                                >

                                                    <div>

                                                        <strong>

                                                            Match #

                                                            {

                                                                match.id

                                                            }

                                                        </strong>

                                                        <p>

                                                            Mise :

                                                            {" "}

                                                            {

                                                                match.stake

                                                            }

                                                            {" "}FC

                                                        </p>

                                                    </div>

                                                    <button

                                                        className="join-button"

                                                        disabled={loading}

                                                        onClick={() =>
                                                            joinMatch(
                                                                match.id
                                                            )
                                                        }

                                                    >

                                                        Rejoindre

                                                    </button>

                                                </div>

                                            )

                                        )

                                    }

                                </div>

                            )

                        }

                    </section>

                </>

            )

        }

                {/* ==========================================
                        WAITING ROOM
                ========================================== */}

                {

                    status === STATUS.CREATING ||

                    status === STATUS.WAITING ||

                    status === STATUS.READY

                        ? (

                            <section className="waiting-room">

                                <div className="waiting-card">

                                    <div className="waiting-icon">

                                        💪

                                    </div>

                                    <h2>

                                        Salle d'attente

                                    </h2>

                                    <p>

                                        Match

                                        {" "}

                                        #

                                        {

                                            currentMatch?.id ??

                                            currentMatch?.matchId ??

                                            "--"

                                        }

                                    </p>

                                    <div className="waiting-status">

                                        {

                                            status === STATUS.CREATING &&

                                            "Création du défi..."

                                        }

                                        {

                                            status === STATUS.WAITING &&

                                            "En attente d'un adversaire..."

                                        }

                                        {

                                            status === STATUS.READY &&

                                            "Synchronisation des joueurs..."

                                        }

                                    </div>

                                    <div className="players-preview">

                                        <div className="player blue">

                                            <div className="avatar"/>

                                            <span>

                                                Vous

                                            </span>

                                        </div>

                                        <div className="vs">

                                            VS

                                        </div>

                                        <div className="player red">

                                            <div className="avatar"/>

                                            <span>

                                                {

                                                    opponent

                                                        ? "Adversaire"

                                                        : "Recherche..."

                                                }

                                            </span>

                                        </div>

                                    </div>

                                    <div className="loader"/>

                                </div>

                            </section>

                        )

                        : null

                }



                {/* ==========================================
                        COUNTDOWN
                ========================================== */}

                {

                    status === STATUS.COUNTDOWN && (

                        <section className="countdown-screen">

                            <div className="countdown-card">

                                <div className="countdown-title">

                                    Préparez-vous

                                </div>

                                <div className="countdown-number">

                                    {

                                        countdownText

                                    }

                                </div>

                                <div className="countdown-subtitle">

                                    Le duel commence...

                                </div>

                            </div>

                        </section>

                    )

                }

                {/* ==========================================
                        GAME ARENA
                ========================================== */}

                {

                    status === STATUS.PLAYING && (

                        <section className="arena">

                            {/* ===========================
                                    SCOREBOARD
                            =========================== */}

                            <div className="scoreboard">

                                <div className="score blue">

                                    <div className="score-label">

                                        VOUS

                                    </div>

                                    <div className="score-value">

                                        {myTaps}

                                    </div>

                                    <div className="score-text">

                                        TAPS

                                    </div>

                                </div>

                                <div className="center-panel">

                                    <div className={`timer ${timerClass}`}>

                                        {timer}s

                                    </div>

                                    <div className="match-state">

                                        BRAS DE FER

                                    </div>

                                </div>

                                <div className="score red">

                                    <div className="score-label">

                                        ADVERSE

                                    </div>

                                    <div className="score-value">

                                        {opponentTaps}

                                    </div>

                                    <div className="score-text">

                                        TAPS

                                    </div>

                                </div>

                            </div>



                    {/* ===========================
                            TABLE
                    =========================== */}

                    <div className="battle-zone">

                        <div className="table"/>



                        {/* -----------------------
                                BLUE PLAYER
                        ----------------------- */}

                        <div className="fighter blue">

                            <div className="head"/>

                            <div className="body"/>

                            <div

                                className={

                                    myPunch

                                    ? "arm attack"

                                    : "arm"

                                }

                                style={{

                                    transform:

                                        `rotate(${armRotation}deg)`

                                }}

                            />

                            <div className="left-arm"/>

                            <div className="legs"/>

                        </div>



                        {/* -----------------------
                                RED PLAYER
                        ----------------------- */}

                        <div className="fighter red">

                            <div className="head"/>

                            <div className="body"/>

                            <div

                                className={

                                    opponentPunch

                                    ? "arm attack"

                                    : "arm"

                                }

                                style={{

                                    transform:

                                        `rotate(${armRotation}deg)`

                                }}

                            />

                            <div className="left-arm"/>

                            <div className="legs"/>

                        </div>



                        {/* ======================
                                ARM BAR
                        ====================== */}

                        <div className="progress-wrapper">

                            <div className="progress-track">

                                <div

                                    className="progress-value"

                                    style={{

                                        left:

                                            `${armProgress}%`

                                    }}

                                />

                            </div>

                        </div>

                    </div>



                    {/* ===========================
                            TAP BUTTONS
                    =========================== */}

                    <div className="tap-panel">

                        <button

                            className="tap-button blue"

                            onMouseDown={sendTap}

                            onTouchStart={sendTap}

                            onClick={sendTap}

                        >

                            TAP

                        </button>

                        <button

                            className="tap-button red"

                            disabled

                        >

                            ADVERSAIRE

                        </button>

                    </div>

                </section>

            )

        }

                

                {/* ==========================================
                        RESULT SCREEN
                ========================================== */}

                {

                    status === STATUS.FINISHED && (

                        <section className="result-screen">

                            <div

                                className={

                                    `result-card ${result?.type}`

                                }

                            >

                                <div className="result-icon">

                                    {

                                        result?.type === "victory"

                                            ? "🏆"

                                            : result?.type === "defeat"

                                                ? "💀"

                                                : "🤝"

                                    }

                                </div>

                                <h2>

                                    {

                                        result?.title ??

                                        "Partie terminée"

                                    }

                                </h2>

                                <div className="result-stats">

                                    <div className="stat">

                                        <span>

                                            Vos TAPS

                                        </span>

                                        <strong>

                                            {myTaps}

                                        </strong>

                                    </div>

                                    <div className="stat">

                                        <span>

                                            TAPS adverses

                                        </span>

                                        <strong>

                                            {opponentTaps}

                                        </strong>

                                    </div>

                                </div>

                                <div className="result-buttons">

                                    <button

                                        className="play-again"

                                        onClick={() => {

                                            resetGame();

                                            loadMatches();

                                        }}

                                    >

                                        Retour au menu

                                    </button>

                                </div>

                            </div>

                        </section>

                    )

                }



        {/* ==========================================
                LOADING
        ========================================== */}

        {

            loading && (

                <div className="loading-panel">

                    Chargement...

                </div>

            )

        }



        {/* ==========================================
                ERROR
        ========================================== */}

        {

            error && (

                <div className="error-panel">

                    {error}

                </div>

            )

        }

    </div>

);

}

    // ==================================================
    // LOAD MATCHES
    // ==================================================

    const loadMatches =
        useCallback(async () => {

            try {

                const response =
                    await getSacMatches(
                        GAME_ID
                    );

                if (
                    response?.success
                ) {

                    setMatches(
                        Array.isArray(
                            response.matches
                        )
                            ? response.matches
                            : []
                    );

                }

            } catch (error) {

                console.error(
                    "LOAD MATCHES ERROR:",
                    error
                );

            }

        }, []);





    // ==================================================
    // LOAD CURRENT MATCH
    // ==================================================

    const loadCurrentMatch =
        useCallback(async (
            id
        ) => {

            if (!id) {
                return;
            }

            try {

                const response =
                    await getSacMatch(
                        id
                    );

                if (
                    !response?.success
                ) {
                    return;
                }

                const match =
                    response.match;

                setCurrentMatch(
                    match
                );

                setMe(
                    match.players?.creator ||
                    null
                );

                setOpponent(
                    match.players?.opponent ||
                    null
                );

            } catch (error) {

                console.error(
                    "LOAD MATCH ERROR:",
                    error
                );

            }

        }, []);





    // ==================================================
    // CREATE MATCH
    // ==================================================

    const createMatch =
        useCallback(async (
            stake
        ) => {

            try {

                setLoading(true);

                setError("");

                setStatus(
                    STATUS.CREATING
                );

                const response =
                    await createSacMatch({

                        game: GAME_ID,

                        stake

                    });

                if (
                    !response?.success
                ) {

                    throw new Error(
                        "Création impossible."
                    );

                }

                setCurrentMatch(
                    response.match
                );

                setStatus(
                    STATUS.WAITING
                );

                await loadMatches();

            } catch (error) {

                console.error(
                    error
                );

                setStatus(
                    STATUS.ERROR
                );

                setError(
                    error.message
                );

            } finally {

                setLoading(false);

            }

        }, [

            loadMatches

        ]);





    // ==================================================
    // JOIN MATCH
    // ==================================================

    const joinMatch =
        useCallback(async (
            matchId
        ) => {

            try {

                setLoading(true);

                setError("");

                const response =
                    await joinSacMatch({

                        game: GAME_ID,

                        matchId

                    });

                if (
                    !response?.success
                ) {

                    throw new Error(
                        "Impossible de rejoindre."
                    );

                }

                setCurrentMatch(
                    response.match
                );

                setStatus(
                    STATUS.READY
                );

                await loadCurrentMatch(
                    matchId
                );

                await loadMatches();

            } catch (error) {

                console.error(
                    error
                );

                setStatus(
                    STATUS.ERROR
                );

                setError(
                    error.message
                );

            } finally {

                setLoading(false);

            }

        }, [

            loadCurrentMatch,

            loadMatches

        ]);





    // ==================================================
    // AUTO REFRESH MATCHES
    // ==================================================

    useEffect(() => {

        loadMatches();

        refreshTimer.current =
            setInterval(

                loadMatches,

                MATCH_REFRESH

            );

        return () => {

            clearInterval(

                refreshTimer.current

            );

        };

    }, [

        loadMatches

    ]);





    // ==================================================
    // RELOAD CURRENT MATCH
    // ==================================================

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

    // ==================================================
// SOCKET CONNECTION
// ==================================================

useEffect(() => {

    if (!token) return;

    const socket = io(

        SOCKET_URL,

        {

            auth: { token },

            transports: ["websocket"],

            timeout: SOCKET_TIMEOUT,

            reconnection: true,

            reconnectionAttempts: Infinity,

            reconnectionDelay: 1000

        }

    );

    socketRef.current = socket;



    socket.on("connect", () => {

        console.log("🟢 BRAVMAN CONNECT");

        setConnected(true);

    });



    socket.on("disconnect", () => {

        console.log("🔴 BRAVMAN DISCONNECT");

        setConnected(false);

    });



    socket.on(

        "connect_error",

        err => {

            console.error(err);

            setConnected(false);

            setError(err.message);

        }

    );



    socket.on(

        "bravman:error",

        err => {

            console.error(err);

            setError(

                err.message ||

                "Erreur serveur"

            );

        }

    );



    return () => {

        socket.removeAllListeners();

        socket.disconnect();

    };

}, [token]);



// ==================================================
// JOIN ENGINE ROOM
// ==================================================

useEffect(() => {

    if (

        !connected ||

        !matchId ||

        !socketRef.current ||

        !me?.id

    ) {

        return;

    }

    socketRef.current.emit(

        "bravman:join",

        {

            matchId,

            userId: me.id

        }

    );

}, [

    connected,

    matchId,

    me

]);



// ==================================================
// JOIN ACK
// ==================================================

useEffect(() => {

    if (!socketRef.current) return;

    const socket = socketRef.current;

    const handler = data => {

        console.log(

            "JOINED",

            data

        );

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

}, []);



// ==================================================
// LIVE UPDATE
// ==================================================

useEffect(() => {

    if (!socketRef.current) return;

    const socket = socketRef.current;

    const update = game => {

        if (!game) return;

        setCurrentMatch(game);

        setTimer(

            game.remaining

        );

        setCountdown(

            game.countdown

        );

        setMyTaps(

            game.creatorTaps

        );

        setOpponentTaps(

            game.opponentTaps

        );

        setArmProgress(

            game.armPosition

        );



        switch (

            game.status

        ) {

            case "waiting":

                setStatus(

                    STATUS.WAITING

                );

                break;

            case "countdown":

                setStatus(

                    STATUS.COUNTDOWN

                );

                break;

            case "running":

                setStatus(

                    STATUS.PLAYING

                );

                break;

            case "finished":

                setStatus(

                    STATUS.FINISHED

                );

                break;

            default:

                break;

        }

    };

    socket.on(

        "bravman:update",

        update

    );

    return () => {

        socket.off(

            "bravman:update",

            update

        );

    };

}, []);



// ==================================================
// RUNNING EVENT
// ==================================================

useEffect(() => {

    if (!socketRef.current) return;

    const socket = socketRef.current;

    const running = game => {

        console.log(

            "GAME START"

        );

        setStatus(

            STATUS.PLAYING

        );

    };

    socket.on(

        "bravman:running",

        running

    );

    return () => {

        socket.off(

            "bravman:running",

            running

        );

    };

}, []);



// ==================================================
// FINISHED EVENT
// ==================================================

useEffect(() => {

    if (!socketRef.current) return;

    const socket = socketRef.current;

    const finished = result => {

        console.log(

            "GAME FINISHED",

            result

        );

        setWinner(

            result

        );

        setStatus(

            STATUS.FINISHED

        );

    };

    socket.on(

        "bravman:finished",

        finished

    );

    return () => {

        socket.off(

            "bravman:finished",

            finished

        );

    };

}, []);



// ==================================================
// REQUEST CURRENT STATE
// ==================================================

useEffect(() => {

    if (

        !connected ||

        !matchId ||

        !socketRef.current

    ) {

        return;

    }

    socketRef.current.emit(

        "bravman:state"

    );

}, [

    connected,

    matchId

]);

    // ==================================================
    // SEND TAP
    // ==================================================

    const sendTap =
        useCallback(() => {

            if (

                !socketRef.current ||

                !connected ||

                status !== STATUS.PLAYING

            ) {

                return;

            }

            socketRef.current.emit(

                "bravman:tap"

            );

            setMyPunch(true);

            clearTimeout(

                tapAnimationTimer.current

            );

            tapAnimationTimer.current =
                setTimeout(() => {

                    setMyPunch(false);

                }, TAP_ANIMATION);

        }, [

            connected,

            status

        ]);





    // ==================================================
    // KEYBOARD SUPPORT
    // ==================================================

    useEffect(() => {

        const handler = event => {

            if (

                event.code === "Space"

            ) {

                event.preventDefault();

                sendTap();

            }

        };

        window.addEventListener(

            "keydown",

            handler

        );

        return () => {

            window.removeEventListener(

                "keydown",

                handler

            );

        };

    }, [

        sendTap

    ]);





    // ==================================================
    // ARM ANIMATION
    // ==================================================

    useEffect(() => {

        const position =

            currentMatch?.armPosition ?? 0;

        setArmRotation(

            position *

            (

                MAX_ARM_ROTATION /

                100

            )

        );

        setArmProgress(

            50 +

            position / 2

        );

    }, [

        currentMatch

    ]);





    // ==================================================
    // OPPONENT TAP EFFECT
    // ==================================================

    useEffect(() => {

        if (

            !currentMatch

        ) {

            return;

        }

        setOpponentPunch(true);

        const timer =
            setTimeout(() => {

                setOpponentPunch(false);

            }, TAP_ANIMATION);

        return () => {

            clearTimeout(timer);

        };

    }, [

        opponentTaps

    ]);





    // ==================================================
    // COUNTDOWN DISPLAY
    // ==================================================

    const countdownText =
        useMemo(() => {

            if (

                status !==

                STATUS.COUNTDOWN

            ) {

                return "";

            }

            if (

                countdown <= 0

            ) {

                return "GO !";

            }

            return countdown;

        }, [

            countdown,

            status

        ]);





    // ==================================================
    // TIMER COLOR
    // ==================================================

    const timerClass =
        useMemo(() => {

            if (

                timer <= 5

            ) {

                return "danger";

            }

            if (

                timer <= 10

            ) {

                return "warning";

            }

            return "normal";

        }, [

            timer

        ]);
