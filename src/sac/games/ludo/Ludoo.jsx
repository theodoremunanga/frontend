import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import "./Ludo.css";

import {
    connectLudo,
    disconnectLudo,
} from "../../../services/ludoSocket";

import {
    createSacMatch,
    joinSacMatch,
    getSacMatch,
    getSacMatches,
} from "../../sacApi";

// ============================================================
// CONSTANTES
// ============================================================

const GAME_ID = "ludo";

const MIN_STAKE = 500;

const AI_ID = 9999;

const MODES = {
    USER: "user",
    AI: "ai",
    TRAINING: "training",
};

const SOCKET = {
    JOIN: "ludo:join",
    LEAVE: "ludo:leave",
    START: "ludo:start",
    ROLL: "ludo:rollDice",
    MOVE: "ludo:movePawn",
    STATE: "ludo:state",

    JOINED: "ludo:joined",
    STATE_UPDATE: "ludo:stateUpdate",
    ROLL_RESULT: "ludo:rollResult",
    MOVE_RESULT: "ludo:moveResult",
    GAME_STARTED: "ludo:gameStarted",
    GAME_FINISHED: "ludo:gameFinished",
    TIMEOUT: "ludo:timeout",
    BOT_RESULT: "ludo:botResult",
    PLAYER_LEFT: "ludo:playerLeft",
    ERROR: "ludo:error",
};

const GAME_STATUS = {
    WAITING: "waiting",
    STARTING: "starting",
    PLAYING: "playing",
    FINISHED: "finished",
    TIMEOUT: "timeout",
    ABORTED: "aborted",
};

const PAWN_STATE = {
    BASE: "base",
    BOARD: "board",
    HOME: "home",
};

const CAMPS = {
    RED: "red",
    YELLOW: "yellow",
    BLUE: "blue",
    GREEN: "green",
};

const CAMP_LABELS = {
    red: "RED",
    yellow: "YELLOW",
    blue: "BLUE",
    green: "GREEN",
};

const TEAM_LABELS = {
    red_yellow: "RED + YELLOW",
    blue_green: "BLUE + GREEN",
};

// ============================================================
// PARCOURS VISUEL
// ============================================================
//
// Le moteur utilise 52 cases communes.
//
// Les offsets du moteur sont :
// RED    = 0
// GREEN  = 13
// YELLOW = 26
// BLUE   = 39
//
// Le frontend reproduit cette géométrie.
// ============================================================

const TRACK_COORDS = [
    // Haut
    [0, 1],
    [0, 2],
    [0, 3],
    [0, 4],
    [0, 5],
    [0, 6],
    [0, 7],
    [0, 8],
    [0, 9],
    [0, 10],
    [0, 11],
    [0, 12],
    [0, 13],

    // Droite
    [1, 14],
    [2, 14],
    [3, 14],
    [4, 14],
    [5, 14],
    [6, 14],
    [7, 14],
    [8, 14],
    [9, 14],
    [10, 14],
    [11, 14],
    [12, 14],
    [13, 14],

    // Bas
    [14, 13],
    [14, 12],
    [14, 11],
    [14, 10],
    [14, 9],
    [14, 8],
    [14, 7],
    [14, 6],
    [14, 5],
    [14, 4],
    [14, 3],
    [14, 2],
    [14, 1],

    // Gauche
    [13, 0],
    [12, 0],
    [11, 0],
    [10, 0],
    [9, 0],
    [8, 0],
    [7, 0],
    [6, 0],
    [5, 0],
    [4, 0],
    [3, 0],
    [2, 0],
    [1, 0],
];

// ============================================================
// OFFSETS MOTEUR
// ============================================================

const CAMP_OFFSETS = {
    // Mapping visuel du plateau de référence :
    // jaune en haut, vert à droite, bleu en bas, rouge à gauche.
    yellow: 0,
    green: 13,
    blue: 26,
    red: 39,
};

// ============================================================
// COORDONNÉES DES BASES
// ============================================================

const BASE_COORDS = {
    // Comme sur le plateau de référence :
    // rouge = haut-gauche, jaune = haut-droite,
    // bleu = bas-gauche, vert = bas-droite.
    red: [
        [2, 2],
        [2, 4],
        [4, 2],
        [4, 4],
    ],

    yellow: [
        [2, 10],
        [2, 12],
        [4, 10],
        [4, 12],
    ],

    blue: [
        [10, 2],
        [10, 4],
        [12, 2],
        [12, 4],
    ],

    green: [
        [10, 10],
        [10, 12],
        [12, 10],
        [12, 12],
    ],
};

// ============================================================
// LIGNES FINALES
// ============================================================

const HOME_LANES = {
    // plateau de référence : rouge à gauche, jaune en haut,
    // vert à droite, bleu en bas.
    red: [
        [7, 1],
        [7, 2],
        [7, 3],
        [7, 4],
        [7, 5],
        [7, 6],
    ],

    yellow: [
        [1, 7],
        [2, 7],
        [3, 7],
        [4, 7],
        [5, 7],
        [6, 7],
    ],

    green: [
        [7, 13],
        [7, 12],
        [7, 11],
        [7, 10],
        [7, 9],
        [7, 8],
    ],

    blue: [
        [13, 7],
        [12, 7],
        [11, 7],
        [10, 7],
        [9, 7],
        [8, 7],
    ],
};

// ============================================================
// HELPERS
// ============================================================

function normalizeId(value) {
    const id = Number(value);

    return Number.isInteger(id) && id > 0
        ? id
        : null;
}

function getMatchId(payload) {
    if (!payload) return null;

    return normalizeId(
        payload.matchId ??
            payload.id ??
            payload.match_id ??
            payload.match?.id
    );
}

function getMatchObject(payload) {
    if (!payload) return null;

    return (
        payload.match ??
        payload.data?.match ??
        payload.data ??
        payload
    );
}

function normalizeMode(value) {
    const mode = String(
        value || MODES.USER
    )
        .trim()
        .toLowerCase();

    if (
        mode === MODES.AI ||
        mode === MODES.TRAINING ||
        mode === MODES.USER
    ) {
        return mode;
    }

    return MODES.USER;
}

function getPlayerIdFromMatch(match) {
    if (!match) return null;

    return normalizeId(
        match.player1Id ??
            match.player1_id ??
            match.user1_id ??
            match.creator_id ??
            match.creatorId
    );
}

function getOpponentIdFromMatch(match) {
    if (!match) return null;

    return normalizeId(
        match.player2Id ??
            match.player2_id ??
            match.user2_id ??
            match.opponent_id ??
            match.opponentId
    );
}

function getStatusFromMatch(match) {
    if (!match) return null;

    return (
        match.status ??
        match.game_status ??
        match.match_status ??
        null
    );
}

function getModeFromMatch(match) {
    if (!match) return MODES.USER;

    return normalizeMode(
        match.mode ??
            match.game_mode
    );
}

function getCurrentUserId() {
    try {
        const token =
            localStorage.getItem("token") ||
            localStorage.getItem("accessToken") ||
            localStorage.getItem("jwt");

        if (!token) return null;

        const parts = String(token).split(".");
        if (parts.length !== 3) return null;

        const payload = JSON.parse(
            atob(
                parts[1]
                    .replace(/-/g, "+")
                    .replace(/_/g, "/")
            )
        );

        return normalizeId(
            payload?.id ??
            payload?.userId ??
            payload?.user_id ??
            payload?.sub
        );
    } catch {
        return null;
    }
}

function formatMoney(value) {
    const amount = Number(value || 0);

    return new Intl.NumberFormat(
        "fr-FR"
    ).format(amount);
}

function createInitialPawns(player1Id, player2Id) {
    const camps = [
        ["red", player1Id],
        ["yellow", player1Id],
        ["blue", player2Id || null],
        ["green", player2Id || null],
    ];

    return camps.flatMap(([camp, playerId]) =>
        Array.from({ length: 4 }, (_, index) => ({
            id: `${camp}-${index + 1}`,
            pawnNumber: index + 1,
            camp,
            playerId,
            state: PAWN_STATE.BASE,
            progress: 0,
            completed: false,
        }))
    );
}

function getTeamForPlayer(game, playerId) {
    if (!game) return null;

    if (
        Number(game.player1Id) ===
        Number(playerId)
    ) {
        return "red_yellow";
    }

    if (
        Number(game.player2Id) ===
        Number(playerId)
    ) {
        return "blue_green";
    }

    return null;
}

function getCampsForPlayer(game, playerId) {
    const team =
        getTeamForPlayer(
            game,
            playerId
        );

    if (team === "red_yellow") {
        return [
            CAMPS.RED,
            CAMPS.YELLOW,
        ];
    }

    if (team === "blue_green") {
        return [
            CAMPS.BLUE,
            CAMPS.GREEN,
        ];
    }

    return [];
}

function getBoardPosition(pawn) {
    if (
        !pawn ||
        pawn.state !== PAWN_STATE.BOARD
    ) {
        return null;
    }

    if (
        pawn.progress < 0 ||
        pawn.progress >= 52
    ) {
        return null;
    }

    const offset =
        CAMP_OFFSETS[pawn.camp];

    if (offset === undefined) {
        return null;
    }

    return (
        offset +
        Number(pawn.progress)
    ) % 52;
}

function coordKey(row, col) {
    return `${row}-${col}`;
}

function isLegalPawn(game, pawnId) {
    return Boolean(
        game?.legalPawnIds?.some(
            id =>
                String(id) ===
                String(pawnId)
        )
    );
}

function getPawnLabel(pawn) {
    return `${CAMP_LABELS[pawn.camp]}-${pawn.pawnNumber}`;
}

// ============================================================
// DÉ VISUEL
// ============================================================

function DiceFace({ value, rolling = false }) {
    if (!value) {
        return (
            <div
                aria-label="Dé Ludo"
            className={`ludo-dice-face ludo-dice-empty ${
                    rolling
                        ? "is-rolling"
                        : ""
                }`}
            >
                <span>?</span>
            </div>
        );
    }

    const dots = [];

    for (
        let index = 0;
        index < Number(value);
        index += 1
    ) {
        dots.push(
            <span
                key={index}
                className="ludo-dice-dot"
            />
        );
    }

    return (
        <div
            aria-label={`Dé : ${value}`}
            className={`ludo-dice-face dice-${value} ${
                rolling
                    ? "is-rolling"
                    : ""
            }`}
        >
            {dots}
        </div>
    );
}

// ============================================================
// PAWN
// ============================================================

function Pawn({
    pawn,
    clickable,
    onClick,
    moving = false,
}) {
    if (!pawn) return null;

    return (
        <button
            type="button"
            className={[
                "ludo-pawn",
                `pawn-${pawn.camp}`,
                pawn.completed
                    ? "pawn-completed"
                    : "",
                clickable
                    ? "pawn-legal"
                    : "",
                moving
                    ? "pawn-moving"
                    : "",
            ]
                .filter(Boolean)
                .join(" ")}
            title={getPawnLabel(pawn)}
            onClick={
                clickable
                    ? onClick
                    : undefined
            }
            disabled={!clickable}
        >
            <span>
                {pawn.pawnNumber}
            </span>
        </button>
    );
}

// ============================================================
// BASE
// ============================================================

function BaseZone({
    camp,
    pawns,
    legalPawnIds,
    onPawnClick,
    movingPawnId,
}) {
    return (
        <div
            className={`ludo-base-zone base-${camp}`}
        >
            <div className="ludo-base-header">
                <span className="ludo-base-dot" />
                <strong>
                    {CAMP_LABELS[camp]}
                </strong>
            </div>

            <div className="ludo-base-pawns">
                {pawns.map(
                    pawn => (
                        <Pawn
                            key={pawn.id}
                            pawn={pawn}
                            moving={
                                String(movingPawnId) === String(pawn.id)
                            }
                            clickable={isLegalPawn(
                                {
                                    legalPawnIds,
                                },
                                pawn.id
                            )}
                            onClick={() =>
                                onPawnClick(
                                    pawn
                                )
                            }
                        />
                    )
                )}
            </div>
        </div>
    );
}

// ============================================================
// HOME LANE
// ============================================================

function HomePawn({
    pawn,
    clickable,
    onClick,
    moving = false,
}) {
    return (
        <Pawn
            pawn={pawn}
            clickable={clickable}
            onClick={onClick}
            moving={moving}
        />
    );
}

// ============================================================
// BOARD CELL
// ============================================================

function BoardCell({
    row,
    col,
    children,
    className = "",
}) {
    return (
        <div
            className={`ludo-board-cell ${className}`}
            style={{
                gridRow: row + 1,
                gridColumn: col + 1,
            }}
        >
            {children}
        </div>
    );
}

// ============================================================
// LUDO BOARD
// ============================================================

function LudoBoard({
    game,
    myId,
    onPawnClick,
    movingPawnId,
}) {
    const pawns =
        Array.isArray(game?.pawns)
            ? game.pawns
            : [];

    const pawnsByCell =
        new Map();

    const homePawns =
        new Map();

    const basePawns =
        {
            red: [],
            yellow: [],
            blue: [],
            green: [],
        };

    pawns.forEach(
        pawn => {
            if (
                pawn.state ===
                PAWN_STATE.BASE
            ) {
                if (
                    basePawns[pawn.camp]
                ) {
                    basePawns[
                        pawn.camp
                    ].push(pawn);
                }

                return;
            }

            if (
                pawn.state ===
                PAWN_STATE.HOME
            ) {
                const key =
                    `${pawn.camp}-${pawn.progress}`;

                if (
                    !homePawns.has(key)
                ) {
                    homePawns.set(
                        key,
                        []
                    );
                }

                homePawns
                    .get(key)
                    .push(pawn);

                return;
            }

            const boardPosition =
                getBoardPosition(
                    pawn
                );

            if (
                boardPosition === null
            ) {
                return;
            }

            const coords =
                TRACK_COORDS[
                    boardPosition
                ];

            if (!coords) {
                return;
            }

            const key =
                coordKey(
                    coords[0],
                    coords[1]
                );

            if (
                !pawnsByCell.has(
                    key
                )
            ) {
                pawnsByCell.set(
                    key,
                    []
                );
            }

            pawnsByCell
                .get(key)
                .push(pawn);
        }
    );

    const boardCells = [];

    // --------------------------------------------------------
    // Parcours
    // --------------------------------------------------------

    TRACK_COORDS.forEach(
        (coords, index) => {
            const key =
                coordKey(
                    coords[0],
                    coords[1]
                );

            const cellPawns =
                pawnsByCell.get(
                    key
                ) || [];

            const startCamp =
                Object.keys(
                    CAMP_OFFSETS
                ).find(
                    camp =>
                        CAMP_OFFSETS[
                            camp
                        ] === index
                );

            boardCells.push(
                <BoardCell
                    key={`track-${index}`}
                    row={coords[0]}
                    col={coords[1]}
                    className={[
                        "track-cell",
                        startCamp
                            ? `start-${startCamp}`
                            : "",
                    ]
                        .filter(Boolean)
                        .join(" ")}
                >
                    <div className="track-index">
                        {index + 1}
                    </div>

                    <div className="cell-pawns">
                        {cellPawns.map(
                            pawn => (
                                <Pawn
                                    key={
                                        pawn.id
                                    }
                                    pawn={
                                        pawn
                                    }
                                    moving={
                                        String(movingPawnId) === String(pawn.id)
                                    }
                                    clickable={
                                        Number(
                                            pawn.playerId
                                        ) ===
                                            Number(
                                                myId
                                            ) &&
                                        isLegalPawn(
                                            game,
                                            pawn.id
                                        )
                                    }
                                    onClick={() =>
                                        onPawnClick(
                                            pawn
                                        )
                                    }
                                />
                            )
                        )}
                    </div>
                </BoardCell>
            );
        }
    );

    // --------------------------------------------------------
    // Lignes finales
    // --------------------------------------------------------

    Object.entries(
        HOME_LANES
    ).forEach(
        ([camp, coords]) => {
            coords.forEach(
                (position, index) => {
                    const key =
                        `${camp}-home-${index}`;

                    const cellPawns =
                        homePawns.get(
                            `${camp}-${52 + index}`
                        ) || [];

                    boardCells.push(
                        <BoardCell
                            key={key}
                            row={
                                position[0]
                            }
                            col={
                                position[1]
                            }
                            className={[
                                "home-cell",
                                `home-${camp}`,
                            ].join(" ")}
                        >
                            <span className="home-step">
                                {index + 1}
                            </span>

                            <div className="cell-pawns">
                                {cellPawns.map(
                                    pawn => (
                                        <HomePawn
                                            key={
                                                pawn.id
                                            }
                                            pawn={
                                                pawn
                                            }
                                            moving={
                                                String(movingPawnId) === String(pawn.id)
                                            }
                                            clickable={
                                                Number(
                                                    pawn.playerId
                                                ) ===
                                                    Number(
                                                        myId
                                                    ) &&
                                                isLegalPawn(
                                                    game,
                                                    pawn.id
                                                )
                                            }
                                            onClick={() =>
                                                onPawnClick(
                                                    pawn
                                                )
                                            }
                                        />
                                    )
                                )}
                            </div>
                        </BoardCell>
                    );
                }
            );
        }
    );

    // --------------------------------------------------------
    // Centre
    // --------------------------------------------------------

    boardCells.push(
        <BoardCell
            key="center"
            row={7}
            col={7}
            className="ludo-center-home"
        >
            <div className="ludo-center-triangle red-triangle" />
            <div className="ludo-center-triangle green-triangle" />
            <div className="ludo-center-triangle yellow-triangle" />
            <div className="ludo-center-triangle blue-triangle" />

            <div className="ludo-center-logo">
                <span>6</span>
            </div>
        </BoardCell>
    );

    return (
        <div className="ludo-board-shell">
            <div className="ludo-board">
                {boardCells}

                <BaseZone
                    camp="red"
                    pawns={
                        basePawns.red
                    }
                    legalPawnIds={
                        game?.legalPawnIds
                    }
                    onPawnClick={
                        onPawnClick
                    }
                    movingPawnId={movingPawnId}
                />

                <BaseZone
                    camp="green"
                    pawns={
                        basePawns.green
                    }
                    legalPawnIds={
                        game?.legalPawnIds
                    }
                    onPawnClick={
                        onPawnClick
                    }
                    movingPawnId={movingPawnId}
                />

                <BaseZone
                    camp="yellow"
                    pawns={
                        basePawns.yellow
                    }
                    legalPawnIds={
                        game?.legalPawnIds
                    }
                    onPawnClick={
                        onPawnClick
                    }
                    movingPawnId={movingPawnId}
                />

                <BaseZone
                    camp="blue"
                    pawns={
                        basePawns.blue
                    }
                    legalPawnIds={
                        game?.legalPawnIds
                    }
                    onPawnClick={
                        onPawnClick
                    }
                    movingPawnId={movingPawnId}
                />
            </div>
        </div>
    );
}

// ============================================================
// MODE CARD
// ============================================================

function ModeCard({
    mode,
    selected,
    onClick,
    title,
    description,
    icon,
    paid,
}) {
    return (
        <button
            type="button"
            className={[
                "ludo-mode-card",
                selected
                    ? "is-selected"
                    : "",
            ]
                .filter(Boolean)
                .join(" ")}
            onClick={onClick}
        >
            <div className="ludo-mode-icon">
                {icon}
            </div>

            <div className="ludo-mode-content">
                <strong>{title}</strong>

                <span>
                    {description}
                </span>

                <small>
                    {paid
                        ? "Mise minimum : 500"
                        : "Gratuit"}
                </small>
            </div>

            <div className="ludo-mode-radio">
                {selected ? "✓" : ""}
            </div>
        </button>
    );
}

// ============================================================
// CREATE PANEL
// ============================================================

function CreateMatchPanel({
    mode,
    setMode,
    stake,
    setStake,
    creating,
    onCreate,
}) {
    const isTraining =
        mode === MODES.TRAINING;

    return (
        <section className="ludo-create-panel">
            <div className="ludo-section-heading">
                <span className="ludo-kicker">
                    NOUVELLE PARTIE
                </span>

                <h2>
                    Choisis ton expérience
                </h2>

                <p>
                    Crée une partie et
                    lance ton aventure
                    Ludo.
                </p>
            </div>

            <div className="ludo-mode-grid">
                <ModeCard
                    mode={MODES.USER}
                    selected={
                        mode ===
                        MODES.USER
                    }
                    onClick={() =>
                        setMode(
                            MODES.USER
                        )
                    }
                    title="Joueur"
                    description="Affronte un autre joueur."
                    icon="⚔️"
                    paid
                />

                <ModeCard
                    mode={MODES.AI}
                    selected={
                        mode ===
                        MODES.AI
                    }
                    onClick={() =>
                        setMode(
                            MODES.AI
                        )
                    }
                    title="Intelligence artificielle"
                    description="Affronte le Bot Ludo."
                    icon="🤖"
                    paid
                />

                <ModeCard
                    mode={
                        MODES.TRAINING
                    }
                    selected={
                        mode ===
                        MODES.TRAINING
                    }
                    onClick={() =>
                        setMode(
                            MODES.TRAINING
                        )
                    }
                    title="Entraînement"
                    description="Apprends sans miser."
                    icon="🎯"
                    paid={false}
                />
            </div>

            <div className="ludo-stake-box">
                <div>
                    <span>
                        MONTANT DE LA
                        MISE
                    </span>

                    <strong>
                        {isTraining
                            ? "GRATUIT"
                            : `${formatMoney(
                                  stake
                              )} FC`}
                    </strong>
                </div>

                {!isTraining && (
                    <input
                        type="number"
                        min={MIN_STAKE}
                        step="100"
                        value={stake}
                        onChange={event =>
                            setStake(
                                Math.max(
                                    MIN_STAKE,
                                    Number(
                                        event
                                            .target
                                            .value ||
                                            MIN_STAKE
                                    )
                                )
                            )
                        }
                    />
                )}
            </div>

            <button
                type="button"
                className="ludo-primary-button"
                onClick={onCreate}
                disabled={creating}
            >
                {creating
                    ? "Création..."
                    : isTraining
                    ? "Commencer l'entraînement"
                    : "Créer la partie"}
            </button>
        </section>
    );
}

// ============================================================
// OPEN MATCHES
// ============================================================

function MatchLobby({
    matches,
    loading,
    joiningId,
    onRefresh,
    onJoin,
}) {
    return (
        <section className="ludo-lobby-panel">
            <div className="ludo-section-heading inline">
                <div>
                    <span className="ludo-kicker">
                        LOBBY
                    </span>

                    <h2>
                        Parties disponibles
                    </h2>
                </div>

                <button
                    type="button"
                    className="ludo-secondary-button"
                    onClick={onRefresh}
                    disabled={loading}
                >
                    ↻ Actualiser
                </button>
            </div>

            {loading ? (
                <div className="ludo-empty-state">
                    <div className="ludo-loader" />
                    <span>
                        Recherche des
                        parties...
                    </span>
                </div>
            ) : matches.length === 0 ? (
                <div className="ludo-empty-state">
                    <div className="ludo-empty-icon">
                        ♟
                    </div>

                    <strong>
                        Aucune partie
                        ouverte
                    </strong>

                    <span>
                        Crée une partie
                        Joueur pour
                        apparaître ici.
                    </span>
                </div>
            ) : (
                <div className="ludo-match-list">
                    {matches.map(
                        match => {
                            const id =
                                getMatchId(
                                    match
                                );

                            const creator =
                                getPlayerIdFromMatch(
                                    match
                                );

                            const matchMode =
                                getModeFromMatch(
                                    match
                                );

                            const stake =
                                match.stake ??
                                match.bet_amount ??
                                match.amount ??
                                0;

                            return (
                                <div
                                    className="ludo-match-row"
                                    key={id}
                                >
                                    <div className="ludo-match-avatar">
                                        ♟
                                    </div>

                                    <div className="ludo-match-info">
                                        <strong>
                                            Joueur #
                                            {creator ||
                                                "—"}
                                        </strong>

                                        <span>
                                            En attente d'un adversaire • Ludo 6
                                        </span>
                                    </div>

                                    <div className="ludo-match-meta">
                                        <strong>
                                            {formatMoney(
                                                stake
                                            )}{" "}
                                            FC
                                        </strong>

                                        <span>
                                            {matchMode.toUpperCase()}
                                        </span>
                                    </div>

                                    <button
                                        type="button"
                                        className="ludo-join-button"
                                        disabled={
                                            joiningId ===
                                            id
                                        }
                                        onClick={() =>
                                            onJoin(
                                                id
                                            )
                                        }
                                    >
                                        {joiningId ===
                                        id
                                            ? "Connexion..."
                                            : "Rejoindre"}
                                    </button>
                                </div>
                            );
                        }
                    )}
                </div>
            )}
        </section>
    );
}

// ============================================================
// WAITING SCREEN
// ============================================================

function WaitingRoom({
    game,
    matchId,
    mode,
    onCancel,
}) {
    const isTraining =
        mode === MODES.TRAINING;

    const isAI =
        mode === MODES.AI;

    return (
        <div className="ludo-waiting-screen">
            <div className="ludo-waiting-card">
                <div className="ludo-waiting-orbit">
                    <div className="ludo-waiting-die">
                        🎲
                    </div>
                </div>

                <span className="ludo-kicker">
                    PARTIE #{matchId}
                </span>

                <h2>
                    {isAI
                        ? "Préparation du Bot..."
                        : isTraining
                        ? "Préparation de l'entraînement..."
                        : "En attente de l'adversaire"}
                </h2>

                <p>
                    {isAI
                        ? "La partie va démarrer automatiquement."
                        : isTraining
                        ? "La partie gratuite va démarrer automatiquement."
                        : "Partage cette partie avec ton adversaire. Elle commencera dès sa jonction."}
                </p>

                <div className="ludo-waiting-status">
                    <div className="ludo-player-slot active">
                        <span className="player-color red" />
                        <strong>
                            Joueur 1
                        </strong>
                        <small>
                            Prêt
                        </small>
                    </div>

                    <div className="ludo-vs">
                        VS
                    </div>

                    <div
                        className={`ludo-player-slot ${
                            game?.player2Id
                                ? "active"
                                : ""
                        }`}
                    >
                        <span className="player-color blue" />

                        <strong>
                            {game?.player2Id
                                ? "Adversaire"
                                : "En attente"}
                        </strong>

                        <small>
                            {game?.player2Id
                                ? "Connecté"
                                : "Recherche..."}
                        </small>
                    </div>
                </div>

                {!game?.player2Id &&
                    !isAI &&
                    !isTraining && (
                        <div className="ludo-waiting-dots">
                            <span />
                            <span />
                            <span />
                        </div>
                    )}

                <button
                    type="button"
                    className="ludo-secondary-button"
                    onClick={onCancel}
                >
                    Quitter le lobby
                </button>
            </div>
        </div>
    );
}

// ============================================================
// GAME HUD
// ============================================================

function PlayerPanel({
    playerNumber,
    playerId,
    active,
    isMe,
    team,
    completed,
}) {
    const isBot =
        Number(playerId) === AI_ID;

    return (
        <div
            className={[
                "ludo-player-panel",
                active
                    ? "is-active"
                    : "",
                isMe ? "is-me" : "",
            ]
                .filter(Boolean)
                .join(" ")}
        >
            <div className="ludo-player-icon">
                {isBot ? "🤖" : "♟"}
            </div>

            <div className="ludo-player-data">
                <span>
                    {playerNumber === 1
                        ? "Joueur 1"
                        : "Joueur 2"}
                </span>

                <strong>
                    {isBot
                        ? "Ludo Bot"
                        : isMe
                        ? "Vous"
                        : `Joueur #${playerId}`}
                </strong>

                <small>
                    {TEAM_LABELS[
                        team
                    ] || "Équipe"}
                </small>
            </div>

            <div className="ludo-completed-count">
                <strong>
                    {completed}
                </strong>
                <span>/ 8</span>
            </div>
        </div>
    );
}

// ============================================================
// GAME
// ============================================================

function GameView({
    game,
    myId,
    onRoll,
    onPawnClick,
    rolling,
    remainingSeconds,
    movingPawnId,
    diceAnimationValue,
}) {
    const myTurn =
        Number(
            game?.currentPlayerId
        ) === Number(myId);

    const diceRolled =
        Boolean(game?.dice?.rolled);

    const legalPawnCount =
        game?.legalPawnIds?.length ||
        0;

    const player1Completed =
        game?.pawns?.filter(
            pawn =>
                Number(
                    pawn.playerId
                ) ===
                    Number(
                        game.player1Id
                    ) &&
                pawn.completed
        ).length || 0;

    const player2Completed =
        game?.pawns?.filter(
            pawn =>
                Number(
                    pawn.playerId
                ) ===
                    Number(
                        game.player2Id
                    ) &&
                pawn.completed
        ).length || 0;

    const canRoll =
        myTurn &&
        !diceRolled &&
        game?.status ===
            GAME_STATUS.PLAYING;

    return (
        <div className="ludo-game">
            <header className="ludo-game-header">
                <div>
                    <span className="ludo-kicker">
                        LUDO LIVE
                    </span>

                    <h1>
                        Partie #
                        {game.matchId}
                    </h1>
                </div>

                <div className="ludo-live-status">
                    <span className="live-dot" />
                    EN DIRECT
                </div>
            </header>

            <div className="ludo-game-layout">
                <aside className="ludo-side-panel left">
                    <PlayerPanel
                        playerNumber={1}
                        playerId={
                            game.player1Id
                        }
                        active={
                            Number(
                                game.currentPlayerId
                            ) ===
                            Number(
                                game.player1Id
                            )
                        }
                        isMe={
                            Number(
                                myId
                            ) ===
                            Number(
                                game.player1Id
                            )
                        }
                        team="red_yellow"
                        completed={
                            player1Completed
                        }
                    />

                    <div className="ludo-team-card red-yellow">
                        <span>RED</span>
                        <span>+</span>
                        <span>YELLOW</span>
                    </div>
                </aside>

                <main className="ludo-main-board">
                    <LudoBoard
                        game={game}
                        myId={myId}
                        onPawnClick={
                            onPawnClick
                        }
                        movingPawnId={movingPawnId}
                    />
                </main>

                <aside className="ludo-side-panel right">
                    <PlayerPanel
                        playerNumber={2}
                        playerId={
                            game.player2Id
                        }
                        active={
                            Number(
                                game.currentPlayerId
                            ) ===
                            Number(
                                game.player2Id
                            )
                        }
                        isMe={
                            Number(
                                myId
                            ) ===
                            Number(
                                game.player2Id
                            )
                        }
                        team="blue_green"
                        completed={
                            player2Completed
                        }
                    />

                    <div className="ludo-team-card blue-green">
                        <span>BLUE</span>
                        <span>+</span>
                        <span>GREEN</span>
                    </div>
                </aside>
            </div>

            <section className="ludo-control-bar">
                <div className="ludo-turn-info">
                    <div
                        className={[
                            "ludo-turn-indicator",
                            myTurn
                                ? "my-turn"
                                : "",
                        ]
                            .filter(Boolean)
                            .join(" ")}
                    >
                        <span className="turn-pulse" />

                        <div>
                            <small>
                                TOUR #
                                {
                                    game.currentTurnNumber
                                }
                            </small>

                            <strong>
                                {myTurn
                                    ? "À vous de jouer"
                                    : `Tour du joueur ${
                                          Number(
                                              game.currentPlayerId
                                          ) ===
                                          Number(
                                              game.player1Id
                                          )
                                              ? "1"
                                              : "2"
                                      }`}
                            </strong>
                        </div>
                    </div>

                    <div className="ludo-timer">
                        <span>⏱</span>

                        <strong>
                            {remainingSeconds}
                            s
                        </strong>
                    </div>
                </div>

                <button
                    type="button"
                    className={`ludo-dice-zone ${
                        canRoll && !rolling
                            ? "is-clickable"
                            : ""
                    }`}
                    onClick={onRoll}
                    disabled={!canRoll || rolling}
                    aria-label="Lancer le dé Ludo"
                >
                    <DiceFace
                        value={
                            rolling
                                ? diceAnimationValue
                                : game?.dice?.value
                        }
                        rolling={
                            rolling
                        }
                    />

                    <div className="ludo-dice-caption">
                        {game?.dice
                            ?.value
                            ? `Résultat : ${game.dice.value}`
                            : myTurn
                            ? "Cliquez sur le dé"
                            : "Dé de l'adversaire"}
                    </div>
                </button>

                <div className="ludo-action-zone">
                    {!diceRolled ? (
                        <div className="ludo-move-hint">
                            {rolling
                                ? "Le dé tourne..."
                                : myTurn
                                ? "Cliquez sur le dé pour jouer"
                                : "Attendez votre tour"}
                        </div>
                    ) : (
                        <div className="ludo-move-hint">
                            {legalPawnCount > 0
                                ? "Choisissez un de vos pions lumineux"
                                : "Aucun mouvement disponible"}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}

// ============================================================
// RESULT SCREEN
// ============================================================

function ResultScreen({
    game,
    result,
    myId,
    onBack,
}) {
    const winnerId =
        result?.winnerId ??
        game?.winnerId;

    const winnerTeam =
        result?.winningTeam ??
        game?.winningTeam;

    const won =
        Number(winnerId) ===
        Number(myId);

    const isTimeout =
        result?.reason ===
        "90_seconds_timeout";

    return (
        <div className="ludo-result-screen">
            <div
                className={[
                    "ludo-result-card",
                    won
                        ? "is-win"
                        : "is-loss",
                ].join(" ")}
            >
                <div className="ludo-result-icon">
                    {won ? "🏆" : "🎲"}
                </div>

                <span className="ludo-kicker">
                    PARTIE TERMINÉE
                </span>

                <h1>
                    {won
                        ? "Victoire !"
                        : "Partie terminée"}
                </h1>

                <p>
                    {isTimeout
                        ? "La partie s'est terminée par expiration du temps."
                        : `Équipe gagnante : ${
                              TEAM_LABELS[
                                  winnerTeam
                              ] ||
                              winnerTeam ||
                              "—"
                          }`}
                </p>

                <div className="ludo-result-team">
                    <strong>
                        {TEAM_LABELS[
                            winnerTeam
                        ] ||
                            winnerTeam ||
                            "Équipe"}
                    </strong>
                </div>

                <button
                    type="button"
                    className="ludo-primary-button"
                    onClick={onBack}
                >
                    Retour au Ludo
                </button>
            </div>
        </div>
    );
}

// ============================================================
// RULES
// ============================================================

function RulesPanel() {
    return (
        <section className="ludo-rules-panel">
            <div className="ludo-section-heading">
                <span className="ludo-kicker">
                    RÈGLES
                </span>

                <h2>
                    Comment jouer ?
                </h2>
            </div>

            <div className="ludo-rules-grid">
                <article>
                    <span>01</span>
                    <strong>
                        Sortie
                    </strong>
                    <p>
                        Un pion sort de
                        sa base uniquement
                        avec un 6.
                    </p>
                </article>

                <article>
                    <span>02</span>
                    <strong>
                        Équipes
                    </strong>
                    <p>
                        RED + YELLOW
                        jouent ensemble
                        contre BLUE +
                        GREEN.
                    </p>
                </article>

                <article>
                    <span>03</span>
                    <strong>
                        Capture
                    </strong>
                    <p>
                        Les pions alliés
                        ne se capturent
                        jamais.
                    </p>
                </article>

                <article>
                    <span>04</span>
                    <strong>
                        Arrivée
                    </strong>
                    <p>
                        Le pion doit
                        atteindre exactement
                        sa maison finale.
                    </p>
                </article>

                <article>
                    <span>05</span>
                    <strong>
                        Six
                    </strong>
                    <p>
                        Un 6 donne un
                        tour supplémentaire.
                    </p>
                </article>

                <article>
                    <span>06</span>
                    <strong>
                        Victoire
                    </strong>
                    <p>
                        Les 8 pions de
                        ton équipe doivent
                        être terminés.
                    </p>
                </article>
            </div>
        </section>
    );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function Ludo() {
    const socketRef =
        useRef(null);

    const mountedRef =
        useRef(true);

    const timerRef =
        useRef(null);

    const [view, setView] =
        useState("lobby");

    const [mode, setMode] =
        useState(MODES.USER);

    const [stake, setStake] =
        useState(MIN_STAKE);

    const [matches, setMatches] =
        useState([]);

    const [matchesLoading, setMatchesLoading] =
        useState(false);

    const [joiningId, setJoiningId] =
        useState(null);

    const [creating, setCreating] =
        useState(false);

    const [matchId, setMatchId] =
        useState(null);

    const [game, setGame] =
        useState(null);

    const [myId, setMyId] =
        useState(null);

    const [error, setError] =
        useState("");

    const [rolling, setRolling] =
        useState(false);

    const [remainingSeconds, setRemainingSeconds] =
        useState(90);

    const [result, setResult] =
        useState(null);

    const [movingPawnId, setMovingPawnId] =
        useState(null);

    const [diceAnimationValue, setDiceAnimationValue] =
        useState(1);

    useEffect(() => {
        const id = getCurrentUserId();
        if (id) setMyId(id);
    }, []);

    // ========================================================
    // SAFE STATE
    // ========================================================

    const applyGameState =
        useCallback(
            nextState => {
                if (!mountedRef.current) {
                    return;
                }

                if (!nextState) {
                    return;
                }

                const state =
                    nextState.state ??
                    nextState;

                if (!state) {
                    return;
                }

                const normalizedState = {
                    ...state,
                    pawns:
                        Array.isArray(state.pawns) &&
                        state.pawns.length
                            ? state.pawns
                            : createInitialPawns(
                                state.player1Id ?? state.player1_id,
                                state.player2Id ?? state.player2_id
                            ),
                };

                setGame(normalizedState);

                const id =
                    getMatchId(
                        state
                    );

                if (id) {
                    setMatchId(id);
                }

                const status = String(
                    state.status || ""
                ).toLowerCase();

                if (
                    status === GAME_STATUS.WAITING ||
                    status === GAME_STATUS.STARTING ||
                    status === "open" ||
                    status === "pending"
                ) {
                    setView("waiting");
                }

                if (
                    status === GAME_STATUS.PLAYING
                ) {
                    setView("game");
                }

                if (
                    status === GAME_STATUS.FINISHED ||
                    status === GAME_STATUS.TIMEOUT ||
                    status === GAME_STATUS.ABORTED
                ) {
                    setView("finished");
                }

                if (
                    state.turnDeadlineAt
                ) {
                    const deadline =
                        new Date(
                            state.turnDeadlineAt
                        ).getTime();

                    const seconds =
                        Math.max(
                            0,
                            Math.ceil(
                                (
                                    deadline -
                                    Date.now()
                                ) /
                                    1000
                            )
                        );

                    setRemainingSeconds(
                        seconds
                    );
                }
            },
            []
        );

    // ========================================================
    // SOCKET ERROR
    // ========================================================

    const handleSocketError =
        useCallback(
            payload => {
                const message =
                    payload?.message ||
                    "Une erreur Ludo est survenue.";

                setError(
                    message
                );

                setRolling(
                    false
                );
            },
            []
        );

    // ========================================================
    // LOAD OPEN MATCHES
    // ========================================================

    const loadMatches =
        useCallback(
            async () => {
                try {
                    setMatchesLoading(
                        true
                    );
                    setError("");

                    const response =
                        await getSacMatches(
                            GAME_ID
                        );

                    const list =
                        Array.isArray(
                            response
                        )
                            ? response
                            : response?.matches ||
                              response?.data ||
                              [];

                    const openMatches =
                        list.filter(
                            match => {
                                const status =
                                    getStatusFromMatch(
                                        match
                                    );

                                const mode =
                                    getModeFromMatch(
                                        match
                                    );

                                // Seules les parties USER
                                // attendent un adversaire.
                                if (
                                    mode !==
                                    MODES.USER
                                ) {
                                    return false;
                                }

                                if (
                                    status &&
                                    ![
                                        GAME_STATUS.WAITING,
                                        GAME_STATUS.STARTING,
                                        "open",
                                        "pending",
                                    ].includes(
                                        String(
                                            status
                                        ).toLowerCase()
                                    )
                                ) {
                                    return false;
                                }

                                // Le lobby ne montre que les parties
                                // réellement ouvertes à un adversaire.
                                const opponentId =
                                    getOpponentIdFromMatch(match);

                                if (opponentId) {
                                    return false;
                                }

                                const creatorId =
                                    getPlayerIdFromMatch(match);

                                if (
                                    myId &&
                                    creatorId &&
                                    Number(creatorId) === Number(myId)
                                ) {
                                    return false;
                                }

                                return true;
                            }
                        );

                    if (
                        mountedRef.current
                    ) {
                        setMatches(
                            openMatches
                        );
                    }
                } catch (err) {
                    console.error(
                        "[LUDO] load matches",
                        err
                    );

                    if (
                        mountedRef.current
                    ) {
                        setError(
                            err?.response
                                ?.data
                                ?.message ||
                                "Impossible de charger le lobby Ludo."
                        );
                    }
                } finally {
                    if (
                        mountedRef.current
                    ) {
                        setMatchesLoading(
                            false
                        );
                    }
                }
            },
            [myId]
        );

    // ========================================================
    // SOCKET SETUP
    // ========================================================

    const setupSocket =
        useCallback(
            () => {
                const socket =
                    connectLudo();

                if (!socket) {
                    throw new Error(
                        "Impossible d'initialiser le socket Ludo : token JWT absent."
                    );
                }

                socketRef.current =
                    socket;

                // --------------------------------------------
                // JOINED
                // --------------------------------------------

                socket.on(
                    SOCKET.JOINED,
                    payload => {
                        console.log(
                            "♟️ LUDO JOINED:",
                            payload
                        );

                        if (
                            payload?.playerId
                        ) {
                            setMyId(
                                Number(
                                    payload.playerId
                                )
                            );
                        }

                        if (
                            payload?.matchId
                        ) {
                            setMatchId(
                                Number(
                                    payload.matchId
                                )
                            );
                        }

                        if (
                            payload?.state
                        ) {
                            applyGameState(
                                payload.state
                            );
                        }
                    }
                );

                // --------------------------------------------
                // STATE
                // --------------------------------------------

                socket.on(
                    SOCKET.STATE_UPDATE,
                    payload => {
                        applyGameState(
                            payload
                        );
                    }
                );

                // --------------------------------------------
                // GAME STARTED
                // --------------------------------------------

                socket.on(
                    SOCKET.GAME_STARTED,
                    payload => {
                        console.log(
                            "🎲 LUDO STARTED:",
                            payload
                        );

                        applyGameState(
                            payload?.state ||
                                payload
                        );

                        setView(
                            "game"
                        );
                    }
                );

                // --------------------------------------------
                // ROLL
                // --------------------------------------------

                socket.on(
                    SOCKET.ROLL_RESULT,
                    payload => {
                        console.log(
                            "🎲 LUDO ROLL:",
                            payload
                        );

                        setRolling(
                            false
                        );

                        if (
                            payload?.state
                        ) {
                            applyGameState(
                                payload.state
                            );
                        }
                    }
                );

                // --------------------------------------------
                // MOVE
                // --------------------------------------------

                socket.on(
                    SOCKET.MOVE_RESULT,
                    payload => {
                        console.log(
                            "♟️ LUDO MOVE:",
                            payload
                        );

                        if (
                            payload?.state
                        ) {
                            applyGameState(
                                payload.state
                            );
                        }
                    }
                );

                // --------------------------------------------
                // FINISH
                // --------------------------------------------

                socket.on(
                    SOCKET.GAME_FINISHED,
                    payload => {
                        console.log(
                            "🏆 LUDO FINISHED:",
                            payload
                        );

                        setResult(
                            payload?.result ||
                                null
                        );

                        if (
                            payload?.state
                        ) {
                            applyGameState(
                                payload.state
                            );
                        }

                        setView(
                            "finished"
                        );
                    }
                );

                // --------------------------------------------
                // TIMEOUT
                // --------------------------------------------

                socket.on(
                    SOCKET.TIMEOUT,
                    payload => {
                        console.log(
                            "⏱️ LUDO TIMEOUT:",
                            payload
                        );

                        setResult(
                            payload?.result ||
                                null
                        );

                        if (
                            payload?.state
                        ) {
                            applyGameState(
                                payload.state
                            );
                        }

                        setView(
                            "finished"
                        );
                    }
                );

                // --------------------------------------------
                // BOT
                // --------------------------------------------

                socket.on(
                    SOCKET.BOT_RESULT,
                    payload => {
                        console.log(
                            "🤖 LUDO BOT:",
                            payload
                        );

                        if (
                            payload?.state
                        ) {
                            applyGameState(
                                payload.state
                            );
                        }

                        if (
                            payload?.result
                                ?.finished
                        ) {
                            setResult(
                                payload.result
                            );

                            setView(
                                "finished"
                            );
                        }
                    }
                );

                // --------------------------------------------
                // PLAYER LEFT
                // --------------------------------------------

                socket.on(
                    SOCKET.PLAYER_LEFT,
                    payload => {
                        console.log(
                            "🚪 LUDO PLAYER LEFT:",
                            payload
                        );

                        if (
                            mountedRef.current
                        ) {
                            setError(
                                "Un joueur a quitté la partie."
                            );
                        }
                    }
                );

                // --------------------------------------------
                // ERROR
                // --------------------------------------------

                socket.on(
                    SOCKET.ERROR,
                    handleSocketError
                );

                return socket;
            },
            [
                applyGameState,
                handleSocketError,
            ]
        );

    // ========================================================
    // SOCKET MOUNT
    // ========================================================

    useEffect(() => {
        mountedRef.current =
            true;

        let socket;

        try {
            socket =
                setupSocket();
        } catch (err) {
            console.error(
                "[LUDO] socket setup",
                err
            );

            setError(
                err?.message ||
                    "Connexion Socket.IO impossible."
            );
        }

        return () => {
            mountedRef.current = false;

            if (timerRef.current) {
                clearInterval(timerRef.current);
            }

            if (socket) {
                Object.values(SOCKET).forEach(
                    event => {
                        socket.off(event);
                    }
                );
            }

            disconnectLudo();

            socketRef.current = null;
        };
    }, [setupSocket]);

    // ========================================================
    // TIMER
    // ========================================================

    useEffect(() => {
        if (
            timerRef.current
        ) {
            clearInterval(
                timerRef.current
            );
        }

        if (
            !game?.turnDeadlineAt ||
            game.status !==
                GAME_STATUS.PLAYING
        ) {
            return undefined;
        }

        const updateTimer =
            () => {
                const deadline =
                    new Date(
                        game.turnDeadlineAt
                    ).getTime();

                const seconds =
                    Math.max(
                        0,
                        Math.ceil(
                            (
                                deadline -
                                Date.now()
                            ) /
                                1000
                        )
                    );

                setRemainingSeconds(
                    seconds
                );
            };

        updateTimer();

        timerRef.current =
            setInterval(
                updateTimer,
                1000
            );

        return () => {
            if (
                timerRef.current
            ) {
                clearInterval(
                    timerRef.current
                );
            }
        };
    }, [
        game?.turnDeadlineAt,
        game?.status,
    ]);

    useEffect(() => {
        if (!rolling) return undefined;

        const spin = setInterval(() => {
            setDiceAnimationValue(
                Math.floor(Math.random() * 6) + 1
            );
        }, 90);

        return () => clearInterval(spin);
    }, [rolling]);

    // ========================================================
    // CREATE MATCH
    // ========================================================

    const createMatch = useCallback(
        async () => {
            try {
                setError("");
                setCreating(true);

                const selectedMode =
                    normalizeMode(mode);

                const selectedStake =
                    selectedMode === MODES.TRAINING
                        ? 0
                        : Math.max(
                            MIN_STAKE,
                            Number(stake) ||
                                MIN_STAKE
                        );

                // ------------------------------------------------
                // 1. CRÉATION SAC
                // ------------------------------------------------

                const response =
                    await createSacMatch({
                        game: GAME_ID,
                        stake: selectedStake,
                        mode: selectedMode,
                    });

                console.log(
                    "🎲 LUDO SAC MATCH CREATED:",
                    response
                );

                // ------------------------------------------------
                // 2. RÉCUPÉRATION DE L'ID
                // ------------------------------------------------

                const id =
                    getMatchId(response);

                if (!id) {
                    throw new Error(
                        "Le SAC n'a pas retourné d'identifiant de partie."
                    );
                }

                // ------------------------------------------------
                // 3. RÉCUPÉRATION DU MATCH SAC
                // ------------------------------------------------

                const sacMatch =
                    getMatchObject(response);

                if (!sacMatch) {
                    throw new Error(
                        "Le SAC a créé la partie mais n'a retourné aucun objet match."
                    );
                }

                console.log(
                    "🎲 LUDO SAC MATCH NORMALIZED:",
                    sacMatch
                );

                // ------------------------------------------------
                // 4. CONSTRUIRE UN ÉTAT FRONTEND MINIMAL
                // ------------------------------------------------

                const players =
                    sacMatch.players || {};

                const player1Id =
                    normalizeId(
                        sacMatch.player1Id ??
                            sacMatch.player1_id ??
                            players.player1Id ??
                            players.player1 ??
                            players.creatorId ??
                            players.creator ??
                            sacMatch.creatorId ??
                            sacMatch.creator_id
                    ) || getCurrentUserId();

                const player2Id =
                    normalizeId(
                        sacMatch.player2Id ??
                            sacMatch.player2_id ??
                            players.player2Id ??
                            players.player2 ??
                            players.opponentId ??
                            sacMatch.opponentId ??
                            sacMatch.opponent_id
                    );

                const runtimeMatch = {
                    ...sacMatch,

                    // Identifiants utilisés par le frontend
                    matchId: id,

                    player1Id:
                        player1Id || null,

                    player2Id:
                        player2Id || null,

                    // État frontend explicite
                    status:
                        String(
                            sacMatch.status ||
                                GAME_STATUS.WAITING
                        ).toLowerCase(),

                    mode:
                        normalizeMode(
                            sacMatch.mode ||
                                selectedMode
                        ),

                    stake:
                        Number(
                            sacMatch.stake ??
                                selectedStake
                        ),

                    // Le moteur pourra les remplacer
                    currentPlayerId:
                        sacMatch.currentPlayerId ??
                        null,

                    currentTurnNumber:
                        sacMatch.currentTurnNumber ??
                        1,

                    pawns:
                        Array.isArray(
                            sacMatch.pawns
                        ) &&
                        sacMatch.pawns.length
                            ? sacMatch.pawns
                            : createInitialPawns(
                                player1Id,
                                player2Id
                            ),

                    legalPawnIds:
                        Array.isArray(
                            sacMatch.legalPawnIds
                        )
                            ? sacMatch.legalPawnIds
                            : [],

                    dice:
                        sacMatch.dice || {
                            value: null,
                            rolled: false,
                        },
                };

                console.log(
                    "🎲 LUDO FRONTEND RUNTIME:",
                    runtimeMatch
                );

                // ------------------------------------------------
                // 5. ÉTAT LOCAL
                // ------------------------------------------------

                setMatchId(id);

                setGame(
                    runtimeMatch
                );

                // IMPORTANT :
                // la partie vient d'être créée,
                // elle doit immédiatement afficher
                // WaitingRoom.
                setView(
                    "waiting"
                );

                // ------------------------------------------------
                // 6. SOCKET
                // ------------------------------------------------

                const socket =
                    socketRef.current ||
                    setupSocket();

                if (!socket) {
                    throw new Error(
                        "Socket Ludo indisponible après création."
                    );
                }

                // ------------------------------------------------
                // 7. JOIN DE LA ROOM
                // ------------------------------------------------

                socket.emit(
                    SOCKET.JOIN,
                    {
                        matchId: id,
                    },
                    joinResponse => {
                        console.log(
                            "♟️ LUDO CREATE JOIN ACK:",
                            joinResponse
                        );

                        if (
                            !joinResponse?.success
                        ) {
                            setError(
                                joinResponse?.message ||
                                    "Impossible de rejoindre la partie créée."
                            );

                            // On conserve WaitingRoom :
                            // la partie existe réellement.
                            setView(
                                "waiting"
                            );

                            return;
                        }

                        // ----------------------------------------
                        // PLAYER ID
                        // ----------------------------------------

                        if (
                            joinResponse.playerId
                        ) {
                            setMyId(
                                Number(
                                    joinResponse.playerId
                                )
                            );
                        }

                        // ----------------------------------------
                        // ÉTAT SOCKET
                        // ----------------------------------------

                        if (
                            joinResponse.state
                        ) {
                            applyGameState(
                                joinResponse.state
                            );
                        } else {
                            // Si le socket ne renvoie pas encore
                            // de runtime state, on reste dans
                            // WaitingRoom.
                            setView(
                                "waiting"
                            );
                        }

                        // ----------------------------------------
                        // AI / TRAINING
                        // ----------------------------------------

                        const socketState =
                            joinResponse?.state ||
                            runtimeMatch;

                        const player2 =
                            getOpponentIdFromMatch(
                                socketState
                            );

                        if (
                            selectedMode ===
                                MODES.AI ||
                            selectedMode ===
                                MODES.TRAINING
                        ) {
                            if (
                                Number(
                                    player2
                                ) !== AI_ID
                            ) {
                                console.warn(
                                    "[LUDO] AI/TRAINING : player2Id=9999 absent pour le moment."
                                );
                            }

                            socket.emit(
                                SOCKET.START,
                                {
                                    matchId: id,
                                },
                                startResponse => {
                                    console.log(
                                        "🎮 LUDO AUTO START:",
                                        startResponse
                                    );

                                    if (
                                        !startResponse?.success
                                    ) {
                                        setError(
                                            startResponse?.message ||
                                                "Le démarrage automatique a échoué."
                                        );

                                        setView(
                                            "waiting"
                                        );

                                        return;
                                    }

                                    if (
                                        startResponse.state
                                    ) {
                                        applyGameState(
                                            startResponse.state
                                        );
                                    }
                                }
                            );
                        }
                    }
                );
            } catch (err) {
                console.error(
                    "[LUDO] create",
                    err
                );

                setError(
                    err?.response?.data
                        ?.message ||
                        err?.message ||
                        "Impossible de créer la partie Ludo."
                );

                // En cas d'échec réel :
                // retour au lobby.
                setView(
                    "lobby"
                );
            } finally {
                setCreating(false);
            }
        },
        [
            mode,
            stake,
            setupSocket,
            applyGameState,
        ]
    );

    // ========================================================
    // JOIN MATCH
    // ========================================================

    const joinMatch =
        useCallback(
            async id => {
                try {
                    setError("");
                    setJoiningId(
                        id
                    );

                    const response =
                        await joinSacMatch(
                            {
                                game:
                                    GAME_ID,
                                matchId:
                                    id,
                            }
                        );

                    console.log(
                        "♟️ LUDO SAC JOIN:",
                        response
                    );

                    setMatchId(
                        id
                    );

                    const socket =
                        socketRef.current ||
                        setupSocket();

                    socket.emit(
                        SOCKET.JOIN,
                        {
                            matchId:
                                id,
                        },
                        joinResponse => {
                            console.log(
                                "♟️ LUDO SOCKET JOIN:",
                                joinResponse
                            );

                            if (
                                !joinResponse
                                    ?.success
                            ) {
                                setError(
                                    joinResponse?.message ||
                                        "Connexion à la partie impossible."
                                );

                                return;
                            }

                            if (
                                joinResponse
                                    ?.playerId
                            ) {
                                setMyId(
                                    Number(
                                        joinResponse.playerId
                                    )
                                );
                            }

                            if (
                                joinResponse
                                    ?.state
                            ) {
                                applyGameState(
                                    joinResponse.state
                                );
                            }

                            const joinedState =
                                joinResponse?.state;

                            // Le serveur a normalement
                            // déjà mis player2Id et
                            // peut considérer la partie
                            // comme prête.
                            if (
                                joinedState &&
                                joinedState
                                    .player2Id
                            ) {
                                setView(
                                    "waiting"
                                );

                                // Le joueur 1 est
                                // responsable du START.
                                if (
                                    Number(
                                        joinedState
                                            .player1Id
                                    ) ===
                                    Number(
                                        joinResponse
                                            .playerId
                                    ) &&
                                    [
                                        GAME_STATUS.STARTING,
                                        GAME_STATUS.WAITING,
                                    ].includes(
                                        joinedState.status
                                    )
                                ) {
                                    socket.emit(
                                        SOCKET.START,
                                        {
                                            matchId:
                                                id,
                                        },
                                        startResponse => {
                                            console.log(
                                                "🎮 LUDO START AFTER JOIN:",
                                                startResponse
                                            );

                                            if (
                                                !startResponse
                                                    ?.success
                                            ) {
                                                setError(
                                                    startResponse?.message ||
                                                        "Impossible de démarrer la partie."
                                                );

                                                return;
                                            }

                                            applyGameState(
                                                startResponse.state
                                            );
                                        }
                                    );
                                }
                            }
                        }
                    );

                    // Le response SAC est utile
                    // pour récupérer une première
                    // représentation même avant
                    // le socket.
                    const fresh =
                        response?.match ||
                        response?.data;

                    if (fresh) {
                        setGame(
                            fresh
                        );
                    }
                } catch (err) {
                    console.error(
                        "[LUDO] join",
                        err
                    );

                    setError(
                        err?.response
                            ?.data
                            ?.message ||
                            err?.message ||
                            "Impossible de rejoindre cette partie."
                    );
                } finally {
                    setJoiningId(
                        null
                    );
                }
            },
            [
                setupSocket,
                applyGameState,
            ]
        );

    // ========================================================
    // ROLL
    // ========================================================

    const rollDice =
        useCallback(
            () => {
                if (
                    !socketRef.current ||
                    !matchId
                ) {
                    return;
                }

                if (
                    Number(
                        game?.currentPlayerId
                    ) !==
                    Number(myId)
                ) {
                    return;
                }

                if (
                    game?.dice?.rolled
                ) {
                    return;
                }

                setError("");
                setRolling(
                    true
                );

                socketRef.current.emit(
                    SOCKET.ROLL,
                    {
                        matchId,
                    },
                    response => {
                        console.log(
                            "🎲 LUDO ROLL ACK:",
                            response
                        );

                        if (
                            !response
                                ?.success
                        ) {
                            setRolling(
                                false
                            );

                            setError(
                                response?.message ||
                                    "Le lancer a échoué."
                            );
                        }
                    }
                );
            },
            [
                matchId,
                game?.currentPlayerId,
                game?.dice?.rolled,
                myId,
            ]
        );

    // ========================================================
    // MOVE PAWN
    // ========================================================

    const movePawn =
        useCallback(
            pawn => {
                if (
                    !socketRef.current ||
                    !matchId ||
                    !pawn
                ) {
                    return;
                }

                if (
                    Number(
                        pawn.playerId
                    ) !==
                    Number(myId)
                ) {
                    return;
                }

                if (
                    !isLegalPawn(
                        game,
                        pawn.id
                    )
                ) {
                    return;
                }

                setError("");
                setMovingPawnId(pawn.id);

                window.setTimeout(() => {
                    setMovingPawnId(current =>
                        String(current) === String(pawn.id)
                            ? null
                            : current
                    );
                }, 900);

                socketRef.current.emit(
                    SOCKET.MOVE,
                    {
                        matchId,
                        pawnId:
                            pawn.id,
                    },
                    response => {
                        console.log(
                            "♟️ LUDO MOVE ACK:",
                            response
                        );

                        if (
                            !response
                                ?.success
                        ) {
                            setError(
                                response?.message ||
                                    "Déplacement impossible."
                            );
                        }
                    }
                );
            },
            [
                matchId,
                myId,
                game,
            ]
        );

    // ========================================================
    // RESTORE STATE
    // ========================================================

    const restoreState =
        useCallback(
            () => {
                if (
                    !socketRef.current ||
                    !matchId
                ) {
                    return;
                }

                socketRef.current.emit(
                    SOCKET.STATE,
                    {
                        matchId,
                    },
                    response => {
                        console.log(
                            "♻️ LUDO STATE ACK:",
                            response
                        );

                        if (
                            response
                                ?.success &&
                            response?.state
                        ) {
                            applyGameState(
                                response.state
                            );
                        }
                    }
                );
            },
            [
                matchId,
                applyGameState,
            ]
        );

    // ========================================================
    // AUTO REFRESH STATE
    // ========================================================

    useEffect(() => {
        if (
            !matchId ||
            !socketRef.current
        ) {
            return;
        }

        restoreState();
    }, [
        matchId,
        restoreState,
    ]);

    // ========================================================
    // LEAVE
    // ========================================================

    const leaveMatch =
        useCallback(
            () => {
                if (
                    socketRef.current &&
                    matchId
                ) {
                    socketRef.current.emit(
                        SOCKET.LEAVE,
                        {
                            matchId,
                        }
                    );
                }

                setMatchId(
                    null
                );

                setGame(
                    null
                );

                setResult(
                    null
                );

                setMyId(
                    null
                );

                setError("");

                setView(
                    "lobby"
                );

                loadMatches();
            },
            [
                matchId,
                loadMatches,
            ]
        );

    // ========================================================
    // LOAD LOBBY
    // ========================================================

    useEffect(() => {
        if (
            view === "lobby"
        ) {
            loadMatches();
        }
    }, [
        view,
        loadMatches,
    ]);

    // Actualisation légère du lobby : une partie créée par
    // un autre joueur apparaît sans recharger la page.
   

    // ========================================================
    // COMPUTED
    // ========================================================

    const selectedModeLabel =
        useMemo(() => {
            if (
                mode ===
                MODES.AI
            ) {
                return "IA";
            }

            if (
                mode ===
                MODES.TRAINING
            ) {
                return "ENTRAÎNEMENT";
            }

            return "JOUEUR";
        }, [mode]);

    // ========================================================
    // RENDER
    // ========================================================

    return (
        <div className="ludo-page">
            <div className="ludo-background-glow glow-one" />
            <div className="ludo-background-glow glow-two" />

            <header className="ludo-page-header">
                <div className="ludo-brand">
                    <div className="ludo-brand-mark">
                        6
                    </div>

                    <div>
                        <span>
                            6BetBall
                        </span>

                        <strong>
                            LUDO
                        </strong>
                    </div>
                </div>

                {view !== "game" &&
                    view !==
                        "finished" && (
                        <div className="ludo-header-pills">
                            <span>
                                🎲 6 faces
                            </span>

                            <span>
                                👥 2 joueurs
                            </span>

                            <span>
                                ⏱ 90s / tour
                            </span>
                        </div>
                    )}

                {matchId && (
                    <div className="ludo-match-badge">
                        MATCH #
                        {matchId}
                    </div>
                )}
            </header>

            {error && (
                <div className="ludo-error">
                    <span>!</span>

                    <div>
                        <strong>
                            Attention
                        </strong>

                        <p>
                            {error}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() =>
                            setError(
                                ""
                            )
                        }
                    >
                        ×
                    </button>
                </div>
            )}

            {view ===
                "lobby" && (
                <main className="ludo-lobby-page">
                    <section className="ludo-hero">
                        <div className="ludo-hero-copy">
                            <span className="ludo-kicker">
                                LE LUDO
                                COMPÉTITIF
                            </span>

                            <h1>
                                Tes pions.
                                <br />
                                <span>
                                    Ton équipe.
                                </span>
                                <br />
                                Ta victoire.
                            </h1>

                            <p>
                                Un Ludo
                                stratégique
                                en équipes,
                                où RED +
                                YELLOW
                                affrontent
                                BLUE +
                                GREEN.
                            </p>

                            <div className="ludo-hero-stats">
                                <div>
                                    <strong>
                                        16
                                    </strong>
                                    <span>
                                        pions
                                    </span>
                                </div>

                                <div>
                                    <strong>
                                        52
                                    </strong>
                                    <span>
                                        cases
                                    </span>
                                </div>

                                <div>
                                    <strong>
                                        90s
                                    </strong>
                                    <span>
                                        par tour
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="ludo-hero-board">
                            <div className="ludo-mini-board">
                                <div className="mini-red" />
                                <div className="mini-green" />
                                <div className="mini-yellow" />
                                <div className="mini-blue" />

                                <div className="mini-center">
                                    6
                                </div>
                            </div>
                        </div>
                    </section>

                    <div className="ludo-lobby-grid">
                        <CreateMatchPanel
                            mode={mode}
                            setMode={
                                setMode
                            }
                            stake={stake}
                            setStake={
                                setStake
                            }
                            creating={
                                creating
                            }
                            onCreate={
                                createMatch
                            }
                        />

                        <MatchLobby
                            matches={
                                matches
                            }
                            loading={
                                matchesLoading
                            }
                            joiningId={
                                joiningId
                            }
                            onRefresh={
                                loadMatches
                            }
                            onJoin={
                                joinMatch
                            }
                        />
                    </div>

                    <RulesPanel />

                    <footer className="ludo-footer-note">
                        Mode sélectionné :
                        <strong>
                            {selectedModeLabel}
                        </strong>
                        <span>
                            • Mise minimum
                            500 FC sauf
                            entraînement
                            gratuit
                        </span>
                    </footer>
                </main>
            )}

            {view ===
                "waiting" && (
                <WaitingRoom
                    game={game}
                    matchId={
                        matchId
                    }
                    mode={
                        game?.mode ||
                        mode
                    }
                    onCancel={
                        leaveMatch
                    }
                />
            )}

            {view ===
                "game" &&
                game && (
                    <GameView
                        game={game}
                        myId={myId}
                        onRoll={
                            rollDice
                        }
                        onPawnClick={
                            movePawn
                        }
                        rolling={
                            rolling
                        }
                        movingPawnId={movingPawnId}
                        diceAnimationValue={diceAnimationValue}
                        remainingSeconds={
                            remainingSeconds
                        }
                    />
                )}

            {view ===
                "finished" &&
                game && (
                    <ResultScreen
                        game={game}
                        result={
                            result
                        }
                        myId={myId}
                        onBack={
                            leaveMatch
                        }
                    />
                )}
        </div>
    );
}

