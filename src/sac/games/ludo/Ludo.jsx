// ============================================================
// 6BETBALL — SAC / LUDO
// frontend/src/sac/games/ludo/Ludo.jsx
//
// RESPONSABILITÉS
// ------------------------------------------------------------
// - Choix du mode : USER / AI / TRAINING
// - Gestion de la mise
// - Création d'une partie
// - Lobby des parties Ludo disponibles
// - Rejoindre une partie
// - Reprise des parties actives
// - Affichage des règles
// - Acceptation des règles
// - Connexion Socket.IO Ludo
// - Réception de l'état serveur
// - Lancer du dé
// - Sélection / déplacement des pions
// - Affichage des 16 pions
// - Affichage des 4 camps
// - Affichage du parcours 52 cases
// - Affichage des lignes finales
// - Affichage du tour courant
// - Compteur des 90 secondes
// - Gestion AI / TRAINING
// - Gestion timeout
// - Résultat
// - Nettoyage
// - Retour accueil
//
// SOURCE DE VÉRITÉ
// ------------------------------------------------------------
// Ludo.jsx NE CALCULE PAS les règles.
//
// Le backend reste maître de :
//   - dé
//   - tour
//   - pions légaux
//   - déplacements
//   - captures
//   - victoire
//   - timeout
//   - résultat
//
// Le frontend ne fait que :
//   - demander une action
//   - afficher l'état retourné
//
// ============================================================

import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import {
    createSacMatch,
    joinSacMatch,
    getSacMatch,
    getSacMatches,
} from "../../sacApi";

import api from "../../../services/api";

import * as ludoSocketModule from "./ludoSocket";

import "./Ludo.css";


// ============================================================
// CONFIGURATION
// ============================================================

const GAME = "ludo";

const DEFAULT_STAKE = 500;

const MIN_STAKE = 500;

const MAX_STAKE = 100000;

const TURN_DURATION_SECONDS = 90;

const ACTIVE_MATCH_STORAGE_KEY =
    "sixbetball_ludo_active_matches";

const ACCEPTED_RULES_STORAGE_KEY =
    "sixbetball_ludo_rules_accepted";

const AI_ID = 9999;


// ============================================================
// MODES
// ============================================================

const MODES = Object.freeze({
    USER: "user",
    AI: "ai",
    TRAINING: "training",
});


// ============================================================
// ÉCRANS
// ============================================================

const SCREENS = Object.freeze({
    LOBBY: "LOBBY",
    WAITING: "WAITING",
    RULES: "RULES",
    PLAYING: "PLAYING",
    RESULT: "RESULT",
});


// ============================================================
// STATUTS
// ============================================================

const MATCH_STATUS = Object.freeze({
    WAITING: "waiting",
    STARTING: "starting",
    PLAYING: "playing",
    FINISHED: "finished",
    TIMEOUT: "timeout",
    ABORTED: "aborted",
});


// ============================================================
// ÉTATS PIONS
// ============================================================

const PAWN_STATE = Object.freeze({
    BASE: "base",
    BOARD: "board",
    HOME: "home",
});


// ============================================================
// CAMPS
//
// Moteur :
//
// PLAYER 1
//   RED
//   YELLOW
//
// PLAYER 2
//   BLUE
//   GREEN
//
// ============================================================

const CAMPS = Object.freeze({
    RED: "red",
    YELLOW: "yellow",
    BLUE: "blue",
    GREEN: "green",
});


// ============================================================
// ÉQUIPES
// ============================================================

const TEAMS = Object.freeze({
    RED_YELLOW: "red_yellow",
    BLUE_GREEN: "blue_green",
});


// ============================================================
// DÉ
//
// Le moteur produit une valeur numérique 1..6.
//
// Le frontend traduit visuellement cette valeur.
// ============================================================

const DICE_SYMBOLS = Object.freeze({
    1: "•",
    2: "••",
    3: "•••",
    4: "••••",
    5: "•••••",
    6: "••••••",
});


// ============================================================
// COULEURS LOGIQUES
//
// Le CSS pourra remplacer complètement le rendu.
// ============================================================

const CAMP_META = Object.freeze({
    red: {
        label: "Rouge",
        color: "#ef4444",
        team: TEAMS.RED_YELLOW,
        player: 1,
    },

    yellow: {
        label: "Jaune",
        color: "#facc15",
        team: TEAMS.RED_YELLOW,
        player: 1,
    },

    blue: {
        label: "Bleu",
        color: "#3b82f6",
        team: TEAMS.BLUE_GREEN,
        player: 2,
    },

    green: {
        label: "Vert",
        color: "#22c55e",
        team: TEAMS.BLUE_GREEN,
        player: 2,
    },
});


// ============================================================
// OUTILS
// ============================================================

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


function normalizeString(
    value,
    fallback = ""
) {
    if (
        value === null ||
        value === undefined
    ) {
        return fallback;
    }

    const result =
        String(value).trim();

    return result || fallback;
}


function formatMoney(value) {
    const amount =
        Number(value) || 0;

    return new Intl.NumberFormat(
        "fr-FR"
    ).format(amount);
}


function formatDate(value) {
    if (!value) {
        return "";
    }

    try {
        return new Intl.DateTimeFormat(
            "fr-FR",
            {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
            }
        ).format(
            new Date(value)
        );
    } catch {
        return "";
    }
}


function safeJsonParse(
    value,
    fallback
) {
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
}


function getToken() {
    return (
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken") ||
        ""
    );
}


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
        user?.pseudo ??
        user?.email,
        "Joueur"
    );
}


// ============================================================
// MATCH NORMALIZATION
// ============================================================

function normalizeMatch(
    payload
) {
    const source =
        payload?.match ??
        payload?.data ??
        payload ??
        {};

    return {
        ...source,

        id: normalizeId(
            source.id ??
            source.matchId ??
            source.match_id
        ),

        matchId: normalizeId(
            source.matchId ??
            source.match_id ??
            source.id
        ),

        game:
            source.game ??
            GAME,

        mode:
            String(
                source.mode ??
                MODES.USER
            ).toLowerCase(),

        status:
            String(
                source.status ??
                MATCH_STATUS.WAITING
            ).toLowerCase(),

        stake: Number(
            source.stake ??
            source.bet_amount ??
            source.amount ??
            0
        ),

        player1Id: normalizeId(
            source.player1Id ??
            source.player1_id ??
            source.user1_id ??
            source.creator_id
        ),

        player2Id: normalizeId(
            source.player2Id ??
            source.player2_id ??
            source.user2_id ??
            source.opponent_id
        ),

        creatorId: normalizeId(
            source.creatorId ??
            source.creator_id ??
            source.player1Id ??
            source.player1_id ??
            source.user1_id
        ),

        opponentId: normalizeId(
            source.opponentId ??
            source.opponent_id ??
            source.player2Id ??
            source.player2_id ??
            source.user2_id
        ),

        player1Name:
            source.player1Name ??
            source.player1_name ??
            source.creatorName ??
            source.creator_name ??
            source.user1_name ??
            null,

        player2Name:
            source.player2Name ??
            source.player2_name ??
            source.opponentName ??
            source.opponent_name ??
            source.user2_name ??
            null,

        winnerId: normalizeId(
            source.winnerId ??
            source.winner_player_id ??
            source.winner_id
        ),
    };
}


// ============================================================
// SOCKET ADAPTER
//
// Le fichier ludoSocket.js reste prioritaire.
//
// Nous utilisons une détection souple afin que Ludo.jsx puisse
// fonctionner avec les noms d'API classiques du module.
// ============================================================

function getSocketAdapter() {
    return (
        ludoSocketModule.default ||
        ludoSocketModule
    );
}


function callSocketFunction(
    names,
    ...args
) {
    const adapter =
        getSocketAdapter();

    for (
        const name of names
    ) {
        if (
            adapter &&
            typeof adapter[name] ===
                "function"
        ) {
            return adapter[name](
                ...args
            );
        }
    }

    return null;
}


function getRawLudoSocket() {
    const adapter =
        getSocketAdapter();

    if (
        adapter &&
        typeof adapter.getLudoSocket ===
            "function"
    ) {
        return adapter.getLudoSocket();
    }

    if (
        adapter &&
        typeof adapter.getSocket ===
            "function"
    ) {
        return adapter.getSocket();
    }

    if (
        adapter?.socket
    ) {
        return adapter.socket;
    }

    return null;
}


// ============================================================
// EXTRACTION ÉTAT SOCKET
// ============================================================

function extractState(
    payload
) {
    if (!payload) {
        return null;
    }

    return (
        payload.state ??
        payload.gameState ??
        payload.matchState ??
        payload.data?.state ??
        payload.data ??
        payload
    );
}


// ============================================================
// EXTRACTION MATCH
// ============================================================

function extractMatch(
    payload
) {
    if (!payload) {
        return null;
    }

    return normalizeMatch(
        payload.match ??
        payload.data?.match ??
        payload.data ??
        payload
    );
}


// ============================================================
// EXTRACTION RÉSULTAT
// ============================================================

function extractResult(
    payload
) {
    if (!payload) {
        return null;
    }

    return (
        payload.result ??
        payload.data?.result ??
        payload.data ??
        payload
    );
}


// ============================================================
// ÉTAT TERMINÉ
// ============================================================

function isFinishedState(
    state
) {
    const status =
        String(
            state?.status ??
            ""
        ).toLowerCase();

    return (
        status ===
            MATCH_STATUS.FINISHED ||
        status ===
            MATCH_STATUS.TIMEOUT ||
        state?.finished === true
    );
}


// ============================================================
// ÉTAT EN COURS
// ============================================================

function isPlayingState(
    state
) {
    const status =
        String(
            state?.status ??
            ""
        ).toLowerCase();

    return (
        status ===
            MATCH_STATUS.PLAYING ||
        status ===
            MATCH_STATUS.STARTING
    );
}


// ============================================================
// UTILITAIRES SOCKET
// ============================================================

function emitSocket(
    event,
    payload
) {
    const socket =
        getRawLudoSocket();

    if (
        socket &&
        typeof socket.emit ===
            "function"
    ) {
        socket.emit(
            event,
            payload
        );

        return true;
    }

    return false;
}


// ============================================================
// SOCKET — CONNEXION
// ============================================================

function connectLudo() {
    return callSocketFunction(
        [
            "connectLudoSocket",
            "connectSocket",
            "connect",
        ],
        {
            token: getToken(),
        }
    );
}


// ============================================================
// SOCKET — DÉCONNEXION
// ============================================================

function disconnectLudo() {
    return callSocketFunction(
        [
            "disconnectLudoSocket",
            "disconnectSocket",
            "disconnect",
        ]
    );
}


// ============================================================
// SOCKET — JOIN
// ============================================================

function joinLudo(
    matchId,
    userId
) {
    const result =
        callSocketFunction(
            [
                "joinLudoMatch",
                "joinMatch",
            ],
            matchId,
            userId
        );

    if (
        result !== null
    ) {
        return result;
    }

    return emitSocket(
        "ludo:join",
        {
            matchId,
            userId,
        }
    );
}


// ============================================================
// SOCKET — LEAVE
// ============================================================

function leaveLudo(
    matchId,
    userId
) {
    const result =
        callSocketFunction(
            [
                "leaveLudoMatch",
                "leaveMatch",
            ],
            matchId,
            userId
        );

    if (
        result !== null
    ) {
        return result;
    }

    return emitSocket(
        "ludo:leave",
        {
            matchId,
            userId,
        }
    );
}


// ============================================================
// SOCKET — STATE
// ============================================================

function requestLudoState(
    matchId
) {
    const result =
        callSocketFunction(
            [
                "requestLudoState",
                "requestState",
                "getLudoState",
            ],
            matchId
        );

    if (
        result !== null
    ) {
        return result;
    }

    return emitSocket(
        "ludo:state",
        {
            matchId,
        }
    );
}


// ============================================================
// SOCKET — RESTORE
// ============================================================

function restoreLudo(
    matchId,
    userId
) {
    const result =
        callSocketFunction(
            [
                "restoreLudoMatch",
                "restoreMatch",
                "restore",
            ],
            matchId,
            userId
        );

    if (
        result !== null
    ) {
        return result;
    }

    return emitSocket(
        "ludo:restore",
        {
            matchId,
            userId,
        }
    );
}


// ============================================================
// SOCKET — START
// ============================================================

function startLudo(
    matchId,
    userId
) {
    const result =
        callSocketFunction(
            [
                "startLudoMatch",
                "startMatch",
            ],
            matchId,
            userId
        );

    if (
        result !== null
    ) {
        return result;
    }

    return emitSocket(
        "ludo:start",
        {
            matchId,
            userId,
        }
    );
}


// ============================================================
// SOCKET — ROLL
// ============================================================

function rollLudoDice(
    matchId,
    userId
) {
    const result =
        callSocketFunction(
            [
                "rollLudoDice",
                "sendLudoRoll",
                "rollDice",
            ],
            matchId,
            userId
        );

    if (
        result !== null
    ) {
        return result;
    }

    return emitSocket(
        "ludo:rollDice",
        {
            matchId,
            playerId: userId,
            userId,
        }
    );
}


// ============================================================
// SOCKET — MOVE
// ============================================================

function moveLudoPawn(
    matchId,
    userId,
    pawnId
) {
    const result =
        callSocketFunction(
            [
                "moveLudoPawn",
                "sendLudoMove",
                "movePawn",
            ],
            matchId,
            userId,
            pawnId
        );

    if (
        result !== null
    ) {
        return result;
    }

    return emitSocket(
        "ludo:movePawn",
        {
            matchId,
            playerId: userId,
            userId,
            pawnId,
        }
    );
}


// ============================================================
// LECTURE STORAGE
// ============================================================

function getStoredIds(
    key
) {
    const raw =
        sessionStorage.getItem(
            key
        );

    if (!raw) {
        return [];
    }

    const parsed =
        safeJsonParse(
            raw,
            []
        );

    if (!Array.isArray(parsed)) {
        return [];
    }

    return parsed
        .map(normalizeId)
        .filter(Boolean);
}


function saveStoredIds(
    key,
    ids
) {
    const unique =
        [
            ...new Set(
                ids
                    .map(normalizeId)
                    .filter(Boolean)
            ),
        ];

    sessionStorage.setItem(
        key,
        JSON.stringify(unique)
    );
}


function rememberMatch(
    matchId
) {
    const ids =
        getStoredIds(
            ACTIVE_MATCH_STORAGE_KEY
        );

    saveStoredIds(
        ACTIVE_MATCH_STORAGE_KEY,
        [
            ...ids,
            matchId,
        ]
    );
}


function forgetMatch(
    matchId
) {
    const ids =
        getStoredIds(
            ACTIVE_MATCH_STORAGE_KEY
        );

    saveStoredIds(
        ACTIVE_MATCH_STORAGE_KEY,
        ids.filter(
            id =>
                Number(id) !==
                Number(matchId)
        )
    );
}


// ============================================================
// RÈGLES ACCEPTÉES
// ============================================================

function isRulesAccepted(
    matchId
) {
    const ids =
        getStoredIds(
            ACCEPTED_RULES_STORAGE_KEY
        );

    return ids.some(
        id =>
            Number(id) ===
            Number(matchId)
    );
}


function rememberRulesAccepted(
    matchId
) {
    const ids =
        getStoredIds(
            ACCEPTED_RULES_STORAGE_KEY
        );

    saveStoredIds(
        ACCEPTED_RULES_STORAGE_KEY,
        [
            ...ids,
            matchId,
        ]
    );
}


// ============================================================
// PARCOURS VISUEL
//
// 52 cases.
// Le moteur utilise :
// TRACK_LENGTH = 52.
//
// La position physique du pion est :
// (startOffset + progress) % 52.
//
// ============================================================

function buildTrackCells() {
    const cells = [];

    // Haut : 13
    for (
        let x = 1;
        x <= 13;
        x++
    ) {
        cells.push({
            x,
            y: 1,
        });
    }

    // Droite : 13
    for (
        let y = 2;
        y <= 14;
        y++
    ) {
        cells.push({
            x: 13,
            y,
        });
    }

    // Bas : 13
    for (
        let x = 12;
        x >= 0;
        x--
    ) {
        cells.push({
            x,
            y: 14,
        });
    }

    // Gauche : 13
    for (
        let y = 13;
        y >= 1;
        y--
    ) {
        cells.push({
            x: 1,
            y,
        });
    }

    return cells.slice(
        0,
        52
    );
}


const TRACK_CELLS =
    buildTrackCells();


// ============================================================
// DÉPARTS PHYSIQUES
//
// Même offsets que ludoEngine :
//
// RED    = 0
// GREEN  = 13
// YELLOW = 26
// BLUE   = 39
//
// ============================================================

const CAMP_START_OFFSETS =
    Object.freeze({
        red: 0,
        green: 13,
        yellow: 26,
        blue: 39,
    });


// ============================================================
// LANES FINALES
//
// progress 52..57
// ============================================================

const HOME_LANES =
    Object.freeze({
        red: [
            { x: 7, y: 2 },
            { x: 7, y: 3 },
            { x: 7, y: 4 },
            { x: 7, y: 5 },
            { x: 7, y: 6 },
            { x: 7, y: 7 },
        ],

        green: [
            { x: 12, y: 8 },
            { x: 11, y: 8 },
            { x: 10, y: 8 },
            { x: 9, y: 8 },
            { x: 8, y: 8 },
            { x: 7, y: 8 },
        ],

        yellow: [
            { x: 7, y: 13 },
            { x: 7, y: 12 },
            { x: 7, y: 11 },
            { x: 7, y: 10 },
            { x: 7, y: 9 },
            { x: 7, y: 8 },
        ],

        blue: [
            { x: 2, y: 7 },
            { x: 3, y: 7 },
            { x: 4, y: 7 },
            { x: 5, y: 7 },
            { x: 6, y: 7 },
            { x: 7, y: 7 },
        ],
    });


// ============================================================
// POSITION BASE
// ============================================================

const BASE_POSITIONS =
    Object.freeze({
        red: [
            { x: 3.4, y: 3.4 },
            { x: 5.2, y: 3.4 },
            { x: 3.4, y: 5.2 },
            { x: 5.2, y: 5.2 },
        ],

        green: [
            { x: 9.8, y: 3.4 },
            { x: 11.6, y: 3.4 },
            { x: 9.8, y: 5.2 },
            { x: 11.6, y: 5.2 },
        ],

        yellow: [
            { x: 3.4, y: 9.8 },
            { x: 5.2, y: 9.8 },
            { x: 3.4, y: 11.6 },
            { x: 5.2, y: 11.6 },
        ],

        blue: [
            { x: 9.8, y: 9.8 },
            { x: 11.6, y: 9.8 },
            { x: 9.8, y: 11.6 },
            { x: 11.6, y: 11.6 },
        ],
    });


// ============================================================
// POSITION PION
// ============================================================

function getPawnVisualPosition(
    pawn
) {
    if (!pawn) {
        return null;
    }

    const camp =
        String(
            pawn.camp || ""
        ).toLowerCase();

    if (
        pawn.state ===
            PAWN_STATE.BASE ||
        Number(pawn.progress) < 0
    ) {
        const positions =
            BASE_POSITIONS[
                camp
            ] || [];

        const index =
            Math.max(
                0,
                Number(
                    pawn.pawnNumber
                ) - 1
            ) %
            Math.max(
                positions.length,
                1
            );

        return (
            positions[index] || {
                x: 7,
                y: 7,
            }
        );
    }

    if (
        pawn.state ===
            PAWN_STATE.HOME ||
        Number(pawn.progress) >= 52
    ) {
        const lane =
            HOME_LANES[
                camp
            ] || [];

        const index =
            Math.max(
                0,
                Number(
                    pawn.progress
                ) - 52
            );

        return (
            lane[index] || {
                x: 7,
                y: 7,
            }
        );
    }

    const progress =
        Number(
            pawn.progress
        );

    const offset =
        CAMP_START_OFFSETS[
            camp
        ];

    if (
        !Number.isFinite(
            progress
        ) ||
        !Number.isFinite(
            offset
        )
    ) {
        return {
            x: 7,
            y: 7,
        };
    }

    const physicalPosition =
        (
            offset +
            progress
        ) % 52;

    return (
        TRACK_CELLS[
            physicalPosition
        ] || {
            x: 7,
            y: 7,
        }
    );
}


// ============================================================
// CLASSES PION
// ============================================================

function getPawnClass(
    pawn,
    legalPawnIds
) {
    const classes = [
        "ludo-pawn",
        `ludo-pawn-${pawn.camp}`,
    ];

    if (
        legalPawnIds.includes(
            String(pawn.id)
        )
    ) {
        classes.push(
            "ludo-pawn-legal"
        );
    }

    if (
        pawn.completed
    ) {
        classes.push(
            "ludo-pawn-completed"
        );
    }

    return classes.join(" ");
}


// ============================================================
// COMPONENT
// ============================================================

export default function Ludo({
    onBack,
    onHome,
    setPage,
}) {

    // ========================================================
    // UTILISATEUR
    // ========================================================

    const user =
        useMemo(
            () => getStoredUser(),
            []
        );

    const userId =
        useMemo(
            () =>
                getUserId(
                    user
                ),
            [user]
        );

    const userName =
        useMemo(
            () =>
                getUserName(
                    user
                ),
            [user]
        );


    // ========================================================
    // REFS
    // ========================================================

    const mountedRef =
        useRef(false);

    const matchIdRef =
        useRef(null);

    const selectedMatchRef =
        useRef(null);

    const rulesAcceptedRef =
        useRef(false);

    const resultHandledRef =
        useRef(false);


    // ========================================================
    // ÉTAT
    // ========================================================

    const [
        screen,
        setScreen,
    ] = useState(
        SCREENS.LOBBY
    );

    const [
        mode,
        setMode,
    ] = useState(
        MODES.USER
    );

    const [
        stake,
        setStake,
    ] = useState(
        DEFAULT_STAKE
    );

    const [
        match,
        setMatch,
    ] = useState(null);

    const [
        gameState,
        setGameState,
    ] = useState(null);

    const [
        matches,
        setMatches,
    ] = useState([]);

    const [
        activeMatches,
        setActiveMatches,
    ] = useState([]);

    const [
        rulesAccepted,
        setRulesAccepted,
    ] = useState(false);

    const [
        loading,
        setLoading,
    ] = useState(false);

    const [
        error,
        setError,
    ] = useState("");

    const [
        notice,
        setNotice,
    ] = useState("");

    const [
        selectedPawnId,
        setSelectedPawnId,
    ] = useState(null);

    const [
        diceRolling,
        setDiceRolling,
    ] = useState(false);

    const [
        diceAnimationValue,
        setDiceAnimationValue,
    ] = useState(null);

    const [
        remainingSeconds,
        setRemainingSeconds,
    ] = useState(
        TURN_DURATION_SECONDS
    );

    const [
        result,
        setResult,
    ] = useState(null);


    // ========================================================
    // NETTOYAGE MESSAGE
    // ========================================================

    useEffect(() => {

        if (!error && !notice) {
            return undefined;
        }

        const timer =
            window.setTimeout(
                () => {
                    setError("");
                    setNotice("");
                },
                6000
            );

        return () =>
            window.clearTimeout(
                timer
            );

    }, [
        error,
        notice,
    ]);


    // ========================================================
    // SAUVEGARDE MATCH
    // ========================================================

    const registerCurrentMatch =
        useCallback(
            currentMatch => {

                const normalized =
                    normalizeMatch(
                        currentMatch
                    );

                if (
                    !normalized.matchId
                ) {
                    return;
                }

                matchIdRef.current =
                    normalized.matchId;

                selectedMatchRef.current =
                    normalized;

                setMatch(
                    normalized
                );

                rememberMatch(
                    normalized.matchId
                );
            },
            []
        );


    // ========================================================
    // APPLICATION ÉTAT SERVEUR
    // ========================================================

    const applyServerState =
        useCallback(
            payload => {

                const state =
                    extractState(
                        payload
                    );

                if (!state) {
                    return;
                }

                if (
                    !mountedRef.current
                ) {
                    return;
                }

                setGameState(
                    state
                );

                const serverMatch =
                    extractMatch(
                        payload
                    );

                if (
                    serverMatch?.matchId
                ) {
                    setMatch(
                        previous => ({
                            ...previous,
                            ...serverMatch,
                        })
                    );

                    matchIdRef.current =
                        serverMatch.matchId;

                    selectedMatchRef.current =
                        serverMatch;
                }

                const currentPlayer =
                    normalizeId(
                        state.currentPlayerId ??
                        state.current_player_id
                    );

                const deadline =
                    state.turnDeadlineAt ??
                    state.turn_deadline_at;

                if (deadline) {

                    const end =
                        new Date(
                            deadline
                        ).getTime();

                    const seconds =
                        Math.max(
                            0,
                            Math.ceil(
                                (
                                    end -
                                    Date.now()
                                ) / 1000
                            )
                        );

                    setRemainingSeconds(
                        seconds
                    );

                } else {

                    setRemainingSeconds(
                        TURN_DURATION_SECONDS
                    );
                }

                if (
                    isFinishedState(
                        state
                    )
                ) {
                    setScreen(
                        SCREENS.RESULT
                    );
                }
                else if (
                    isPlayingState(
                        state
                    ) &&
                    rulesAcceptedRef.current
                ) {
                    setScreen(
                        SCREENS.PLAYING
                    );
                }

                if (
                    normalizeId(
                        state.winnerId ??
                        state.winner_player_id
                    ) ||
                    state.finished === true
                ) {
                    setScreen(
                        SCREENS.RESULT
                    );
                }

                setSelectedPawnId(
                    null
                );

                return currentPlayer;

            },
            []
        );


    // ========================================================
    // RÉSULTAT SERVEUR
    // ========================================================

    const applyServerResult =
        useCallback(
            payload => {

                const serverResult =
                    extractResult(
                        payload
                    );

                if (
                    !serverResult
                ) {
                    return;
                }

                const currentMatch =
                    selectedMatchRef.current ||
                    match;

                const winnerId =
                    normalizeId(
                        serverResult.winnerId ??
                        serverResult.winner_player_id
                    );

                const currentUserId =
                    normalizeId(
                        userId
                    );

                const stakeAmount =
                    Number(
                        currentMatch?.stake ??
                        0
                    ) || 0;

                const pot =
                    stakeAmount *
                    2;

                const winnerAmount =
                    Number(
                        serverResult.winnerAmount ??
                        serverResult.payout ??
                        serverResult.prize ??
                        serverResult.gain
                    );

                const isWinner =
                    winnerId !== null &&
                    currentUserId !== null &&
                    winnerId ===
                        currentUserId;

                const isLoser =
                    winnerId !== null &&
                    currentUserId !== null &&
                    winnerId !==
                        currentUserId;

                setResult({
                    ...serverResult,
                    winnerId,
                    stake: stakeAmount,
                    pot,
                    winnerAmount:
                        Number.isFinite(
                            winnerAmount
                        )
                            ? winnerAmount
                            : null,
                    isWinner,
                    isLoser,
                    opponentName:
                        getOpponentName(
                            currentMatch,
                            currentUserId
                        ),
                });

                setScreen(
                    SCREENS.RESULT
                );

                resultHandledRef.current =
                    true;

            },
            [
                match,
                userId,
            ]
        );


    // ========================================================
    // SOCKET EVENTS
    // ========================================================

    useEffect(() => {

        mountedRef.current =
            true;

        const socket =
            getRawLudoSocket();

        const handlers = [];

        const register =
            (
                event,
                handler
            ) => {

                if (
                    socket &&
                    typeof socket.on ===
                        "function"
                ) {
                    socket.on(
                        event,
                        handler
                    );

                    handlers.push({
                        event,
                        handler,
                    });
                }
            };

        // ----------------------------------------------------
        // ÉTAT
        // ----------------------------------------------------

        register(
            "ludo:stateUpdate",
            payload => {
                applyServerState(
                    payload
                );
            }
        );

        register(
            "ludo:state",
            payload => {
                applyServerState(
                    payload
                );
            }
        );

        // ----------------------------------------------------
        // JOIN
        // ----------------------------------------------------

        register(
            "ludo:joined",
            payload => {

                const joinedMatch =
                    extractMatch(
                        payload
                    );

                if (
                    joinedMatch?.matchId
                ) {
                    registerCurrentMatch(
                        joinedMatch
                    );
                }

                const state =
                    extractState(
                        payload
                    );

                if (state) {
                    applyServerState(
                        payload
                    );
                }
            }
        );

        // ----------------------------------------------------
        // START
        // ----------------------------------------------------

        register(
            "ludo:gameStarted",
            payload => {

                const state =
                    extractState(
                        payload
                    );

                if (state) {
                    applyServerState(
                        payload
                    );
                }

                if (
                    rulesAcceptedRef.current
                ) {
                    setScreen(
                        SCREENS.PLAYING
                    );
                }
            }
        );

        // ----------------------------------------------------
        // ROLL
        // ----------------------------------------------------

        register(
            "ludo:rollResult",
            payload => {

                setDiceRolling(
                    false
                );

                const state =
                    extractState(
                        payload
                    );

                if (state) {
                    applyServerState(
                        payload
                    );
                }
            }
        );

        // ----------------------------------------------------
        // MOVE
        // ----------------------------------------------------

        register(
            "ludo:moveResult",
            payload => {

                const state =
                    extractState(
                        payload
                    );

                if (state) {
                    applyServerState(
                        payload
                    );
                }

                const resultPayload =
                    extractResult(
                        payload
                    );

                if (
                    resultPayload?.finished
                ) {
                    applyServerResult(
                        resultPayload
                    );
                }
            }
        );

        // ----------------------------------------------------
        // FIN
        // ----------------------------------------------------

        register(
            "ludo:gameFinished",
            payload => {

                applyServerResult(
                    payload
                );
            }
        );

        // ----------------------------------------------------
        // TIMEOUT
        // ----------------------------------------------------

        register(
            "ludo:timeout",
            payload => {

                applyServerState(
                    payload
                );

                applyServerResult(
                    payload
                );
            }
        );

        // ----------------------------------------------------
        // BOT
        // ----------------------------------------------------

        register(
            "ludo:botResult",
            payload => {

                const state =
                    extractState(
                        payload
                    );

                if (state) {
                    applyServerState(
                        payload
                    );
                }

                const resultPayload =
                    extractResult(
                        payload
                    );

                if (
                    resultPayload?.finished
                ) {
                    applyServerResult(
                        resultPayload
                    );
                }
            }
        );

        // ----------------------------------------------------
        // ERREUR
        // ----------------------------------------------------

        register(
            "ludo:error",
            payload => {

                setDiceRolling(
                    false
                );

                setError(
                    payload?.message ??
                    payload?.error ??
                    "Une erreur Ludo est survenue."
                );
            }
        );

        // ----------------------------------------------------
        // JOUEUR PARTI
        // ----------------------------------------------------

        register(
            "ludo:playerLeft",
            payload => {

                setNotice(
                    payload?.message ??
                    "L'adversaire a quitté la partie."
                );
            }
        );

        return () => {

            mountedRef.current =
                false;

            const currentSocket =
                getRawLudoSocket();

            if (
                currentSocket &&
                typeof currentSocket.off ===
                    "function"
            ) {

                for (
                    const item of handlers
                ) {
                    currentSocket.off(
                        item.event,
                        item.handler
                    );
                }
            }
        };

    }, [
        applyServerResult,
        applyServerState,
        registerCurrentMatch,
    ]);


    // ========================================================
    // COMPTEUR TOUR
    // ========================================================

    useEffect(() => {

        if (
            screen !==
            SCREENS.PLAYING
        ) {
            return undefined;
        }

        const timer =
            window.setInterval(
                () => {

                    setRemainingSeconds(
                        previous =>
                            Math.max(
                                0,
                                previous - 1
                            )
                    );

                },
                1000
            );

        return () =>
            window.clearInterval(
                timer
            );

    }, [
        screen,
    ]);


    // ========================================================
    // TIMEOUT VISUEL
    //
    // Le vrai timeout reste serveur.
    // Le frontend ne termine jamais la partie lui-même.
    // ========================================================

    useEffect(() => {

        if (
            remainingSeconds >
            0
        ) {
            return;
        }

        if (
            screen !==
            SCREENS.PLAYING
        ) {
            return;
        }

        const id =
            matchIdRef.current;

        if (!id) {
            return;
        }

        requestLudoState(
            id
        );

    }, [
        remainingSeconds,
        screen,
    ]);


    // ========================================================
    // CHARGEMENT PARTIES DISPONIBLES
    // ========================================================

    const loadLobbyMatches =
        useCallback(
            async () => {

                try {

                    const data =
                        await getSacMatches(
                            GAME
                        );

                    const list =
                        Array.isArray(
                            data
                        )
                            ? data
                            : (
                                data?.matches ??
                                data?.data ??
                                []
                            );

                    const normalized =
                        list
                            .map(
                                normalizeMatch
                            )
                            .filter(
                                item =>
                                    item.matchId
                            );

                    setMatches(
                        normalized
                    );

                } catch (
                    requestError
                ) {

                    console.error(
                        "❌ LUDO LIST MATCHES:",
                        requestError
                    );

                    setError(
                        requestError?.message ??
                        "Impossible de charger les parties Ludo."
                    );
                }

            },
            []
        );


    // ========================================================
    // CHARGEMENT PARTIES ACTIVES
    //
    // Les identifiants connus sont conservés dans la session.
    // Chaque partie est ensuite relue via SAC GET MATCH.
    // ========================================================

    const loadActiveMatches =
        useCallback(
            async () => {

                const ids =
                    getStoredIds(
                        ACTIVE_MATCH_STORAGE_KEY
                    );

                if (
                    !ids.length
                ) {
                    setActiveMatches(
                        []
                    );

                    return;
                }

                const loaded =
                    [];

                for (
                    const id of ids
                ) {

                    try {

                        const data =
                            await getSacMatch(
                                id
                            );

                        const current =
                            normalizeMatch(
                                data
                            );

                        if (
                            current.matchId &&
                            current.status !==
                                MATCH_STATUS.FINISHED &&
                            current.status !==
                                MATCH_STATUS.ABORTED
                        ) {
                            loaded.push(
                                current
                            );
                        }
                        else {
                            forgetMatch(
                                id
                            );
                        }

                    } catch (
                        requestError
                    ) {

                        console.warn(
                            "Ludo active match unavailable:",
                            id,
                            requestError
                        );
                    }
                }

                setActiveMatches(
                    loaded
                );

            },
            []
        );


    // ========================================================
    // INITIALISATION LOBBY
    // ========================================================

    useEffect(() => {

        loadLobbyMatches();
        loadActiveMatches();

        const timer =
            window.setInterval(
                () => {
                    loadLobbyMatches();
                    loadActiveMatches();
                },
                5000
            );

        return () =>
            window.clearInterval(
                timer
            );

    }, [
        loadLobbyMatches,
        loadActiveMatches,
    ]);


    // ========================================================
    // CRÉER UNE PARTIE
    // ========================================================

    const createMatch =
        useCallback(
            async () => {

                if (!userId) {

                    setError(
                        "Vous devez être connecté pour créer une partie."
                    );

                    return;
                }

                const numericStake =
                    Number(stake);

                if (
                    mode !==
                        MODES.TRAINING &&
                    (
                        !Number.isFinite(
                            numericStake
                        ) ||
                        numericStake <
                            MIN_STAKE ||
                        numericStake >
                            MAX_STAKE
                    )
                ) {

                    setError(
                        `La mise doit être comprise entre ${formatMoney(MIN_STAKE)} FC et ${formatMoney(MAX_STAKE)} FC.`
                    );

                    return;
                }

                try {

                    setLoading(
                        true
                    );

                    setError("");

                    setNotice("");

                    const response =
                        await createSacMatch({
                            game: mode,
                            stake:
                                mode ===
                                MODES.TRAINING
                                    ? 0
                                    : numericStake,
                        });

                    const created =
                        normalizeMatch(
                            response
                        );

                    registerCurrentMatch(
                        created
                    );

                    setGameState(
                        null
                    );

                    setResult(
                        null
                    );

                    resultHandledRef.current =
                        false;

                    rulesAcceptedRef.current =
                        false;

                    setRulesAccepted(
                        false
                    );

                    // ------------------------------------------------
                    // Connexion socket
                    // ------------------------------------------------

                    connectLudo();

                    joinLudo(
                        created.matchId,
                        userId
                    );

                    requestLudoState(
                        created.matchId
                    );

                    // ------------------------------------------------
                    // AI / TRAINING
                    //
                    // Le service backend crée déjà la partie
                    // techniquement en PLAYING.
                    //
                    // L'interface garde toutefois l'écran des règles
                    // avant d'autoriser le jeu.
                    // ------------------------------------------------

                    if (
                        mode === MODES.AI ||
                        mode ===
                            MODES.TRAINING
                    ) {

                        setScreen(
                            SCREENS.RULES
                        );

                    } else {

                        setScreen(
                            SCREENS.WAITING
                        );
                    }

                } catch (
                    requestError
                ) {

                    console.error(
                        "❌ LUDO CREATE:",
                        requestError
                    );

                    setError(
                        requestError?.message ??
                        "Impossible de créer la partie Ludo."
                    );

                } finally {

                    setLoading(
                        false
                    );
                }

            },
            [
                mode,
                registerCurrentMatch,
                stake,
                userId,
            ]
        );


    // ========================================================
    // REJOINDRE UNE PARTIE
    // ========================================================

    const joinMatch =
        useCallback(
            async currentMatch => {

                if (!userId) {

                    setError(
                        "Vous devez être connecté pour rejoindre une partie."
                    );

                    return;
                }

                const id =
                    normalizeId(
                        currentMatch?.matchId ??
                        currentMatch?.id
                    );

                if (!id) {

                    setError(
                        "Identifiant de partie invalide."
                    );

                    return;
                }

                try {

                    setLoading(
                        true
                    );

                    setError("");

                    const response =
                        await joinSacMatch({
                            game: GAME,
                            matchId: id,
                        });

                    const joined =
                        normalizeMatch(
                            response
                        );

                    registerCurrentMatch(
                        joined
                    );

                    setGameState(
                        null
                    );

                    setResult(
                        null
                    );

                    resultHandledRef.current =
                        false;

                    rulesAcceptedRef.current =
                        false;

                    setRulesAccepted(
                        false
                    );

                    connectLudo();

                    joinLudo(
                        id,
                        userId
                    );

                    requestLudoState(
                        id
                    );

                    setScreen(
                        SCREENS.RULES
                    );

                } catch (
                    requestError
                ) {

                    console.error(
                        "❌ LUDO JOIN:",
                        requestError
                    );

                    setError(
                        requestError?.message ??
                        "Impossible de rejoindre cette partie."
                    );

                } finally {

                    setLoading(
                        false
                    );
                }

            },
            [
                registerCurrentMatch,
                userId,
            ]
        );


    // ========================================================
    // REPRENDRE UNE PARTIE
    // ========================================================

    const resumeMatch =
        useCallback(
            async currentMatch => {

                const normalized =
                    normalizeMatch(
                        currentMatch
                    );

                if (
                    !normalized.matchId
                ) {
                    return;
                }

                try {

                    setLoading(
                        true
                    );

                    setError("");

                    registerCurrentMatch(
                        normalized
                    );

                    const accepted =
                        isRulesAccepted(
                            normalized.matchId
                        );

                    rulesAcceptedRef.current =
                        accepted;

                    setRulesAccepted(
                        accepted
                    );

                    connectLudo();

                    joinLudo(
                        normalized.matchId,
                        userId
                    );

                    restoreLudo(
                        normalized.matchId,
                        userId
                    );

                    requestLudoState(
                        normalized.matchId
                    );

                    if (
                        accepted &&
                        isPlayingState(
                            normalized
                        )
                    ) {
                        setScreen(
                            SCREENS.PLAYING
                        );
                    }
                    else if (
                        normalized.status ===
                            MATCH_STATUS.WAITING
                    ) {
                        setScreen(
                            SCREENS.WAITING
                        );
                    }
                    else {
                        setScreen(
                            SCREENS.RULES
                        );
                    }

                } catch (
                    requestError
                ) {

                    console.error(
                        "❌ LUDO RESUME:",
                        requestError
                    );

                    setError(
                        requestError?.message ??
                        "Impossible de reprendre la partie."
                    );

                } finally {

                    setLoading(
                        false
                    );
                }

            },
            [
                registerCurrentMatch,
                userId,
            ]
        );


    // ========================================================
    // ACCEPTER LES RÈGLES
    // ========================================================

    const acceptRules =
        useCallback(
            async () => {

                const id =
                    matchIdRef.current;

                if (!id) {

                    setError(
                        "Aucune partie sélectionnée."
                    );

                    return;
                }

                rememberRulesAccepted(
                    id
                );

                rulesAcceptedRef.current =
                    true;

                setRulesAccepted(
                    true
                );

                // ------------------------------------------------
                // AI / TRAINING
                //
                // Le backend a déjà démarré techniquement le moteur.
                // On débloque simplement l'interface.
                // ------------------------------------------------

                if (
                    mode === MODES.AI ||
                    mode ===
                        MODES.TRAINING
                ) {

                    connectLudo();

                    joinLudo(
                        id,
                        userId
                    );

                    requestLudoState(
                        id
                    );

                    setScreen(
                        SCREENS.PLAYING
                    );

                    return;
                }

                // ------------------------------------------------
                // USER
                //
                // Une fois les deux joueurs présents, le SAC peut
                // démarrer techniquement le match.
                // ------------------------------------------------

                try {

                    setLoading(
                        true
                    );

                    const current =
                        selectedMatchRef.current ||
                        match;

                    const player2 =
                        normalizeId(
                            current?.player2Id ??
                            current?.player2_id
                        );

                    if (
                        player2
                    ) {

                        try {

                            await api.post(
                                `/sac/matches/${id}/start`
                            );

                        } catch (
                            startError
                        ) {

                            // Si le backend socket est maître du
                            // démarrage, on laisse également l'événement
                            // ludo:start prendre le relais.

                            console.warn(
                                "Ludo API start fallback:",
                                startError
                            );

                            startLudo(
                                id,
                                userId
                            );
                        }

                        connectLudo();

                        joinLudo(
                            id,
                            userId
                        );

                        requestLudoState(
                            id
                        );

                        setScreen(
                            SCREENS.PLAYING
                        );

                    } else {

                        setScreen(
                            SCREENS.WAITING
                        );
                    }

                } catch (
                    requestError
                ) {

                    console.error(
                        "❌ LUDO ACCEPT RULES:",
                        requestError
                    );

                    setError(
                        requestError?.message ??
                        "Impossible de démarrer la partie."
                    );

                } finally {

                    setLoading(
                        false
                    );
                }

            },
            [
                match,
                mode,
                userId,
            ]
        );


    // ========================================================
    // LANCER LE DÉ
    // ========================================================

    const rollDice =
        useCallback(
            () => {

                const id =
                    matchIdRef.current;

                if (!id) {
                    return;
                }

                if (
                    !rulesAcceptedRef.current
                ) {

                    setError(
                        "Vous devez accepter les règles avant de jouer."
                    );

                    return;
                }

                const currentPlayerId =
                    normalizeId(
                        gameState?.currentPlayerId ??
                        gameState?.current_player_id
                    );

                if (
                    currentPlayerId !==
                    normalizeId(userId)
                ) {

                    setError(
                        "Ce n'est pas votre tour."
                    );

                    return;
                }

                const dice =
                    gameState?.dice;

                if (
                    dice?.rolled
                ) {

                    setError(
                        "Le dé a déjà été lancé pour ce tour."
                    );

                    return;
                }

                setDiceRolling(
                    true
                );

                setSelectedPawnId(
                    null
                );

                // ------------------------------------------------
                // Animation purement visuelle.
                // La vraie valeur vient du serveur.
                // ------------------------------------------------

                let animationStep = 0;

                const animation =
                    window.setInterval(
                        () => {

                            animationStep += 1;

                            setDiceAnimationValue(
                                (
                                    animationStep %
                                    6
                                ) + 1
                            );

                            if (
                                animationStep >=
                                10
                            ) {

                                window.clearInterval(
                                    animation
                                );
                            }

                        },
                        70
                    );

                rollLudoDice(
                    id,
                    userId
                );

            },
            [
                gameState,
                userId,
            ]
        );


    // ========================================================
    // DÉPLACER UN PION
    // ========================================================

    const movePawn =
        useCallback(
            pawnId => {

                const id =
                    matchIdRef.current;

                if (!id) {
                    return;
                }

                if (
                    !rulesAcceptedRef.current
                ) {
                    return;
                }

                const legalPawnIds =
                    (
                        gameState?.legalPawnIds ||
                        []
                    ).map(
                        String
                    );

                if (
                    !legalPawnIds.includes(
                        String(pawnId)
                    )
                ) {

                    setError(
                        "Ce pion n'est pas disponible pour ce lancer."
                    );

                    return;
                }

                setSelectedPawnId(
                    pawnId
                );

                moveLudoPawn(
                    id,
                    userId,
                    pawnId
                );

            },
            [
                gameState,
                userId,
            ]
        );


    // ========================================================
    // CLIC PION
    // ========================================================

    const handlePawnClick =
        useCallback(
            pawn => {

                if (!pawn) {
                    return;
                }

                const legalPawnIds =
                    (
                        gameState?.legalPawnIds ||
                        []
                    ).map(
                        String
                    );

                if (
                    !legalPawnIds.includes(
                        String(pawn.id)
                    )
                ) {
                    return;
                }

                movePawn(
                    pawn.id
                );

            },
            [
                gameState,
                movePawn,
            ]
        );


    // ========================================================
    // RETOUR ACCUEIL
    // ========================================================

    const goHome =
        useCallback(
            () => {

                const id =
                    matchIdRef.current;

                if (id) {

                    leaveLudo(
                        id,
                        userId
                    );
                }

                disconnectLudo();

                matchIdRef.current =
                    null;

                selectedMatchRef.current =
                    null;

                setMatch(
                    null
                );

                setGameState(
                    null
                );

                setResult(
                    null
                );

                setScreen(
                    SCREENS.LOBBY
                );

                if (
                    typeof onHome ===
                        "function"
                ) {
                    onHome();

                    return;
                }

                if (
                    typeof setPage ===
                        "function"
                ) {
                    setPage(
                        "accueil"
                    );

                    return;
                }

                if (
                    typeof onBack ===
                        "function"
                ) {
                    onBack();
                }

            },
            [
                onBack,
                onHome,
                setPage,
                userId,
            ]
        );


    // ========================================================
    // NETTOYAGE AU DÉMONTAGE
    // ========================================================

    useEffect(() => {

        return () => {

            const id =
                matchIdRef.current;

            if (id) {

                try {
                    leaveLudo(
                        id,
                        userId
                    );
                } catch {
                    // nettoyage silencieux
                }
            }

            try {
                disconnectLudo();
            } catch {
                // nettoyage silencieux
            }

        };

    }, [
        userId,
    ]);


    // ========================================================
    // RÉSULTAT : RÈGLEMENT SAC
    //
    // Le frontend demande seulement le règlement.
    // Le serveur reste maître du calcul financier.
    // ========================================================

    useEffect(() => {

        if (
            screen !==
                SCREENS.RESULT ||
            !matchIdRef.current ||
            !result
        ) {
            return;
        }

        const settle =
            async () => {

                try {

                    await api.post(
                        `/sac/matches/${matchIdRef.current}/settle`,
                        {
                            userId,
                        }
                    );

                } catch (
                    settleError
                ) {

                    console.error(
                        "❌ LUDO SETTLEMENT:",
                        settleError
                    );

                    // Le résultat technique reste affiché.
                    // Le règlement financier est traité par le SAC.
                }
            };

        settle();

    }, [
        result,
        screen,
        userId,
    ]);


    // ========================================================
    // DERNIER DÉ
    // ========================================================

    const diceValue =
        Number(
            gameState?.dice?.value
        ) ||
        diceAnimationValue ||
        null;


    // ========================================================
    // LEGAL PAWNS
    // ========================================================

    const legalPawnIds =
        useMemo(
            () =>
                (
                    gameState?.legalPawnIds ||
                    []
                ).map(
                    String
                ),
            [
                gameState?.legalPawnIds,
            ]
        );


    // ========================================================
    // PIONS
    // ========================================================

    const pawns =
        useMemo(
            () =>
                Array.isArray(
                    gameState?.pawns
                )
                    ? gameState.pawns
                    : [],
            [
                gameState?.pawns,
            ]
        );


    // ========================================================
    // JOUEUR COURANT
    // ========================================================

    const currentPlayerId =
        normalizeId(
            gameState?.currentPlayerId ??
            gameState?.current_player_id
        );


    const isMyTurn =
        currentPlayerId !== null &&
        currentPlayerId ===
            normalizeId(userId);


    // ========================================================
    // NOMS JOUEURS
    // ========================================================

    const player1Name =
        normalizeString(
            match?.player1Name ??
            match?.creatorName,
            match?.player1Id
                ? `Joueur #${match.player1Id}`
                : "Joueur 1"
        );

    const player2Name =
        normalizeString(
            match?.player2Name ??
            match?.opponentName,
            match?.player2Id ===
                AI_ID
                ? "Ludo IA"
                : match?.player2Id
                    ? `Joueur #${match.player2Id}`
                    : "Adversaire"
        );


    // ========================================================
    // POT
    // ========================================================

    const stakeAmount =
        Number(
            match?.stake
        ) || 0;

    const totalPot =
        stakeAmount * 2;


    // ========================================================
    // MODE LABEL
    // ========================================================

    const modeLabel =
        mode === MODES.USER
            ? "Joueur vs Joueur"
            : mode === MODES.AI
                ? "Joueur vs IA"
                : "Entraînement";


    // ========================================================
    // RENDER
    // ========================================================

    return (
        <div
            className={
                "ludo-page"
            }
        >

            {/* =================================================
                HEADER
            ================================================= */}

            <header
                className={
                    "ludo-header"
                }
            >

                <div
                    className={
                        "ludo-header-brand"
                    }
                >

                    <button
                        type="button"
                        className={
                            "ludo-back-button"
                        }
                        onClick={
                            goHome
                        }
                    >
                        ←
                    </button>

                    <div>
                        <div
                            className={
                                "ludo-title"
                            }
                        >
                            Ludo
                        </div>

                        <div
                            className={
                                "ludo-subtitle"
                            }
                        >
                            6BetBall
                        </div>
                    </div>

                </div>

                {screen !==
                    SCREENS.LOBBY && (
                    <div
                        className={
                            "ludo-header-match"
                        }
                    >

                        <span>
                            Match #
                            {
                                match?.matchId ??
                                "—"
                            }
                        </span>

                        {match?.mode && (
                            <span
                                className={
                                    "ludo-mode-badge"
                                }
                            >
                                {
                                    match.mode ===
                                    MODES.USER
                                        ? "USER"
                                        : match.mode ===
                                            MODES.AI
                                            ? "IA"
                                            : "TRAINING"
                                }
                            </span>
                        )}

                    </div>
                )}

            </header>


            {/* =================================================
                MESSAGE
            ================================================= */}

            {(error || notice) && (
                <div
                    className={
                        error
                            ? "ludo-alert ludo-alert-error"
                            : "ludo-alert ludo-alert-info"
                    }
                >
                    {error || notice}
                </div>
            )}


            {/* =================================================
                LOBBY
            ================================================= */}

            {screen ===
                SCREENS.LOBBY && (

                <main
                    className={
                        "ludo-lobby"
                    }
                >

                    <section
                        className={
                            "ludo-hero"
                        }
                    >

                        <div>
                            <span
                                className={
                                    "ludo-eyebrow"
                                }
                            >
                                SAC GAME
                            </span>

                            <h1>
                                Ludo
                            </h1>

                            <p>
                                Affrontez un joueur,
                                défiez le Bot ou
                                entraînez-vous gratuitement.
                            </p>
                        </div>

                    </section>


                    {/* =========================================
                        CRÉATION
                    ========================================= */}

                    <section
                        className={
                            "ludo-create-card"
                        }
                    >

                        <div
                            className={
                                "ludo-section-heading"
                            }
                        >
                            <div>
                                <span>
                                    Nouvelle partie
                                </span>

                                <h2>
                                    Choisir votre mode
                                </h2>
                            </div>
                        </div>


                        <div
                            className={
                                "ludo-mode-grid"
                            }
                        >

                            {/* USER */}

                            <button
                                type="button"
                                className={
                                    mode ===
                                    MODES.USER
                                        ? "ludo-mode-card active"
                                        : "ludo-mode-card"
                                }
                                onClick={() =>
                                    setMode(
                                        MODES.USER
                                    )
                                }
                            >

                                <span
                                    className={
                                        "ludo-mode-icon"
                                    }
                                >
                                    👥
                                </span>

                                <strong>
                                    Joueur
                                </strong>

                                <small>
                                    Joueur vs joueur
                                </small>

                            </button>


                            {/* AI */}

                            <button
                                type="button"
                                className={
                                    mode ===
                                    MODES.AI
                                        ? "ludo-mode-card active"
                                        : "ludo-mode-card"
                                }
                                onClick={() =>
                                    setMode(
                                        MODES.AI
                                    )
                                }
                            >

                                <span
                                    className={
                                        "ludo-mode-icon"
                                    }
                                >
                                    🤖
                                </span>

                                <strong>
                                    IA
                                </strong>

                                <small>
                                    Partie avec mise
                                </small>

                            </button>


                            {/* TRAINING */}

                            <button
                                type="button"
                                className={
                                    mode ===
                                    MODES.TRAINING
                                        ? "ludo-mode-card active"
                                        : "ludo-mode-card"
                                }
                                onClick={() =>
                                    setMode(
                                        MODES.TRAINING
                                    )
                                }
                            >

                                <span
                                    className={
                                        "ludo-mode-icon"
                                    }
                                >
                                    🎯
                                </span>

                                <strong>
                                    Entraînement
                                </strong>

                                <small>
                                    Gratuit
                                </small>

                            </button>

                        </div>


                        {/* =====================================
                            MISE
                        ===================================== */}

                        {mode !==
                            MODES.TRAINING && (

                            <div
                                className={
                                    "ludo-stake-section"
                                }
                            >

                                <label>
                                    Mise de la partie
                                </label>

                                <div
                                    className={
                                        "ludo-stake-input"
                                    }
                                >

                                    <input
                                        type="number"
                                        min={
                                            MIN_STAKE
                                        }
                                        max={
                                            MAX_STAKE
                                        }
                                        step="100"
                                        value={
                                            stake
                                        }
                                        onChange={
                                            event =>
                                                setStake(
                                                    event.target.value
                                                )
                                        }
                                    />

                                    <span>
                                        FC
                                    </span>

                                </div>

                                <small>
                                    Minimum :
                                    {" "}
                                    {
                                        formatMoney(
                                            MIN_STAKE
                                        )
                                    }
                                    {" "}
                                    FC
                                </small>

                            </div>
                        )}


                        {mode ===
                            MODES.TRAINING && (

                            <div
                                className={
                                    "ludo-training-info"
                                }
                            >
                                🎯 Mode entraînement :
                                aucune mise n'est prélevée.
                            </div>
                        )}


                        <button
                            type="button"
                            className={
                                "ludo-primary-button"
                            }
                            disabled={
                                loading
                            }
                            onClick={
                                createMatch
                            }
                        >
                            {loading
                                ? "Création..."
                                : "Créer la partie"}
                        </button>

                    </section>


                    {/* =========================================
                        PARTIES DISPONIBLES
                    ========================================= */}

                    <section
                        className={
                            "ludo-list-section"
                        }
                    >

                        <div
                            className={
                                "ludo-section-heading"
                            }
                        >

                            <div>
                                <span>
                                    Lobby
                                </span>

                                <h2>
                                    Parties disponibles
                                </h2>
                            </div>

                            <button
                                type="button"
                                className={
                                    "ludo-refresh-button"
                                }
                                onClick={
                                    loadLobbyMatches
                                }
                            >
                                ↻ Actualiser
                            </button>

                        </div>


                        {!matches.length && (

                            <div
                                className={
                                    "ludo-empty-state"
                                }
                            >
                                <div>
                                    🎲
                                </div>

                                <strong>
                                    Aucune partie disponible
                                </strong>

                                <span>
                                    Créez une partie
                                    ou revenez dans
                                    quelques secondes.
                                </span>
                            </div>

                        )}


                        <div
                            className={
                                "ludo-match-list"
                            }
                        >

                            {matches.map(
                                currentMatch => {

                                    const creator =
                                        normalizeString(
                                            currentMatch.player1Name,
                                            currentMatch.player1Id
                                                ? `Joueur #${currentMatch.player1Id}`
                                                : "Joueur"
                                        );

                                    const matchStake =
                                        Number(
                                            currentMatch.stake
                                        ) || 0;

                                    return (
                                        <article
                                            className={
                                                "ludo-match-card"
                                            }
                                            key={
                                                currentMatch.matchId
                                            }
                                        >

                                            <div
                                                className={
                                                    "ludo-match-card-main"
                                                }
                                            >

                                                <div
                                                    className={
                                                        "ludo-match-game-icon"
                                                    }
                                                >
                                                    🎲
                                                </div>

                                                <div>

                                                    <strong>
                                                        Match Ludo{" "}
                                                        {
                                                            formatMoney(
                                                                matchStake
                                                            )
                                                        } FC
                                                    </strong>

                                                    <span>
                                                        {
                                                            creator
                                                        }
                                                        {" "}
                                                        vs{" "}
                                                        ...
                                                    </span>

                                                    <small>
                                                        Créée le{" "}
                                                        {
                                                            formatDate(
                                                                currentMatch.created_at ??
                                                                currentMatch.createdAt
                                                            )
                                                        }
                                                    </small>

                                                </div>

                                            </div>


                                            <div
                                                className={
                                                    "ludo-match-card-right"
                                                }
                                            >

                                                <span
                                                    className={
                                                        "ludo-waiting-badge"
                                                    }
                                                >
                                                    En attente
                                                </span>

                                                <button
                                                    type="button"
                                                    className={
                                                        "ludo-secondary-button"
                                                    }
                                                    disabled={
                                                        loading
                                                    }
                                                    onClick={() =>
                                                        joinMatch(
                                                            currentMatch
                                                        )
                                                    }
                                                >
                                                    Rejoindre
                                                </button>

                                            </div>

                                        </article>
                                    );
                                }
                            )}

                        </div>

                    </section>


                    {/* =========================================
                        MES PARTIES
                    ========================================= */}

                    <section
                        className={
                            "ludo-list-section"
                        }
                    >

                        <div
                            className={
                                "ludo-section-heading"
                            }
                        >

                            <div>
                                <span>
                                    Mon espace
                                </span>

                                <h2>
                                    Mes parties actives
                                </h2>
                            </div>

                            <button
                                type="button"
                                className={
                                    "ludo-refresh-button"
                                }
                                onClick={
                                    loadActiveMatches
                                }
                            >
                                ↻
                            </button>

                        </div>


                        {!activeMatches.length && (

                            <div
                                className={
                                    "ludo-empty-state compact"
                                }
                            >
                                <strong>
                                    Aucune partie active
                                </strong>

                                <span>
                                    Vos parties créées ou
                                    rejointes apparaîtront ici.
                                </span>
                            </div>

                        )}


                        <div
                            className={
                                "ludo-active-list"
                            }
                        >

                            {activeMatches.map(
                                currentMatch => {

                                    const isReady =
                                        currentMatch.status ===
                                            MATCH_STATUS.PLAYING ||
                                        currentMatch.status ===
                                            MATCH_STATUS.STARTING;

                                    const opponent =
                                        currentMatch.player2Id ===
                                            AI_ID
                                            ? "Ludo IA"
                                            : normalizeString(
                                                currentMatch.player2Name,
                                                currentMatch.player2Id
                                                    ? `Joueur #${currentMatch.player2Id}`
                                                    : "Adversaire"
                                            );

                                    return (
                                        <article
                                            className={
                                                "ludo-active-card"
                                            }
                                            key={
                                                currentMatch.matchId
                                            }
                                        >

                                            <div>

                                                <strong>
                                                    {
                                                        player1Name
                                                    }
                                                    {" "}
                                                    vs{" "}
                                                    {
                                                        opponent
                                                    }
                                                </strong>

                                                <span>
                                                    Mise :
                                                    {" "}
                                                    {
                                                        formatMoney(
                                                            currentMatch.stake
                                                        )
                                                    }
                                                    {" "}
                                                    FC
                                                </span>

                                            </div>


                                            <button
                                                type="button"
                                                className={
                                                    "ludo-secondary-button"
                                                }
                                                onClick={() =>
                                                    resumeMatch(
                                                        currentMatch
                                                    )
                                                }
                                            >
                                                {isReady
                                                    ? "Jouer"
                                                    : "Reprendre"}
                                            </button>

                                        </article>
                                    );
                                }
                            )}

                        </div>

                    </section>

                </main>
            )}


            {/* =================================================
                WAITING
            ================================================= */}

            {screen ===
                SCREENS.WAITING && (

                <main
                    className={
                        "ludo-waiting-screen"
                    }
                >

                    <section
                        className={
                            "ludo-waiting-card"
                        }
                    >

                        <div
                            className={
                                "ludo-waiting-animation"
                            }
                        >
                            🎲
                        </div>

                        <span
                            className={
                                "ludo-eyebrow"
                            }
                        >
                            MATCH LUDO
                        </span>

                        <h1>
                            En attente de l'adversaire
                        </h1>

                        <p>
                            Votre partie est créée.
                            Nous attendons qu'un autre
                            joueur la rejoigne.
                        </p>

                        <div
                            className={
                                "ludo-match-summary"
                            }
                        >

                            <div>
                                <span>
                                    Joueur
                                </span>

                                <strong>
                                    {
                                        userName
                                    }
                                </strong>
                            </div>

                            <div>
                                <span>
                                    Mise
                                </span>

                                <strong>
                                    {
                                        formatMoney(
                                            stakeAmount
                                        )
                                    }
                                    {" "}
                                    FC
                                </strong>
                            </div>

                            <div>
                                <span>
                                    Cagnotte prévue
                                </span>

                                <strong>
                                    {
                                        formatMoney(
                                            totalPot
                                        )
                                    }
                                    {" "}
                                    FC
                                </strong>
                            </div>

                        </div>


                        <div
                            className={
                                "ludo-waiting-status"
                            }
                        >
                            <span
                                className={
                                    "ludo-status-dot"
                                }
                            />

                            Partie ouverte
                        </div>


                        <button
                            type="button"
                            className={
                                "ludo-secondary-button"
                            }
                            onClick={
                                goHome
                            }
                        >
                            Retour au lobby
                        </button>

                    </section>

                </main>
            )}


            {/* =================================================
                RÈGLES
            ================================================= */}

            {screen ===
                SCREENS.RULES && (

                <main
                    className={
                        "ludo-rules-screen"
                    }
                >

                    <section
                        className={
                            "ludo-rules-card"
                        }
                    >

                        <div
                            className={
                                "ludo-rules-header"
                            }
                        >

                            <span
                                className={
                                    "ludo-eyebrow"
                                }
                            >
                                AVANT DE JOUER
                            </span>

                            <h1>
                                Règles du Ludo
                            </h1>

                            <p>
                                Prenez connaissance des règles
                                avant de commencer la partie.
                            </p>

                        </div>


                        <div
                            className={
                                "ludo-rules-grid"
                            }
                        >

                            <div
                                className={
                                    "ludo-rule"
                                }
                            >
                                <strong>
                                    🎲
                                </strong>

                                <div>
                                    <b>
                                        Le dé
                                    </b>

                                    <span>
                                        Le serveur génère
                                        aléatoirement une valeur
                                        de 1 à 6.
                                    </span>
                                </div>
                            </div>


                            <div
                                className={
                                    "ludo-rule"
                                }
                            >
                                <strong>
                                    6️⃣
                                </strong>

                                <div>
                                    <b>
                                        Sortir de la base
                                    </b>

                                    <span>
                                        Un pion peut sortir
                                        de sa base uniquement
                                        lorsqu'un 6 est obtenu.
                                    </span>
                                </div>
                            </div>


                            <div
                                className={
                                    "ludo-rule"
                                }
                            >
                                <strong>
                                    🔄
                                </strong>

                                <div>
                                    <b>
                                        Six = tour supplémentaire
                                    </b>

                                    <span>
                                        Après un 6, le même
                                        joueur conserve la main.
                                    </span>
                                </div>
                            </div>


                            <div
                                className={
                                    "ludo-rule"
                                }
                            >
                                <strong>
                                    ♟️
                                </strong>

                                <div>
                                    <b>
                                        16 pions
                                    </b>

                                    <span>
                                        4 pions par camp :
                                        Rouge, Jaune,
                                        Bleu et Vert.
                                    </span>
                                </div>
                            </div>


                            <div
                                className={
                                    "ludo-rule"
                                }
                            >
                                <strong>
                                    🏁
                                </strong>

                                <div>
                                    <b>
                                        Victoire
                                    </b>

                                    <span>
                                        Un joueur gagne lorsque
                                        ses 8 pions sont arrivés
                                        à la maison.
                                    </span>
                                </div>
                            </div>


                            <div
                                className={
                                    "ludo-rule"
                                }
                            >
                                <strong>
                                    ⏱️
                                </strong>

                                <div>
                                    <b>
                                        Temps de tour
                                    </b>

                                    <span>
                                        Chaque tour est limité
                                        à 90 secondes.
                                    </span>
                                </div>
                            </div>


                            <div
                                className={
                                    "ludo-rule"
                                }
                            >
                                <strong>
                                    🛡️
                                </strong>

                                <div>
                                    <b>
                                        Cases protégées
                                    </b>

                                    <span>
                                        Les cases de départ
                                        des camps sont protégées.
                                    </span>
                                </div>
                            </div>


                            <div
                                className={
                                    "ludo-rule"
                                }
                            >
                                <strong>
                                    💰
                                </strong>

                                <div>
                                    <b>
                                        Mise
                                    </b>

                                    <span>
                                        En mode payant, chaque
                                        joueur engage sa propre
                                        mise.
                                    </span>
                                </div>
                            </div>

                        </div>


                        <div
                            className={
                                "ludo-rules-footer"
                            }
                        >

                            <label
                                className={
                                    "ludo-checkbox"
                                }
                            >

                                <input
                                    type="checkbox"
                                    checked={
                                        rulesAccepted
                                    }
                                    onChange={
                                        event =>
                                            setRulesAccepted(
                                                event.target.checked
                                            )
                                    }
                                />

                                <span>
                                    J'ai lu et j'accepte
                                    les règles de cette partie.
                                </span>

                            </label>


                            <button
                                type="button"
                                className={
                                    "ludo-primary-button"
                                }
                                disabled={
                                    !rulesAccepted ||
                                    loading
                                }
                                onClick={
                                    acceptRules
                                }
                            >
                                {loading
                                    ? "Préparation..."
                                    : "Accepter et jouer"}
                            </button>

                        </div>

                    </section>

                </main>
            )}


            {/* =================================================
                JEU
            ================================================= */}

            {screen ===
                SCREENS.PLAYING && (

                <main
                    className={
                        "ludo-game-screen"
                    }
                >

                    {/* =========================================
                        BARRE MATCH
                    ========================================= */}

                    <section
                        className={
                            "ludo-match-header"
                        }
                    >

                        <div
                            className={
                                "ludo-player-header player-one"
                            }
                        >

                            <span>
                                Joueur 1
                            </span>

                            <strong>
                                {
                                    player1Name
                                }
                            </strong>

                            {normalizeId(
                                match?.player1Id
                            ) ===
                                currentPlayerId && (
                                <small>
                                    À votre tour
                                </small>
                            )}

                        </div>


                        <div
                            className={
                                "ludo-score-center"
                            }
                        >

                            <span>
                                Mise
                            </span>

                            <strong>
                                {
                                    formatMoney(
                                        stakeAmount
                                    )
                                } FC
                            </strong>

                            <small>
                                Cagnotte{" "}
                                {
                                    formatMoney(
                                        totalPot
                                    )
                                } FC
                            </small>

                        </div>


                        <div
                            className={
                                "ludo-player-header player-two"
                            }
                        >

                            <span>
                                Joueur 2
                            </span>

                            <strong>
                                {
                                    player2Name
                                }
                            </strong>

                            {normalizeId(
                                match?.player2Id
                            ) ===
                                currentPlayerId && (
                                <small>
                                    À votre tour
                                </small>
                            )}

                        </div>

                    </section>


                    {/* =========================================
                        TABLE DE JEU
                    ========================================= */}

                    <section
                        className={
                            "ludo-game-layout"
                        }
                    >

                        <div
                            className={
                                "ludo-board-wrapper"
                            }
                        >

                            <div
                                className={
                                    "ludo-board"
                                }
                            >

                                {/* =================================
                                    QUADRANT ROUGE
                                ================================= */}

                                <div
                                    className={
                                        "ludo-base ludo-base-red"
                                    }
                                >

                                    <div
                                        className={
                                            "ludo-base-title"
                                        }
                                    >
                                        ROUGE
                                    </div>

                                    {pawns
                                        .filter(
                                            pawn =>
                                                pawn.camp ===
                                                CAMPS.RED &&
                                                pawn.state ===
                                                PAWN_STATE.BASE
                                        )
                                        .map(
                                            pawn => {

                                                const position =
                                                    getPawnVisualPosition(
                                                        pawn
                                                    );

                                                return (
                                                    <Pawn
                                                        key={
                                                            pawn.id
                                                        }
                                                        pawn={
                                                            pawn
                                                        }
                                                        position={
                                                            position
                                                        }
                                                        legalPawnIds={
                                                            legalPawnIds
                                                        }
                                                        selectedPawnId={
                                                            selectedPawnId
                                                        }
                                                        onClick={
                                                            handlePawnClick
                                                        }
                                                    />
                                                );
                                            }
                                        )}

                                </div>


                                {/* =================================
                                    QUADRANT VERT
                                ================================= */}

                                <div
                                    className={
                                        "ludo-base ludo-base-green"
                                    }
                                >

                                    <div
                                        className={
                                            "ludo-base-title"
                                        }
                                    >
                                        VERT
                                    </div>

                                    {pawns
                                        .filter(
                                            pawn =>
                                                pawn.camp ===
                                                CAMPS.GREEN &&
                                                pawn.state ===
                                                PAWN_STATE.BASE
                                        )
                                        .map(
                                            pawn => {

                                                const position =
                                                    getPawnVisualPosition(
                                                        pawn
                                                    );

                                                return (
                                                    <Pawn
                                                        key={
                                                            pawn.id
                                                        }
                                                        pawn={
                                                            pawn
                                                        }
                                                        position={
                                                            position
                                                        }
                                                        legalPawnIds={
                                                            legalPawnIds
                                                        }
                                                        selectedPawnId={
                                                            selectedPawnId
                                                        }
                                                        onClick={
                                                            handlePawnClick
                                                        }
                                                    />
                                                );
                                            }
                                        )}

                                </div>


                                {/* =================================
                                    QUADRANT JAUNE
                                ================================= */}

                                <div
                                    className={
                                        "ludo-base ludo-base-yellow"
                                    }
                                >

                                    <div
                                        className={
                                            "ludo-base-title"
                                        }
                                    >
                                        JAUNE
                                    </div>

                                    {pawns
                                        .filter(
                                            pawn =>
                                                pawn.camp ===
                                                CAMPS.YELLOW &&
                                                pawn.state ===
                                                PAWN_STATE.BASE
                                        )
                                        .map(
                                            pawn => {

                                                const position =
                                                    getPawnVisualPosition(
                                                        pawn
                                                    );

                                                return (
                                                    <Pawn
                                                        key={
                                                            pawn.id
                                                        }
                                                        pawn={
                                                            pawn
                                                        }
                                                        position={
                                                            position
                                                        }
                                                        legalPawnIds={
                                                            legalPawnIds
                                                        }
                                                        selectedPawnId={
                                                            selectedPawnId
                                                        }
                                                        onClick={
                                                            handlePawnClick
                                                        }
                                                    />
                                                );
                                            }
                                        )}

                                </div>


                                {/* =================================
                                    QUADRANT BLEU
                                ================================= */}

                                <div
                                    className={
                                        "ludo-base ludo-base-blue"
                                    }
                                >

                                    <div
                                        className={
                                            "ludo-base-title"
                                        }
                                    >
                                        BLEU
                                    </div>

                                    {pawns
                                        .filter(
                                            pawn =>
                                                pawn.camp ===
                                                CAMPS.BLUE &&
                                                pawn.state ===
                                                PAWN_STATE.BASE
                                        )
                                        .map(
                                            pawn => {

                                                const position =
                                                    getPawnVisualPosition(
                                                        pawn
                                                    );

                                                return (
                                                    <Pawn
                                                        key={
                                                            pawn.id
                                                        }
                                                        pawn={
                                                            pawn
                                                        }
                                                        position={
                                                            position
                                                        }
                                                        legalPawnIds={
                                                            legalPawnIds
                                                        }
                                                        selectedPawnId={
                                                            selectedPawnId
                                                        }
                                                        onClick={
                                                            handlePawnClick
                                                        }
                                                    />
                                                );
                                            }
                                        )}

                                </div>


                                {/* =================================
                                    CASES DU PARCOURS
                                ================================= */}

                                {TRACK_CELLS.map(
                                    (
                                        cell,
                                        index
                                    ) => {

                                        const occupants =
                                            pawns.filter(
                                                pawn => {

                                                    if (
                                                        pawn.state !==
                                                        PAWN_STATE.BOARD
                                                    ) {
                                                        return false;
                                                    }

                                                    const position =
                                                        getPawnVisualPosition(
                                                            pawn
                                                        );

                                                    return (
                                                        position?.x ===
                                                            cell.x &&
                                                        position?.y ===
                                                            cell.y
                                                    );
                                                }
                                            );

                                        const startCamp =
                                            Object.keys(
                                                CAMP_START_OFFSETS
                                            ).find(
                                                camp =>
                                                    CAMP_START_OFFSETS[
                                                        camp
                                                    ] ===
                                                    index
                                            );

                                        return (
                                            <div
                                                key={
                                                    `track-${index}`
                                                }
                                                className={
                                                    startCamp
                                                        ? `ludo-track-cell ludo-track-cell-${startCamp}`
                                                        : "ludo-track-cell"
                                                }
                                                style={{
                                                    gridColumn:
                                                        cell.x,
                                                    gridRow:
                                                        cell.y,
                                                }}
                                            >

                                                {occupants.map(
                                                    pawn => {

                                                        const position =
                                                            getPawnVisualPosition(
                                                                pawn
                                                            );

                                                        return (
                                                            <Pawn
                                                                key={
                                                                    pawn.id
                                                                }
                                                                pawn={
                                                                    pawn
                                                                }
                                                                position={{
                                                                    x: 7,
                                                                    y: 7,
                                                                }}
                                                                boardCell
                                                                legalPawnIds={
                                                                    legalPawnIds
                                                                }
                                                                selectedPawnId={
                                                                    selectedPawnId
                                                                }
                                                                onClick={
                                                                    handlePawnClick
                                                                }
                                                            />
                                                        );
                                                    }
                                                )}

                                            </div>
                                        );
                                    }
                                )}


                                {/* =================================
                                    LANES FINALES
                                ================================= */}

                                {Object.entries(
                                    HOME_LANES
                                ).map(
                                    (
                                        [
                                            camp,
                                            lane,
                                        ]
                                    ) =>
                                        lane.map(
                                            (
                                                cell,
                                                index
                                            ) => {

                                                const progress =
                                                    index +
                                                    52;

                                                const occupants =
                                                    pawns.filter(
                                                        pawn =>
                                                            pawn.camp ===
                                                                camp &&
                                                            Number(
                                                                pawn.progress
                                                            ) ===
                                                                progress &&
                                                            (
                                                                pawn.state ===
                                                                    PAWN_STATE.BOARD ||
                                                                pawn.state ===
                                                                    PAWN_STATE.HOME
                                                            )
                                                    );

                                                return (
                                                    <div
                                                        key={
                                                            `${camp}-lane-${index}`
                                                        }
                                                        className={
                                                            `ludo-home-lane ludo-home-lane-${camp}`
                                                        }
                                                        style={{
                                                            gridColumn:
                                                                cell.x,
                                                            gridRow:
                                                                cell.y,
                                                        }}
                                                    >

                                                        {occupants.map(
                                                            pawn => (
                                                                <Pawn
                                                                    key={
                                                                        pawn.id
                                                                    }
                                                                    pawn={
                                                                        pawn
                                                                    }
                                                                    position={
                                                                        cell
                                                                    }
                                                                    boardCell
                                                                    legalPawnIds={
                                                                        legalPawnIds
                                                                    }
                                                                    selectedPawnId={
                                                                        selectedPawnId
                                                                    }
                                                                    onClick={
                                                                        handlePawnClick
                                                                    }
                                                                />
                                                            )
                                                        )}

                                                    </div>
                                                );
                                            }
                                        )
                                )}


                                {/* =================================
                                    CENTRE
                                ================================= */}

                                <div
                                    className={
                                        "ludo-center"
                                    }
                                >

                                    <div
                                        className={
                                            "ludo-center-red"
                                        }
                                    />

                                    <div
                                        className={
                                            "ludo-center-blue"
                                        }
                                    />

                                    <div
                                        className={
                                            "ludo-center-yellow"
                                        }
                                    />

                                    <div
                                        className={
                                            "ludo-center-green"
                                        }
                                    />

                                    <button
                                        type="button"
                                        className={
                                            diceRolling
                                                ? "ludo-dice rolling"
                                                : "ludo-dice"
                                        }
                                        disabled={
                                            !isMyTurn ||
                                            diceRolling ||
                                            Boolean(
                                                gameState?.dice?.rolled
                                            )
                                        }
                                        onClick={
                                            rollDice
                                        }
                                        aria-label={
                                            "Lancer le dé"
                                        }
                                    >

                                        <span
                                            className={
                                                "ludo-dice-symbol"
                                            }
                                        >
                                            {
                                                diceValue
                                                    ? DICE_SYMBOLS[
                                                        diceValue
                                                    ]
                                                    : "?"
                                            }
                                        </span>

                                        <small>
                                            {diceRolling
                                                ? "..."
                                                : isMyTurn
                                                    ? "LANCER"
                                                    : "TOUR"}
                                        </small>

                                    </button>

                                </div>


                                {/* =================================
                                    PIONS BOARD / HOME
                                ================================= */}

                                {pawns
                                    .filter(
                                        pawn =>
                                            pawn.state !==
                                                PAWN_STATE.BASE &&
                                            pawn.state !==
                                                PAWN_STATE.HOME
                                    )
                                    .map(
                                        pawn => {

                                            const position =
                                                getPawnVisualPosition(
                                                    pawn
                                                );

                                            return (
                                                <Pawn
                                                    key={
                                                        pawn.id
                                                    }
                                                    pawn={
                                                        pawn
                                                    }
                                                    position={
                                                        position
                                                    }
                                                    boardAbsolute
                                                    legalPawnIds={
                                                        legalPawnIds
                                                    }
                                                    selectedPawnId={
                                                        selectedPawnId
                                                    }
                                                    onClick={
                                                        handlePawnClick
                                                    }
                                                />
                                            );
                                        }
                                    )}

                            </div>

                        </div>


                        {/* =========================================
                            PANNEAU DROIT
                        ========================================= */}

                        <aside
                            className={
                                "ludo-side-panel"
                            }
                        >

                            {/* TOUR */}

                            <div
                                className={
                                    "ludo-turn-card"
                                }
                            >

                                <span>
                                    Tour
                                </span>

                                <strong>
                                    {
                                        isMyTurn
                                            ? "À vous"
                                            : currentPlayerId
                                                ? (
                                                    currentPlayerId ===
                                                    normalizeId(
                                                        match?.player1Id
                                                    )
                                                        ? player1Name
                                                        : player2Name
                                                )
                                                : "—"
                                    }
                                </strong>

                                <div
                                    className={
                                        "ludo-timer"
                                    }
                                >
                                    ⏱️{" "}
                                    {
                                        String(
                                            Math.floor(
                                                remainingSeconds /
                                                60
                                            )
                                        ).padStart(
                                            2,
                                            "0"
                                        )
                                    }
                                    :
                                    {
                                        String(
                                            remainingSeconds %
                                            60
                                        ).padStart(
                                            2,
                                            "0"
                                        )
                                    }
                                </div>

                            </div>


                            {/* DÉ */}

                            <div
                                className={
                                    "ludo-dice-info"
                                }
                            >

                                <span>
                                    Dernier lancer
                                </span>

                                <strong>
                                    {
                                        diceValue
                                            ? DICE_SYMBOLS[
                                                diceValue
                                            ]
                                            : "—"
                                    }
                                </strong>

                                {gameState?.dice?.rolled && (
                                    <small>
                                        Valeur :
                                        {" "}
                                        {
                                            gameState.dice.value
                                        }
                                    </small>
                                )}

                            </div>


                            {/* PIONS JOUABLES */}

                            <div
                                className={
                                    "ludo-legal-card"
                                }
                            >

                                <span>
                                    Pions jouables
                                </span>

                                {!legalPawnIds.length && (
                                    <small>
                                        Aucun pion sélectionnable.
                                    </small>
                                )}

                                {!!legalPawnIds.length && (
                                    <div
                                        className={
                                            "ludo-legal-list"
                                        }
                                    >

                                        {legalPawnIds.map(
                                            pawnId => {

                                                const pawn =
                                                    pawns.find(
                                                        item =>
                                                            String(
                                                                item.id
                                                            ) ===
                                                            String(
                                                                pawnId
                                                            )
                                                    );

                                                if (
                                                    !pawn
                                                ) {
                                                    return null;
                                                }

                                                return (
                                                    <button
                                                        key={
                                                            pawnId
                                                        }
                                                        type="button"
                                                        className={
                                                            `ludo-legal-pawn-button ludo-legal-${pawn.camp}`
                                                        }
                                                        onClick={() =>
                                                            movePawn(
                                                                pawnId
                                                            )
                                                        }
                                                    >
                                                        {
                                                            pawn.camp
                                                                .toUpperCase()
                                                        }
                                                        {" "}
                                                        #
                                                        {
                                                            pawn.pawnNumber
                                                        }
                                                    </button>
                                                );
                                            }
                                        )}

                                    </div>
                                )}

                            </div>


                            {/* PROGRESSION */}

                            <div
                                className={
                                    "ludo-progress-card"
                                }
                            >

                                <span>
                                    Progression
                                </span>

                                <div>
                                    <strong>
                                        {
                                            pawns.filter(
                                                pawn =>
                                                    Number(
                                                        pawn.playerId
                                                    ) ===
                                                    Number(
                                                        userId
                                                    ) &&
                                                    pawn.completed ===
                                                        true
                                            ).length
                                        }
                                    </strong>

                                    <small>
                                        / 8 pions à la maison
                                    </small>
                                </div>

                            </div>


                            {/* RÈGLE RAPIDE */}

                            <div
                                className={
                                    "ludo-quick-rule"
                                }
                            >
                                <strong>
                                    Rappel
                                </strong>

                                <span>
                                    Un 6 permet de sortir
                                    un pion de la base et
                                    donne un tour supplémentaire.
                                </span>
                            </div>

                        </aside>

                    </section>

                </main>
            )}


            {/* =================================================
                RESULTAT
            ================================================= */}

            {screen ===
                SCREENS.RESULT && (

                <main
                    className={
                        "ludo-result-screen"
                    }
                >

                    <section
                        className={
                            result?.isWinner
                                ? "ludo-result-card winner"
                                : "ludo-result-card loser"
                        }
                    >

                        <div
                            className={
                                "ludo-result-icon"
                            }
                        >
                            {
                                result?.isWinner
                                    ? "🏆"
                                    : "🎲"
                            }
                        </div>


                        {result?.isWinner ? (

                            <>
                                <span
                                    className={
                                        "ludo-eyebrow"
                                    }
                                >
                                    PARTIE TERMINÉE
                                </span>

                                <h1>
                                    Félicitations !
                                </h1>

                                <p>
                                    Vous avez gagné cette
                                    partie de Ludo.
                                </p>

                                <div
                                    className={
                                        "ludo-result-amount"
                                    }
                                >

                                    <span>
                                        Gain
                                    </span>

                                    <strong>
                                        {
                                            result.winnerAmount !==
                                                null
                                                ? formatMoney(
                                                    result.winnerAmount
                                                )
                                                : formatMoney(
                                                    result.pot
                                                )
                                        }
                                        {" "}
                                        FC
                                    </strong>

                                </div>

                                <p
                                    className={
                                        "ludo-result-secondary"
                                    }
                                >
                                    Cagnotte de la partie :
                                    {" "}
                                    {
                                        formatMoney(
                                            result.pot
                                        )
                                    }
                                    {" "}
                                    FC.
                                </p>

                            </>

                        ) : (

                            <>
                                <span
                                    className={
                                        "ludo-eyebrow"
                                    }
                                >
                                    PARTIE TERMINÉE
                                </span>

                                <h1>
                                    Partie terminée
                                </h1>

                                <p>
                                    Vous avez perdu cette
                                    partie.
                                </p>

                                {result?.stake >
                                    0 && (
                                    <div
                                        className={
                                            "ludo-result-amount"
                                        }
                                    >

                                        <span>
                                            Mise perdue
                                        </span>

                                        <strong>
                                            -
                                            {
                                                formatMoney(
                                                    result.stake
                                                )
                                            }
                                            {" "}
                                            FC
                                        </strong>

                                    </div>
                                )}

                            </>
                        )}


                        {result?.reason ===
                            "90_seconds_timeout" && (
                            <div
                                className={
                                    "ludo-timeout-message"
                                }
                            >
                                ⏱️
                                La partie s'est terminée
                                à la suite du temps imparti.
                            </div>
                        )}


                        <button
                            type="button"
                            className={
                                "ludo-primary-button"
                            }
                            onClick={
                                goHome
                            }
                        >
                            Retour à l'accueil
                        </button>

                    </section>

                </main>
            )}


        </div>
    );
}


// ============================================================
// COMPOSANT PION
// ============================================================

function Pawn({
    pawn,
    position,
    legalPawnIds = [],
    selectedPawnId,
    onClick,
    boardCell = false,
    boardAbsolute = false,
}) {

    if (!pawn) {
        return null;
    }

    const camp =
        String(
            pawn.camp ||
            ""
        ).toLowerCase();

    const meta =
        CAMP_META[
            camp
        ] ||
        CAMP_META.red;

    const isLegal =
        legalPawnIds.includes(
            String(pawn.id)
        );

    const isSelected =
        String(
            selectedPawnId
        ) ===
        String(
            pawn.id
        );

    const className =
        [
            getPawnClass(
                pawn,
                legalPawnIds
            ),

            isSelected
                ? "selected"
                : "",

            boardCell
                ? "board-cell-pawn"
                : "",

            boardAbsolute
                ? "board-absolute-pawn"
                : "",
        ]
            .filter(Boolean)
            .join(" ");

    if (!position) {
        return null;
    }

    if (
        boardCell
    ) {
        return (
            <button
                type="button"
                className={
                    className
                }
                disabled={
                    !isLegal
                }
                onClick={
                    () =>
                        onClick(
                            pawn
                        )
                }
                title={
                    isLegal
                        ? `Déplacer ${camp} #${pawn.pawnNumber}`
                        : `${camp} #${pawn.pawnNumber}`
                }
                style={{
                    "--pawn-color":
                        meta.color,
                }}
            >
                <span>
                    {
                        pawn.pawnNumber
                    }
                </span>
            </button>
        );
    }

    if (
        boardAbsolute
    ) {
        return (
            <button
                type="button"
                className={
                    className
                }
                disabled={
                    !isLegal
                }
                onClick={
                    () =>
                        onClick(
                            pawn
                        )
                }
                title={
                    isLegal
                        ? `Déplacer ${camp} #${pawn.pawnNumber}`
                        : `${camp} #${pawn.pawnNumber}`
                }
                style={{
                    "--pawn-color":
                        meta.color,

                    "--pawn-x":
                        position.x,

                    "--pawn-y":
                        position.y,
                }}
            >
                <span>
                    {
                        pawn.pawnNumber
                    }
                </span>
            </button>
        );
    }

    return (
        <button
            type="button"
            className={
                className
            }
            disabled={
                !isLegal
            }
            onClick={
                () =>
                    onClick(
                        pawn
                    )
            }
            title={
                isLegal
                    ? `Déplacer ${camp} #${pawn.pawnNumber}`
                    : `${camp} #${pawn.pawnNumber}`
            }
            style={{
                "--pawn-color":
                    meta.color,

                "--pawn-x":
                    position.x,

                "--pawn-y":
                    position.y,
            }}
        >
            <span>
                {
                    pawn.pawnNumber
                }
            </span>
        </button>
    );
}


// ============================================================
// NOM ADVERSAIRE
// ============================================================

function getOpponentName(
    currentMatch,
    userId
) {

    const player1Id =
        normalizeId(
            currentMatch?.player1Id ??
            currentMatch?.player1_id
        );

    const player2Id =
        normalizeId(
            currentMatch?.player2Id ??
            currentMatch?.player2_id
        );

    if (
        Number(userId) ===
        player1Id
    ) {
        return normalizeString(
            currentMatch?.player2Name ??
            currentMatch?.player2_name,
            player2Id === AI_ID
                ? "Ludo IA"
                : "Adversaire"
        );
    }

    if (
        Number(userId) ===
        player2Id
    ) {
        return normalizeString(
            currentMatch?.player1Name ??
            currentMatch?.player1_name,
            "Adversaire"
        );
    }

    return "Adversaire";
}