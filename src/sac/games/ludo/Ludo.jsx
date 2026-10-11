import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState
} from 'react';

import { io } from 'socket.io-client';

import {
    createSacMatch,
    joinSacMatch,
    getSacMatch,
    getSacMatches
} from '../../../sac/sacApi';

import './Ludo.css';

/* =========================================================
   CONFIGURATION
========================================================= */

const AI_PLAYER_ID = '9999';
const DEFAULT_TURN_SECONDS = 90;

const MODES = {
    USER: 'user',
    ANDROID: 'android',
    TRAINING: 'training'
};

const SOCKET_EVENTS = {
    CONNECTED: 'ludo:connected',
    STATE: 'ludo:state',
    DICE_ROLLED: 'ludo:diceRolled',
    PAWN_MOVED: 'ludo:pawnMoved',
    TURN_CHANGED: 'ludo:turnChanged',
    STARTED: 'ludo:started',
    FINISHED: 'ludo:finished',
    PLAYER_JOINED: 'ludo:playerJoined',
    PLAYER_LEFT: 'ludo:playerLeft',
    BOT_THINKING: 'ludo:botThinking',
    BOT_ACTION: 'ludo:botAction',
    ERROR: 'ludo:error'
};

const CLIENT_EVENTS = {
    GET_STATE: 'ludo:getState',
    ROLL_DICE: 'ludo:rollDice',
    MOVE_PAWN: 'ludo:movePawn',
    LEAVE: 'ludo:leave'
};

const CAMP_CLASSES = {
    RED: 'red',
    YELLOW: 'yellow',
    GREEN: 'green',
    BLUE: 'blue'
};

/* =========================================================
   FONCTIONS UTILITAIRES
========================================================= */

function normalizeId(value) {
    if (value === undefined || value === null) {
        return null;
    }

    return String(value);
}

function getValue(object, keys, fallback = null) {
    if (!object || typeof object !== 'object') {
        return fallback;
    }

    for (const key of keys) {
        if (
            Object.prototype.hasOwnProperty.call(object, key) &&
            object[key] !== undefined &&
            object[key] !== null
        ) {
            return object[key];
        }
    }

    return fallback;
}

function findDeep(object, keys, visited = new Set()) {
    if (
        object === null ||
        object === undefined ||
        typeof object !== 'object' ||
        visited.has(object)
    ) {
        return undefined;
    }

    visited.add(object);

    for (const key of keys) {
        if (
            Object.prototype.hasOwnProperty.call(object, key) &&
            object[key] !== undefined &&
            object[key] !== null
        ) {
            return object[key];
        }
    }

    for (const value of Object.values(object)) {
        if (value && typeof value === 'object') {
            const found = findDeep(value, keys, visited);

            if (found !== undefined) {
                return found;
            }
        }
    }

    return undefined;
}

function extractArray(data, keys) {
    for (const key of keys) {
        const direct = data?.[key];

        if (Array.isArray(direct)) {
            return direct;
        }
    }

    const nested = data?.data;

    if (Array.isArray(nested)) {
        return nested;
    }

    if (nested && typeof nested === 'object') {
        for (const key of keys) {
            if (Array.isArray(nested[key])) {
                return nested[key];
            }
        }
    }

    return [];
}

async function readApiResponse(response) {
    const text = await response.text();

    let data = {};

    if (text.trim()) {
        try {
            data = JSON.parse(text);
        } catch {
            data = {
                success: false,
                message: `Réponse serveur invalide (HTTP ${response.status}).`
            };
        }
    }

    if (!response.ok && !data.message) {
        data.message = `Erreur serveur HTTP ${response.status}.`;
    }

    return data;
}

function formatMoney(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return '0 Fc';
    }

    return `${new Intl.NumberFormat('fr-FR').format(number)} Fc`;
}

function normalizeMode(value) {
    const mode = String(value || '').toLowerCase();

    if (mode === 'ai') {
        return MODES.ANDROID;
    }

    if (Object.values(MODES).includes(mode)) {
        return mode;
    }

    return MODES.USER;
}

function extractMatchId(match) {
    const id = getValue(match, [
        'id',
        'matchId',
        'match_id'
    ]);

    return normalizeId(id);
}

function extractCurrentPlayerId(state) {
    const value = findDeep(state, [
        'currentPlayerId',
        'currentPlayer',
        'turnPlayerId',
        'activePlayerId',
        'playerTurn'
    ]);

    if (value && typeof value === 'object') {
        return normalizeId(
            getValue(value, [
                'id',
                'playerId',
                'userId',
                'player'
            ])
        );
    }

    return normalizeId(value);
}

function extractWinnerId(state, result = null) {
    const value =
        findDeep(result, [
            'winnerId',
            'winningPlayerId',
            'winnerPlayerId',
            'winner'
        ]) ??
        findDeep(state, [
            'winnerId',
            'winningPlayerId',
            'winnerPlayerId',
            'winner'
        ]);

    if (value && typeof value === 'object') {
        return normalizeId(
            getValue(value, [
                'id',
                'playerId',
                'userId'
            ])
        );
    }

    return normalizeId(value);
}

function isFinished(state) {
    if (!state) {
        return false;
    }

    const status = String(state.status || '').toLowerCase();

    return (
        state.finished === true ||
        state.gameFinished === true ||
        state.gameOver === true ||
        state.isFinished === true ||
        state.ended === true ||
        ['finished', 'timeout', 'aborted'].includes(status)
    );
}

function extractDice(state, result = null) {
    const value =
        findDeep(result, [
            'diceValue',
            'dice',
            'roll',
            'value',
            'number'
        ]) ??
        findDeep(state, [
            'diceValue',
            'dice',
            'lastDice',
            'lastRoll'
        ]);

    if (value === undefined || value === null) {
        return null;
    }

    const number = Number(value);

    return Number.isFinite(number) ? number : null;
}

function extractPawns(state) {
    const pawns = findDeep(state, ['pawns']);

    return Array.isArray(pawns) ? pawns : [];
}

function extractLegalPawnIds(state) {
    const ids = findDeep(state, [
        'legalPawnIds',
        'playablePawnIds',
        'availablePawnIds'
    ]);

    return Array.isArray(ids) ? ids.map(normalizeId) : [];
}

function getPawnCamp(pawn) {
    return String(
        getValue(pawn, ['camp', 'color', 'visualCamp'], '')
    ).toUpperCase();
}

function getPawnPlayerId(pawn) {
    return normalizeId(
        getValue(pawn, ['playerId', 'userId', 'ownerId'])
    );
}

function getPawnId(pawn) {
    return normalizeId(
        getValue(pawn, ['id', 'pawnId'])
    );
}

function getPawnPosition(pawn) {
    const visual = getValue(pawn, ['visual']);

    if (!visual || typeof visual !== 'object') {
        return null;
    }

    const row = visual.row ?? visual.y;
    const col = visual.col ?? visual.x;

    if (row === undefined || col === undefined) {
        return null;
    }

    const parsedRow = Number(row);
    const parsedCol = Number(col);

    if (
        !Number.isFinite(parsedRow) ||
        !Number.isFinite(parsedCol)
    ) {
        return null;
    }

    return {
        row: parsedRow,
        col: parsedCol
    };
}

function extractStake(match, state) {
    const value =
        findDeep(match, ['bet_amount', 'betAmount', 'stake']) ??
        findDeep(state, ['bet_amount', 'betAmount', 'stake']) ??
        0;

    const number = Number(value);

    return Number.isFinite(number) ? number : 0;
}

function extractSettlementAmount(settlement, match, state) {
    const explicit = findDeep(settlement, [
        'winnerAmount',
        'winner_amount',
        'payout',
        'prize',
        'amountWon',
        'amount_won',
        'netAmount',
        'net_amount'
    ]);

    if (explicit !== undefined && explicit !== null) {
        const amount = Number(explicit);

        if (Number.isFinite(amount)) {
            return amount;
        }
    }

    /*
     * Montant brut affiché à titre de secours.
     * Le montant réellement payé doit venir du backend.
     */
    return extractStake(match, state) * 2;
}

function getMatchStatus(match) {
    const status = String(
        getValue(match, ['status', 'state'], 'WAITING')
    ).toUpperCase();

    const labels = {
        WAITING: 'En attente',
        STARTING: 'Démarrage',
        PLAYING: 'En cours',
        FINISHED: 'Terminé',
        TIMEOUT: 'Temps écoulé',
        ABORTED: 'Interrompu'
    };

    return labels[status] || status;
}

function getMatchCreatorId(match) {
    return normalizeId(
        getValue(match, [
            'player1_id',
            'player1Id',
            'creatorId',
            'creator_id',
            'userId'
        ])
    );
}

/* =========================================================
   PLATEAU
========================================================= */

function buildBoardCells() {
    const cells = [];

    for (let row = 0; row < 15; row += 1) {
        for (let col = 0; col < 15; col += 1) {
            cells.push({
                row,
                col,
                key: `${row}-${col}`
            });
        }
    }

    return cells;
}

const BOARD_CELLS = buildBoardCells();

function isHomeArea(row, col) {
    return (
        (row <= 5 && col <= 5) ||
        (row <= 5 && col >= 9) ||
        (row >= 9 && col <= 5) ||
        (row >= 9 && col >= 9)
    );
}

function getHomeCamp(row, col) {
    if (row <= 5 && col <= 5) return 'RED';
    if (row <= 5 && col >= 9) return 'YELLOW';
    if (row >= 9 && col >= 9) return 'GREEN';
    if (row >= 9 && col <= 5) return 'BLUE';

    return null;
}

function isCenter(row, col) {
    return row >= 6 && row <= 8 && col >= 6 && col <= 8;
}

function getCellClass(row, col) {
    const classes = ['ludo-cell'];

    if (isHomeArea(row, col)) {
        classes.push(
            `ludo-home-${getHomeCamp(row, col).toLowerCase()}`
        );
    } else if (isCenter(row, col)) {
        classes.push('ludo-center');
    } else {
        classes.push('ludo-track');
    }

    return classes.join(' ');
}

function getCellPawnList(pawns, row, col) {
    return pawns.filter(pawn => {
        const position = getPawnPosition(pawn);

        return (
            position &&
            position.row === row &&
            position.col === col
        );
    });
}

/* =========================================================
   COMPOSANTS DU LOBBY
========================================================= */

function ModeSelector({ selectedMode, onChange }) {
    const options = [
        {
            id: MODES.ANDROID,
            title: 'Android',
            description: 'Jouer contre le bot'
        },
        {
            id: MODES.USER,
            title: 'Joueur',
            description: 'Affronter un joueur'
        },
        {
            id: MODES.TRAINING,
            title: 'Entraînement',
            description: 'Sans mise'
        }
    ];

    return (
        <div className="ludo-mode-grid">
            {options.map(option => (
                <button
                    key={option.id}
                    type="button"
                    className={
                        selectedMode === option.id
                            ? 'ludo-mode active'
                            : 'ludo-mode'
                    }
                    onClick={() => onChange(option.id)}
                >
                    <strong>{option.title}</strong>
                    <span>{option.description}</span>
                </button>
            ))}
        </div>
    );
}

function WaitingMatches({
    matches,
    loading,
    currentUserId,
    onJoin,
    onRefresh
}) {
    const availableMatches = matches.filter(match => {
        const creatorId = getMatchCreatorId(match);
        const status = String(match.status || '').toUpperCase();
        const mode = normalizeMode(match.mode);

        return (
            status === 'WAITING' &&
            mode === MODES.USER &&
            creatorId !== currentUserId
        );
    });

    return (
        <section className="ludo-card ludo-waiting-card">
            <div className="ludo-section-heading">
                <div>
                    <h2>Parties disponibles</h2>
                    <p>Rejoignez une partie en attente.</p>
                </div>

                <button
                    type="button"
                    className="ludo-ghost-button"
                    onClick={onRefresh}
                    disabled={loading}
                >
                    {loading ? 'Actualisation…' : 'Actualiser'}
                </button>
            </div>

            {availableMatches.length === 0 ? (
                <p className="ludo-empty">
                    Aucune partie disponible pour le moment.
                </p>
            ) : (
                <div className="ludo-match-list">
                    {availableMatches.map(match => {
                        const id = extractMatchId(match);
                        const amount = extractStake(match, null);

                        return (
                            <article
                                key={id}
                                className="ludo-match-item"
                            >
                                <div>
                                    <strong>
                                        Match #{id}
                                    </strong>

                                    <span>
                                        Mise : {formatMoney(amount)}
                                    </span>

                                    <small>
                                        {getMatchStatus(match)}
                                    </small>
                                </div>

                                <button
                                    type="button"
                                    className="ludo-primary-button"
                                    disabled={!id || loading}
                                    onClick={() => onJoin(match)}
                                >
                                    Rejoindre
                                </button>
                            </article>
                        );
                    })}
                </div>
            )}
        </section>
    );
}

function MyMatches({
    matches,
    currentUserId,
    loading,
    onResume,
    onRefresh
}) {
    const resumable = matches.filter(match => {
        const status = String(match.status || '').toUpperCase();

        const creatorId = getMatchCreatorId(match);
        const secondPlayerId = normalizeId(
            getValue(match, ['player2_id', 'player2Id'])
        );

        const belongsToUser =
            creatorId === currentUserId ||
            secondPlayerId === currentUserId;

        return (
            belongsToUser &&
            ['WAITING', 'STARTING', 'PLAYING'].includes(status)
        );
    });

    return (
        <section className="ludo-card ludo-my-matches-card">
            <div className="ludo-section-heading">
                <div>
                    <h2>Mes parties</h2>
                    <p>Reprenez une partie existante.</p>
                </div>

                <button
                    type="button"
                    className="ludo-ghost-button"
                    onClick={onRefresh}
                    disabled={loading}
                >
                    Actualiser
                </button>
            </div>

            {resumable.length === 0 ? (
                <p className="ludo-empty">
                    Vous n'avez aucune partie à reprendre.
                </p>
            ) : (
                <div className="ludo-match-list">
                    {resumable.map(match => {
                        const id = extractMatchId(match);

                        return (
                            <article
                                key={id}
                                className="ludo-match-item"
                            >
                                <div>
                                    <strong>Match #{id}</strong>

                                    <span>
                                        Mise : {formatMoney(
                                            extractStake(match, null)
                                        )}
                                    </span>

                                    <small>
                                        {getMatchStatus(match)}
                                    </small>
                                </div>

                                <button
                                    type="button"
                                    className="ludo-primary-button"
                                    disabled={!id || loading}
                                    onClick={() => onResume(match)}
                                >
                                    Reprendre
                                </button>
                            </article>
                        );
                    })}
                </div>
            )}
        </section>
    );
}

/* =========================================================
   COMPOSANT PRINCIPAL
========================================================= */

function LudoGame({
    userId,
    initialMatchId = null,
    initialMatch = null,
    initialState = null,
    mode = MODES.ANDROID,
    apiBaseUrl = '/api',
    socketUrl = null,
    onHome = null
}) {
    const socketRef = useRef(null);
    const stateRef = useRef(initialState);
    const matchRef = useRef(initialMatch);
    const finishRequestedRef = useRef(false);
    const timeoutIntervalRef = useRef(null);
    const requestInProgressRef = useRef(false);

    const [screen, setScreen] = useState(
        initialMatchId ? 'game' : 'home'
    );

    const [matchId, setMatchId] = useState(
        initialMatchId ? String(initialMatchId) : null
    );

    const [match, setMatch] = useState(initialMatch);
    const [state, setState] = useState(initialState);

    const [selectedMode, setSelectedMode] = useState(
        normalizeMode(mode)
    );

    const [stake, setStake] = useState(
        initialMatch
            ? Number(
                initialMatch.bet_amount ??
                initialMatch.betAmount ??
                1000
            )
            : 1000
    );

    const [waitingMatches, setWaitingMatches] = useState([]);
    const [myMatches, setMyMatches] = useState([]);

    const [dice, setDice] = useState(extractDice(initialState));
    const [legalPawnIds, setLegalPawnIds] = useState(
        extractLegalPawnIds(initialState)
    );

    const [botThinking, setBotThinking] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingMatches, setLoadingMatches] = useState(false);
    const [remainingSeconds, setRemainingSeconds] = useState(
        DEFAULT_TURN_SECONDS
    );

    const [result, setResult] = useState(null);
    const [settlement, setSettlement] = useState(null);
    const [finishData, setFinishData] = useState(null);

    const apiRoot = useMemo(() => {
        const base = String(apiBaseUrl || '/api').replace(/\/$/, '');
        return `${base}/ludo`;
    }, [apiBaseUrl]);

    const humanId = normalizeId(userId);

    const currentPlayerId = extractCurrentPlayerId(state);

    const myTurn =
        humanId !== null &&
        currentPlayerId === humanId;

    const pawns = useMemo(
        () => extractPawns(state),
        [state]
    );

    const winnerId = extractWinnerId(state, result);

    const didWin =
        winnerId !== null &&
        humanId !== null &&
        winnerId === humanId;

    const gameFinished = isFinished(state);

    const displayedReward = extractSettlementAmount(
        settlement,
        match,
        state
    );

    /* -----------------------------------------------------
       SYNCHRONISATION DE L'ÉTAT
    ----------------------------------------------------- */

    const applyState = useCallback((nextState) => {
        if (!nextState) return;

        stateRef.current = nextState;
        setState(nextState);

        const nextDice = extractDice(nextState);
        setDice(nextDice);

        setLegalPawnIds(extractLegalPawnIds(nextState));

        const current = extractCurrentPlayerId(nextState);

        if (current === humanId || isFinished(nextState)) {
            setBotThinking(false);
        }
    }, [humanId]);

    const setMatchSafely = useCallback((nextMatch) => {
        if (!nextMatch) return;

        matchRef.current = nextMatch;
        setMatch(nextMatch);
    }, []);

    /* -----------------------------------------------------
       API : LISTES DU LOBBY
    ----------------------------------------------------- */

    const loadLobbyMatches = useCallback(async () => {
        setLoadingMatches(true);
        setError('');

        try {
            const response = await getSacMatches('ludo');

            const candidates = [
                response?.matches,
                response?.items,
                response?.data?.matches,
                response?.data?.items,
                response?.data
            ];

            const matches = candidates.find(
                Array.isArray
            ) || [];

            setWaitingMatches(
                matches.filter(match =>
                    String(
                        match?.status ||
                        match?.state ||
                        'WAITING'
                    ).toUpperCase() === 'WAITING'
                )
            );

            setMyMatches(
                matches.filter(match => {
                    const creatorId = getMatchCreatorId(match);

                    const secondPlayerId = normalizeId(
                        getValue(match, [
                            'player2_id',
                            'player2Id',
                            'user2_id',
                            'user2Id'
                        ])
                    );

                    return (
                        creatorId === humanId ||
                        secondPlayerId === humanId
                    );
                })
            );
        } catch (errorObject) {
            setWaitingMatches([]);
            setMyMatches([]);

            setError(
                errorObject?.response?.data?.message ||
                errorObject?.message ||
                'Impossible de charger les matchs SAC de Ludo.'
            );
        } finally {
            setLoadingMatches(false);
        }
    }, [humanId]);

    useEffect(() => {
        if (screen === 'home') {
            loadLobbyMatches();
        }
    }, [screen, loadLobbyMatches]);

    /* -----------------------------------------------------
       SOCKET.IO
    ----------------------------------------------------- */

    const cleanupSocket = useCallback(({ notifyServer = false } = {}) => {
        const socket = socketRef.current;

        if (!socket) return;

        if (notifyServer && socket.connected && matchId) {
            socket.emit(CLIENT_EVENTS.LEAVE, { matchId });
        }

        socket.removeAllListeners();
        socket.disconnect();
        socketRef.current = null;
    }, [matchId]);

    const requestFinish = useCallback(async (finalState = null) => {
        const currentMatchId = matchId;

        if (!currentMatchId || finishRequestedRef.current) {
            return;
        }

        finishRequestedRef.current = true;

        try {
            const response = await fetch(
                `${apiRoot}/matches/${encodeURIComponent(currentMatchId)}/finish`,
                {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            const data = await readApiResponse(response);

            if (response.ok && data.success) {
                setResult(data.result ?? null);
                setSettlement(data.settlement ?? null);
                setFinishData(data);

                if (data.match) {
                    setMatchSafely(data.match);
                }
            } else {
                setResult(
                    data.result ??
                    extractWinnerId(finalState || stateRef.current)
                );
            }
        } catch {
            setResult(
                extractWinnerId(finalState || stateRef.current)
            );
        } finally {
            setBotThinking(false);
            setScreen('result');
        }
    }, [apiRoot, matchId, setMatchSafely]);

    const connectSocket = useCallback((currentMatchId) => {
        cleanupSocket();

        const baseSocketUrl = socketUrl
            ? String(socketUrl).replace(/\/$/, '')
            : '';

        const socket = io(
            baseSocketUrl
                ? `${baseSocketUrl}/ludo`
                : '/ludo',
            {
                transports: ['websocket', 'polling'],
                autoConnect: true
            }
        );

        socketRef.current = socket;

        const requestState = () => {
            socket.emit(
                CLIENT_EVENTS.GET_STATE,
                { matchId: currentMatchId },
                response => {
                    if (response?.ok && response.state) {
                        applyState(response.state);
                    } else if (response?.success && response.state) {
                        applyState(response.state);
                    }
                }
            );
        };

        socket.on(SOCKET_EVENTS.CONNECTED, requestState);
        socket.on('connect', requestState);

        socket.on(SOCKET_EVENTS.STATE, payload => {
            if (
                payload?.matchId &&
                normalizeId(payload.matchId) !== normalizeId(currentMatchId)
            ) {
                return;
            }

            if (payload?.state) {
                applyState(payload.state);
            } else if (payload?.game) {
                applyState(payload.game);
            }
        });

        socket.on(SOCKET_EVENTS.DICE_ROLLED, payload => {
            const value = extractDice(payload?.state, payload?.result);

            if (value !== null) {
                setDice(value);
            }

            if (payload?.state) {
                applyState(payload.state);
            }
        });

        socket.on(SOCKET_EVENTS.PAWN_MOVED, payload => {
            if (payload?.state) {
                applyState(payload.state);
            }
        });

        socket.on(SOCKET_EVENTS.STARTED, payload => {
            if (payload?.state) {
                applyState(payload.state);
            }
        });

        socket.on(SOCKET_EVENTS.TURN_CHANGED, payload => {
            if (payload?.state) {
                applyState(payload.state);
            }
        });

        socket.on(SOCKET_EVENTS.FINISHED, payload => {
            if (payload?.state) {
                applyState(payload.state);
            }

            setBotThinking(false);
            requestFinish(payload?.state || stateRef.current);
        });

        socket.on(SOCKET_EVENTS.BOT_THINKING, () => {
            setBotThinking(true);
        });

        socket.on(SOCKET_EVENTS.BOT_ACTION, payload => {
            setBotThinking(false);

            if (payload?.state) {
                applyState(payload.state);
            }
        });

        socket.on(SOCKET_EVENTS.PLAYER_JOINED, requestState);
        socket.on(SOCKET_EVENTS.PLAYER_LEFT, requestState);

        socket.on(SOCKET_EVENTS.ERROR, payload => {
            setError(
                payload?.error?.message ||
                payload?.message ||
                'Une erreur Ludo est survenue.'
            );
            setLoading(false);
            setBotThinking(false);
        });

        socket.on('connect_error', errorObject => {
            setError(
                errorObject?.message ||
                'Connexion au serveur Ludo impossible.'
            );
        });

        return socket;
    }, [
        applyState,
        cleanupSocket,
        requestFinish,
        socketUrl
    ]);

    /* -----------------------------------------------------
       CRÉER UNE PARTIE
    ----------------------------------------------------- */

    const createMatch = useCallback(async () => {
        setError('');

        if (requestInProgressRef.current) {
            return;
        }

        const amount =
            selectedMode === MODES.TRAINING
                ? 0
                : Number(stake);

        if (
            !Number.isFinite(amount) ||
            amount < 0 ||
            (
                selectedMode !== MODES.TRAINING &&
                amount <= 0
            )
        ) {
            setError('La mise doit être supérieure à zéro.');
            return;
        }

        requestInProgressRef.current = true;
        setLoading(true);

        try {
            // SAC est responsable de la création et de la persistance.
            
            const response = await createSacMatch({
                game: 'ludo',
                stake: amount,
                mode: selectedMode
            });


            const createdMatch =
                response?.match ||
                response?.data?.match ||
                response?.data ||
                response;

            const createdId =
                extractMatchId(createdMatch) ||
                normalizeId(
                    response?.matchId ??
                    response?.match_id ??
                    response?.id
                );

            if (!createdId) {
                throw new Error(
                    'Le service SAC n’a pas retourné l’identifiant du match.'
                );
            }

            const localMatch = {
                ...createdMatch,
                id: createdId,
                game: 'ludo',
                mode: selectedMode,
                bet_amount: amount
            };

            setMatchSafely(localMatch);
            setMatchId(createdId);

            const initialState =
                response?.state ||
                response?.data?.state ||
                null;

            if (initialState) {
                applyState(initialState);
            }

            setResult(null);
            setSettlement(null);
            setFinishData(null);

            finishRequestedRef.current = false;

            setScreen('game');

            // Le socket actuel reste en place pour cette étape.
            connectSocket(createdId);
        } catch (errorObject) {
            setError(
                errorObject?.response?.data?.message ||
                errorObject?.message ||
                'Impossible de créer le match Ludo via SAC.'
            );
        } finally {
            setLoading(false);
            requestInProgressRef.current = false;
        }
    }, [
        applyState,
        connectSocket,
        selectedMode,
        setMatchSafely,
        stake
    ]);

    /* -----------------------------------------------------
       REJOINDRE UNE PARTIE
    ----------------------------------------------------- */

    const joinMatch = useCallback(async (waitingMatch) => {
        const id = extractMatchId(waitingMatch);

        if (!id) {
            setError('Identifiant de match SAC invalide.');
            return;
        }

        setError('');
        setLoading(true);

        try {
            const response = await joinSacMatch({
                game: 'ludo',
                matchId: id
            });

            const joinedMatch =
                response?.match ||
                response?.data?.match ||
                response?.data ||
                waitingMatch;

            setMatchSafely({
                ...joinedMatch,
                id,
                game: 'ludo'
            });

            setMatchId(id);

            const initialState =
                response?.state ||
                response?.data?.state ||
                null;

            if (initialState) {
                applyState(initialState);
            }

            setResult(null);
            setSettlement(null);
            setFinishData(null);

            finishRequestedRef.current = false;

            setScreen('game');
            connectSocket(id);
        } catch (errorObject) {
            setError(
                errorObject?.response?.data?.message ||
                errorObject?.message ||
                'Impossible de rejoindre ce match SAC.'
            );

            await loadLobbyMatches();
        } finally {
            setLoading(false);
        }
    }, [
        applyState,
        connectSocket,
        loadLobbyMatches,
        setMatchSafely
    ]);

    /* -----------------------------------------------------
       REPRENDRE UNE PARTIE
    ----------------------------------------------------- */

    const loadExistingMatch = useCallback(async (existingMatchId) => {
        if (!existingMatchId) {
            return;
        }

        const id = String(existingMatchId);

        setLoading(true);
        setError('');

        try {
            const response = await getSacMatch(id);

            const loadedMatch =
                response?.match ||
                response?.data?.match ||
                response?.data ||
                response;

            if (
                !loadedMatch ||
                !extractMatchId(loadedMatch)
            ) {
                throw new Error('Match SAC introuvable.');
            }

            setMatchSafely({
                ...loadedMatch,
                id,
                game: 'ludo'
            });

            setMatchId(id);

            const initialState =
                response?.state ||
                response?.data?.state ||
                loadedMatch?.state ||
                loadedMatch?.gameState ||
                null;

            if (initialState) {
                applyState(initialState);
            }

            finishRequestedRef.current = false;

            setResult(null);
            setSettlement(null);
            setFinishData(null);

            setScreen('game');

            // Le socket actuel demandera ensuite l'état de jeu.
            connectSocket(id);
        } catch (errorObject) {
            setError(
                errorObject?.response?.data?.message ||
                errorObject?.message ||
                'Impossible de récupérer ce match SAC.'
            );

            setScreen('home');
        } finally {
            setLoading(false);
        }
    }, [
        applyState,
        connectSocket,
        setMatchSafely
    ]);

    /* -----------------------------------------------------
       LANCER LE DÉ
    ----------------------------------------------------- */

    const rollDice = useCallback(() => {
        const socket = socketRef.current;

        if (
            !socket?.connected ||
            !matchId ||
            !myTurn ||
            gameFinished ||
            botThinking ||
            loading
        ) {
            return;
        }

        setError('');
        setLoading(true);

        socket.emit(
            CLIENT_EVENTS.ROLL_DICE,
            {
                matchId,
                playerId: humanId
            },
            response => {
                setLoading(false);

                if (!response?.ok && !response?.success) {
                    setError(
                        response?.error?.message ||
                        response?.message ||
                        'Impossible de lancer le dé.'
                    );
                    return;
                }

                if (response.state) {
                    applyState(response.state);
                }

                const value = extractDice(
                    response.state,
                    response.result
                );

                if (value !== null) {
                    setDice(value);
                }
            }
        );
    }, [
        applyState,
        botThinking,
        gameFinished,
        humanId,
        loading,
        matchId,
        myTurn
    ]);

    /* -----------------------------------------------------
       DÉPLACER UN PION
    ----------------------------------------------------- */

    const movePawn = useCallback((pawnId) => {
        const socket = socketRef.current;

        if (
            !socket?.connected ||
            !matchId ||
            !myTurn ||
            gameFinished ||
            botThinking ||
            loading
        ) {
            return;
        }

        const normalizedPawnId = normalizeId(pawnId);

        if (
            legalPawnIds.length > 0 &&
            !legalPawnIds.includes(normalizedPawnId)
        ) {
            return;
        }

        setError('');
        setLoading(true);

        socket.emit(
            CLIENT_EVENTS.MOVE_PAWN,
            {
                matchId,
                playerId: humanId,
                pawnId
            },
            response => {
                setLoading(false);

                if (!response?.ok && !response?.success) {
                    setError(
                        response?.error?.message ||
                        response?.message ||
                        'Impossible de déplacer le pion.'
                    );
                    return;
                }

                if (response.state) {
                    applyState(response.state);
                }
            }
        );
    }, [
        applyState,
        botThinking,
        gameFinished,
        humanId,
        legalPawnIds,
        loading,
        matchId,
        myTurn
    ]);

    /* -----------------------------------------------------
       GESTION DU TEMPS
    ----------------------------------------------------- */

    const checkTimeout = useCallback(async () => {
        if (!matchId || gameFinished || !myTurn) return;

        try {
            const response = await fetch(
                `${apiRoot}/matches/${encodeURIComponent(matchId)}/timeout`,
                {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            const data = await readApiResponse(response);

            if (response.ok && data.success && data.state) {
                applyState(data.state);
            }
        } catch {
            // Le serveur reste l'autorité pour le chronomètre.
        }
    }, [
        apiRoot,
        applyState,
        gameFinished,
        matchId,
        myTurn
    ]);

    useEffect(() => {
        if (screen !== 'game' || !matchId) {
            return undefined;
        }

        const updateTimer = () => {
            const currentState = stateRef.current;

            const turnStartedAt = findDeep(currentState, [
                'turnStartedAt',
                'turnStartTime'
            ]);

            const turnDuration = Number(
                findDeep(currentState, [
                    'turnDurationSeconds',
                    'turnDuration'
                ]) ?? DEFAULT_TURN_SECONDS
            );

            if (!turnStartedAt) {
                setRemainingSeconds(turnDuration);
                return;
            }

            const started = new Date(turnStartedAt).getTime();

            if (!Number.isFinite(started)) return;

            const elapsed = Math.floor(
                (Date.now() - started) / 1000
            );

            const remaining = Math.max(0, turnDuration - elapsed);

            setRemainingSeconds(remaining);

            if (
                remaining === 0 &&
                myTurn &&
                !isFinished(currentState)
            ) {
                checkTimeout();
            }
        };

        updateTimer();

        timeoutIntervalRef.current = setInterval(updateTimer, 1000);

        return () => {
            if (timeoutIntervalRef.current) {
                clearInterval(timeoutIntervalRef.current);
                timeoutIntervalRef.current = null;
            }
        };
    }, [checkTimeout, matchId, myTurn, screen, state]);

    /* -----------------------------------------------------
       FIN DE PARTIE ET NETTOYAGE
    ----------------------------------------------------- */

    useEffect(() => {
        if (gameFinished && screen === 'game') {
            requestFinish(state);
        }
    }, [gameFinished, requestFinish, screen, state]);

    useEffect(() => {
        return () => {
            if (timeoutIntervalRef.current) {
                clearInterval(timeoutIntervalRef.current);
            }

            const socket = socketRef.current;

            if (socket) {
                socket.removeAllListeners();
                socket.disconnect();
                socketRef.current = null;
            }
        };
    }, []);

    const resetGameState = useCallback(() => {
        stateRef.current = null;
        matchRef.current = null;

        setMatchId(null);
        setMatch(null);
        setState(null);
        setDice(null);
        setLegalPawnIds([]);
        setBotThinking(false);
        setError('');
        setLoading(false);
        setRemainingSeconds(DEFAULT_TURN_SECONDS);
        setResult(null);
        setSettlement(null);
        setFinishData(null);

        finishRequestedRef.current = false;
    }, []);

    const returnHome = useCallback(() => {
        cleanupSocket({ notifyServer: true });

        if (timeoutIntervalRef.current) {
            clearInterval(timeoutIntervalRef.current);
            timeoutIntervalRef.current = null;
        }

        resetGameState();
        setScreen('home');

        if (typeof onHome === 'function') {
            onHome();
        }
    }, [cleanupSocket, onHome, resetGameState]);

    /* -----------------------------------------------------
       INFORMATIONS JOUEURS
    ----------------------------------------------------- */

    const playerNames = useMemo(() => {
        const players = findDeep(state, ['players']);

        return Array.isArray(players) ? players : [];
    }, [state]);

    const getPlayerLabel = useCallback((playerId) => {
        const id = normalizeId(playerId);

        if (id === humanId) return 'Vous';
        if (id === AI_PLAYER_ID) return 'Android';

        const player = playerNames.find(item => {
            const itemId = normalizeId(
                item?.id ?? item?.playerId ?? item?.userId
            );

            return itemId === id;
        });

        return (
            player?.name ||
            player?.username ||
            `Joueur ${id || ''}`
        );
    }, [humanId, playerNames]);

    const opponentId = useMemo(() => {
        const direct = findDeep(state, [
            'player2Id',
            'player2_id',
            'opponentId'
        ]);

        if (direct !== undefined && direct !== null) {
            return normalizeId(direct);
        }

        const players = playerNames.map(player =>
            normalizeId(
                player?.id ?? player?.playerId ?? player?.userId
            )
        );

        return players.find(id => id && id !== humanId) || (
            normalizeMode(match?.mode) === MODES.ANDROID
                ? AI_PLAYER_ID
                : null
        );
    }, [humanId, match, playerNames, state]);

    /* =====================================================
       ÉCRAN : LOBBY
    ===================================================== */

    if (screen === 'home') {
        return (
            <div className="ludo-page">
                <div className="ludo-shell">
                    <header className="ludo-header">
                        <div>
                            <span className="ludo-eyebrow">
                                6BetBall
                            </span>

                            <h1>Jeux de 6</h1>
                            <p>Ludo</p>
                        </div>

                        <div className="ludo-status-pill">
                            <span className="ludo-status-dot" />
                            Prêt à jouer
                        </div>
                    </header>

                    {error && (
                        <div className="ludo-error">
                            {error}
                        </div>
                    )}

                    <main className="ludo-home">
                        <section className="ludo-card ludo-create-card">
                            <div className="ludo-card-icon">🎲</div>

                            <h2>Nouvelle partie</h2>

                            <p>
                                Choisissez votre mode et lancez une partie.
                            </p>

                            <ModeSelector
                                selectedMode={selectedMode}
                                onChange={setSelectedMode}
                            />

                            {selectedMode !== MODES.TRAINING && (
                                <label className="ludo-field">
                                    <span>Mise</span>

                                    <div className="ludo-input-money">
                                        <input
                                            type="number"
                                            min="1"
                                            step="1"
                                            value={stake}
                                            onChange={event =>
                                                setStake(event.target.value)
                                            }
                                        />

                                        <span>Fc</span>
                                    </div>
                                </label>
                            )}

                            <button
                                type="button"
                                className="ludo-primary-button"
                                disabled={
                                    loading ||
                                    (
                                        selectedMode !== MODES.TRAINING &&
                                        Number(stake) <= 0
                                    )
                                }
                                onClick={createMatch}
                            >
                                {loading ? 'Veuillez patienter…' : 'Créer la partie'}
                            </button>
                        </section>

                        <section className="ludo-card ludo-info-card">
                            <h2>Règles des équipes</h2>

                            <div className="ludo-info-row">
                                <span>Équipe 1</span>
                                <strong>🔴 Rouge + 🟡 Jaune</strong>
                            </div>

                            <div className="ludo-info-row">
                                <span>Équipe 2</span>
                                <strong>🔵 Bleu + 🟢 Vert</strong>
                            </div>

                            <div className="ludo-info-row">
                                <span>Chronomètre</span>
                                <strong>{DEFAULT_TURN_SECONDS} secondes</strong>
                            </div>

                            <div className="ludo-info-row">
                                <span>Pions</span>
                                <strong>16 au total</strong>
                            </div>
                        </section>

                        <MyMatches
                            matches={myMatches}
                            currentUserId={humanId}
                            loading={loadingMatches}
                            onResume={item =>
                                loadExistingMatch(extractMatchId(item))
                            }
                            onRefresh={loadLobbyMatches}
                        />

                        <WaitingMatches
                            matches={waitingMatches}
                            loading={loadingMatches}
                            currentUserId={humanId}
                            onJoin={joinMatch}
                            onRefresh={loadLobbyMatches}
                        />
                    </main>
                </div>
            </div>
        );
    }

    /* =====================================================
       ÉCRAN : RÉSULTAT
    ===================================================== */

    if (screen === 'result') {
        return (
            <div className="ludo-page ludo-result-page">
                <div className="ludo-result-card">
                    <div
                        className={
                            didWin
                                ? 'ludo-result-icon win'
                                : 'ludo-result-icon lose'
                        }
                    >
                        {didWin ? '🏆' : '✕'}
                    </div>

                    <span className="ludo-eyebrow">
                        Match terminé
                    </span>

                    {didWin ? (
                        <>
                            <h1>Félicitations !</h1>

                            <p className="ludo-result-title">
                                Le match est terminé, vous avez gagné !
                            </p>

                            <div className="ludo-reward">
                                <span>Gain brut affiché</span>

                                <strong>
                                    {formatMoney(displayedReward)}
                                </strong>
                            </div>
                        </>
                    ) : (
                        <>
                            <h1>Partie terminée</h1>

                            <p className="ludo-result-title">
                                {winnerId
                                    ? 'Votre adversaire a remporté la partie.'
                                    : 'La partie est terminée.'}
                            </p>

                            <div className="ludo-loss">
                                {winnerId
                                    ? 'Votre mise peut avoir été perdue selon le règlement du match.'
                                    : 'Le serveur n’a pas communiqué de gagnant.'}
                            </div>
                        </>
                    )}

                    {finishData?.message && (
                        <p>{finishData.message}</p>
                    )}

                    <button
                        type="button"
                        className="ludo-primary-button"
                        onClick={returnHome}
                    >
                        Retour à l'accueil Ludo
                    </button>
                </div>
            </div>
        );
    }

    /* =====================================================
       ÉCRAN : PARTIE
    ===================================================== */

    return (
        <div className="ludo-page">
            <div className="ludo-shell">
                <header className="ludo-header game-header">
                    <div>
                        <span className="ludo-eyebrow">
                            Jeux de 6
                        </span>

                        <h1>Ludo</h1>
                    </div>

                    <div className="ludo-game-header-right">
                        <div className="ludo-match-id">
                            Match #{matchId}
                        </div>

                        <button
                            type="button"
                            className="ludo-ghost-button"
                            onClick={returnHome}
                        >
                            Quitter
                        </button>
                    </div>
                </header>

                {error && (
                    <div className="ludo-error ludo-global-error">
                        {error}
                    </div>
                )}

                <main className="ludo-game-layout">
                    <aside className="ludo-side-panel">
                        <section className="ludo-player-card human">
                            <div className="ludo-player-color red-yellow">
                                <span />
                                <span />
                            </div>

                            <div>
                                <small>Équipe Rouge / Jaune</small>
                                <strong>Vous</strong>
                            </div>

                            {myTurn && (
                                <span className="ludo-turn-badge">
                                    Votre tour
                                </span>
                            )}
                        </section>

                        <section className="ludo-player-card opponent">
                            <div className="ludo-player-color blue-green">
                                <span />
                                <span />
                            </div>

                            <div>
                                <small>Équipe Bleu / Vert</small>
                                <strong>
                                    {getPlayerLabel(opponentId)}
                                </strong>
                            </div>

                            {!myTurn && !gameFinished && (
                                <span className="ludo-wait-badge">
                                    Son tour
                                </span>
                            )}
                        </section>

                        <section className="ludo-info-card">
                            <div className="ludo-info-row">
                                <span>Mise</span>
                                <strong>
                                    {formatMoney(extractStake(match, state))}
                                </strong>
                            </div>

                            <div className="ludo-info-row">
                                <span>Pot estimé</span>
                                <strong>
                                    {formatMoney(
                                        extractStake(match, state) * 2
                                    )}
                                </strong>
                            </div>

                            <div className="ludo-info-row">
                                <span>Temps restant</span>

                                <strong
                                    className={
                                        remainingSeconds <= 10
                                            ? 'danger'
                                            : ''
                                    }
                                >
                                    {remainingSeconds}s
                                </strong>
                            </div>

                            <div className="ludo-info-row">
                                <span>Dé</span>
                                <strong>{dice ?? '—'}</strong>
                            </div>
                        </section>

                        <section className="ludo-dice-card">
                            <div className="ludo-dice-label">
                                {botThinking
                                    ? 'Android réfléchit…'
                                    : myTurn
                                        ? 'À vous de jouer'
                                        : 'En attente de l’adversaire'}
                            </div>

                            <button
                                type="button"
                                className={
                                    myTurn && !gameFinished && !botThinking
                                        ? 'ludo-dice-button active'
                                        : 'ludo-dice-button'
                                }
                                disabled={
                                    !myTurn ||
                                    gameFinished ||
                                    botThinking ||
                                    loading
                                }
                                onClick={rollDice}
                            >
                                <span>{dice ?? '🎲'}</span>
                            </button>

                            {dice !== null &&
                                myTurn &&
                                legalPawnIds.length > 0 && (
                                    <p>
                                        Choisissez un pion lumineux à déplacer.
                                    </p>
                                )}
                        </section>
                    </aside>

                    <section className="ludo-board-area">
                        <div className="ludo-board-frame">
                            <div className="ludo-board">
                                {BOARD_CELLS.map(cell => {
                                    const cellPawns = getCellPawnList(
                                        pawns,
                                        cell.row,
                                        cell.col
                                    );

                                    return (
                                        <div
                                            key={cell.key}
                                            className={getCellClass(
                                                cell.row,
                                                cell.col
                                            )}
                                        >
                                            {cellPawns.map(pawn => {
                                                const pawnId = getPawnId(pawn);
                                                const pawnOwner =
                                                    getPawnPlayerId(pawn);

                                                const playable =
                                                    myTurn &&
                                                    legalPawnIds.includes(pawnId) &&
                                                    pawnOwner === humanId &&
                                                    !gameFinished &&
                                                    !botThinking;

                                                const camp = getPawnCamp(pawn);
                                                const pawnClass =
                                                    CAMP_CLASSES[camp] ||
                                                    camp.toLowerCase();

                                                return (
                                                    <button
                                                        key={pawnId}
                                                        type="button"
                                                        className={[
                                                            'ludo-pawn',
                                                            `ludo-pawn-${pawnClass}`,
                                                            playable ? 'playable' : '',
                                                            pawnOwner === humanId
                                                                ? 'mine'
                                                                : 'opponent'
                                                        ].filter(Boolean).join(' ')}
                                                        disabled={!playable}
                                                        onClick={() =>
                                                            movePawn(pawnId)
                                                        }
                                                        title={
                                                            playable
                                                                ? 'Déplacer ce pion'
                                                                : undefined
                                                        }
                                                    >
                                                        {getValue(
                                                            pawn,
                                                            ['pawnNumber', 'number'],
                                                            ''
                                                        )}
                                                    </button>
                                                );
                                            })}

                                            {isCenter(cell.row, cell.col) &&
                                                cell.row === 7 &&
                                                cell.col === 7 && (
                                                    <div className="ludo-center-logo">
                                                        6
                                                    </div>
                                                )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="ludo-board-help">
                            <span>🔴🟡 Votre équipe</span>
                            <span>🔵🟢 Équipe adverse</span>
                            <span>✨ Pions lumineux : coups possibles</span>
                        </div>
                    </section>
                </main>
            </div>
        </div>
    );
}

export default LudoGame;