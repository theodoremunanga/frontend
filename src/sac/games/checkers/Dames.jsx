// frontend/src/sac/games/checkers/Dames.jsx

import React, {
    memo,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import {
    getSacMatch,
} from "../../sacApi";

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

// ==========================================================
// CONSTANTES
// ==========================================================

const BOARD_SIZE = 10;

const PLAYER_1 = 1;
const PLAYER_2 = 2;

const KING_1 = 3;
const KING_2 = 4;

const MAX_CHAT_LENGTH = 300;
const MAX_MESSAGES = 100;

const MATCH_REFRESH = 1500;
const MOVE_TIMEOUT = 7000;


// ==========================================================
// HELPERS
// ==========================================================

function sanitizeText(value, max = MAX_CHAT_LENGTH) {
    return String(value || "")
        .replace(/[\u0000-\u001F\u007F]/g, "")
        .slice(0, max);
}

function normalizeMode(config) {
    const value = String(
        config?.mode ??
            config?.gameMode ??
            config?.matchMode ??
            config?.type ??
            "USER"
    ).toUpperCase();

    if (
        value === "IA" ||
        value === "AI" ||
        value === "BOT"
    ) {
        return "IA";
    }

    if (
        value === "TRAINING" ||
        value === "TRAIN" ||
        value === "ENTRAINEMENT"
    ) {
        return "TRAINING";
    }

    return "USER";
}

function isValidBoard(board) {
    return (
        Array.isArray(board) &&
        board.length === BOARD_SIZE &&
        board.every(
            (row) =>
                Array.isArray(row) &&
                row.length === BOARD_SIZE &&
                row.every((cell) =>
                    [0, 1, 2, 3, 4].includes(
                        Number(cell)
                    )
                )
        )
    );
}

function normalizePosition(position) {
    if (
        position === undefined ||
        position === null
    ) {
        return null;
    }

    if (
        typeof position === "object" &&
        position.r !== undefined &&
        position.c !== undefined
    ) {
        const r = Number(position.r);
        const c = Number(position.c);

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

    if (
        typeof position === "object" &&
        position.row !== undefined &&
        position.col !== undefined
    ) {
        const r = Number(position.row);
        const c = Number(position.col);

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

    if (
        typeof position === "object" &&
        position.x !== undefined &&
        position.y !== undefined
    ) {
        const c = Number(position.x);
        const r = Number(position.y);

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

    if (Array.isArray(position)) {
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
    if (!move) {
        return null;
    }

    const from = normalizePosition(
        move.from ??
            move.start ??
            move.origin ??
            move.source
    );

    const rawPath =
        move.path ??
        move.positions ??
        move.route ??
        move.steps ??
        move.to ??
        [];

    const pathArray = Array.isArray(rawPath)
        ? rawPath
        : [rawPath];

    const path = pathArray
        .map(normalizePosition)
        .filter(Boolean);

    if (!from || path.length === 0) {
        return null;
    }

    return {
        ...move,
        from,
        path,
    };
}

function isValidMove(move) {
    return Boolean(
        normalizeMove(move)
    );
}

function normalizeMoves(data) {
    if (!data) {
        return [];
    }

    const candidates =
        data?.allMoves ??
        data?.validMoves ??
        data?.moves ??
        data?.possibleMoves ??
        data?.legalMoves ??
        data?.state?.allMoves ??
        data?.state?.validMoves ??
        data?.state?.moves ??
        data?.game?.allMoves ??
        data?.game?.validMoves ??
        data?.game?.moves ??
        data?.match?.allMoves ??
        data?.match?.validMoves ??
        data?.match?.moves ??
        [];

    if (!Array.isArray(candidates)) {
        return [];
    }

    return candidates
        .map(normalizeMove)
        .filter(Boolean);
}

function samePosition(a, b) {
    const first = normalizePosition(a);
    const second = normalizePosition(b);

    return Boolean(
        first &&
            second &&
            first.r === second.r &&
            first.c === second.c
    );
}

function getPlayerName(player, fallback) {
    if (!player) {
        return fallback;
    }

    if (typeof player === "string") {
        return player;
    }

    return (
        player.username ||
        player.name ||
        player.displayName ||
        player.pseudo ||
        fallback
    );
}

/**
 * Normalise les différentes enveloppes pouvant
 * être retournées par SAC ou Socket.IO.
 */
function normalizeSacPayload(payload) {
    if (!payload) {
        return null;
    }

    let value = payload;

    if (
        value?.data &&
        typeof value.data === "object"
    ) {
        value = value.data;
    }

    if (
        value?.match &&
        typeof value.match === "object"
    ) {
        value = value.match;
    }

    if (
        value?.data?.match &&
        typeof value.data.match === "object"
    ) {
        value = value.data.match;
    }

    return value;
}

/**
 * Cherche le véritable objet d'état de partie.
 */
function getGameState(data) {
    if (!data) {
        return null;
    }

    return (
        data?.state ??
        data?.game ??
        data?.match ??
        data
    );
}

/**
 * Extrait le joueur local depuis toutes les formes
 * actuellement possibles côté backend/socket.
 */
function extractMyPlayer(data, config) {
    const state = getGameState(data);

    const candidates = [
        state?.player,
        state?.myPlayer,
        state?.playerSide,
        state?.side,
        state?.mySide,

        data?.player,
        data?.myPlayer,
        data?.playerSide,
        data?.side,
        data?.mySide,

        config?.player,
        config?.myPlayer,
        config?.playerSide,
        config?.side,
    ];

    for (const candidate of candidates) {
        const number = Number(candidate);

        if (
            number === PLAYER_1 ||
            number === PLAYER_2
        ) {
            return number;
        }
    }

    return null;
}

/**
 * Normalise la collection de joueurs provenant du SAC.
 */
function normalizePlayersFromSac(data) {
    const match = normalizeSacPayload(data);

    if (!match) {
        return [];
    }

    const candidates = [
        match?.players,
        match?.players?.list,
        match?.players?.items,
        match?.participants,
        match?.users,
    ];

    for (const value of candidates) {
        if (Array.isArray(value)) {
            return value.filter(Boolean);
        }
    }

    const result = [];

    const player1 =
        match?.player1 ||
        match?.player_1 ||
        match?.homePlayer ||
        match?.home_player ||
        match?.creator ||
        match?.creatorUser;

    const player2 =
        match?.player2 ||
        match?.player_2 ||
        match?.awayPlayer ||
        match?.away_player ||
        match?.opponent ||
        match?.opponentUser;

    if (player1) {
        result.push(player1);
    }

    if (player2) {
        result.push(player2);
    }

    return result;
}

/**
 * Extrait les joueurs sans inventer une identité
 * lorsque le backend n'en fournit aucune.
 */
function extractPlayers(data, config) {
    const match = normalizeSacPayload(data);

    const players = normalizePlayersFromSac(match);

    const home =
        match?.homePlayer ??
        match?.player1 ??
        match?.player_1 ??
        players[0] ??
        match?.home ??
        config?.homePlayer ??
        config?.player1;

    const away =
        match?.awayPlayer ??
        match?.player2 ??
        match?.player_2 ??
        players[1] ??
        match?.away ??
        config?.awayPlayer ??
        config?.player2;

    return {
        player1: getPlayerName(
            home,
            config?.creatorName ||
                config?.creator?.username ||
                "Joueur 1"
        ),

        player2: getPlayerName(
            away,
            config?.opponentName ||
                config?.opponent?.username ||
                "Adversaire"
        ),
    };
}

function extractStake(config, data) {
    const match = normalizeSacPayload(data);

    const value =
        match?.bet_amount ??
        match?.stake ??
        match?.amount ??
        match?.match?.bet_amount ??
        match?.match?.stake ??
        match?.match?.amount ??
        config?.bet_amount ??
        config?.stake ??
        config?.amount ??
        0;

    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : 0;
}

function extractPot(config, data) {

    const match =
        normalizeSacPayload(data);

    const explicit =
        match?.total_bet_amount ??
        match?.pot ??
        match?.prize;

    if (
        explicit !== undefined &&
        explicit !== null
    ) {
        const number =
            Number(explicit);

        if (
            Number.isFinite(number)
        ) {
            return number;
        }
    }

    const user1 =
        Number(
            match?.bet_amount_user_1
        );

    const user2 =
        Number(
            match?.bet_amount_user_2
        );

    if (
        Number.isFinite(user1) &&
        Number.isFinite(user2)
    ) {
        return user1 + user2;
    }

    return 0;
}

function formatFc(value) {
    return `${new Intl.NumberFormat(
        "fr-FR"
    ).format(Number(value) || 0)} Fc`;
}

/**
 * Détection robuste de la présence du deuxième joueur
 * côté REST/SAC.
 */
function hasOpponentFromMatch(data) {
    const match = normalizeSacPayload(data);

    if (!match) {
        return false;
    }

    const players =
        normalizePlayersFromSac(match);

    const opponentId =
        match?.user2_id ??
        match?.user2Id ??
        match?.player2_id ??
        match?.player2Id ??
        match?.opponent_id ??
        match?.opponentId ??
        match?.away_player_id ??
        match?.awayPlayerId;

    if (
        opponentId !== undefined &&
        opponentId !== null &&
        Number(opponentId) > 0
    ) {
        return true;
    }

    if (
        Array.isArray(players) &&
        players.length >= 2
    ) {
        return true;
    }

    const opponent =
        match?.opponent ??
        match?.opponentUser ??
        match?.awayPlayer ??
        match?.player2 ??
        match?.player_2 ??
        match?.away;

    return Boolean(opponent);
}

/**
 * Détection robuste de la présence du deuxième joueur
 * côté Socket.IO.
 *
 * IMPORTANT :
 * cette fonction est PURE.
 * Elle ne connaît ni matchId ni setAllMoves.
 */
function hasOpponentFromSocket(data) {
    if (!data) {
        return false;
    }

    if (
        data.opponentJoined === true ||
        data.hasOpponent === true
    ) {
        return true;
    }

    const state = getGameState(data);

    const opponentId =
        data?.player2Id ??
        data?.user2_id ??
        data?.user2Id ??
        data?.opponentId ??
        data?.opponent_id ??
        data?.awayPlayerId ??
        data?.away_player_id ??
        state?.player2Id ??
        state?.user2_id ??
        state?.user2Id ??
        state?.opponentId ??
        state?.opponent_id;

    if (
        opponentId !== undefined &&
        opponentId !== null &&
        Number(opponentId) > 0
    ) {
        return true;
    }

    const players =
        normalizePlayersFromSac(data);

    if (
        Array.isArray(players) &&
        players.length >= 2
    ) {
        return true;
    }

    const opponent =
        data?.player2 ??
        data?.awayPlayer ??
        data?.opponent ??
        data?.opponentUser ??
        state?.player2 ??
        state?.awayPlayer ??
        state?.opponent;

    if (opponent) {
        return true;
    }

    return false;
}

// ==========================================================
// CELL
// ==========================================================

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

    const whitePiece =
        cell === PLAYER_1 ||
        cell === KING_1;

    const king =
        cell === KING_1 ||
        cell === KING_2;

    return (
        <button
            type="button"
            className={[
                "dames-cell",
                dark
                    ? "dames-cell-dark"
                    : "dames-cell-light",
                selected
                    ? "dames-cell-selected"
                    : "",
                possible
                    ? "dames-cell-target"
                    : "",
                playable
                    ? "dames-cell-playable"
                    : "",
                last
                    ? "dames-cell-last"
                    : "",
            ]
                .filter(Boolean)
                .join(" ")}
            disabled={
                disabled ||
                !dark
            }
            onClick={() =>
                onClick(row, col)
            }
            aria-label={`Case ${row + 1}, ${
                col + 1
            }`}
        >
            {cell !== 0 && (
                <span
                    className={[
                        "dames-piece",
                        whitePiece
                            ? "dames-piece-white"
                            : "dames-piece-black",
                        king
                            ? "dames-piece-king"
                            : "",
                    ]
                        .filter(Boolean)
                        .join(" ")}
                >
                    <span className="dames-piece-inner">
                        {king ? "♛" : ""}
                    </span>
                </span>
            )}

            {playable && !selected && (
                <span className="dames-playable-dot" />
            )}

            {possible && (
                <span className="dames-target-dot" />
            )}
        </button>
    );
});

// ==========================================================
// PLAYER CARD
// ==========================================================

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
                active ? "is-active" : "",
                isMe ? "is-me" : "",
            ]
                .filter(Boolean)
                .join(" ")}
        >
            <div
                className={[
                    "dames-player-avatar",
                    side === PLAYER_1
                        ? "avatar-white"
                        : "avatar-black",
                ].join(" ")}
            >
                {side === PLAYER_1
                    ? "♙"
                    : "♟"}
            </div>

            <div className="dames-player-info">
                <div className="dames-player-name">
                    {name}

                    {isMe && (
                        <span className="dames-me-label">
                            VOUS
                        </span>
                    )}
                </div>

                <div className="dames-player-stats">
                    <span>
                        {pieces} pièces
                    </span>

                    <span>•</span>

                    <span>
                        {kings} rois
                    </span>
                </div>
            </div>

            <div
                className={[
                    "dames-turn-indicator",
                    active ? "active" : "",
                ].join(" ")}
            >
                {active
                    ? "À vous"
                    : "En attente"}
            </div>
        </div>
    );
});

// ==========================================================
// WAITING
// ==========================================================

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
                <div className="dames-waiting-logo">
                    ♛
                </div>

                <div className="dames-live-pill">
                    <span
                        className={
                            connected
                                ? "dames-live-dot"
                                : "dames-live-dot offline"
                        }
                    />

                    {connected
                        ? "Serveur connecté"
                        : "Connexion..."}
                </div>

                <h1>
                    En attente de votre
                    adversaire
                </h1>

                <p>
                    Votre match est créé.
                    Il restera disponible
                    pour être repris.
                </p>

                <div className="dames-waiting-match">
                    <div>
                        <span>Joueur</span>
                        <strong>
                            {playerName}
                        </strong>
                    </div>

                    <div>
                        <span>Mise</span>
                        <strong>
                            {formatFc(stake)}
                        </strong>
                    </div>

                    <div>
                        <span>Cagnotte</span>
                        <strong>
                            {formatFc(pot)}
                        </strong>
                    </div>
                </div>

                <div className="dames-waiting-loader">
                    <span />
                    <span />
                    <span />
                </div>

                <button
                    type="button"
                    className="dames-secondary-button"
                    onClick={onBack}
                >
                    ← Retour à
                    l'Accueil
                </button>
            </div>
        </div>
    );
}

// ==========================================================
// CONDITIONS
// ==========================================================

function ConditionsModal({
    mode,
    accepted,
    onAccept,
}) {
    const immediate =
        mode === "IA" ||
        mode === "TRAINING";

    return (
        <div className="dames-modal-layer">
            <div className="dames-conditions-modal">
                <div className="dames-modal-icon">
                    ♟
                </div>

                <h2>
                    Conditions du match
                </h2>

                <p className="dames-modal-subtitle">
                    Prenez connaissance des
                    règles avant de commencer.
                </p>

                <div className="dames-conditions-list">
                    <div>
                        <span>✓</span>
                        <p>
                            Les mouvements sont
                            contrôlés et validés
                            par le serveur.
                        </p>
                    </div>

                    <div>
                        <span>✓</span>
                        <p>
                            Chaque tour est limité
                            à 90 secondes.
                        </p>
                    </div>

                    <div>
                        <span>✓</span>
                        <p>
                            Si vous ne jouez pas
                            dans le délai imparti,
                            le serveur détermine
                            automatiquement le résultat.
                        </p>
                    </div>

                    <div>
                        <span>✓</span>
                        <p>
                            Quitter l'écran du jeu
                            pendant une partie active
                            ne suspend pas le chrono
                            serveur.
                        </p>
                    </div>

                    <div>
                        <span>✓</span>
                        <p>
                            Le chat reste disponible
                            et ne provoque pas
                            d'abandon.
                        </p>
                    </div>

                    <div>
                        <span>✓</span>
                        <p>
                            Le résultat final est
                            déterminé par le serveur.
                        </p>
                    </div>
                </div>

                <div className="dames-condition-warning">
                    ⏱️ Attention : votre tour doit
                    être joué dans les 90 secondes.
                    Le serveur détermine automatiquement
                    le résultat en cas d'expiration.
                </div>

                <button
                    type="button"
                    className="dames-primary-button"
                    disabled={accepted}
                    onClick={onAccept}
                >
                    {accepted
                        ? "Conditions acceptées"
                        : immediate
                        ? "J'accepte et je commence"
                        : "J'accepte les conditions"}
                </button>
            </div>
        </div>
    );
}

// ==========================================================
// CHAT
// ==========================================================

function ChatPanel({
    messages,
    input,
    typingPlayer,
    onChange,
    onSend,
    onClose,
}) {
    const chatRef = useRef(null);

    useEffect(() => {
        if (!chatRef.current) {
            return;
        }

        chatRef.current.scrollTop =
            chatRef.current.scrollHeight;
    }, [
        messages,
        typingPlayer,
    ]);

    return (
        <div className="dames-chat-panel">
            <div className="dames-chat-header">
                <div>
                    <strong>
                        Discussion
                    </strong>

                    <span>
                        Conversation du match
                    </span>
                </div>

                <button
                    type="button"
                    className="dames-icon-button"
                    onClick={onClose}
                >
                    ×
                </button>
            </div>

            <div
                className="dames-chat-messages"
                ref={chatRef}
            >
                {messages.length === 0 && (
                    <div className="dames-chat-empty">
                        <div>
                            💬
                        </div>

                        <strong>
                            Aucun message
                        </strong>

                        <span>
                            Commencez la
                            conversation.
                        </span>
                    </div>
                )}

                {messages.map(
                    (message, index) => (
                        <div
                            className="dames-chat-message"
                            key={`${index}-${message.text}`}
                        >
                            <div className="dames-chat-author">
                                {message.username}
                            </div>

                            <div className="dames-chat-bubble">
                                {message.text}
                            </div>
                        </div>
                    )
                )}

                {typingPlayer && (
                    <div className="dames-chat-typing">
                        <span />
                        <span />
                        <span />

                        {typingPlayer}
                        {" "}écrit...
                    </div>
                )}
            </div>

            <form
                className="dames-chat-form"
                onSubmit={(event) => {
                    event.preventDefault();
                    onSend();
                }}
            >
                <input
                    value={input}
                    maxLength={
                        MAX_CHAT_LENGTH
                    }
                    onChange={onChange}
                    placeholder="Écrire un message..."
                    autoComplete="off"
                />

                <button
                    type="submit"
                    disabled={!input.trim()}
                >
                    ➤
                </button>
            </form>
        </div>
    );
}

// ==========================================================
// RESULT
// ==========================================================

function ResultPanel({
    won,
    draw,
    pot,
    stake,
    onBack,
}) {
    const reward = won ? pot : 0;

    return (
        <div className="dames-result-card">
            <div
                className={[
                    "dames-result-icon",
                    won
                        ? "result-win"
                        : draw
                        ? "result-draw"
                        : "result-loss",
                ].join(" ")}
            >
                {won
                    ? "🏆"
                    : draw
                    ? "🤝"
                    : "♟"}
            </div>

            <div className="dames-result-label">
                {won
                    ? "VICTOIRE"
                    : draw
                    ? "MATCH NUL"
                    : "PARTIE TERMINÉE"}
            </div>

            <h1>
                {won
                    ? "Félicitations !"
                    : draw
                    ? "Belle partie !"
                    : "Partie terminée"}
            </h1>

            <p>
                {won
                    ? `Vous avez gagné ${formatFc(
                          reward
                      )}.`
                    : draw
                    ? "La partie se termine par un match nul."
                    : `Vous avez perdu ${formatFc(
                          stake
                      )}.`}
            </p>

            {won && (
                <div className="dames-result-prize">
                    <span>
                        Gain du match
                    </span>

                    <strong>
                        {formatFc(reward)}
                    </strong>
                </div>
            )}

            {!won && !draw && (
                <div className="dames-result-prize">
                    <span>
                        Mise engagée
                    </span>

                    <strong>
                        {formatFc(stake)}
                    </strong>
                </div>
            )}

            <button
                type="button"
                className="dames-primary-button"
                onClick={onBack}
            >
                Retour à l'Accueil
            </button>
        </div>
    );
}

// ==========================================================
// AVIS DE FIN DE MATCH
// ==========================================================

function AvisModal({
    matchId,
    onSkip,
    onSubmitted,
}) {
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!matchId || !Number.isFinite(Number(matchId))) {
            setError("Identifiant de partie invalide.");
            return;
        }

        if (!rating || rating < 1 || rating > 5) {
            setError("Choisissez une note entre 1 et 5.");
            return;
        }

        setSubmitting(true);
        setError("");

        try {
            await createAvis({
                game: "dames",
                matchId: Number(matchId),
                rating,
                comment: comment.trim() || null,
                context: "match",
            });

            onSubmitted?.();
        } catch (submitError) {
            console.error(
                "❌ DAMES AVIS SUBMIT ERROR :",
                submitError
            );

            setError(
                submitError?.response?.data?.message ||
                submitError?.response?.data?.error ||
                "Impossible d'enregistrer votre avis."
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="dames-modal-layer">
            <div className="dames-conditions-modal dames-review-modal">
                <div className="dames-modal-icon">
                    ★
                </div>

                <h2>
                    Votre avis sur la partie
                </h2>

                <p className="dames-modal-subtitle">
                    Votre retour nous aide à améliorer
                    l'expérience Dames de 6BetBall.
                </p>

                <form onSubmit={handleSubmit}>
                    <div
                        className="dames-review-stars"
                        role="radiogroup"
                        aria-label="Note de la partie"
                    >
                        {[1, 2, 3, 4, 5].map((value) => (
                            <button
                                key={value}
                                type="button"
                                className={
                                    value <= rating
                                        ? "dames-review-star active"
                                        : "dames-review-star"
                                }
                                onClick={() =>
                                    setRating(value)
                                }
                                disabled={submitting}
                                aria-label={`${value} étoile${value > 1 ? "s" : ""}`}
                                aria-pressed={value === rating}
                            >
                                ★
                            </button>
                        ))}
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
                        placeholder="Votre commentaire (facultatif)"
                        rows={4}
                        disabled={submitting}
                    />

                    {error && (
                        <div className="dames-review-error">
                            {error}
                        </div>
                    )}

                    <div className="dames-review-actions">
                        <button
                            type="button"
                            className="dames-secondary-button"
                            onClick={onSkip}
                            disabled={submitting}
                        >
                            Plus tard
                        </button>

                        <button
                            type="submit"
                            className="dames-primary-button"
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
                </form>
            </div>
        </div>
    );
}

// ==========================================================
// MAIN COMPONENT
// ==========================================================

export default function Dames({
    gameConfig,
    resetGame,
}) {
    // ------------------------------------------------------
    // MATCH SAC
    // ------------------------------------------------------

    const matchId = Number(
        gameConfig?.matchId ??
            gameConfig?.match_id ??
            gameConfig?.id
    );

    const mode = useMemo(
        () => normalizeMode(gameConfig),
        [gameConfig]
    );

    // ------------------------------------------------------
    // STATE
    // ------------------------------------------------------

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
        useState("--");

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

    const [
        conditionsAccepted,
        setConditionsAccepted,
    ] = useState(false);

    const [
        waitingOpponent,
        setWaitingOpponent,
    ] = useState(
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

    const [turnSeconds, setTurnSeconds] =
        useState(null);

    const [animatedMove, setAnimatedMove] =
        useState(null);

    const [reviewOpen, setReviewOpen] =
        useState(false);

    const [resultReady, setResultReady] =
        useState(false);

    // ------------------------------------------------------
    // REFS
    // ------------------------------------------------------

    const socketRef = useRef(null);

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

    // ------------------------------------------------------
    // REF SYNCHRONISATION
    // ------------------------------------------------------

    useEffect(() => {
        conditionsAcceptedRef.current =
            conditionsAccepted;
    }, [conditionsAccepted]);

    useEffect(() => {
        gameOverRef.current =
            gameOver;
    }, [gameOver]);

    useEffect(() => {
        boardRef.current = board;
    }, [board]);

    useEffect(() => {
        sacMatchRef.current = sacMatch;
    }, [sacMatch]);

    // ======================================================
    // DERIVED
    // ======================================================

    const isMyTurn =
        Number(turn) ===
        Number(myPlayer);

    const myPieces = useMemo(() => {
        return Number(myPlayer) ===
            PLAYER_1
            ? [PLAYER_1, KING_1]
            : [PLAYER_2, KING_2];
    }, [myPlayer]);

    const playablePieces = useMemo(() => {
        const result = new Set();

        allMoves.forEach((rawMove) => {
            const move =
                normalizeMove(rawMove);

            if (!move?.from) {
                return;
            }

            result.add(
                `${move.from.r}-${move.from.c}`
            );
        });

        return result;
    }, [allMoves]);

    const targets = useMemo(() => {
        const result = new Map();

        validMoves.forEach((rawMove) => {
            const move =
                normalizeMove(rawMove);

            if (!move) {
                return;
            }

            const destination =
                move.path[
                    move.path.length - 1
                ];

            if (!destination) {
                return;
            }

            result.set(
                `${destination.r}-${destination.c}`,
                move
            );
        });

        return result;
    }, [validMoves]);

    const boardStats = useMemo(() => {
        let mine = 0;
        let enemy = 0;
        let myKings = 0;
        let enemyKings = 0;

        if (!board) {
            return {
                mine,
                enemy,
                myKings,
                enemyKings,
            };
        }

        board.forEach((row) => {
            row.forEach((cell) => {
                const value =
                    Number(cell);

                if (
                    myPieces.includes(
                        value
                    )
                ) {
                    mine++;

                    if (
                        value === KING_1 ||
                        value === KING_2
                    ) {
                        myKings++;
                    }
                } else if (
                    value !== 0
                ) {
                    enemy++;

                    if (
                        value === KING_1 ||
                        value === KING_2
                    ) {
                        enemyKings++;
                    }
                }
            });
        });

        return {
            mine,
            enemy,
            myKings,
            enemyKings,
        };
    }, [board, myPieces]);

    const player1Stats =
        Number(myPlayer) === PLAYER_1
            ? {
                  pieces:
                      boardStats.mine,
                  kings:
                      boardStats.myKings,
              }
            : {
                  pieces:
                      boardStats.enemy,
                  kings:
                      boardStats.enemyKings,
              };

    const player2Stats =
        Number(myPlayer) === PLAYER_2
            ? {
                  pieces:
                      boardStats.mine,
                  kings:
                      boardStats.myKings,
              }
            : {
                  pieces:
                      boardStats.enemy,
                  kings:
                      boardStats.enemyKings,
              };

    const amWinner =
        !draw &&
        Number(winnerSide) ===
            Number(myPlayer);

    const boardPerspectiveClass =
        Number(myPlayer) === PLAYER_2
            ? "dames-board-perspective-player2"
            : "dames-board-perspective-player1";

    // ======================================================
    // SAC REST
    // ======================================================

    const loadSacMatch = useCallback(
        async () => {
            if (
                !matchId ||
                !Number.isFinite(matchId)
            ) {
                return;
            }

            try {
                const response =
                    await getSacMatch(
                        matchId
                    );

                console.log(
                    "♟️ DAMES SAC RESPONSE :",
                    response
                );

                const data =
                    normalizeSacPayload(
                        response?.data ??
                            response
                    );

                console.log(
                    "♟️ DAMES SAC MATCH NORMALISÉ :",
                    data
                );

                if (!data) {
                    return;
                }

                /**
                 * Ne pas considérer simplement
                 * { success: true } comme un match.
                 */
                const hasRealMatchData =
                    Boolean(
                        data?.id ||
                        data?.matchId ||
                        data?.match_id ||
                        data?.user1_id ||
                        data?.user1Id ||
                        data?.user2_id ||
                        data?.user2Id ||
                        data?.players ||
                        data?.board ||
                        data?.state ||
                        data?.game
                    );

                if (!hasRealMatchData) {
                    console.warn(
                        "⚠️ DAMES : réponse SAC sans données de match exploitables.",
                        data
                    );

                    /**
                     * Ne pas écraser une partie déjà
                     * connue du socket.
                     */
                    if (
                        !boardRef.current &&
                        !sacMatchRef.current
                    ) {
                        setLoadingError(
                            false
                        );
                    }

                    return;
                }

                setSacMatch(data);

                // ------------------------------------------
                // JOUEURS
                // ------------------------------------------

                const names =
                    extractPlayers(
                        data,
                        gameConfig
                    );

                setPlayerNames(
                    (previous) => ({
                        player1:
                            names.player1 ||
                            previous.player1,

                        player2:
                            names.player2 ||
                            previous.player2,
                    })
                );

                // ------------------------------------------
                // MISE / CAGNOTTE
                // ------------------------------------------

                const nextStake =
                    extractStake(
                        gameConfig,
                        data
                    );

                const nextPot =
                    extractPot(
                        gameConfig,
                        data
                    );

                if (
                    Number.isFinite(
                        nextStake
                    )
                ) {
                    setStake(
                        nextStake
                    );
                }

                if (
                    Number.isFinite(
                        nextPot
                    )
                ) {
                    setPot(
                        nextPot
                    );
                }

                // ------------------------------------------
                // PRÉSENCE ADVERSAIRE
                // ------------------------------------------

                if (mode === "USER") {
                    const hasOpponent =
                        hasOpponentFromMatch(
                            data
                        );

                    console.log(
                        "♟️ DAMES PRESENCE SAC :",
                        {
                            matchId,
                            hasOpponent,
                            user1:
                                data?.user1_id ??
                                data?.user1Id,
                            user2:
                                data?.user2_id ??
                                data?.user2Id,
                            players:
                                data?.players,
                            board:
                                isValidBoard(
                                    data?.board
                                ),
                        }
                    );

                    if (hasOpponent) {
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
                    } else {
                        /**
                         * IMPORTANT :
                         * si le socket a déjà fourni
                         * un état de partie valide,
                         * le polling SAC ne doit pas
                         * remettre waitingOpponent=true.
                         */
                        if (
                            !boardRef.current
                        ) {
                            setWaitingOpponent(
                                true
                            );
                        }
                    }
                } else {
                    setWaitingOpponent(
                        false
                    );
                }

                setLoading(false);
                setLoadingError(false);
            } catch (error) {
                console.error(
                    "❌ DAMES LOAD MATCH ERROR :",
                    error
                );

                /**
                 * Une erreur REST ne doit pas
                 * casser une partie déjà reçue
                 * via socket.
                 */
                if (
                    !boardRef.current &&
                    !sacMatch
                ) {
                    setLoadingError(
                        true
                    );
                }

                setLoading(false);
            }
        },
        [
            matchId,
            mode,
            gameConfig,
        ]
    );

    // ======================================================
    // SOCKET
    // ======================================================

    useEffect(() => {
        if (
            !matchId ||
            !Number.isFinite(matchId)
        ) {
            setLoading(false);
            setLoadingError(true);
            return undefined;
        }

        const socket =
            connectDamesSocket();

        if (!socket) {
            setLoading(false);
            setLoadingError(true);
            setConnected(false);

            return undefined;
        }

        socketRef.current =
            socket;

        // --------------------------------------------------
        // REST INITIAL + FALLBACK PRESENCE
        // --------------------------------------------------

        loadSacMatch();

        if (
            presenceTimer.current
        ) {
            clearInterval(
                presenceTimer.current
            );
        }

        presenceTimer.current =
            setInterval(() => {
                loadSacMatch();
            }, MATCH_REFRESH);

        // ==================================================
        // APPLY STATE
        // ==================================================

        const applyState = (data) => {
            if (!data) {
                return;
            }

            console.log(
                "♟️ DAMES APPLY STATE :",
                data
            );

            // ----------------------------------------------
            // ETAT CENTRAL
            // ----------------------------------------------

            const state =
                getGameState(data);

            // ----------------------------------------------
            // PLATEAU
            // ----------------------------------------------

            const nextBoard =
                data?.board ??
                data?.state?.board ??
                data?.game?.board ??
                data?.match?.board;

            const validBoard =
                isValidBoard(nextBoard);

            if (validBoard) {
                setBoard(
                    nextBoard
                );
            }

            // ----------------------------------------------
            // TOUR
            // ----------------------------------------------

            const nextTurn =
                data?.turn ??
                data?.state?.turn ??
                data?.game?.turn ??
                data?.match?.turn;

            if (
                nextTurn !== undefined &&
                nextTurn !== null
            ) {
                const numericTurn =
                    Number(nextTurn);

                if (
                    numericTurn === PLAYER_1 ||
                    numericTurn === PLAYER_2
                ) {
                    setTurn(
                        numericTurn
                    );
                }
            }

            // ----------------------------------------------
            // JOUEUR LOCAL
            // ----------------------------------------------

            const nextPlayer =
                extractMyPlayer(
                    data,
                    gameConfig
                );

            if (
                nextPlayer === PLAYER_1 ||
                nextPlayer === PLAYER_2
            ) {
                setMyPlayer(
                    nextPlayer
                );
            }

            // ----------------------------------------------
            // COUPS VALIDES
            // ----------------------------------------------

            const normalizedMoves =
                normalizeMoves(data);

            /**
             * Si le backend envoie explicitement
             * une collection de coups, on la conserve.
             */
            const hasMovesPayload =
                Array.isArray(
                    data?.allMoves
                ) ||
                Array.isArray(
                    data?.validMoves
                ) ||
                Array.isArray(
                    data?.moves
                ) ||
                Array.isArray(
                    data?.state?.allMoves
                ) ||
                Array.isArray(
                    data?.state?.validMoves
                ) ||
                Array.isArray(
                    data?.state?.moves
                ) ||
                Array.isArray(
                    data?.game?.allMoves
                ) ||
                Array.isArray(
                    data?.game?.validMoves
                ) ||
                Array.isArray(
                    data?.game?.moves
                );

            if (hasMovesPayload) {
                setAllMoves(
                    normalizedMoves
                );
            }

            // ----------------------------------------------
            // DERNIER COUP
            // ----------------------------------------------

            const nextLastMove =
                data?.lastMove ??
                data?.state?.lastMove ??
                data?.game?.lastMove ??
                data?.match?.lastMove;

            if (
                nextLastMove &&
                isValidMove(
                    nextLastMove
                )
            ) {
                setLastMove(
                    normalizeMove(
                        nextLastMove
                    )
                );
            }

            // ----------------------------------------------
            // TIMER
            // ----------------------------------------------

            const nextTurnSeconds =
                data?.turnSeconds ??
                data?.state?.turnSeconds ??
                data?.game?.turnSeconds ??
                data?.match?.turnSeconds ??
                data?.remaining ??
                data?.seconds;

            if (
                nextTurnSeconds !==
                    undefined &&
                nextTurnSeconds !== null
            ) {
                const seconds =
                    Number(
                        nextTurnSeconds
                    );

                if (
                    Number.isFinite(
                        seconds
                    )
                ) {
                    setTurnSeconds(
                        Math.max(
                            0,
                            seconds
                        )
                    );
                }
            }

            // ----------------------------------------------
            // CHAT INITIAL
            // ----------------------------------------------

            const nextMessages =
                data?.messages ??
                data?.state?.messages ??
                data?.game?.messages ??
                data?.match?.messages;

            if (
                Array.isArray(
                    nextMessages
                )
            ) {
                setMessages(
                    nextMessages
                        .slice(
                            -MAX_MESSAGES
                        )
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
                );
            }

            // ----------------------------------------------
            // PRÉSENCE SOCKET
            // ----------------------------------------------

            const socketOpponent =
                hasOpponentFromSocket(
                    data
                );

            /**
             * Un plateau valide + un joueur local
             * + un tour valide = partie constituée.
             */
            const activeGame =
                validBoard &&
                (
                    nextPlayer === PLAYER_1 ||
                    nextPlayer === PLAYER_2
                ) &&
                (
                    Number(nextTurn) === PLAYER_1 ||
                    Number(nextTurn) === PLAYER_2
                );

            if (
                mode === "USER" &&
                (
                    socketOpponent ||
                    activeGame
                )
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

            // ----------------------------------------------
            // JOUEURS
            // ----------------------------------------------

            const names =
                extractPlayers(
                    data,
                    gameConfig
                );

            setPlayerNames(
                (previous) => ({
                    player1:
                        names.player1 ||
                        previous.player1,

                    player2:
                        names.player2 ||
                        previous.player2,
                })
            );

            // ----------------------------------------------
            // MISE / CAGNOTTE
            // ----------------------------------------------

            const currentStake =
                extractStake(
                    gameConfig,
                    data
                );

            const currentPot =
                extractPot(
                    gameConfig,
                    data
                );

            if (
                Number.isFinite(
                    currentStake
                )
            ) {
                setStake(
                    currentStake
                );
            }

            if (
                Number.isFinite(
                    currentPot
                )
            ) {
                setPot(
                    currentPot
                );
            }

            // ----------------------------------------------
            // ETAT FINI TRANSMIS DANS INIT/UPDATE
            // ----------------------------------------------

            const serverFinished =
                Boolean(
                    data?.gameOver ||
                    data?.finished ||
                    data?.status ===
                        "FINISHED" ||
                    data?.matchStatus ===
                        "FINISHED" ||
                    state?.gameOver ||
                    state?.finished ||
                    state?.status ===
                        "FINISHED"
                );

            if (serverFinished) {
                const serverWinner =
                    data?.winner ??
                    data?.winnerSide ??
                    data?.state?.winner ??
                    data?.state?.winnerSide ??
                    data?.game?.winner ??
                    data?.game?.winnerSide;

                if (
                    serverWinner !==
                        undefined &&
                    serverWinner !== null
                ) {
                    setWinnerSide(
                        Number(
                            serverWinner
                        )
                    );
                }

                setDraw(
                    Boolean(
                        data?.draw ??
                            data?.state?.draw ??
                            data?.game?.draw
                    )
                );

                setGameOver(
                    true
                );

                setConditionsOpen(
                    false
                );

                setWaitingOpponent(
                    false
                );

                setTurnSeconds(
                    0
                );
            }

            // ----------------------------------------------
            // IA / TRAINING
            // ----------------------------------------------

            if (
                mode === "IA" ||
                mode === "TRAINING"
            ) {
                setWaitingOpponent(
                    false
                );
            }

            setLoading(false);
            setLoadingError(false);
            setSendingMove(false);
        };

        // ==================================================
        // CONNEXION
        // ==================================================

        const handleConnect = () => {
            console.log(
                "♟️ DAMES SOCKET : connecté",
                {
                    matchId,
                }
            );

            setConnected(true);
            setLoadingError(false);

            joinDamesMatch(
                matchId
            );

            loadSacMatch();
        };

        // ==================================================
        // MATCH INIT
        // ==================================================

        const handleMatchInit = (
            data
        ) => {
            console.log(
                "♟️ DAMES MATCH INIT :",
                data
            );

            applyState(data);
        };

        // ==================================================
        // MATCH UPDATE
        // ==================================================

        const handleMatchUpdate = (
            data
        ) => {
            console.log(
                "♟️ DAMES MATCH UPDATE :",
                data
            );

            if (
                data?.lastMove &&
                isValidMove(
                    data.lastMove
                )
            ) {
                const normalizedLastMove =
                    normalizeMove(
                        data.lastMove
                    );

                const from =
                    normalizedLastMove?.from;

                const to =
                    normalizedLastMove?.path?.[
                        normalizedLastMove
                            ?.path?.length - 1
                    ];

                if (from && to) {
                    let piece = 0;

                    const currentBoard =
                        boardRef.current;

                    if (
                        currentBoard &&
                        currentBoard[from.r]
                    ) {
                        piece =
                            Number(
                                currentBoard[
                                    from.r
                                ]?.[
                                    from.c
                                ]
                            ) || 0;
                    }

                    setAnimatedMove({
                        from,
                        to,
                        piece,
                        key: Date.now(),
                    });

                    clearTimeout(
                        animationTimeout.current
                    );

                    animationTimeout.current =
                        setTimeout(() => {
                            setAnimatedMove(
                                null
                            );
                        }, 650);
                }
            }

            applyState(data);

            setSelected(null);
            setValidMoves([]);
        };

        // ==================================================
        // TIMER
        // ==================================================

        const handleTurnTimer = (
            data
        ) => {
            let seconds = null;

            if (
                typeof data ===
                "number"
            ) {
                seconds =
                    Number(data);
            } else if (
                data?.seconds !==
                undefined
            ) {
                seconds =
                    Number(
                        data.seconds
                    );
            } else if (
                data?.remaining !==
                undefined
            ) {
                seconds =
                    Number(
                        data.remaining
                    );
            } else if (
                data?.turnSeconds !==
                undefined
            ) {
                seconds =
                    Number(
                        data.turnSeconds
                    );
            }

            if (
                Number.isFinite(
                    seconds
                )
            ) {
                setTurnSeconds(
                    Math.max(
                        0,
                        seconds
                    )
                );
            }
        };

        // ==================================================
        // FIN DU MATCH
        // ==================================================

        const handleMatchEnd = (data) => {

            console.log(
                "🏁 DAMES MATCH END :",
                data
            );

            const finalBoard =
                data?.board ??
                data?.state?.board ??
                data?.game?.board ??
                data?.match?.board;

            if (isValidBoard(finalBoard)) {
                setBoard(finalBoard);
            }

            const winner =
                data?.winner ??
                data?.winnerSide ??
                data?.state?.winner ??
                data?.state?.winnerSide ??
                data?.game?.winner ??
                data?.game?.winnerSide ??
                data?.result?.winnerSide;

            const numericWinner =
                Number(winner);

            if (
                numericWinner === PLAYER_1 ||
                numericWinner === PLAYER_2
            ) {
                setWinnerSide(
                    numericWinner
                );
            } else {
                setWinnerSide(null);
            }

            const isDraw =
                Boolean(
                    data?.draw ??
                    data?.state?.draw ??
                    data?.game?.draw ??
                    data?.result?.draw
                );

            setDraw(isDraw);

            setGameOver(true);

            gameOverRef.current = true;

            setConditionsOpen(false);
            setWaitingOpponent(false);
            setSendingMove(false);
            setTurnSeconds(0);

            setResultReady(true);

            // Avis facultatif après la fin du match
            setReviewOpen(true);
        };

        // ==================================================
        // CHAT
        // ==================================================

        const handleChatMessage = (
            message
        ) => {
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

        const handleChatTypingEvent = (
            data
        ) => {
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

        const handleConnectError = (
            error
        ) => {
            console.error(
                "[DAMES] Socket connection error:",
                error
            );

            setConnected(false);

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

            setSendingMove(false);
        };

        const handleDisconnect = () => {
            console.warn(
                "♟️ DAMES SOCKET : déconnexion"
            );

            setConnected(false);
            setSendingMove(false);
        };

        const handleSocketError = (
            error
        ) => {
            console.error(
                "[DAMES] Socket error:",
                error
            );

            setSendingMove(false);
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

        // ==================================================
        // SOCKET DÉJÀ CONNECTÉ
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

                console.log(
                    "♟️ DAMES PION SÉLECTIONNÉ :",
                    {
                        row,
                        col,
                        piece: value,
                        allMoves,
                        moves,
                    }
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

    /**
     * IMPORTANT :
     * le mode attente n'est affiché que si :
     *
     * 1. mode USER
     * 2. aucun adversaire détecté
     * 3. aucun plateau de partie valide
     *
     * Si le backend/socket a déjà donné le plateau,
     * on affiche la partie même si SAC REST est pauvre.
     */
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
    // RESULT
    // ======================================================

    if (gameOver) {

    if (reviewOpen) {
        return (
            <div className="dames-screen">
                <AvisModal
                    matchId={matchId}
                    onSkip={() => {
                        setReviewOpen(false);
                    }}
                    onSubmitted={() => {
                        setReviewOpen(false);
                    }}
                />
            </div>
        );
    }

    return (
        <div className="dames-screen">
            <ResultPanel
                won={amWinner}
                draw={draw}
                pot={pot}
                stake={stake}
                onBack={resetGame}
            />
        </div>
    );
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
