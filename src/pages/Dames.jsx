import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { io } from "socket.io-client";
import html2canvas from "html2canvas";
import "./Dames.css";

/* =========================================================
   CONFIGURATION
========================================================= */

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://backend-ad3t.onrender.com/api";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  API_URL.replace(/\/api\/?$/, "");

const BOARD_SIZE = 10;

const PLAYER_1 = 1;
const PLAYER_2 = 2;
const KING_1 = 3;
const KING_2 = 4;

const MAX_CHAT_LENGTH = 300;
const MAX_MESSAGES = 100;
const SOCKET_TIMEOUT = 15000;
const MATCH_PRESENCE_REFRESH = 1500;
const CHECKERS_GAME_ID = "checkers";

/* =========================================================
   HELPERS
========================================================= */

function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("jwt") ||
    null
  );
}

function sanitizeText(value) {
  return String(value || "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .slice(0, MAX_CHAT_LENGTH);
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
          [0, 1, 2, 3, 4].includes(Number(cell))
        )
    )
  );
}

function isValidMove(move) {
  return Boolean(
    move &&
      move.from &&
      Array.isArray(move.path) &&
      move.path.length > 0
  );
}

function normalizeMode(config) {
  const mode = String(
    config?.mode ||
      config?.gameMode ||
      config?.matchMode ||
      config?.type ||
      "USER"
  ).toUpperCase();

  if (
    mode === "IA" ||
    mode === "AI" ||
    mode === "BOT"
  ) {
    return "IA";
  }

  if (
    mode === "TRAINING" ||
    mode === "ENTRAINEMENT" ||
    mode === "TRAIN"
  ) {
    return "TRAINING";
  }

  return "USER";
}

function getPlayerName(player, fallback) {
  if (!player) return fallback;

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

function extractPlayerNames(data, config) {
  const home =
    data?.homePlayer ||
    data?.player1 ||
    data?.players?.[0] ||
    data?.home ||
    config?.homePlayer ||
    config?.player1;

  const away =
    data?.awayPlayer ||
    data?.player2 ||
    data?.players?.[1] ||
    data?.away ||
    config?.awayPlayer ||
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
  const value =
    data?.stake ??
    data?.amount ??
    data?.match?.stake ??
    config?.stake ??
    config?.amount ??
    0;

  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function extractPot(config, data) {
  const explicit =
    data?.pot ??
    data?.prize ??
    data?.match?.pot ??
    config?.pot ??
    config?.prize;

  if (explicit !== undefined && explicit !== null) {
    const number = Number(explicit);
    if (Number.isFinite(number)) return number;
  }

  const stake = extractStake(config, data);
  return stake > 0 ? stake * 2 : 0;
}

function formatFc(value) {
  const amount = Number(value) || 0;

  return `${new Intl.NumberFormat("fr-FR").format(
    amount
  )} Fc`;
}

function samePosition(a, b) {
  return (
    a &&
    b &&
    Number(a.r) === Number(b.r) &&
    Number(a.c) === Number(b.c)
  );
}

function getPieceLabel(piece) {
  if (piece === KING_1 || piece === KING_2) {
    return "Roi";
  }

  return "Pion";
}

/* =========================================================
   CELL
========================================================= */

const Cell = memo(function Cell({
  cell,
  row,
  col,
  selected,
  possible,
  playable,
  last,
  myTurn,
  onClick,
  hiddenPiece,
}) {
  const dark = (row + col) % 2 === 1;

  const whitePiece =
    cell === PLAYER_1 || cell === KING_1;

  const king =
    cell === KING_1 || cell === KING_2;

  return (
    <button
      type="button"
      className={[
        "dames-cell",
        dark ? "dames-cell-dark" : "dames-cell-light",
        selected ? "dames-cell-selected" : "",
        possible ? "dames-cell-target" : "",
        last ? "dames-cell-last" : "",
        playable ? "dames-cell-playable" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={() => onClick(row, col)}
      disabled={!dark || !myTurn}
      aria-label={`Case ${row + 1}, ${col + 1}`}
    >
      {cell !== 0 && !hiddenPiece && (
        <span
          className={[
            "dames-piece",
            whitePiece
              ? "dames-piece-white"
              : "dames-piece-black",
            king ? "dames-piece-king" : "",
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

/* =========================================================
   PLAYER CARD
========================================================= */

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
          side === 1
            ? "avatar-white"
            : "avatar-black",
        ].join(" ")}
      >
        {side === 1 ? "♙" : "♟"}
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
          <span>{pieces} pièces</span>
          <span>•</span>
          <span>{kings} rois</span>
        </div>
      </div>

      <div
        className={[
          "dames-turn-indicator",
          active ? "active" : "",
        ].join(" ")}
      >
        {active ? "À vous" : "En attente"}
      </div>
    </div>
  );
});

/* =========================================================
   CHAT
========================================================= */

function ChatPanel({
  messages,
  input,
  typingPlayer,
  onChange,
  onSend,
  onClose,
  chatRef,
}) {
  return (
    <div className="dames-chat-panel">
      <div className="dames-chat-header">
        <div>
          <strong>Discussion</strong>
          <span>Conversation privée du match</span>
        </div>

        <button
          type="button"
          className="dames-icon-button"
          onClick={onClose}
          aria-label="Fermer le chat"
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
            <div className="dames-chat-empty-icon">
              💬
            </div>
            <strong>Aucun message</strong>
            <span>
              Commencez la conversation avec votre
              adversaire.
            </span>
          </div>
        )}

        {messages.map((message, index) => (
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
        ))}

        {typingPlayer && (
          <div className="dames-chat-typing">
            <span />
            <span />
            <span />
            {typingPlayer} écrit...
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
          maxLength={MAX_CHAT_LENGTH}
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

/* =========================================================
   CONDITIONS
========================================================= */

function ConditionsModal({
  mode,
  accepted,
  onAccept,
  onClose,
}) {
  const immediate =
    mode === "IA" || mode === "TRAINING";

  return (
    <div className="dames-modal-layer">
      <div className="dames-conditions-modal">
        <div className="dames-modal-icon">
          ♟
        </div>

        <div className="dames-modal-title">
          Conditions du match
        </div>

        <div className="dames-modal-subtitle">
          Prenez connaissance des règles avant de
          commencer.
        </div>

        <div className="dames-conditions-list">
          <div>
            <span>✓</span>
            <p>
              Les mouvements sont contrôlés par le
              serveur.
            </p>
          </div>

          <div>
            <span>✓</span>
            <p>
              Le tour de chaque joueur est limité à
              90 secondes.
            </p>
          </div>

          <div>
            <span>✓</span>
            <p>
              Quitter volontairement le match ou
              abandonner entraîne la fin de la partie.
            </p>
          </div>

          <div>
            <span>✓</span>
            <p>
              Quitter l'écran du jeu pendant une
              partie en cours est considéré comme un
              abandon.
            </p>
          </div>

          <div>
            <span>✓</span>
            <p>
              Le chat reste disponible sans interrompre
              la partie.
            </p>
          </div>

          <div>
            <span>✓</span>
            <p>
              Les résultats du match sont définitifs
              après validation par le serveur.
            </p>
          </div>
        </div>

        <div className="dames-condition-warning">
          ⚠️ En quittant la partie après son démarrage,
          vous pouvez être déclaré perdant.
        </div>

        <div className="dames-modal-actions">
          {immediate ? (
            <button
              type="button"
              className="dames-primary-button"
              onClick={onAccept}
              disabled={accepted}
            >
              {accepted
                ? "Conditions acceptées"
                : "J'accepte et je commence"}
            </button>
          ) : (
            <button
              type="button"
              className="dames-primary-button"
              onClick={onAccept}
              disabled={accepted}
            >
              {accepted
                ? "Conditions acceptées"
                : "J'accepte les conditions"}
            </button>
          )}

          {onClose && (
            <button
              type="button"
              className="dames-secondary-button"
              onClick={onClose}
            >
              Retour
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   WAITING
========================================================= */

function WaitingScreen({
  playerName,
  mode,
  stake,
  pot,
  connected,
  onBack,
}) {
  return (
    <div className="dames-waiting-screen">
      <div className="dames-waiting-card">
        <div className="dames-waiting-logo">
          ♟
        </div>

        <div className="dames-live-pill">
          <span className="dames-live-dot" />
          {connected
            ? "Serveur connecté"
            : "Connexion..."}
        </div>

        <h1>
          En attente de votre adversaire
        </h1>

        <p>
          {mode === "USER"
            ? "Votre match est créé. Vous pouvez revenir à l'accueil : la partie restera disponible pour être reprise."
            : "Préparation de la partie..."}
        </p>

        <div className="dames-waiting-match">
          <div>
            <span>Joueur</span>
            <strong>{playerName}</strong>
          </div>

          <div>
            <span>Mise</span>
            <strong>{formatFc(stake)}</strong>
          </div>

          <div>
            <span>Cagnotte</span>
            <strong>{formatFc(pot)}</strong>
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
          ← Retour à l'Accueil
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   REVIEW
========================================================= */

function ReviewPanel({
  rating,
  setRating,
  review,
  setReview,
  submitted,
  onSubmit,
  onSkip,
}) {
  return (
    <div className="dames-review-card">
      <div className="dames-review-icon">
        ⭐
      </div>

      <h2>Comment avez-vous vécu ce match ?</h2>

      <p>
        Votre avis est facultatif et nous aide à
        améliorer l'expérience de jeu.
      </p>

      <div className="dames-stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={
              star <= rating
                ? "selected"
                : ""
            }
            onClick={() => setRating(star)}
            aria-label={`${star} étoile${
              star > 1 ? "s" : ""
            }`}
          >
            ★
          </button>
        ))}
      </div>

      <textarea
        value={review}
        onChange={(event) =>
          setReview(
            sanitizeText(event.target.value)
          )
        }
        maxLength={500}
        placeholder="Écrivez votre commentaire..."
      />

      <div className="dames-review-actions">
        <button
          type="button"
          className="dames-primary-button"
          onClick={onSubmit}
          disabled={submitted || rating === 0}
        >
          {submitted
            ? "Avis enregistré"
            : "Envoyer mon avis"}
        </button>

        <button
          type="button"
          className="dames-link-button"
          onClick={onSkip}
        >
          Passer
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   RESULT
========================================================= */

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
        {won ? "🏆" : draw ? "🤝" : "♟"}
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
          : "Cette partie est complètement terminée"}
      </h1>

      <p className="dames-result-message">
        {won
          ? `Félicitations, vous avez gagné ${formatFc(
              reward
            )} pour ce match.`
          : draw
          ? `La partie se termine par un match nul.`
          : `Cette partie est complètement terminée, vous avez perdu ${formatFc(
              stake
            )}.`}
      </p>

      {won && (
        <div className="dames-result-prize">
          <span>Gain du match</span>
          <strong>{formatFc(reward)}</strong>
        </div>
      )}

      {!won && !draw && (
        <div className="dames-result-prize">
          <span>Mise engagée</span>
          <strong>{formatFc(stake)}</strong>
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

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function Dames({
  gameConfig,
  resetGame,
}) {
  const matchId =
    gameConfig?.matchId ??
    gameConfig?.match_id ??
    gameConfig?.id;

  const token = getToken();

  const mode = useMemo(
    () => normalizeMode(gameConfig),
    [gameConfig]
  );

  const [board, setBoard] = useState(null);
  const [turn, setTurn] = useState(null);
  const [myPlayer, setMyPlayer] = useState(null);

  const [allMoves, setAllMoves] = useState([]);
  const [selected, setSelected] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [lastMove, setLastMove] = useState(null);

  const [connected, setConnected] = useState(false);
  const [ping, setPing] = useState("--");

  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [typingPlayer, setTypingPlayer] =
    useState(null);
  const [chatOpen, setChatOpen] = useState(false);

  const [gameOver, setGameOver] = useState(false);
  const [winnerSide, setWinnerSide] =
    useState(null);
  const [draw, setDraw] = useState(false);

  const [conditionsOpen, setConditionsOpen] =
    useState(
      mode === "IA" || mode === "TRAINING"
    );
  const [conditionsAccepted, setConditionsAccepted] =
    useState(false);

  const [waitingOpponent, setWaitingOpponent] =
    useState(mode === "USER");

  const [loadingError, setLoadingError] =
    useState(false);
  const [sendingMove, setSendingMove] =
    useState(false);

  const [reporting, setReporting] = useState(false);

  const [playerNames, setPlayerNames] = useState({
    player1: "Joueur 1",
    player2: "Adversaire",
  });

  const [stake, setStake] = useState(
    extractStake(gameConfig, null)
  );

  const [pot, setPot] = useState(
    extractPot(gameConfig, null)
  );

  const [turnSeconds, setTurnSeconds] =
    useState(null);

  const [reviewVisible, setReviewVisible] =
    useState(false);
  const [reviewSubmitted, setReviewSubmitted] =
    useState(false);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");

  const [animatedMove, setAnimatedMove] =
    useState(null);

  const socketRef = useRef(null);
  const boardRef = useRef(null);
  const chatRef = useRef(null);

  const typingTimeout = useRef(null);
  const pingInterval = useRef(null);
  const loadingTimeout = useRef(null);
  const moveTimeout = useRef(null);
  const animationTimeout = useRef(null);
  const abandonmentSent = useRef(false);
  const matchPresenceTimer = useRef(null);
  const presenceRequestRef = useRef(false);

  /* =======================================================
     DERIVED
  ======================================================= */

  const isMyTurn =
    Number(turn) === Number(myPlayer);

  const myPieces = useMemo(() => {
    return Number(myPlayer) === PLAYER_1
      ? [PLAYER_1, KING_1]
      : [PLAYER_2, KING_2];
  }, [myPlayer]);

  const playablePieces = useMemo(() => {
    const result = new Set();

    allMoves.forEach((move) => {
      if (move?.from) {
        result.add(
          `${move.from.r}-${move.from.c}`
        );
      }
    });

    return result;
  }, [allMoves]);

  const targets = useMemo(() => {
    const result = new Map();

    validMoves.forEach((move) => {
      if (!isValidMove(move)) return;

      const destination =
        move.path[move.path.length - 1];

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
        if (myPieces.includes(cell)) {
          mine++;

          if (
            cell === KING_1 ||
            cell === KING_2
          ) {
            myKings++;
          }
        } else if (cell !== 0) {
          enemy++;

          if (
            cell === KING_1 ||
            cell === KING_2
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
          pieces: boardStats.mine,
          kings: boardStats.myKings,
        }
      : {
          pieces: boardStats.enemy,
          kings: boardStats.enemyKings,
        };

  const player2Stats =
    Number(myPlayer) === PLAYER_2
      ? {
          pieces: boardStats.mine,
          kings: boardStats.myKings,
        }
      : {
          pieces: boardStats.enemy,
          kings: boardStats.enemyKings,
        };

  const amWinner =
    !draw &&
    Number(winnerSide) === Number(myPlayer);

  /* =======================================================
     PRÉSENCE DU DEUXIÈME JOUEUR — SAC REST
  ======================================================= */

  const syncMatchPresence = useCallback(async () => {
    if (
      !matchId ||
      mode !== "USER" ||
      presenceRequestRef.current ||
      gameOver
    ) {
      return;
    }

    presenceRequestRef.current = true;

    try {
      const response = await fetch(
        `${API_URL}/sac/matches?game=${CHECKERS_GAME_ID}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          cache: "no-store",
        }
      );

      if (!response.ok) {
        return;
      }

      const data = await response.json();

      const matches = Array.isArray(data?.matches)
        ? data.matches
        : [];

      const currentMatch = matches.find(
        (match) =>
          Number(
            match?.id ??
              match?.matchId ??
              match?.match_id
          ) === Number(matchId)
      );

      if (!currentMatch) {
        return;
      }

      const players =
        currentMatch?.players || {};

      const creatorId = Number(
        players?.creator ??
          currentMatch?.creatorId ??
          currentMatch?.creator_id
      );

      const opponentId = Number(
        players?.opponent ??
          currentMatch?.opponentId ??
          currentMatch?.opponent_id
      );

      const hasOpponent =
        Number.isFinite(opponentId) &&
        opponentId > 0;

      /*
       * =====================================================
       * USER VS USER
       * =====================================================
       */

      if (mode === "USER") {
        if (hasOpponent) {
          console.log(
            "🟢 [DAMES] ADVERSAIRE DÉTECTÉ",
            {
              matchId,
              creatorId,
              opponentId,
              status: currentMatch?.status,
            }
          );

          setWaitingOpponent(false);

          /*
           * Les conditions ne s'affichent qu'après
           * l'arrivée réelle du deuxième joueur.
           */
          setConditionsOpen(
            (previous) =>
              conditionsAccepted
                ? previous
                : true
          );

          /*
           * Les noms viennent du SAC lorsqu'ils existent.
           */
          const creator =
            players?.creatorUser ??
            players?.creatorPlayer ??
            currentMatch?.creator ??
            currentMatch?.creatorUser;

          const opponent =
            players?.opponentUser ??
            players?.opponentPlayer ??
            currentMatch?.opponent ??
            currentMatch?.opponentUser;

          setPlayerNames((previous) => ({
            player1: getPlayerName(
              creator,
              previous.player1
            ),
            player2: getPlayerName(
              opponent,
              previous.player2
            ),
          }));

          const currentStake =
            extractStake(
              gameConfig,
              currentMatch
            );

          const currentPot =
            extractPot(
              gameConfig,
              currentMatch
            );

          if (currentStake > 0) {
            setStake(currentStake);
          }

          if (currentPot > 0) {
            setPot(currentPot);
          }
        } else {
          setWaitingOpponent(true);

          /*
           * Pendant l'attente, aucune condition de match
           * ne doit bloquer inutilement l'interface.
           */
          setConditionsOpen(false);
        }
      }
    } catch (error) {
      console.debug(
        "[DAMES] Presence sync:",
        error?.message || error
      );
    } finally {
      presenceRequestRef.current = false;
    }
  }, [
    matchId,
    mode,
    token,
    gameOver,
    gameConfig,
    conditionsAccepted,
  ]);

  useEffect(() => {
    if (!matchId || !token || mode !== "USER") {
      clearInterval(matchPresenceTimer.current);
      matchPresenceTimer.current = null;
      return undefined;
    }

    syncMatchPresence();

    clearInterval(matchPresenceTimer.current);
    matchPresenceTimer.current = setInterval(
      syncMatchPresence,
      MATCH_PRESENCE_REFRESH
    );

    return () => {
      clearInterval(matchPresenceTimer.current);
      matchPresenceTimer.current = null;
    };
  }, [
    matchId,
    token,
    mode,
    syncMatchPresence,
  ]);

  /* =======================================================
     SOCKET
  ======================================================= */

  useEffect(() => {
    if (!matchId || !token) {
      setLoadingError(true);
      return undefined;
    }

    abandonmentSent.current = false;

    const socket = io(SOCKET_URL, {
      auth: {
        token,
      },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: SOCKET_TIMEOUT,
      autoConnect: true,
      forceNew: true,
    });

    socketRef.current = socket;

    const updateNames = (data) => {
      setPlayerNames((previous) => {
        const names = extractPlayerNames(
          data,
          gameConfig
        );

        return {
          player1:
            names.player1 ||
            previous.player1,
          player2:
            names.player2 ||
            previous.player2,
        };
      });
    };

    const applyMatchState = (data) => {
      if (!data) return;

      if (
        data.board &&
        isValidBoard(data.board)
      ) {
        setBoard(data.board);
      }

      if (
        data.turn !== undefined &&
        data.turn !== null
      ) {
        setTurn(data.turn);
      }

      if (
        data.player !== undefined &&
        data.player !== null
      ) {
        setMyPlayer(data.player);
      }

      const moves = Array.isArray(
        data.allMoves
      )
        ? data.allMoves.filter(isValidMove)
        : [];

      setAllMoves(moves);

      if (data.lastMove) {
        setLastMove(data.lastMove);
      }

      const dataStake = extractStake(
        gameConfig,
        data
      );

      const dataPot = extractPot(
        gameConfig,
        data
      );

      if (dataStake > 0) {
        setStake(dataStake);
      }

      if (dataPot > 0) {
        setPot(dataPot);
      }

      updateNames(data);

      if (
        Array.isArray(data.messages)
      ) {
        setMessages(
          data.messages
            .slice(-MAX_MESSAGES)
            .map((message) => ({
              username: sanitizeText(
                message.username ||
                  "Joueur"
              ),
              text: sanitizeText(
                message.text || ""
              ),
              playerId: message.playerId,
            }))
        );
      }

      if (
        data.conditionsAccepted ||
        data.conditions?.accepted
      ) {
        setConditionsAccepted(true);
        setConditionsOpen(false);
      }

      /*
       * Le socket ne fournit pas toujours l'adversaire
       * dans match:init/match:update. La présence réelle
       * du deuxième joueur est synchronisée séparément
       * avec le SAC REST pour le mode USER.
       */
      if (mode !== "USER") {
        setWaitingOpponent(false);
      }

      if (
        data.turnSeconds !== undefined
      ) {
        setTurnSeconds(
          Number(data.turnSeconds)
        );
      }

      clearTimeout(
        loadingTimeout.current
      );
      setLoadingError(false);
      setSendingMove(false);
    };

    socket.on("connect", () => {
      setConnected(true);
      setLoadingError(false);

      /*
       * Ancien contrat fonctionnel du Dames.jsx.
       * On conserve joinMatch.
       */
      socket.emit("joinMatch", {
        matchId: Number(matchId),
      });

      /*
       * Ping facultatif de supervision.
       */
      clearInterval(pingInterval.current);

      pingInterval.current = setInterval(() => {
        const sentAt = performance.now();

        socket.emit(
          "ping:test",
          sentAt
        );

        socket.once(
          "pong:test",
          (receivedAt) => {
            const latency = Math.floor(
              performance.now() - receivedAt
            );

            setPing(latency);
          }
        );
      }, 5000);
    });

    socket.on("match:init", (data) => {
      applyMatchState(data);
    });

    socket.on("match:update", (data) => {
      const previousBoard = board;

      if (
        data?.lastMove &&
        isValidMove(data.lastMove)
      ) {
        const destination =
          data.lastMove.path[
            data.lastMove.path.length - 1
          ];

        let piece = 0;

        if (
          previousBoard &&
          data.lastMove.from
        ) {
          piece =
            previousBoard[
              data.lastMove.from.r
            ]?.[data.lastMove.from.c] || 0;
        }

        setAnimatedMove({
          from: data.lastMove.from,
          to: destination,
          piece,
          key: Date.now(),
        });

        clearTimeout(
          animationTimeout.current
        );

        animationTimeout.current =
          setTimeout(() => {
            setAnimatedMove(null);
          }, 650);
      }

      applyMatchState(data);
      setSelected(null);
      setValidMoves([]);
    });

    socket.on("turn:timer", (data) => {
      if (
        typeof data === "number"
      ) {
        setTurnSeconds(data);
        return;
      }

      if (data?.seconds !== undefined) {
        setTurnSeconds(
          Number(data.seconds)
        );
      } else if (
        data?.remaining !== undefined
      ) {
        setTurnSeconds(
          Number(data.remaining)
        );
      }
    });

    socket.on("match:end", (data) => {
      if (
        data?.board &&
        isValidBoard(data.board)
      ) {
        setBoard(data.board);
      }

      if (
        data?.winner !== undefined
      ) {
        setWinnerSide(data.winner);
      } else if (
        data?.winnerSide !== undefined
      ) {
        setWinnerSide(
          data.winnerSide
        );
      }

      setDraw(Boolean(data?.draw));
      setGameOver(true);
      setSendingMove(false);
      setConditionsOpen(false);
      setWaitingOpponent(false);

      setTimeout(() => {
        setReviewVisible(true);
      }, 900);
    });

    socket.on("chat:message", (message) => {
      if (!message?.text) return;

      const safeMessage = {
        username: sanitizeText(
          message.username ||
            "Joueur"
        ),
        text: sanitizeText(
          message.text
        ),
        playerId:
          message.playerId,
      };

      setMessages((previous) =>
        [
          ...previous,
          safeMessage,
        ].slice(-MAX_MESSAGES)
      );

      requestAnimationFrame(() => {
        if (chatRef.current) {
          chatRef.current.scrollTop =
            chatRef.current.scrollHeight;
        }
      });
    });

    socket.on(
      "chat:typing",
      (data) => {
        if (!data?.username) return;

        setTypingPlayer(
          sanitizeText(data.username)
        );

        clearTimeout(
          typingTimeout.current
        );

        typingTimeout.current =
          setTimeout(() => {
            setTypingPlayer(null);
          }, 1200);
      }
    );

    socket.on(
      "connect_error",
      (error) => {
        console.error(
          "[DAMES] connect_error:",
          error
        );

        setConnected(false);
        setSendingMove(false);
        setLoadingError(true);
      }
    );

    socket.on(
      "disconnect",
      () => {
        setConnected(false);
        setSendingMove(false);
      }
    );

    socket.on(
      "error",
      (error) => {
        console.error(
          "[DAMES] server error:",
          error
        );

        setSendingMove(false);

        if (!board) {
          setLoadingError(true);
        }
      }
    );

    loadingTimeout.current =
      setTimeout(() => {
        setLoadingError(true);
      }, 15000);

    return () => {
      clearInterval(
        pingInterval.current
      );

      clearTimeout(
        typingTimeout.current
      );

      clearTimeout(
        loadingTimeout.current
      );

      clearTimeout(
        moveTimeout.current
      );

      clearTimeout(
        animationTimeout.current
      );

      clearInterval(
        matchPresenceTimer.current
      );
      matchPresenceTimer.current = null;

      socket.removeAllListeners();
      socket.disconnect();

      socketRef.current = null;
    };
  }, [matchId, token, mode]);

  /* =======================================================
     ABANDON / VISIBILITY
  ======================================================= */

  useEffect(() => {
    if (!matchId) return undefined;

    const abandon = () => {
      if (
        abandonmentSent.current ||
        gameOver ||
        conditionsOpen ||
        waitingOpponent
      ) {
        return;
      }

      /*
       * Le serveur reste l'autorité.
       * Ce signal indique simplement que le joueur
       * quitte la partie active.
       */
      if (
        socketRef.current?.connected
      ) {
        abandonmentSent.current = true;

        socketRef.current.emit(
          "match:forfeit",
          {
            matchId: Number(matchId),
          }
        );
      }
    };

    const onVisibility = () => {
      if (
        document.visibilityState ===
        "hidden"
      ) {
        abandon();
      }
    };

    document.addEventListener(
      "visibilitychange",
      onVisibility
    );

    window.addEventListener(
      "pagehide",
      abandon
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        onVisibility
      );

      window.removeEventListener(
        "pagehide",
        abandon
      );
    };
  }, [
    matchId,
    gameOver,
    conditionsOpen,
    waitingOpponent,
  ]);

  /* =======================================================
     CONDITIONS
  ======================================================= */

  const acceptConditions = useCallback(() => {
    if (!matchId) return;

    setConditionsAccepted(true);

    socketRef.current?.emit(
      "match:conditions:accept",
      {
        matchId: Number(matchId),
      }
    );

    /*
     * IA et Training :
     * aucune attente d'un deuxième joueur.
     */
    if (
      mode === "IA" ||
      mode === "TRAINING"
    ) {
      setWaitingOpponent(false);
    }
  }, [matchId, mode]);

  /* =======================================================
     SELECT PIECE
  ======================================================= */

  const handleSelect = useCallback(
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

      const cell = Number(
        board[row]?.[col]
      );

      if (!myPieces.includes(cell)) {
        return;
      }

      const key = `${row}-${col}`;

      if (!playablePieces.has(key)) {
        return;
      }

      const moves = allMoves.filter(
        (move) =>
          Number(move?.from?.r) === row &&
          Number(move?.from?.c) === col
      );

      setSelected({
        r: row,
        c: col,
      });

      setValidMoves(moves);
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

  /* =======================================================
     MOVE
  ======================================================= */

  const playMove = useCallback(
    (row, col) => {
      if (
        sendingMove ||
        !socketRef.current?.connected
      ) {
        return;
      }

      const move = targets.get(
        `${row}-${col}`
      );

      if (!isValidMove(move)) {
        return;
      }

      setSendingMove(true);

      clearTimeout(
        moveTimeout.current
      );

      moveTimeout.current =
        setTimeout(() => {
          setSendingMove(false);
        }, 7000);

      const payload = {
        matchId: Number(matchId),
        move: {
          from: move.from,
          to: move.path[
            move.path.length - 1
          ],
          id: move.id,
        },
      };

      /*
       * Contrat de l'ancien Dames.jsx :
       * event = "move"
       */
      socketRef.current.emit(
        "move",
        payload,
        (response) => {
          if (!response?.ok) {
            clearTimeout(
              moveTimeout.current
            );

            setSendingMove(false);
          }
        }
      );

      setSelected(null);
      setValidMoves([]);
    },
    [
      sendingMove,
      targets,
      matchId,
    ]
  );

  /* =======================================================
     BOARD CLICK
  ======================================================= */

  const handleCellClick = useCallback(
    (row, col) => {
      if (
        !board ||
        sendingMove ||
        !connected ||
        gameOver ||
        conditionsOpen ||
        waitingOpponent
      ) {
        return;
      }

      if ((row + col) % 2 === 0) {
        return;
      }

      if (!selected) {
        handleSelect(row, col);
        return;
      }

      const cell = Number(
        board[row]?.[col]
      );

      if (myPieces.includes(cell)) {
        handleSelect(row, col);
        return;
      }

      if (
        targets.has(
          `${row}-${col}`
        )
      ) {
        playMove(row, col);
        return;
      }

      setSelected(null);
      setValidMoves([]);
    },
    [
      board,
      sendingMove,
      connected,
      gameOver,
      conditionsOpen,
      waitingOpponent,
      selected,
      handleSelect,
      myPieces,
      targets,
      playMove,
    ]
  );

  /* =======================================================
     CHAT
  ======================================================= */

  const handleChatTyping = useCallback(
    (event) => {
      const value = sanitizeText(
        event.target.value
      );

      setChatInput(value);

      clearTimeout(
        typingTimeout.current
      );

      if (!value.trim()) return;

      typingTimeout.current =
        setTimeout(() => {
          socketRef.current?.emit(
            "chat:typing",
            {
              matchId: Number(matchId),
            }
          );
        }, 600);
    },
    [matchId]
  );

  const sendMessage = useCallback(() => {
    const text = sanitizeText(
      chatInput.trim()
    );

    if (
      !text ||
      !socketRef.current?.connected
    ) {
      return;
    }

    socketRef.current.emit(
      "chat:message",
      {
        matchId: Number(matchId),
        text,
      }
    );

    setChatInput("");
  }, [chatInput, matchId]);

  /* =======================================================
     REPORT
  ======================================================= */

  const handleReport = useCallback(
    async () => {
      if (
        reporting ||
        !boardRef.current
      ) {
        return;
      }

      try {
        setReporting(true);

        const canvas =
          await html2canvas(
            boardRef.current,
            {
              scale: 1,
              backgroundColor: null,
            }
          );

        const blob =
          await new Promise(
            (resolve) =>
              canvas.toBlob(
                resolve,
                "image/jpeg",
                0.75
              )
          );

        if (!blob) {
          throw new Error(
            "REPORT_IMAGE_FAILED"
          );
        }

        const formData = new FormData();

        formData.append(
          "image",
          blob,
          "dames-report.jpg"
        );

        formData.append(
          "matchId",
          String(matchId)
        );

        formData.append(
          "playerSide",
          String(myPlayer)
        );

        formData.append(
          "board",
          JSON.stringify(board)
        );

        formData.append(
          "description",
          "Signalement depuis le jeu de dames"
        );

        const response = await fetch(
          `${API_URL}/match/report`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          }
        );

        if (!response.ok) {
          throw new Error(
            "REPORT_FAILED"
          );
        }

        window.dispatchEvent(
          new CustomEvent("toast", {
            detail:
              "✅ Signalement envoyé",
          })
        );
      } catch (error) {
        console.error(
          "[DAMES REPORT]",
          error
        );

        window.dispatchEvent(
          new CustomEvent("toast", {
            detail:
              "❌ Erreur lors du signalement",
          })
        );
      } finally {
        setReporting(false);
      }
    },
    [
      reporting,
      matchId,
      myPlayer,
      board,
      token,
    ]
  );

  /* =======================================================
     REVIEW
  ======================================================= */

  const submitReview = useCallback(() => {
    if (
      rating < 1 ||
      reviewSubmitted
    ) {
      return;
    }

    /*
     * Le socket fourni ne définit pas d'événement
     * review. On garde donc l'avis côté interface
     * sans inventer un contrat backend.
     *
     * Un endpoint dédié pourra être branché ici plus tard.
     */
    setReviewSubmitted(true);

    setTimeout(() => {
      setReviewVisible(false);
    }, 650);
  }, [rating, reviewSubmitted]);

  /* =======================================================
     LOADING
  ======================================================= */

  if (!board) {
    return (
      <div className="dames-loading">
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

        {loadingError && (
          <div className="dames-error-box">
            <strong>
              Impossible de charger le match
            </strong>

            <button
              type="button"
              onClick={() =>
                window.location.reload()
              }
            >
              Reconnecter
            </button>
          </div>
        )}
      </div>
    );
  }

  /* =======================================================
     WAITING
  ======================================================= */

  if (
    waitingOpponent &&
    mode === "USER"
  ) {
    return (
      <WaitingScreen
        playerName={
          Number(myPlayer) === PLAYER_2
            ? playerNames.player2
            : playerNames.player1
        }
        mode={mode}
        stake={stake}
        pot={pot}
        connected={connected}
        onBack={resetGame}
      />
    );
  }

  /* =======================================================
     RESULT
  ======================================================= */

  if (gameOver && !reviewVisible) {
    return (
      <div className="dames-finish-screen">
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

  /* =======================================================
     GAME
  ======================================================= */

  return (
    <div className="dames-app">
      <header className="dames-topbar">
        <div className="dames-brand">
          <div className="dames-brand-mark">
            ♛
          </div>

          <div>
            <strong>DAMES</strong>
            <span>
              Match #{matchId}
            </span>
          </div>
        </div>

        <div className="dames-matchup">
          <span>
            {playerNames.player1}
          </span>

          <b>VS</b>

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
              setChatOpen(true)
            }
            aria-label="Ouvrir le chat"
          >
            <span>💬</span>

            {messages.length > 0 && (
              <b>{messages.length}</b>
            )}
          </button>
        </div>
      </header>

      <main className="dames-main">
        <section className="dames-game-column">
          <div className="dames-prize-bar">
            <div className="dames-prize-icon">
              💰
            </div>

            <div>
              <span>Cagnotte du match</span>
              <strong>
                {formatFc(pot)}
              </strong>
            </div>

            <div className="dames-prize-separator" />

            <div>
              <span>Mise</span>
              <strong>
                {formatFc(stake)}
              </strong>
            </div>

            <div className="dames-prize-status">
              {mode === "IA"
                ? "🤖 IA"
                : mode === "TRAINING"
                ? "🎯 Entraînement"
                : "👥 Joueur vs Joueur"}
            </div>
          </div>

          <div className="dames-players-mobile">
            <PlayerCard
              name={playerNames.player1}
              side={PLAYER_1}
              active={
                Number(turn) === PLAYER_1
              }
              pieces={
                player1Stats.pieces
              }
              kings={player1Stats.kings}
              isMe={
                Number(myPlayer) === PLAYER_1
              }
            />

            <PlayerCard
              name={playerNames.player2}
              side={PLAYER_2}
              active={
                Number(turn) === PLAYER_2
              }
              pieces={
                player2Stats.pieces
              }
              kings={player2Stats.kings}
              isMe={
                Number(myPlayer) === PLAYER_2
              }
            />
          </div>

          <div className="dames-board-layout">
            <aside className="dames-side-player left">
              <PlayerCard
                name={playerNames.player1}
                side={PLAYER_1}
                active={
                  Number(turn) ===
                  PLAYER_1
                }
                pieces={
                  player1Stats.pieces
                }
                kings={
                  player1Stats.kings
                }
                isMe={
                  Number(myPlayer) ===
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
                  ].join(" ")}
                />

                <strong>
                  {isMyTurn
                    ? "À votre tour"
                    : "Tour de l'adversaire"}
                </strong>

                {turnSeconds !== null && (
                  <span className="dames-timer">
                    ⏱ {turnSeconds}s
                  </span>
                )}
              </div>

              <div
                className="dames-board-frame"
                ref={boardRef}
              >
                <div className="dames-board-coordinates top">
                  {Array.from(
                    { length: 10 },
                    (_, i) => (
                      <span key={i}>
                        {String.fromCharCode(
                          65 + i
                        )}
                      </span>
                    )
                  )}
                </div>

                <div className="dames-board-row-wrap">
                  <div className="dames-board-coordinates side">
                    {Array.from(
                      { length: 10 },
                      (_, i) => (
                        <span key={i}>
                          {10 - i}
                        </span>
                      )
                    )}
                  </div>

                  <div className="dames-board">
                    {board.map(
                      (row, r) =>
                        row.map(
                          (cell, c) => {
                            const key =
                              `${r}-${c}`;

                            const isSelected =
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

                            const hideAnimated =
                              animatedMove &&
                              (
                                samePosition(
                                  animatedMove.from,
                                  {
                                    r,
                                    c,
                                  }
                                ) ||
                                samePosition(
                                  animatedMove.to,
                                  {
                                    r,
                                    c,
                                  }
                                )
                              );

                            return (
                              <Cell
                                key={key}
                                cell={cell}
                                row={r}
                                col={c}
                                selected={
                                  isSelected
                                }
                                possible={
                                  possible
                                }
                                playable={
                                  playable
                                }
                                last={last}
                                myTurn={
                                  isMyTurn &&
                                  !gameOver &&
                                  !conditionsOpen &&
                                  !waitingOpponent
                                }
                                onClick={
                                  handleCellClick
                                }
                                hiddenPiece={
                                  Boolean(
                                    hideAnimated
                                  )
                                }
                              />
                            );
                          }
                        )
                    )}

                    {animatedMove && (
                      <div
                        key={
                          animatedMove.key
                        }
                        className={[
                          "dames-moving-piece",
                          animatedMove.piece ===
                            PLAYER_1 ||
                          animatedMove.piece ===
                            KING_1
                            ? "moving-white"
                            : "moving-black",
                        ].join(" ")}
                        style={{
                          "--from-x":
                            animatedMove
                              .from.c,
                          "--from-y":
                            animatedMove
                              .from.r,
                          "--to-x":
                            animatedMove
                              .to.c,
                          "--to-y":
                            animatedMove
                              .to.r,
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
                    { length: 10 },
                    (_, i) => (
                      <span key={i}>
                        {String.fromCharCode(
                          65 + i
                        )}
                      </span>
                    )
                  )}
                </div>
              </div>

              <div className="dames-board-help">
                <span>
                  {sendingMove
                    ? "Validation du mouvement..."
                    : selected
                    ? "Choisissez une case en surbrillance"
                    : isMyTurn
                    ? "Sélectionnez un de vos pions"
                    : "Attendez le tour de votre adversaire"}
                </span>
              </div>
            </div>

            <aside className="dames-side-player right">
              <PlayerCard
                name={playerNames.player2}
                side={PLAYER_2}
                active={
                  Number(turn) ===
                  PLAYER_2
                }
                pieces={
                  player2Stats.pieces
                }
                kings={
                  player2Stats.kings
                }
                isMe={
                  Number(myPlayer) ===
                  PLAYER_2
                }
              />
            </aside>
          </div>

          <div className="dames-bottom-toolbar">
            <div className="dames-toolbar-info">
              <span>
                {boardStats.mine} pièces
              </span>
              <span>•</span>
              <span>
                {boardStats.myKings} rois
              </span>
              <span>•</span>
              <span>
                Ping {ping}ms
              </span>
            </div>

            <div className="dames-toolbar-actions">
              <button
                type="button"
                onClick={handleReport}
                disabled={reporting}
              >
                🚨{" "}
                {reporting
                  ? "Signalement..."
                  : "Signaler"}
              </button>

              <button
                type="button"
                onClick={() =>
                  setChatOpen(true)
                }
              >
                💬 Chat
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* ===================================================
          CONDITIONS
      =================================================== */}

      {conditionsOpen &&
        !gameOver && (
          <ConditionsModal
            mode={mode}
            accepted={
              conditionsAccepted
            }
            onAccept={() => {
              acceptConditions();
              setConditionsOpen(false);
            }}
          />
        )}

      {/* ===================================================
          CHAT
      =================================================== */}

      {chatOpen && (
        <div className="dames-chat-overlay">
          <ChatPanel
            messages={messages}
            input={chatInput}
            typingPlayer={typingPlayer}
            onChange={
              handleChatTyping
            }
            onSend={sendMessage}
            onClose={() =>
              setChatOpen(false)
            }
            chatRef={chatRef}
          />
        </div>
      )}

      {/* ===================================================
          REVIEW
      =================================================== */}

      {gameOver &&
        reviewVisible && (
          <div className="dames-modal-layer">
            <ReviewPanel
              rating={rating}
              setRating={setRating}
              review={review}
              setReview={setReview}
              submitted={
                reviewSubmitted
              }
              onSubmit={
                submitReview
              }
              onSkip={() =>
                setReviewVisible(false)
              }
            />
          </div>
        )}

      {/* ===================================================
          RESULT AFTER REVIEW
      =================================================== */}

      {gameOver &&
        !reviewVisible && (
          <div className="dames-modal-layer">
            <ResultPanel
              won={amWinner}
              draw={draw}
              pot={pot}
              stake={stake}
              onBack={resetGame}
            />
          </div>
        )}
    </div>
  );
}