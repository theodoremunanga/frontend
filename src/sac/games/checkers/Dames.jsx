import React, {
    memo,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import { getSacMatch } from "../../sacApi";
import { createAvis } from "../../../services/avisApi";

import {
    connectDamesSocket,
    joinDamesMatch,
    sendDamesMove,
    sendDamesChat,
    sendDamesTyping,
    disconnectDamesSocket,
} from "./damesSocket";

import "./Dames.css";

// ======================================================
// CONSTANTS
// ======================================================

const BOARD_SIZE = 10;

const PLAYER_1 = 1;
const PLAYER_2 = 2;

const KING_1 = 3;
const KING_2 = 4;

const MAX_CHAT_LENGTH = 300;
const MAX_MESSAGES = 100;

const MATCH_REFRESH = 1500;
const MOVE_TIMEOUT = 7000;

// ======================================================
// INITIAL BOARD
// ======================================================

function createInitialBoard() {
    const board = Array.from(
        { length: BOARD_SIZE },
        () => Array(BOARD_SIZE).fill(0)
    );

    // Joueur 2
    for (let row = 0; row < 4; row += 1) {
        for (let col = 0; col < BOARD_SIZE; col += 1) {
            if ((row + col) % 2 === 1) {
                board[row][col] = PLAYER_2;
            }
        }
    }

    // Joueur 1
    for (let row = 6; row < BOARD_SIZE; row += 1) {
        for (let col = 0; col < BOARD_SIZE; col += 1) {
            if ((row + col) % 2 === 1) {
                board[row][col] = PLAYER_1;
            }
        }
    }

    return board;
}

// ======================================================
// HELPERS
// ======================================================

function sanitizeText(value, max = MAX_CHAT_LENGTH) {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/[<>]/g, "")
        .trim()
        .slice(0, max);
}

function normalizeMode(config = {}) {
    const raw = String(
        config?.mode ||
        config?.gameMode ||
        config?.type ||
        ""
    ).toLowerCase();

    if (
        raw === "ai" ||
        raw === "ia" ||
        raw === "computer" ||
        raw === "bot"
    ) {
        return "IA";
    }

    if (
        raw === "training" ||
        raw === "entrainement" ||
        raw === "entrain"
    ) {
        return "TRAINING";
    }

    return "USER";
}

function isValidBoard(board) {
    if (!Array.isArray(board) || board.length !== BOARD_SIZE) {
        return false;
    }

    return board.every(
        (row) =>
            Array.isArray(row) &&
            row.length === BOARD_SIZE &&
            row.every((cell) => {
                const value = Number(cell);

                return (
                    value === 0 ||
                    value === PLAYER_1 ||
                    value === PLAYER_2 ||
                    value === KING_1 ||
                    value === KING_2
                );
            })
    );
}

function normalizePosition(position) {
    if (!position) {
        return null;
    }

    if (
        typeof position === "object" &&
        !Array.isArray(position)
    ) {
        const row =
            position.r ??
            position.row ??
            position.y;

        const col =
            position.c ??
            position.col ??
            position.x;

        const r = Number(row);
        const c = Number(col);

        if (
            Number.isInteger(r) &&
            Number.isInteger(c) &&
            r >= 0 &&
            r < BOARD_SIZE &&
            c >= 0 &&
            c < BOARD_SIZE
        ) {
            return { r, c };
        }

        return null;
    }

    if (Array.isArray(position) && position.length >= 2) {
        const r = Number(position[0]);
        const c = Number(position[1]);

        if (
            Number.isInteger(r) &&
            Number.isInteger(c) &&
            r >= 0 &&
            r < BOARD_SIZE &&
            c >= 0 &&
            c < BOARD_SIZE
        ) {
            return { r, c };
        }
    }

    return null;
}

function normalizeMove(move) {
    if (!move || typeof move !== "object") {
        return null;
    }

    const from = normalizePosition(
        move.from ||
        move.start ||
        move.origin ||
        move.source
    );

    const rawPath =
        move.path ||
        move.positions ||
        move.route ||
        move.steps;

    const path = Array.isArray(rawPath)
        ? rawPath
            .map(normalizePosition)
            .filter(Boolean)
        : [];

    const rawTo =
        move.to ||
        move.destination ||
        move.end ||
        path[path.length - 1];

    const to = normalizePosition(rawTo);

    if (!from || !to) {
        return null;
    }

    return {
        id:
            move.id ??
            move.moveId ??
            move.move_id ??
            null,

        from,

        path:
            path.length > 0
                ? path
                : [to],

        to,
    };
}

function isValidMove(move) {
    return Boolean(
        move &&
        normalizePosition(move.from) &&
        normalizePosition(move.to)
    );
}

function normalizeMoves(data) {
    const candidates = [
        data?.allMoves,
        data?.validMoves,
        data?.moves,
        data?.possibleMoves,
        data?.legalMoves,

        data?.state?.allMoves,
        data?.state?.validMoves,
        data?.state?.moves,
        data?.state?.possibleMoves,
        data?.state?.legalMoves,

        data?.game?.allMoves,
        data?.game?.validMoves,
        data?.game?.moves,
        data?.game?.possibleMoves,
        data?.game?.legalMoves,

        data?.match?.allMoves,
        data?.match?.validMoves,
        data?.match?.moves,
        data?.match?.possibleMoves,
        data?.match?.legalMoves,
    ];

    const found = candidates.find(
        (value) => Array.isArray(value)
    );

    if (!Array.isArray(found)) {
        return [];
    }

    return found
        .map(normalizeMove)
        .filter(Boolean);
}

function samePosition(a, b) {
    if (!a || !b) {
        return false;
    }

    return (
        Number(a.r) === Number(b.r) &&
        Number(a.c) === Number(b.c)
    );
}

function getPlayerName(
    player,
    fallback = "Joueur"
) {
    if (!player) {
        return fallback;
    }

    if (typeof player === "string") {
        return sanitizeText(player) || fallback;
    }

    return (
        sanitizeText(
            player.username ||
            player.name ||
            player.displayName ||
            player.pseudo
        ) ||
        fallback
    );
}

function normalizeSacPayload(payload) {
    if (!payload) {
        return null;
    }

    if (payload.data) {
        return payload.data;
    }

    if (payload.match) {
        return payload.match;
    }

    return payload;
}

function getGameState(data) {
    if (!data) {
        return {};
    }

    return (
        data.state ||
        data.game ||
        data.match ||
        data.data ||
        data
    );
}

function extractMyPlayer(data, config = {}) {
    const values = [
        data?.myPlayer,
        data?.player,
        data?.playerSide,
        data?.side,
        data?.mySide,

        data?.state?.myPlayer,
        data?.state?.player,
        data?.state?.playerSide,
        data?.state?.side,
        data?.state?.mySide,

        data?.game?.myPlayer,
        data?.game?.player,
        data?.game?.playerSide,
        data?.game?.side,
        data?.game?.mySide,

        config?.myPlayer,
        config?.player,
        config?.playerSide,
        config?.side,
    ];

    for (const value of values) {
        const numeric = Number(value);

        if (
            numeric === PLAYER_1 ||
            numeric === PLAYER_2
        ) {
            return numeric;
        }
    }

    return null;
}

function normalizePlayersFromSac(data) {
    if (!data) {
        return [];
    }

    const players =
        data.players ||
        data.participants ||
        data.users;

    if (Array.isArray(players)) {
        return players;
    }

    const result = [];

    if (data.player1) {
        result.push(data.player1);
    }

    if (data.player2) {
        result.push(data.player2);
    }

    if (data.user1) {
        result.push(data.user1);
    }

    if (data.user2) {
        result.push(data.user2);
    }

    return result;
}

function extractPlayers(data, config = {}) {
    const source =
        normalizeSacPayload(data) ||
        {};

    const players =
        normalizePlayersFromSac(source);

    const player1 =
        source.player1 ||
        source.user1 ||
        players[0] ||
        config.player1 ||
        config.creator;

    const player2 =
        source.player2 ||
        source.user2 ||
        players[1] ||
        config.player2 ||
        config.opponent;

    return {
        player1: getPlayerName(
            player1,
            config.creatorName ||
            config.creator?.username ||
            "Joueur 1"
        ),

        player2: getPlayerName(
            player2,
            config.opponentName ||
            config.opponent?.username ||
            "Adversaire"
        ),
    };
}

function extractStake(config = {}, data = null) {
    const source =
        data ||
        config ||
        {};

    const values = [
        source.bet_amount,
        source.betAmount,
        source.stake,
        source.amount,
        source.mise,

        source.data?.bet_amount,
        source.data?.stake,

        source.match?.bet_amount,
        source.match?.stake,

        config.bet_amount,
        config.betAmount,
        config.stake,
        config.amount,
        config.mise,
    ];

    for (const value of values) {
        const numeric = Number(value);

        if (
            Number.isFinite(numeric) &&
            numeric >= 0
        ) {
            return numeric;
        }
    }

    return 0;
}

function extractPot(config = {}, data = null) {
    const source =
        data ||
        config ||
        {};

    const directValues = [
        source.total_bet_amount,
        source.totalBetAmount,
        source.pot,
        source.prize,
        source.prizePool,

        source.data?.total_bet_amount,
        source.data?.pot,
        source.data?.prize,

        source.match?.total_bet_amount,
        source.match?.pot,
        source.match?.prize,
    ];

    for (const value of directValues) {
        const numeric = Number(value);

        if (
            Number.isFinite(numeric) &&
            numeric >= 0
        ) {
            return numeric;
        }
    }

    const user1 = Number(
        source.bet_amount_user_1 ??
        source.betAmountUser1 ??
        source.user1_bet ??
        0
    );

    const user2 = Number(
        source.bet_amount_user_2 ??
        source.betAmountUser2 ??
        source.user2_bet ??
        0
    );

    if (
        Number.isFinite(user1) &&
        Number.isFinite(user2) &&
        (user1 > 0 || user2 > 0)
    ) {
        return user1 + user2;
    }

    const stake = extractStake(config, data);

    return stake * 2;
}

function formatFc(value) {
    const numeric = Number(value);

    if (!Number.isFinite(numeric)) {
        return "0 FC";
    }

    return `${numeric.toLocaleString("fr-FR")} FC`;
}

function extractSacPlayerIds(data) {
    const source =
        normalizeSacPayload(data) ||
        {};

    const user1 =
        source.user1_id ??
        source.user1Id ??
        source.player1_id ??
        source.player1Id ??
        source.creator_id ??
        source.creatorId ??
        null;

    const user2 =
        source.user2_id ??
        source.user2Id ??
        source.player2_id ??
        source.player2Id ??
        source.opponent_id ??
        source.opponentId ??
        null;

    return {
        user1:
            user1 !== null &&
            user1 !== undefined
                ? String(user1)
                : null,

        user2:
            user2 !== null &&
            user2 !== undefined
                ? String(user2)
                : null,
    };
}

function hasOpponentFromMatch(data) {
    const ids = extractSacPlayerIds(data);

    if (ids.user2) {
        return true;
    }

    const players =
        normalizePlayersFromSac(
            normalizeSacPayload(data)
        );

    return players.length >= 2;
}

function hasOpponentFromSocket(data) {
    if (!data) {
        return false;
    }

    const sources = [
        data.user2,
        data.user2Id,
        data.user2_id,
        data.player2,
        data.player2Id,
        data.player2_id,
        data.opponentId,
        data.opponent_id,
        data.opponent,

        data.state?.user2,
        data.state?.user2Id,
        data.state?.user2_id,
        data.state?.player2,
        data.state?.player2Id,
        data.state?.player2_id,
        data.state?.opponentId,
        data.state?.opponent_id,
        data.state?.opponent,

        data.game?.user2,
        data.game?.user2Id,
        data.game?.user2_id,
        data.game?.player2,
        data.game?.player2Id,
        data.game?.player2_id,
        data.game?.opponentId,
        data.game?.opponent_id,
        data.game?.opponent,
    ];

    if (
        sources.some(
            (value) =>
                value !== null &&
                value !== undefined &&
                value !== ""
        )
    ) {
        return true;
    }

    const players =
        data.players ||
        data.participants ||
        data.state?.players ||
        data.game?.players;

    if (
        Array.isArray(players) &&
        players.length >= 2
    ) {
        return true;
    }

    return false;
}

function extractWinnerSide(data) {
    if (!data) {
        return null;
    }

    const state = getGameState(data);

    const candidates = [
        data.winnerSide,
        data.winner_side,
        data.winnerPlayer,
        data.winner_player,
        data.winner,

        data.result?.winnerSide,
        data.result?.winner_side,
        data.result?.winnerPlayer,
        data.result?.winner_player,
        data.result?.winner,

        data.result?.winner?.side,
        data.result?.winner?.player,

        data.winner?.side,
        data.winner?.player,

        state?.winnerSide,
        state?.winner_side,
        state?.winnerPlayer,
        state?.winner_player,
        state?.winner,

        state?.result?.winnerSide,
        state?.result?.winner_side,
        state?.result?.winnerPlayer,
        state?.result?.winner_player,
        state?.result?.winner,

        data.game?.winnerSide,
        data.game?.winner_side,
        data.game?.winnerPlayer,
        data.game?.winner_player,
        data.game?.winner,

        data.match?.winnerSide,
        data.match?.winner_side,
        data.match?.winnerPlayer,
        data.match?.winner_player,
        data.match?.winner,
    ];

    for (const candidate of candidates) {
        if (
            candidate &&
            typeof candidate === "object"
        ) {
            const nested =
                candidate.side ??
                candidate.player ??
                candidate.playerSide ??
                candidate.player_id;

            const numeric = Number(nested);

            if (
                numeric === PLAYER_1 ||
                numeric === PLAYER_2
            ) {
                return numeric;
            }

            continue;
        }

        const numeric = Number(candidate);

        if (
            numeric === PLAYER_1 ||
            numeric === PLAYER_2
        ) {
            return numeric;
        }
    }

    return null;
}

function extractDraw(data) {
    if (!data) {
        return false;
    }

    const state = getGameState(data);

    const candidates = [
        data.draw,
        data.isDraw,
        data.matchDraw,

        data.result?.draw,
        data.result?.isDraw,

        state?.draw,
        state?.isDraw,

        data.game?.draw,
        data.game?.isDraw,

        data.match?.draw,
        data.match?.isDraw,
    ];

    return candidates.some(
        (value) =>
            value === true ||
            value === "true" ||
            Number(value) === 1
    );
}

function extractFinalBoard(data) {
    if (!data) {
        return null;
    }

    const state = getGameState(data);

    const candidates = [
        data.board,
        state?.board,
        data.game?.board,
        data.match?.board,
        data.result?.board,
    ];

    return (
        candidates.find(
            (candidate) =>
                isValidBoard(candidate)
        ) || null
    );
}

function isServerFinished(data) {
    if (!data) {
        return false;
    }

    const state = getGameState(data);

    const statuses = [
        data.status,
        data.matchStatus,
        data.gameStatus,

        state?.status,
        state?.matchStatus,
        state?.gameStatus,

        data.game?.status,
        data.match?.status,
    ];

    if (
        statuses.some(
            (value) =>
                String(value).toUpperCase() ===
                "FINISHED"
        )
    ) {
        return true;
    }

    return Boolean(
        data.gameOver ||
        data.finished ||
        data.ended ||
        data.isFinished ||

        state?.gameOver ||
        state?.finished ||
        state?.ended ||
        state?.isFinished ||

        data.result?.finished ||
        data.result?.gameOver
    );
}

// ======================================================
// CELL
// ======================================================

const Cell = memo(function Cell({
    cell,
    row,
    col,
    selected,
    possible,
    playable,
    last,
    disabled,
    onClick,
}) {
    const dark =
        (row + col) % 2 === 1;

    const classes = [
        "dames-cell",
        dark
            ? "dark"
            : "light",

        selected
            ? "selected"
            : "",

        possible
            ? "possible"
            : "",

        playable
            ? "playable"
            : "",

        last
            ? "last"
            : "",
    ]
        .filter(Boolean)
        .join(" ");

    const isPlayer1 =
        cell === PLAYER_1 ||
        cell === KING_1;

    const isKing =
        cell === KING_1 ||
        cell === KING_2;

    return (
        <button
            type="button"
            className={classes}
            disabled={
                disabled ||
                !dark
            }
            onClick={() =>
                onClick(row, col)
            }
        >
            {cell !== 0 && (
                <span
                    className={[
                        "dames-piece",
                        isPlayer1
                            ? "white"
                            : "black",
                        isKing
                            ? "king"
                            : "",
                    ]
                        .filter(Boolean)
                        .join(" ")}
                >
                    {isKing
                        ? "♛"
                        : ""}
                </span>
            )}

            {possible && (
                <span className="dames-cell-target" />
            )}
        </button>
    );
});

// ======================================================
// PLAYER CARD
// ======================================================

const PlayerCard = memo(function PlayerCard({
    name,
    side,
    active,
    pieces,
    kings,
    isMe,
}) {
    return (
        <div
            className={[
                "dames-player-card",
                active
                    ? "active"
                    : "",
                isMe
                    ? "me"
                    : "",
            ]
                .filter(Boolean)
                .join(" ")}
        >
            <div className="dames-player-avatar">
                {side === PLAYER_1
                    ? "♙"
                    : "♟"}
            </div>

            <div className="dames-player-info">
                <strong>
                    {name}
                </strong>

                <span>
                    {isMe
                        ? "VOUS"
                        : side ===
                          PLAYER_1
                        ? "Joueur 1"
                        : "Joueur 2"}
                </span>

                <small>
                    {pieces} pièces ·{" "}
                    {kings} rois
                </small>
            </div>

            {active && (
                <span className="dames-player-active">
                    ●
                </span>
            )}
        </div>
    );
});

// ======================================================
// WAITING SCREEN
// ======================================================

function WaitingScreen({
    playerName,
    stake,
    pot,
    connected,
    onBack,
}) {
    return (
        <div className="dames-screen">
            <div className="dames-waiting-card">
                <div className="dames-loading-piece">
                    ♟
                </div>

                <h2>
                    En attente de
                    l'adversaire
                </h2>

                <p>
                    {playerName}
                </p>

                <div className="dames-waiting-stats">
                    <span>
                        Mise
                        <strong>
                            {formatFc(
                                stake
                            )}
                        </strong>
                    </span>

                    <span>
                        Cagnotte
                        <strong>
                            {formatFc(
                                pot
                            )}
                        </strong>
                    </span>
                </div>

                <div className="dames-waiting-status">
                    <span
                        className={
                            connected
                                ? "online"
                                : "offline"
                        }
                    />

                    {connected
                        ? "Serveur connecté"
                        : "Connexion au serveur..."}
                </div>

                <button
                    type="button"
                    className="dames-secondary-button"
                    onClick={onBack}
                >
                    Retour
                </button>
            </div>
        </div>
    );
}

// ======================================================
// CONDITIONS MODAL
// ======================================================

function ConditionsModal({
    mode,
    accepted,
    onAccept,
}) {
    return (
        <div className="dames-modal-overlay">
            <div className="dames-conditions-modal">
                <div className="dames-modal-icon">
                    ♛
                </div>

                <h2>
                    Conditions du match
                </h2>

                <p>
                    {mode === "IA"
                        ? "Vous allez affronter l'intelligence artificielle."
                        : "Vous êtes prêt à commencer votre partie de dames."}
                </p>

                <ul>
                    <li>
                        Le serveur contrôle
                        l'état officiel de
                        la partie.
                    </li>

                    <li>
                        Chaque tour est
                        limité à 90 secondes.
                    </li>

                    <li>
                        En cas d'expiration,
                        le serveur détermine
                        le résultat.
                    </li>

                    <li>
                        Les mises et le
                        résultat sont réglés
                        côté serveur.
                    </li>
                </ul>

                <button
                    type="button"
                    className="dames-primary-button"
                    disabled={accepted}
                    onClick={onAccept}
                >
                    {accepted
                        ? "Conditions acceptées"
                        : "J'accepte et je commence"}
                </button>
            </div>
        </div>
    );
}

// ======================================================
// CHAT
// ======================================================

function ChatPanel({
    messages,
    input,
    typingPlayer,
    onChange,
    onSend,
    onClose,
}) {
    return (
        <div className="dames-chat-panel">
            <div className="dames-chat-header">
                <strong>
                    Chat du match
                </strong>

                <button
                    type="button"
                    onClick={onClose}
                >
                    ×
                </button>
            </div>

            <div className="dames-chat-messages">
                {messages.length === 0 ? (
                    <div className="dames-chat-empty">
                        Aucun message.
                    </div>
                ) : (
                    messages.map(
                        (message, index) => (
                            <div
                                className="dames-chat-message"
                                key={`${message.playerId || "p"}-${index}`}
                            >
                                <strong>
                                    {
                                        message.username
                                    }
                                </strong>

                                <span>
                                    {
                                        message.text
                                    }
                                </span>
                            </div>
                        )
                    )
                )}

                {typingPlayer && (
                    <div className="dames-chat-typing">
                        {typingPlayer} écrit...
                    </div>
                )}
            </div>

            <div className="dames-chat-form">
                <input
                    value={input}
                    maxLength={
                        MAX_CHAT_LENGTH
                    }
                    onChange={onChange}
                    onKeyDown={(event) => {
                        if (
                            event.key ===
                            "Enter"
                        ) {
                            event.preventDefault();
                            onSend();
                        }
                    }}
                    placeholder="Votre message..."
                />

                <button
                    type="button"
                    onClick={onSend}
                    disabled={
                        !input.trim()
                    }
                >
                    Envoyer
                </button>
            </div>
        </div>
    );
}

// ======================================================
// RESULT PANEL
// ======================================================

function ResultPanel({
    won,
    draw,
    pot,
    stake,
    onBack,
}) {
    let title = "DÉFAITE";
    let description =
        "Votre adversaire remporte la partie.";

    if (draw) {
        title = "MATCH NUL";
        description =
            "La partie se termine sans vainqueur.";
    } else if (won) {
        title = "VICTOIRE !";
        description =
            "Félicitations, vous remportez la partie.";
    }

    return (
        <div className="dames-result-card">
            <div className="dames-result-icon">
                {draw
                    ? "🤝"
                    : won
                    ? "🏆"
                    : "♟"}
            </div>

            <h1>
                {title}
            </h1>

            <p>
                {description}
            </p>

            <div className="dames-result-money">
                <span>
                    Cagnotte
                </span>

                <strong>
                    {formatFc(
                        pot
                    )}
                </strong>
            </div>

            {!draw && (
                <p className="dames-result-stake">
                    Mise :{" "}
                    {formatFc(
                        stake
                    )}
                </p>
            )}

            <button
                type="button"
                className="dames-primary-button"
                onClick={onBack}
            >
                Retour à l'accueil
            </button>
        </div>
    );
}

// ======================================================
// AVIS MODAL
// ======================================================

function AvisModal({
    matchId,
    onSkip,
    onResults,
}) {
    const [rating, setRating] =
        useState(0);

    const [comment, setComment] =
        useState("");

    const [submitting, setSubmitting] =
        useState(false);

    const [submitted, setSubmitted] =
        useState(false);

    const [error, setError] =
        useState("");

    const submit = async () => {
        if (
            submitting ||
            rating < 1
        ) {
            return;
        }

        try {
            setSubmitting(true);
            setError("");

            await createAvis({
                game: "dames",
                matchId: Number(
                    matchId
                ),
                rating: Number(
                    rating
                ),
                comment:
                    comment.trim() ||
                    null,
                context: "match",
            });

            setSubmitted(true);
        } catch (err) {
            console.error(
                "[DAMES] Avis error:",
                err
            );

            setError(
                "Impossible d'enregistrer votre avis."
            );
        } finally {
            setSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <div className="dames-avis-modal">
                <div className="dames-avis-card">
                    <div className="dames-result-icon">
                        ✓
                    </div>

                    <h2>
                        Merci pour votre avis
                    </h2>

                    <p>
                        Votre retour a bien
                        été enregistré.
                    </p>

                    <button
                        type="button"
                        className="dames-primary-button"
                        onClick={onResults}
                    >
                        Voir les résultats du match
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="dames-avis-modal">
            <div className="dames-avis-card">
                <h2>
                    Votre avis
                </h2>

                <p>
                    Comment avez-vous trouvé
                    cette partie ?
                </p>

                <div className="dames-rating">
                    {[1, 2, 3, 4, 5].map(
                        (value) => (
                            <button
                                type="button"
                                key={value}
                                className={
                                    value <=
                                    rating
                                        ? "active"
                                        : ""
                                }
                                onClick={() =>
                                    setRating(
                                        value
                                    )
                                }
                            >
                                ★
                            </button>
                        )
                    )}
                </div>

                <textarea
                    value={comment}
                    maxLength={500}
                    onChange={(event) =>
                        setComment(
                            sanitizeText(
                                event.target.value,
                                500
                            )
                        )
                    }
                    placeholder="Un commentaire ?"
                />

                {error && (
                    <div className="dames-avis-error">
                        {error}
                    </div>
                )}

                <div className="dames-avis-actions">
                    <button
                        type="button"
                        className="dames-secondary-button"
                        onClick={onSkip}
                        disabled={
                            submitting
                        }
                    >
                        Plus tard
                    </button>

                    <button
                        type="button"
                        className="dames-primary-button"
                        onClick={submit}
                        disabled={
                            submitting ||
                            rating < 1
                        }
                    >
                        {submitting
                            ? "Enregistrement..."
                            : "Envoyer mon avis"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ======================================================
// MAIN
// ======================================================

function Dames({
    gameConfig,
    resetGame,
}) {
    const matchId = useMemo(
        () =>
            gameConfig?.matchId ??
            gameConfig?.match_id ??
            gameConfig?.id ??
            null,
        [gameConfig]
    );

    const mode = useMemo(
        () =>
            normalizeMode(
                gameConfig
            ),
        [gameConfig]
    );

    // ==================================================
    // STATE
    // ==================================================

    const [sacMatch, setSacMatch] =
        useState(null);

    const [board, setBoard] =
        useState(null);

    const [turn, setTurn] =
        useState(null);

    const [myPlayer, setMyPlayer] =
        useState(null);

    const [allMoves, setAllMoves] =
        useState([]);

    const [selected, setSelected] =
        useState(null);

    const [validMoves, setValidMoves] =
        useState([]);

    const [lastMove, setLastMove] =
        useState(null);

    const [connected, setConnected] =
        useState(false);

    const [ping, setPing] =
        useState(0);

    const [messages, setMessages] =
        useState([]);

    const [chatInput, setChatInput] =
        useState("");

    const [typingPlayer, setTypingPlayer] =
        useState(null);

    const [chatOpen, setChatOpen] =
        useState(false);

    const [conditionsOpen, setConditionsOpen] =
        useState(
            mode === "IA" ||
            mode === "TRAINING"
        );

    const [conditionsAccepted, setConditionsAccepted] =
        useState(false);

    const [waitingOpponent, setWaitingOpponent] =
        useState(
            mode === "USER"
        );

    const [gameOver, setGameOver] =
        useState(false);

    const [winnerSide, setWinnerSide] =
        useState(null);

    const [draw, setDraw] =
        useState(false);

    const [loading, setLoading] =
        useState(true);

    const [loadingError, setLoadingError] =
        useState(false);

    const [sendingMove, setSendingMove] =
        useState(false);

    const [playerNames, setPlayerNames] =
        useState({
            player1: "Joueur 1",
            player2: "Adversaire",
        });

    const [stake, setStake] =
        useState(
            extractStake(
                gameConfig,
                null
            )
        );

    const [pot, setPot] =
        useState(
            extractPot(
                gameConfig,
                null
            )
        );

    /**
     * Ce chrono est UNIQUEMENT celui
     * transmis par le backend.
     *
     * Il ne déclenche jamais lui-même
     * la fin du match.
     */
    const [turnSeconds, setTurnSeconds] =
        useState(null);

    const [animatedMove, setAnimatedMove] =
        useState(null);

    const [reviewOpen, setReviewOpen] =
        useState(false);

    const [resultReady, setResultReady] =
        useState(false);

    // ==================================================
    // REFS
    // ==================================================

    const socketRef =
        useRef(null);

    const presenceTimer =
        useRef(null);

    const moveTimeout =
        useRef(null);

    const animationTimeout =
        useRef(null);

    const typingTimeout =
        useRef(null);

    const chatTypingTimeout =
        useRef(null);

    const conditionsAcceptedRef =
        useRef(false);

    const gameOverRef =
        useRef(false);

    const boardRef =
        useRef(null);

    const sacMatchRef =
        useRef(null);

    // ==================================================
    // REF SYNC
    // ==================================================

    useEffect(() => {
        conditionsAcceptedRef.current =
            conditionsAccepted;
    }, [conditionsAccepted]);

    useEffect(() => {
        gameOverRef.current =
            gameOver;
    }, [gameOver]);

    useEffect(() => {
        boardRef.current =
            board;
    }, [board]);

    useEffect(() => {
        sacMatchRef.current =
            sacMatch;
    }, [sacMatch]);

    // ==================================================
    // DERIVED
    // ==================================================

    const isMyTurn =
        !gameOver &&
        Number(turn) ===
            Number(myPlayer);

    const myPieces = useMemo(
        () =>
            Number(myPlayer) ===
            PLAYER_1
                ? [
                      PLAYER_1,
                      KING_1,
                  ]
                : [
                      PLAYER_2,
                      KING_2,
                  ],
        [myPlayer]
    );

    const playablePieces =
        useMemo(() => {
            const result =
                new Set();

            allMoves.forEach(
                (move) => {
                    const normalized =
                        normalizeMove(
                            move
                        );

                    if (
                        normalized
                    ) {
                        result.add(
                            `${normalized.from.r}-${normalized.from.c}`
                        );
                    }
                }
            );

            return result;
        }, [allMoves]);

    const targets =
        useMemo(() => {
            const map =
                new Map();

            validMoves.forEach(
                (move) => {
                    const normalized =
                        normalizeMove(
                            move
                        );

                    if (
                        normalized
                    ) {
                        map.set(
                            `${normalized.to.r}-${normalized.to.c}`,
                            normalized
                        );
                    }
                }
            );

            return map;
        }, [validMoves]);

    const boardStats =
        useMemo(() => {
            let mine = 0;
            let enemy = 0;
            let myKings = 0;

            if (
                !isValidBoard(board)
            ) {
                return {
                    mine: 0,
                    enemy: 0,
                    myKings: 0,
                };
            }

            board.forEach(
                (row) => {
                    row.forEach(
                        (cell) => {
                            if (
                                myPieces.includes(
                                    Number(
                                        cell
                                    )
                                )
                            ) {
                                mine += 1;

                                if (
                                    cell ===
                                        KING_1 ||
                                    cell ===
                                        KING_2
                                ) {
                                    myKings += 1;
                                }
                            } else if (
                                Number(
                                    cell
                                ) !== 0
                            ) {
                                enemy += 1;
                            }
                        }
                    );
                }
            );

            return {
                mine,
                enemy,
                myKings,
            };
        }, [board, myPieces]);

    const player1Stats =
        useMemo(() => {
            let pieces = 0;
            let kings = 0;

            if (
                isValidBoard(board)
            ) {
                board.forEach(
                    (row) => {
                        row.forEach(
                            (cell) => {
                                if (
                                    cell ===
                                        PLAYER_1 ||
                                    cell ===
                                        KING_1
                                ) {
                                    pieces += 1;
                                }

                                if (
                                    cell ===
                                    KING_1
                                ) {
                                    kings += 1;
                                }
                            }
                        );
                    }
                );
            }

            return {
                pieces,
                kings,
            };
        }, [board]);

    const player2Stats =
        useMemo(() => {
            let pieces = 0;
            let kings = 0;

            if (
                isValidBoard(board)
            ) {
                board.forEach(
                    (row) => {
                        row.forEach(
                            (cell) => {
                                if (
                                    cell ===
                                        PLAYER_2 ||
                                    cell ===
                                        KING_2
                                ) {
                                    pieces += 1;
                                }

                                if (
                                    cell ===
                                    KING_2
                                ) {
                                    kings += 1;
                                }
                            }
                        );
                    }
                );
            }

            return {
                pieces,
                kings,
            };
        }, [board]);

    const amWinner =
        !draw &&
        Number(winnerSide) ===
            Number(myPlayer);

    const boardPerspectiveClass =
        Number(myPlayer) ===
        PLAYER_2
            ? "rotate-180"
            : "";

    // ==================================================
    // RESULTS BACK
    // ==================================================

    const handleResultsBack =
        useCallback(() => {
            clearInterval(
                presenceTimer.current
            );

            clearTimeout(
                moveTimeout.current
            );

            clearTimeout(
                animationTimeout.current
            );

            clearTimeout(
                typingTimeout.current
            );

            clearTimeout(
                chatTypingTimeout.current
            );

            gameOverRef.current =
                false;

            conditionsAcceptedRef.current =
                false;

            if (
                socketRef.current
            ) {
                disconnectDamesSocket();
                socketRef.current =
                    null;
            }

            setGameOver(false);
            setWinnerSide(null);
            setDraw(false);
            setResultReady(false);
            setReviewOpen(false);
            setWaitingOpponent(
                mode === "USER"
            );
            setSendingMove(false);
            setConditionsAccepted(
                false
            );
            setConditionsOpen(
                mode === "IA" ||
                mode === "TRAINING"
            );
            setTurnSeconds(null);
            setAnimatedMove(null);
            setSelected(null);
            setValidMoves([]);
            setLastMove(null);
            setMessages([]);
            setTypingPlayer(null);
            setChatInput("");
            setBoard(null);
            setTurn(null);
            setAllMoves([]);

            resetGame?.();
        }, [mode, resetGame]);

    // ==================================================
    // LOAD SAC MATCH
    // ==================================================

    const loadSacMatch =
        useCallback(async () => {
            if (!matchId) {
                return;
            }

            try {
                const response =
                    await getSacMatch(
                        matchId
                    );

                const normalized =
                    normalizeSacPayload(
                        response
                    );

                if (!normalized) {
                    throw new Error(
                        "Match SAC introuvable"
                    );
                }

                setSacMatch(
                    normalized
                );

                const names =
                    extractPlayers(
                        normalized,
                        gameConfig
                    );

                setPlayerNames(
                    names
                );

                setStake(
                    extractStake(
                        gameConfig,
                        normalized
                    )
                );

                setPot(
                    extractPot(
                        gameConfig,
                        normalized
                    )
                );

                if (
                    mode === "USER"
                ) {
                    const hasOpponent =
                        hasOpponentFromMatch(
                            normalized
                        );

                    if (
                        hasOpponent &&
                        !gameOverRef.current
                    ) {
                        setWaitingOpponent(
                            false
                        );
                    }
                }

                setLoading(false);
                setLoadingError(false);
            } catch (error) {
                console.error(
                    "[DAMES] SAC load error:",
                    error
                );

                /**
                 * Une erreur REST ne doit pas
                 * casser une partie si le socket
                 * nous a déjà fourni le plateau.
                 */
                if (
                    !boardRef.current &&
                    !sacMatchRef.current
                ) {
                    setLoadingError(
                        true
                    );
                }

                setLoading(false);
            }
        }, [
            matchId,
            mode,
            gameConfig,
        ]);

    // ==================================================
    // SOCKET
    // ==================================================

    useEffect(() => {
        if (!matchId) {
            setLoading(false);
            setLoadingError(true);
            return undefined;
        }

        const socket =
            connectDamesSocket();

        if (!socket) {
            setLoading(false);
            setLoadingError(true);
            return undefined;
        }

        socketRef.current =
            socket;

        loadSacMatch();

        if (
            presenceTimer.current
        ) {
            clearInterval(
                presenceTimer.current
            );
        }

        presenceTimer.current =
            setInterval(
                loadSacMatch,
                MATCH_REFRESH
            );

        // ==================================================
        // APPLY SERVER STATE
        // ==================================================

        const applyState =
            (data) => {
                if (!data) {
                    return;
                }

                console.log(
                    "♟️ [DAMES] SERVER STATE:",
                    data
                );

                const state =
                    getGameState(
                        data
                    );

                // ------------------------------------------
                // BOARD
                // ------------------------------------------

                const receivedBoard =
                    data.board ||
                    state.board ||
                    data.game?.board ||
                    data.match?.board;

                if (
                    isValidBoard(
                        receivedBoard
                    )
                ) {
                    setBoard(
                        receivedBoard
                    );

                    boardRef.current =
                        receivedBoard;
                }

                // ------------------------------------------
                // TURN
                // ------------------------------------------

                const receivedTurn =
                    data.turn ??
                    state.turn ??
                    data.game?.turn ??
                    data.match?.turn;

                const numericTurn =
                    Number(
                        receivedTurn
                    );

                if (
                    numericTurn ===
                        PLAYER_1 ||
                    numericTurn ===
                        PLAYER_2
                ) {
                    setTurn(
                        numericTurn
                    );
                }

                // ------------------------------------------
                // MY PLAYER
                // ------------------------------------------

                const localPlayer =
                    extractMyPlayer(
                        data,
                        gameConfig
                    );

                if (
                    localPlayer ===
                        PLAYER_1 ||
                    localPlayer ===
                        PLAYER_2
                ) {
                    setMyPlayer(
                        localPlayer
                    );
                }

                // ------------------------------------------
                // MOVES
                // ------------------------------------------

                const receivedMoves =
                    normalizeMoves(
                        data
                    );

                if (
                    Array.isArray(
                        receivedMoves
                    )
                ) {
                    setAllMoves(
                        receivedMoves
                    );
                }

                // ------------------------------------------
                // LAST MOVE
                // ------------------------------------------

                const receivedLastMove =
                    normalizeMove(
                        data.lastMove ||
                        state.lastMove ||
                        data.move ||
                        data.last_move
                    );

                if (
                    receivedLastMove
                ) {
                    setLastMove(
                        receivedLastMove
                    );
                }

                // ------------------------------------------
                // BACKEND TIMER
                // ------------------------------------------

                const seconds =
                    data.turnSeconds ??
                    state.turnSeconds ??
                    data.game?.turnSeconds ??
                    data.match?.turnSeconds ??
                    data.remaining ??
                    data.seconds;

                if (
                    seconds !==
                        undefined &&
                    seconds !== null
                ) {
                    const numericSeconds =
                        Number(
                            seconds
                        );

                    if (
                        Number.isFinite(
                            numericSeconds
                        )
                    ) {
                        setTurnSeconds(
                            Math.max(
                                0,
                                numericSeconds
                            )
                        );
                    }
                }

                // ------------------------------------------
                // CHAT INITIAL
                // ------------------------------------------

                const incomingMessages =
                    data.messages ||
                    state.messages ||
                    data.chat?.messages;

                if (
                    Array.isArray(
                        incomingMessages
                    )
                ) {
                    setMessages(
                        incomingMessages
                            .map(
                                (message) => ({
                                    username:
                                        sanitizeText(
                                            message?.username ||
                                            message?.name ||
                                            "Joueur"
                                        ),

                                    text:
                                        sanitizeText(
                                            message?.text ||
                                            message?.message ||
                                            ""
                                        ),

                                    playerId:
                                        message?.playerId ??
                                        message?.player_id,
                                })
                            )
                            .filter(
                                (message) =>
                                    Boolean(
                                        message.text
                                    )
                            )
                            .slice(
                                -MAX_MESSAGES
                            )
                    );
                }

                // ------------------------------------------
                // PLAYERS
                // ------------------------------------------

                const socketHasOpponent =
                    hasOpponentFromSocket(
                        data
                    );

                const activeGame =
                    isValidBoard(
                        receivedBoard
                    ) &&
                    (
                        localPlayer ===
                            PLAYER_1 ||
                        localPlayer ===
                            PLAYER_2
                    ) &&
                    (
                        numericTurn ===
                            PLAYER_1 ||
                        numericTurn ===
                            PLAYER_2
                    );

                if (
                    mode === "USER"
                ) {
                    if (
                        socketHasOpponent ||
                        activeGame
                    ) {
                        setWaitingOpponent(
                            false
                        );

                        if (
                            !conditionsAcceptedRef.current &&
                            !gameOverRef.current
                        ) {
                            setConditionsOpen(
                                true
                            );
                        }
                    }
                } else {
                    setWaitingOpponent(
                        false
                    );
                }

                const names =
                    extractPlayers(
                        data,
                        gameConfig
                    );

                if (
                    names.player1 ||
                    names.player2
                ) {
                    setPlayerNames(
                        names
                    );
                }

                setStake(
                    extractStake(
                        gameConfig,
                        data
                    )
                );

                setPot(
                    extractPot(
                        gameConfig,
                        data
                    )
                );

                // ------------------------------------------
                // SERVER FINISHED
                // ------------------------------------------

                if (
                    isServerFinished(
                        data
                    )
                ) {
                    const winner =
                        extractWinnerSide(
                            data
                        );

                    const serverDraw =
                        extractDraw(
                            data
                        );

                    const finalBoard =
                        extractFinalBoard(
                            data
                        );

                    if (
                        finalBoard
                    ) {
                        setBoard(
                            finalBoard
                        );

                        boardRef.current =
                            finalBoard;
                    }

                    setWinnerSide(
                        winner
                    );

                    setDraw(
                        serverDraw
                    );

                    gameOverRef.current =
                        true;

                    setGameOver(
                        true
                    );

                    setConditionsOpen(
                        false
                    );

                    setWaitingOpponent(
                        false
                    );

                    setSendingMove(
                        false
                    );

                    setTurnSeconds(
                        0
                    );

                    setAnimatedMove(
                        null
                    );

                    /**
                     * IMPORTANT :
                     * On affiche l'avis après la
                     * notification officielle.
                     */
                    setResultReady(
                        true
                    );

                    setReviewOpen(
                        true
                    );
                }

                setLoading(false);
                setLoadingError(false);
                setSendingMove(false);
            };

        // ==================================================
        // CONNECT
        // ==================================================

        const handleConnect =
            () => {
                console.log(
                    "♟️ DAMES SOCKET CONNECTÉ"
                );

                setConnected(
                    true
                );

                setLoadingError(
                    false
                );

                joinDamesMatch(
                    matchId
                );

                loadSacMatch();
            };

        // ==================================================
        // INIT
        // ==================================================

        const handleMatchInit =
            (data) => {
                console.log(
                    "♟️ DAMES MATCH INIT:",
                    data
                );

                applyState(
                    data
                );
            };

        // ==================================================
        // UPDATE
        // ==================================================

        const handleMatchUpdate =
            (data) => {
                console.log(
                    "♟️ DAMES MATCH UPDATE:",
                    data
                );

                const receivedMove =
                    normalizeMove(
                        data?.move ||
                        data?.lastMove ||
                        data?.state?.move ||
                        data?.state?.lastMove
                    );

                if (
                    receivedMove &&
                    boardRef.current
                ) {
                    const from =
                        receivedMove.from;

                    const path =
                        receivedMove.path ||
                        [];

                    const to =
                        path[
                            path.length - 1
                        ] ||
                        receivedMove.to;

                    const piece =
                        Number(
                            boardRef.current?.[
                                from.r
                            ]?.[
                                from.c
                            ]
                        );

                    if (
                        from &&
                        to
                    ) {
                        setAnimatedMove({
                            from,
                            to,
                            piece,
                        });

                        clearTimeout(
                            animationTimeout.current
                        );

                        animationTimeout.current =
                            setTimeout(
                                () => {
                                    setAnimatedMove(
                                        null
                                    );
                                },
                                450
                            );
                    }
                }

                applyState(
                    data
                );

                setSelected(
                    null
                );

                setValidMoves(
                    []
                );

                setSendingMove(
                    false
                );

                clearTimeout(
                    moveTimeout.current
                );
            };

        // ==================================================
        // BACKEND TURN TIMER
        // ==================================================

        const handleTurnTimer =
            (data) => {
                let seconds;

                if (
                    typeof data ===
                    "number"
                ) {
                    seconds =
                        data;
                } else {
                    seconds =
                        data?.seconds ??
                        data?.remaining ??
                        data?.turnSeconds ??
                        data?.timeRemaining;
                }

                const numeric =
                    Number(
                        seconds
                    );

                if (
                    !Number.isFinite(
                        numeric
                    )
                ) {
                    return;
                }

                /**
                 * Le socket transmet seulement
                 * le chrono officiel.
                 *
                 * PAS de :
                 * if(seconds <= 0) gameOver...
                 *
                 * C'est match:end envoyé par
                 * le backend qui termine réellement
                 * la partie.
                 */
                setTurnSeconds(
                    Math.max(
                        0,
                        numeric
                    )
                );
            };

        // ==================================================
        // OFFICIAL MATCH END
        // ==================================================

        const handleMatchEnd =
            (data) => {
                console.log(
                    "🏁 DAMES MATCH END — RÉSULTAT OFFICIEL:",
                    data
                );

                const finalBoard =
                    extractFinalBoard(
                        data
                    );

                if (
                    finalBoard
                ) {
                    setBoard(
                        finalBoard
                    );

                    boardRef.current =
                        finalBoard;
                }

                const winner =
                    extractWinnerSide(
                        data
                    );

                const serverDraw =
                    extractDraw(
                        data
                    );

                const finalStake =
                    extractStake(
                        gameConfig,
                        data
                    );

                const finalPot =
                    extractPot(
                        gameConfig,
                        data
                    );

                setWinnerSide(
                    winner
                );

                setDraw(
                    serverDraw
                );

                if (
                    Number.isFinite(
                        finalStake
                    ) &&
                    finalStake >= 0
                ) {
                    setStake(
                        finalStake
                    );
                }

                if (
                    Number.isFinite(
                        finalPot
                    ) &&
                    finalPot >= 0
                ) {
                    setPot(
                        finalPot
                    );
                }

                gameOverRef.current =
                    true;

                setGameOver(
                    true
                );

                setConditionsOpen(
                    false
                );

                setWaitingOpponent(
                    false
                );

                setSendingMove(
                    false
                );

                setTurnSeconds(
                    0
                );

                setSelected(
                    null
                );

                setValidMoves(
                    []
                );

                setAnimatedMove(
                    null
                );

                clearTimeout(
                    moveTimeout.current
                );

                clearTimeout(
                    animationTimeout.current
                );

                /**
                 * C'est CE chemin qui doit être
                 * utilisé lorsqu'un joueur ou le BOT
                 * gagne, y compris par expiration
                 * du chrono backend.
                 */
                setResultReady(
                    true
                );

                setReviewOpen(
                    true
                );

                setLoading(
                    false
                );

                setLoadingError(
                    false
                );
            };

        // ==================================================
        // CHAT
        // ==================================================

        const handleChatMessage =
            (message) => {
                if (
                    !message?.text &&
                    !message?.message
                ) {
                    return;
                }

                const safe = {
                    username:
                        sanitizeText(
                            message?.username ||
                            message?.name ||
                            "Joueur"
                        ),

                    text:
                        sanitizeText(
                            message?.text ||
                            message?.message ||
                            ""
                        ),

                    playerId:
                        message?.playerId ??
                        message?.player_id,
                };

                setMessages(
                    (previous) =>
                        [
                            ...previous,
                            safe,
                        ].slice(
                            -MAX_MESSAGES
                        )
                );
            };

        // ==================================================
        // CHAT TYPING
        // ==================================================

        const handleChatTypingEvent =
            (data) => {
                if (
                    !data?.username &&
                    !data?.name
                ) {
                    return;
                }

                setTypingPlayer(
                    sanitizeText(
                        data?.username ||
                        data?.name
                    )
                );

                clearTimeout(
                    typingTimeout.current
                );

                typingTimeout.current =
                    setTimeout(() => {
                        setTypingPlayer(
                            null
                        );
                    }, 1200);
            };

        // ==================================================
        // SOCKET ERROR
        // ==================================================

        const handleConnectError =
            (error) => {
                console.error(
                    "[DAMES] Socket connection error:",
                    error
                );

                setConnected(
                    false
                );

                /**
                 * Une coupure socket ne doit pas
                 * détruire une partie déjà affichée.
                 */
                if (
                    !boardRef.current
                ) {
                    setLoadingError(
                        true
                    );
                }

                setSendingMove(
                    false
                );
            };

        const handleDisconnect =
            () => {
                console.warn(
                    "♟️ DAMES SOCKET : déconnexion"
                );

                setConnected(
                    false
                );

                setSendingMove(
                    false
                );
            };

        const handleSocketError =
            (error) => {
                console.error(
                    "[DAMES] Socket error:",
                    error
                );

                setSendingMove(
                    false
                );
            };

        // ==================================================
        // PING
        // ==================================================

        const handlePing =
            (value) => {
                const numeric =
                    Number(
                        value
                    );

                if (
                    Number.isFinite(
                        numeric
                    )
                ) {
                    setPing(
                        numeric
                    );
                }
            };

        // ==================================================
        // LISTENERS
        // ==================================================

        socket.on(
            "connect",
            handleConnect
        );

        socket.on(
            "match:init",
            handleMatchInit
        );

        socket.on(
            "match:update",
            handleMatchUpdate
        );

        socket.on(
            "turn:timer",
            handleTurnTimer
        );

        socket.on(
            "match:end",
            handleMatchEnd
        );

        socket.on(
            "chat:message",
            handleChatMessage
        );

        socket.on(
            "chat:typing",
            handleChatTypingEvent
        );

        socket.on(
            "connect_error",
            handleConnectError
        );

        socket.on(
            "disconnect",
            handleDisconnect
        );

        socket.on(
            "error",
            handleSocketError
        );

        socket.on(
            "pong",
            handlePing
        );

        // ==================================================
        // SOCKET ALREADY CONNECTED
        // ==================================================

        if (
            socket.connected
        ) {
            handleConnect();
        }

        // ==================================================
        // CLEANUP
        // ==================================================

        return () => {
            clearTimeout(
                typingTimeout.current
            );

            clearTimeout(
                chatTypingTimeout.current
            );

            clearTimeout(
                moveTimeout.current
            );

            clearTimeout(
                animationTimeout.current
            );

            if (
                presenceTimer.current
            ) {
                clearInterval(
                    presenceTimer.current
                );

                presenceTimer.current =
                    null;
            }

            socket.off(
                "connect",
                handleConnect
            );

            socket.off(
                "match:init",
                handleMatchInit
            );

            socket.off(
                "match:update",
                handleMatchUpdate
            );

            socket.off(
                "turn:timer",
                handleTurnTimer
            );

            socket.off(
                "match:end",
                handleMatchEnd
            );

            socket.off(
                "chat:message",
                handleChatMessage
            );

            socket.off(
                "chat:typing",
                handleChatTypingEvent
            );

            socket.off(
                "connect_error",
                handleConnectError
            );

            socket.off(
                "disconnect",
                handleDisconnect
            );

            socket.off(
                "error",
                handleSocketError
            );

            socket.off(
                "pong",
                handlePing
            );

            disconnectDamesSocket();

            socketRef.current =
                null;
        };
    }, [
        matchId,
        mode,
        gameConfig,
        loadSacMatch,
    ]);

    // ======================================================
    // CONDITIONS
    // ======================================================

    const handleAcceptConditions =
        useCallback(() => {
            if (!matchId) {
                return;
            }

            setConditionsAccepted(
                true
            );

            conditionsAcceptedRef.current =
                true;

            setConditionsOpen(
                false
            );

            if (
                mode === "IA" ||
                mode === "TRAINING"
            ) {
                setWaitingOpponent(
                    false
                );
            }
        }, [
            matchId,
            mode,
        ]);

    // ======================================================
    // SELECT
    // ======================================================

    const handleSelect =
        useCallback(
            (row, col) => {
                if (
                    !board ||
                    gameOver ||
                    !isMyTurn ||
                    sendingMove ||
                    conditionsOpen ||
                    waitingOpponent
                ) {
                    return;
                }

                const value =
                    Number(
                        board[row]?.[col]
                    );

                if (
                    !myPieces.includes(
                        value
                    )
                ) {
                    return;
                }

                const key =
                    `${row}-${col}`;

                if (
                    !playablePieces.has(
                        key
                    )
                ) {
                    return;
                }

                const moves =
                    allMoves
                        .map(
                            normalizeMove
                        )
                        .filter(Boolean)
                        .filter(
                            (move) =>
                                move.from.r ===
                                    row &&
                                move.from.c ===
                                    col
                        );

                setSelected({
                    r: row,
                    c: col,
                });

                setValidMoves(
                    moves
                );
            },
            [
                board,
                gameOver,
                isMyTurn,
                sendingMove,
                conditionsOpen,
                waitingOpponent,
                myPieces,
                playablePieces,
                allMoves,
            ]
        );

    // ======================================================
    // MOVE
    // ======================================================

    const handleMove =
        useCallback(
            (row, col) => {
                if (
                    sendingMove ||
                    !socketRef.current
                        ?.connected
                ) {
                    return;
                }

                const move =
                    targets.get(
                        `${row}-${col}`
                    );

                if (
                    !isValidMove(
                        move
                    )
                ) {
                    return;
                }

                setSendingMove(
                    true
                );

                clearTimeout(
                    moveTimeout.current
                );

                moveTimeout.current =
                    setTimeout(() => {
                        /**
                         * Sécurité UI uniquement.
                         *
                         * Ce timeout ne termine
                         * JAMAIS le match.
                         */
                        setSendingMove(
                            false
                        );
                    }, MOVE_TIMEOUT);

                sendDamesMove(
                    matchId,
                    {
                        id: move.id,
                        from: move.from,
                        path: move.path,
                    }
                );

                setSelected(
                    null
                );

                setValidMoves(
                    []
                );
            },
            [
                sendingMove,
                targets,
                matchId,
            ]
        );

    // ======================================================
    // BOARD CLICK
    // ======================================================

    const handleCellClick =
        useCallback(
            (row, col) => {
                if (
                    !board ||
                    !connected ||
                    gameOver ||
                    conditionsOpen ||
                    waitingOpponent ||
                    sendingMove ||
                    !isMyTurn
                ) {
                    return;
                }

                if (
                    (row + col) % 2 ===
                    0
                ) {
                    return;
                }

                if (!selected) {
                    handleSelect(
                        row,
                        col
                    );
                    return;
                }

                const value =
                    Number(
                        board[row]?.[col]
                    );

                if (
                    myPieces.includes(
                        value
                    )
                ) {
                    handleSelect(
                        row,
                        col
                    );
                    return;
                }

                if (
                    targets.has(
                        `${row}-${col}`
                    )
                ) {
                    handleMove(
                        row,
                        col
                    );
                    return;
                }

                setSelected(
                    null
                );

                setValidMoves(
                    []
                );
            },
            [
                board,
                connected,
                gameOver,
                conditionsOpen,
                waitingOpponent,
                sendingMove,
                isMyTurn,
                selected,
                handleSelect,
                myPieces,
                targets,
                handleMove,
            ]
        );

    // ======================================================
    // CHAT TYPING
    // ======================================================

    const handleChatTyping =
        useCallback(
            (event) => {
                const value =
                    sanitizeText(
                        event.target.value
                    );

                setChatInput(
                    value
                );

                clearTimeout(
                    chatTypingTimeout.current
                );

                if (
                    !value.trim()
                ) {
                    return;
                }

                chatTypingTimeout.current =
                    setTimeout(() => {
                        if (
                            socketRef.current
                                ?.connected
                        ) {
                            sendDamesTyping(
                                matchId
                            );
                        }
                    }, 500);
            },
            [matchId]
        );

    // ======================================================
    // CHAT SEND
    // ======================================================

    const handleSendChat =
        useCallback(() => {
            const text =
                sanitizeText(
                    chatInput.trim()
                );

            if (!text) {
                return;
            }

            if (
                !socketRef.current
                    ?.connected
            ) {
                return;
            }

            sendDamesChat(
                matchId,
                text
            );

            setChatInput(
                ""
            );
        }, [
            chatInput,
            matchId,
        ]);

    // ======================================================
    // LOADING
    // ======================================================

    if (loading) {
        return (
            <div className="dames-screen">
                <div className="dames-loading-card">
                    <div className="dames-loading-piece">
                        ♟
                    </div>

                    <div className="dames-loading-spinner" />

                    <h2>
                        Connexion au match...
                    </h2>

                    <p>
                        {connected
                            ? "Récupération de la partie"
                            : "Connexion au serveur de jeu"}
                    </p>
                </div>
            </div>
        );
    }

    // ======================================================
    // ERROR
    // ======================================================

    if (
        loadingError &&
        !board &&
        !sacMatch
    ) {
        return (
            <div className="dames-screen">
                <div className="dames-error-card">
                    <div className="dames-error-icon">
                        !
                    </div>

                    <h2>
                        Impossible de
                        charger le match
                    </h2>

                    <p>
                        Vérifiez votre
                        connexion puis
                        réessayez.
                    </p>

                    <button
                        type="button"
                        className="dames-primary-button"
                        onClick={() =>
                            window.location.reload()
                        }
                    >
                        Reconnecter
                    </button>

                    <button
                        type="button"
                        className="dames-secondary-button"
                        onClick={
                            resetGame
                        }
                    >
                        Retour à
                        l'Accueil
                    </button>
                </div>
            </div>
        );
    }

    // ======================================================
    // WAITING USER
    // ======================================================

    if (
        mode === "USER" &&
        waitingOpponent &&
        !isValidBoard(board)
    ) {
        return (
            <WaitingScreen
                playerName={
                    Number(myPlayer) ===
                    PLAYER_2
                        ? playerNames.player2
                        : playerNames.player1
                }
                stake={stake}
                pot={pot}
                connected={connected}
                onBack={
                    resetGame
                }
            />
        );
    }

    // ======================================================
    // FIN DE MATCH
    // ======================================================

    if (gameOver) {
        if (reviewOpen) {
            return (
                <div className="dames-screen">
                    <AvisModal
                        matchId={matchId}
                        onSkip={() => {
                            setReviewOpen(
                                false
                            );
                        }}
                        onResults={() => {
                            setReviewOpen(
                                false
                            );
                        }}
                    />
                </div>
            );
        }

        if (resultReady) {
            return (
                <div className="dames-screen">
                    <ResultPanel
                        won={amWinner}
                        draw={draw}
                        pot={pot}
                        stake={stake}
                        onBack={
                            handleResultsBack
                        }
                    />
                </div>
            );
        }
    }

    // ======================================================
    // BOARD
    // ======================================================

    return (
        <div className="dames-app">
            {/* ============================================ */}
            {/* TOP BAR */}
            {/* ============================================ */}

            <header className="dames-topbar">
                <div className="dames-brand">
                    <div className="dames-brand-mark">
                        ♛
                    </div>

                    <div>
                        <strong>
                            DAMES
                        </strong>

                        <span>
                            Match #{matchId}
                        </span>
                    </div>
                </div>

                <div className="dames-matchup">
                    <span>
                        {playerNames.player1}
                    </span>

                    <b>
                        VS
                    </b>

                    <span>
                        {playerNames.player2}
                    </span>
                </div>

                <div className="dames-top-actions">
                    <div className="dames-connection">
                        <span
                            className={
                                connected
                                    ? "online"
                                    : "offline"
                            }
                        />

                        {connected
                            ? "En ligne"
                            : "Hors ligne"}
                    </div>

                    <button
                        type="button"
                        className="dames-chat-button"
                        onClick={() =>
                            setChatOpen(
                                true
                            )
                        }
                    >
                        💬

                        {messages.length >
                            0 && (
                            <b>
                                {
                                    messages.length
                                }
                            </b>
                        )}
                    </button>
                </div>
            </header>

            {/* ============================================ */}
            {/* MAIN */}
            {/* ============================================ */}

            <main className="dames-main">
                <section className="dames-game-column">
                    {/* PRIZE */}

                    <div className="dames-prize-bar">
                        <div className="dames-prize-icon">
                            💰
                        </div>

                        <div>
                            <span>
                                Cagnotte
                            </span>

                            <strong>
                                {formatFc(
                                    pot
                                )}
                            </strong>
                        </div>

                        <div className="dames-prize-separator" />

                        <div>
                            <span>
                                Mise
                            </span>

                            <strong>
                                {formatFc(
                                    stake
                                )}
                            </strong>
                        </div>

                        <div className="dames-prize-status">
                            {mode === "IA"
                                ? "🤖 IA"
                                : mode ===
                                  "TRAINING"
                                ? "🎯 Entraînement"
                                : "👥 Joueur vs Joueur"}
                        </div>
                    </div>

                    {/* MOBILE PLAYERS */}

                    <div className="dames-players-mobile">
                        <PlayerCard
                            name={
                                playerNames.player1
                            }
                            side={
                                PLAYER_1
                            }
                            active={
                                Number(
                                    turn
                                ) ===
                                PLAYER_1
                            }
                            pieces={
                                player1Stats.pieces
                            }
                            kings={
                                player1Stats.kings
                            }
                            isMe={
                                Number(
                                    myPlayer
                                ) ===
                                PLAYER_1
                            }
                        />

                        <PlayerCard
                            name={
                                playerNames.player2
                            }
                            side={
                                PLAYER_2
                            }
                            active={
                                Number(
                                    turn
                                ) ===
                                PLAYER_2
                            }
                            pieces={
                                player2Stats.pieces
                            }
                            kings={
                                player2Stats.kings
                            }
                            isMe={
                                Number(
                                    myPlayer
                                ) ===
                                PLAYER_2
                            }
                        />
                    </div>

                    {/* BOARD LAYOUT */}

                    <div className="dames-board-layout">
                        <aside className="dames-side-player left">
                            <PlayerCard
                                name={
                                    playerNames.player1
                                }
                                side={
                                    PLAYER_1
                                }
                                active={
                                    Number(
                                        turn
                                    ) ===
                                    PLAYER_1
                                }
                                pieces={
                                    player1Stats.pieces
                                }
                                kings={
                                    player1Stats.kings
                                }
                                isMe={
                                    Number(
                                        myPlayer
                                    ) ===
                                    PLAYER_1
                                }
                            />
                        </aside>

                        <div className="dames-board-section">
                            <div className="dames-turn-banner">
                                <div
                                    className={[
                                        "dames-turn-dot",
                                        isMyTurn
                                            ? "mine"
                                            : "enemy",
                                    ].join(
                                        " "
                                    )}
                                />

                                <strong>
                                    {isMyTurn
                                        ? "À votre tour"
                                        : "Tour de l'adversaire"}
                                </strong>

                                {turnSeconds !==
                                    null && (
                                    <span className="dames-timer">
                                        ⏱{" "}
                                        {
                                            turnSeconds
                                        }s
                                    </span>
                                )}
                            </div>

                            <div
                                className={[
                                    "dames-board-frame",
                                    boardPerspectiveClass,
                                ]
                                    .filter(Boolean)
                                    .join(" ")}
                            >
                                <div className="dames-board-coordinates top">
                                    {Array.from(
                                        {
                                            length: 10,
                                        },
                                        (_, i) => (
                                            <span
                                                key={
                                                    i
                                                }
                                            >
                                                {String.fromCharCode(
                                                    65 +
                                                        i
                                                )}
                                            </span>
                                        )
                                    )}
                                </div>

                                <div className="dames-board-row-wrap">
                                    <div className="dames-board-coordinates side">
                                        {Array.from(
                                            {
                                                length: 10,
                                            },
                                            (_, i) => (
                                                <span
                                                    key={
                                                        i
                                                    }
                                                >
                                                    {
                                                        10 -
                                                        i
                                                    }
                                                </span>
                                            )
                                        )}
                                    </div>

                                    <div className="dames-board">
                                        {board?.map(
                                            (
                                                row,
                                                r
                                            ) =>
                                                row.map(
                                                    (
                                                        cell,
                                                        c
                                                    ) => {
                                                        const key =
                                                            `${r}-${c}`;

                                                        const selectedCell =
                                                            samePosition(
                                                                selected,
                                                                {
                                                                    r,
                                                                    c,
                                                                }
                                                            );

                                                        const possible =
                                                            targets.has(
                                                                key
                                                            );

                                                        const playable =
                                                            playablePieces.has(
                                                                key
                                                            );

                                                        const last =
                                                            Boolean(
                                                                lastMove &&
                                                                    (
                                                                        samePosition(
                                                                            lastMove.from,
                                                                            {
                                                                                r,
                                                                                c,
                                                                            }
                                                                        ) ||
                                                                        lastMove.path?.some(
                                                                            (
                                                                                position
                                                                            ) =>
                                                                                samePosition(
                                                                                    position,
                                                                                    {
                                                                                        r,
                                                                                        c,
                                                                                    }
                                                                                )
                                                                        )
                                                                    )
                                                            );

                                                        return (
                                                            <Cell
                                                                key={
                                                                    key
                                                                }
                                                                cell={
                                                                    cell
                                                                }
                                                                row={
                                                                    r
                                                                }
                                                                col={
                                                                    c
                                                                }
                                                                selected={
                                                                    selectedCell
                                                                }
                                                                possible={
                                                                    possible
                                                                }
                                                                playable={
                                                                    playable
                                                                }
                                                                last={
                                                                    last
                                                                }
                                                                disabled={
                                                                    gameOver ||
                                                                    conditionsOpen ||
                                                                    waitingOpponent ||
                                                                    sendingMove ||
                                                                    !connected ||
                                                                    !isMyTurn
                                                                }
                                                                onClick={
                                                                    handleCellClick
                                                                }
                                                            />
                                                        );
                                                    }
                                                )
                                        )}

                                        {animatedMove && (
                                            <div
                                                className={[
                                                    "dames-moving-piece",
                                                    animatedMove.piece ===
                                                        PLAYER_1 ||
                                                    animatedMove.piece ===
                                                        KING_1
                                                        ? "moving-white"
                                                        : "moving-black",
                                                ].join(
                                                    " "
                                                )}
                                                style={{
                                                    "--from-x":
                                                        animatedMove
                                                            .from
                                                            .c,

                                                    "--from-y":
                                                        animatedMove
                                                            .from
                                                            .r,

                                                    "--to-x":
                                                        animatedMove
                                                            .to
                                                            .c,

                                                    "--to-y":
                                                        animatedMove
                                                            .to
                                                            .r,
                                                }}
                                            >
                                                <span>
                                                    {animatedMove.piece ===
                                                        KING_1 ||
                                                    animatedMove.piece ===
                                                        KING_2
                                                        ? "♛"
                                                        : ""}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="dames-board-coordinates bottom">
                                    {Array.from(
                                        {
                                            length: 10,
                                        },
                                        (_, i) => (
                                            <span
                                                key={
                                                    i
                                                }
                                            >
                                                {String.fromCharCode(
                                                    65 +
                                                        i
                                                )}
                                            </span>
                                        )
                                    )}
                                </div>
                            </div>

                            <div className="dames-board-help">
                                {sendingMove
                                    ? "Validation du mouvement..."
                                    : conditionsOpen
                                    ? "Acceptez les conditions pour commencer."
                                    : waitingOpponent
                                    ? "En attente de votre adversaire..."
                                    : selected
                                    ? "Choisissez une case en surbrillance"
                                    : isMyTurn
                                    ? "Sélectionnez un de vos pions"
                                    : "Attendez le tour de votre adversaire"}
                            </div>
                        </div>

                        <aside className="dames-side-player right">
                            <PlayerCard
                                name={
                                    playerNames.player2
                                }
                                side={
                                    PLAYER_2
                                }
                                active={
                                    Number(
                                        turn
                                    ) ===
                                    PLAYER_2
                                }
                                pieces={
                                    player2Stats.pieces
                                }
                                kings={
                                    player2Stats.kings
                                }
                                isMe={
                                    Number(
                                        myPlayer
                                    ) ===
                                    PLAYER_2
                                }
                            />
                        </aside>
                    </div>

                    {/* TOOLBAR */}

                    <div className="dames-bottom-toolbar">
                        <div className="dames-toolbar-info">
                            <span>
                                {
                                    boardStats.mine
                                }{" "}
                                pièces
                            </span>

                            <span>
                                •
                            </span>

                            <span>
                                {
                                    boardStats.myKings
                                }{" "}
                                rois
                            </span>

                            <span>
                                •
                            </span>

                            <span>
                                Ping {ping}
                                ms
                            </span>
                        </div>

                        <div className="dames-toolbar-actions">
                            <button
                                type="button"
                                onClick={() =>
                                    setChatOpen(
                                        true
                                    )
                                }
                            >
                                💬 Chat
                            </button>
                        </div>
                    </div>
                </section>
            </main>

            {/* ============================================ */}
            {/* CONDITIONS */}
            {/* ============================================ */}

            {conditionsOpen &&
                !gameOver && (
                    <ConditionsModal
                        mode={
                            mode
                        }
                        accepted={
                            conditionsAccepted
                        }
                        onAccept={
                            handleAcceptConditions
                        }
                    />
                )}

            {/* ============================================ */}
            {/* CHAT */}
            {/* ============================================ */}

            {chatOpen && (
                <div className="dames-chat-overlay">
                    <ChatPanel
                        messages={
                            messages
                        }
                        input={
                            chatInput
                        }
                        typingPlayer={
                            typingPlayer
                        }
                        onChange={
                            handleChatTyping
                        }
                        onSend={
                            handleSendChat
                        }
                        onClose={() =>
                            setChatOpen(
                                false
                            )
                        }
                    />
                </div>
            )}
        </div>
    );
}

export default Dames;