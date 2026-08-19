import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  memo,
} from "react";

import html2canvas from "html2canvas";

import "./Dames.css";

import {
  checkersSocket,
  connectCheckers,
  joinCheckersMatch,
  sendCheckersMove,
  sendCheckersMessage,
  sendCheckersTyping,
} from "../services/checkersSocket";

// ======================================================
// CONFIG
// ======================================================

const API =
  import.meta.env.VITE_API_URL || "";

const PLAYER_1 = 1;
const PLAYER_2 = 2;

const KING_1 = 3;
const KING_2 = 4;

const BOARD_SIZE = 10;

const MAX_CHAT_LENGTH = 300;
const MAX_MESSAGES = 100;

const SOCKET_TIMEOUT = 15000;
const MOVE_TIMEOUT = 7000;

// ======================================================
// HELPERS
// ======================================================

function getCellSize() {
  if (typeof window === "undefined") {
    return 52;
  }

  const width = window.innerWidth;

  if (width < 380) {
    return Math.floor((width - 32) / 10);
  }

  if (width < 480) {
    return Math.floor((width - 40) / 10);
  }

  if (width < 768) {
    return Math.floor((width - 48) / 10);
  }

  return Math.floor(
    Math.min(width * 0.82, 680) / 10
  );
}

function isValidBoard(board) {
  if (!Array.isArray(board)) {
    return false;
  }

  if (board.length !== BOARD_SIZE) {
    return false;
  }

  return board.every(
    (row) =>
      Array.isArray(row) &&
      row.length === BOARD_SIZE &&
      row.every((cell) =>
        [0, 1, 2, 3, 4].includes(cell)
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

function sanitizeText(text = "") {
  return String(text)
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .slice(0, MAX_CHAT_LENGTH);
}

function normalizePlayerId(value) {
  const id = Number(value);

  return id === PLAYER_1 || id === PLAYER_2
    ? id
    : null;
}

function oppositePlayer(player) {
  return player === PLAYER_1
    ? PLAYER_2
    : PLAYER_1;
}

// ======================================================
// BOARD RESULT HELPERS
// ======================================================

function countPieces(board, player) {
  if (!isValidBoard(board)) {
    return 0;
  }

  const pieces =
    player === PLAYER_1
      ? [PLAYER_1, KING_1]
      : [PLAYER_2, KING_2];

  let count = 0;

  for (const row of board) {
    for (const cell of row) {
      if (pieces.includes(cell)) {
        count++;
      }
    }
  }

  return count;
}

function getBoardWinner(board) {
  if (!isValidBoard(board)) {
    return null;
  }

  const player1Pieces =
    countPieces(
      board,
      PLAYER_1
    );

  const player2Pieces =
    countPieces(
      board,
      PLAYER_2
    );

  if (
    player1Pieces === 0 &&
    player2Pieces > 0
  ) {
    return PLAYER_2;
  }

  if (
    player2Pieces === 0 &&
    player1Pieces > 0
  ) {
    return PLAYER_1;
  }

  return null;
}

function normalizeWinnerSide(data) {
  if (!data) {
    return null;
  }

  if (
    data.winnerSide === PLAYER_1 ||
    data.winnerSide === PLAYER_2
  ) {
    return Number(
      data.winnerSide
    );
  }

  if (
    data.winner === PLAYER_1 ||
    data.winner === PLAYER_2
  ) {
    return Number(data.winner);
  }

  return null;
}

// ======================================================
// PLAYER DATA HELPERS
// ======================================================

function getPlayerName(
  player,
  gameConfig,
  data
) {
  const players =
    data?.players ||
    gameConfig?.players ||
    {};

  const playerData =
    players?.[player] ||
    players?.[String(player)] ||
    null;

  const candidates =
    player === PLAYER_1
      ? [
          playerData?.username,
          playerData?.name,
          playerData?.displayName,
          data?.creator?.username,
          data?.creator?.name,
          data?.creatorName,
          gameConfig?.creatorName,
          gameConfig?.creatorUsername,
          gameConfig?.creator?.username,
          gameConfig?.creator?.name,
        ]
      : [
          playerData?.username,
          playerData?.name,
          playerData?.displayName,
          data?.opponent?.username,
          data?.opponent?.name,
          data?.opponentName,
          gameConfig?.opponentName,
          gameConfig?.opponentUsername,
          gameConfig?.opponent?.username,
          gameConfig?.opponent?.name,
        ];

  const found =
    candidates.find(
      (value) =>
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ""
    );

  return found
    ? sanitizeText(found)
    : player === PLAYER_1
    ? "Joueur 1"
    : "Joueur 2";
}

function getPlayerAvatar(
  player,
  gameConfig,
  data
) {
  const players =
    data?.players ||
    gameConfig?.players ||
    {};

  const playerData =
    players?.[player] ||
    players?.[String(player)] ||
    null;

  const candidates =
    player === PLAYER_1
      ? [
          playerData?.avatar,
          playerData?.avatarUrl,
          playerData?.photo,
          playerData?.profileImage,
          data?.creator?.avatar,
          data?.creator?.avatarUrl,
          data?.creatorAvatar,
          gameConfig?.creatorAvatar,
          gameConfig?.creator?.avatar,
          gameConfig?.creator?.avatarUrl,
        ]
      : [
          playerData?.avatar,
          playerData?.avatarUrl,
          playerData?.photo,
          playerData?.profileImage,
          data?.opponent?.avatar,
          data?.opponent?.avatarUrl,
          data?.opponentAvatar,
          gameConfig?.opponentAvatar,
          gameConfig?.opponent?.avatar,
          gameConfig?.opponent?.avatarUrl,
        ];

  const found =
    candidates.find(
      (value) =>
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ""
    );

  return found || null;
}

// ======================================================
// CONDITIONS
// ======================================================

function getGameMode(gameConfig) {
  const raw =
    gameConfig?.mode ||
    gameConfig?.gameMode ||
    gameConfig?.matchMode ||
    gameConfig?.type ||
    "user";

  const mode = String(raw)
    .toLowerCase()
    .trim();

  if (
    mode.includes("training") ||
    mode.includes("entrain")
  ) {
    return "training";
  }

  if (
    mode === "ia" ||
    mode === "ai" ||
    mode.includes("computer")
  ) {
    return "ai";
  }

  return "user";
}

function getConditions(mode) {
  if (mode === "training") {
    return {
      icon: "🎯",
      title: "Mode entraînement",
      text:
        "Bienvenue dans votre espace d'entraînement aux Jeux de Dames. " +
        "Profitez de cette partie pour améliorer votre stratégie, " +
        "tester vos déplacements et perfectionner votre maîtrise du jeu. " +
        "Jouez dans un esprit fair-play et respectez les règles du jeu.",
      notice:
        "En cliquant sur « Commencer », vous reconnaissez avoir pris connaissance " +
        "des règles du jeu ainsi que des conditions d'utilisation et de la " +
        "politique de confidentialité du SAJCL.",
    };
  }

  if (mode === "ai") {
    return {
      icon: "🤖",
      title: "Jeu contre l'IA",
      text:
        "Vous allez affronter l'intelligence artificielle des Jeux de Dames. " +
        "La partie commence directement afin de vous permettre de jouer " +
        "sans attendre un autre participant.",
      notice:
        "En jouant directement, vous acceptez les conditions d'utilisation " +
        "du jeu ainsi que la politique de confidentialité du SAJCL.",
    };
  }

  return {
    icon: "♟️",
    title: "Bienvenue aux Jeux de Dames",
    text:
      "Jouez avec sincérité, honnêteté et fair-play. " +
      "Respectez votre adversaire et les règles du jeu. " +
      "En cas de problème, de comportement suspect ou de litige, " +
      "utilisez le signalement afin que l'administration puisse examiner " +
      "la situation.",
    notice:
      "En cliquant sur « Commencer », vous acceptez les conditions " +
      "d'utilisation de ce jeu ainsi que la politique de confidentialité " +
      "du SAJCL.",
  };
}

// ======================================================
// AVATAR
// ======================================================

const PlayerAvatar = memo(
  function PlayerAvatar({
    player,
    name,
    avatar,
    active,
    isMe,
  }) {
    return (
      <div
        className={`dames-player-card ${
          active
            ? "dames-player-card--active"
            : ""
        } ${
          isMe
            ? "dames-player-card--me"
            : ""
        }`}
      >
        <div className="dames-player-avatar-wrap">
          {avatar ? (
            <img
              src={avatar}
              alt={name}
              className="dames-player-avatar"
              onError={(event) => {
                event.currentTarget.style.display =
                  "none";
              }}
            />
          ) : (
            <div className="dames-player-avatar dames-player-avatar--fallback">
              {player === PLAYER_1
                ? "♙"
                : "♟"}
            </div>
          )}

          {active && (
            <span className="dames-player-online">
              ●
            </span>
          )}
        </div>

        <div className="dames-player-name">
          {name}
        </div>

        {isMe && (
          <div className="dames-player-you">
            Vous
          </div>
        )}
      </div>
    );
  }
);

// ======================================================
// CELL
// ======================================================

const Cell = memo(
  function Cell({
    cell,
    r,
    c,
    handleClick,
    selected,
    isMove,
    isLastMove,
    isPlayable,
    isMyTurn,
    cellSize,
  }) {
    const isDark =
      (r + c) % 2 === 1;

    const isWhite =
      cell === PLAYER_1 ||
      cell === KING_1;

    const isKing =
      cell === KING_1 ||
      cell === KING_2;

    const canClick =
      isDark && isMyTurn;

    return (
      <button
        type="button"
        className={[
          "dames-cell",
          isDark
            ? "dames-cell--dark"
            : "dames-cell--light",
          selected
            ? "dames-cell--selected"
            : "",
          isMove
            ? "dames-cell--move"
            : "",
          isLastMove
            ? "dames-cell--last"
            : "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={{
          width: cellSize,
          height: cellSize,
        }}
        onClick={() =>
          handleClick(r, c)
        }
        disabled={!canClick}
        aria-label={`Case ${
          r + 1
        }-${c + 1}`}
      >
        {cell !== 0 && (
          <div
            className={[
              "dames-piece",
              isWhite
                ? "dames-piece--white"
                : "dames-piece--black",
              isKing
                ? "dames-piece--king"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{
              width:
                cellSize * 0.74,
              height:
                cellSize * 0.74,
            }}
          >
            <div className="dames-piece-inner">
              {isKing && "♛"}
            </div>
          </div>
        )}

        {isPlayable &&
          !selected && (
            <span className="dames-playable-dot" />
          )}

        {isMove && (
          <span className="dames-move-dot" />
        )}
      </button>
    );
  }
);

// ======================================================
// CHAT
// ======================================================

function ChatPanel({
  messages,
  chatInput,
  typingPlayer,
  onChange,
  onSend,
  onClose,
  chatRef,
}) {
  return (
    <div className="dames-chat-overlay">
      <div className="dames-chat-window">
        <div className="dames-chat-header">
          <div>
            <strong>
              💬 Discussion
            </strong>

            <span>
              Discussion privée du match
            </span>
          </div>

          <button
            type="button"
            className="dames-chat-close"
            onClick={onClose}
            aria-label="Fermer le chat"
          >
            ✕
          </button>
        </div>

        <div
          ref={chatRef}
          className="dames-chat-messages"
        >
          {messages.length === 0 ? (
            <div className="dames-chat-empty">
              <span>💬</span>

              <p>
                Aucun message pour le moment.
              </p>

              <small>
                Soyez courtois avec votre
                adversaire.
              </small>
            </div>
          ) : (
            messages.map(
              (message, index) => (
                <div
                  key={`${index}-${message.text}-${message.playerId}`}
                  className="dames-chat-message"
                >
                  <div className="dames-chat-message-author">
                    {message.username}
                  </div>

                  <div className="dames-chat-message-bubble">
                    {message.text}
                  </div>
                </div>
              )
            )
          )}

          {typingPlayer && (
            <div className="dames-chat-typing">
              ✍️ {typingPlayer} écrit...
            </div>
          )}
        </div>

        <div className="dames-chat-composer">
          <input
            value={chatInput}
            maxLength={MAX_CHAT_LENGTH}
            onChange={onChange}
            placeholder="Écrire un message..."
            onKeyDown={(event) => {
              if (
                event.key === "Enter"
              ) {
                event.preventDefault();
                onSend();
              }
            }}
          />

          <button
            type="button"
            onClick={onSend}
            aria-label="Envoyer"
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}

// ======================================================
// CONDITIONS MODAL
// ======================================================

function ConditionsModal({
  mode,
  onAccept,
}) {
  const conditions =
    getConditions(mode);

  return (
    <div className="dames-modal-backdrop">
      <div className="dames-conditions-modal">
        <div className="dames-conditions-icon">
          {conditions.icon}
        </div>

        <div className="dames-conditions-kicker">
          SAJCL • JEUX DE DAMES
        </div>

        <h2>
          {conditions.title}
        </h2>

        <p className="dames-conditions-text">
          {conditions.text}
        </p>

        <div className="dames-conditions-notice">
          <span>ℹ️</span>

          <p>
            {conditions.notice}
          </p>
        </div>

        <div className="dames-conditions-rules">
          <div>
            <span>✓</span>
            Fair-play obligatoire
          </div>

          <div>
            <span>✓</span>
            Respect de l'adversaire
          </div>

          <div>
            <span>✓</span>
            Signalement disponible en cas de problème
          </div>
        </div>

        <button
          type="button"
          className="dames-primary-button"
          onClick={onAccept}
        >
          Commencer la partie
        </button>
      </div>
    </div>
  );
}

// ======================================================
// MAIN
// ======================================================

export default function Dames({
  gameConfig,
  resetGame,
}) {
  const { matchId } =
    gameConfig || {};

  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("jwt");

  // ====================================================
  // STATE
  // ====================================================

  const [board, setBoard] =
    useState(null);

  const [turn, setTurn] =
    useState(null);

  const [myPlayer, setMyPlayer] =
    useState(null);

  const [selected, setSelected] =
    useState(null);

  const [allMoves, setAllMoves] =
    useState([]);

  const [validMoves, setValidMoves] =
    useState([]);

  const [lastMove, setLastMove] =
    useState(null);

  const [connected, setConnected] =
    useState(
      checkersSocket.connected
    );

  const [ping, setPing] =
    useState("--");

  const [gameOver, setGameOver] =
    useState(false);

  const [winnerSide, setWinnerSide] =
    useState(null);

  const [winnerId, setWinnerId] =
    useState(null);

  const [draw, setDraw] =
    useState(false);

  const [reporting, setReporting] =
    useState(false);

  const [loadingError, setLoadingError] =
    useState(false);

  const [sendingMove, setSendingMove] =
    useState(false);

  const [messages, setMessages] =
    useState([]);

  const [chatInput, setChatInput] =
    useState("");

  const [typingPlayer, setTypingPlayer] =
    useState(null);

  const [chatOpen, setChatOpen] =
    useState(false);

  const [unreadMessages, setUnreadMessages] =
    useState(0);

  const [
    conditionsAccepted,
    setConditionsAccepted,
  ] = useState(false);

  const [cellSize, setCellSize] =
    useState(getCellSize());

  const [playerInfo, setPlayerInfo] =
    useState({
      1: {
        name: getPlayerName(
          PLAYER_1,
          gameConfig,
          null
        ),
        avatar: getPlayerAvatar(
          PLAYER_1,
          gameConfig,
          null
        ),
      },

      2: {
        name: getPlayerName(
          PLAYER_2,
          gameConfig,
          null
        ),
        avatar: getPlayerAvatar(
          PLAYER_2,
          gameConfig,
          null
        ),
      },
    });

  // ====================================================
  // REFS
  // ====================================================

  const boardRef =
    useRef(null);

  const chatRef =
    useRef(null);

  const typingTimeout =
    useRef(null);

  const pingInterval =
    useRef(null);

  const loadingTimeout =
    useRef(null);

  const moveTimeout =
    useRef(null);

  const matchEndedRef =
    useRef(false);

  const matchJoinedRef =
    useRef(false);

  // ====================================================
  // RESPONSIVE
  // ====================================================

  useEffect(() => {
    const handleResize = () => {
      setCellSize(
        getCellSize()
      );
    };

    window.addEventListener(
      "resize",
      handleResize
    );

    return () => {
      window.removeEventListener(
        "resize",
        handleResize
      );
    };
  }, []);

  // ====================================================
  // MODE
  // ====================================================

  const gameMode = useMemo(
    () =>
      getGameMode(
        gameConfig
      ),
    [gameConfig]
  );

  // ====================================================
  // ORIENTATION
  // ====================================================

  const shouldRotateBoard =
    myPlayer === PLAYER_2;

  const displayBoard =
    useMemo(() => {
      if (!board) {
        return [];
      }

      if (!shouldRotateBoard) {
        return board;
      }

      return [...board]
        .reverse()
        .map((row) =>
          [...row].reverse()
        );
    }, [
      board,
      shouldRotateBoard,
    ]);

  // ====================================================
  // COORDINATES
  // ====================================================

  const toRealCoordinates =
    useCallback(
      (displayR, displayC) => {
        if (
          !shouldRotateBoard
        ) {
          return {
            r: displayR,
            c: displayC,
          };
        }

        return {
          r:
            BOARD_SIZE -
            1 -
            displayR,
          c:
            BOARD_SIZE -
            1 -
            displayC,
        };
      },
      [shouldRotateBoard]
    );

  const toDisplayCoordinates =
    useCallback(
      (realR, realC) => {
        if (
          !shouldRotateBoard
        ) {
          return {
            r: realR,
            c: realC,
          };
        }

        return {
          r:
            BOARD_SIZE -
            1 -
            realR,
          c:
            BOARD_SIZE -
            1 -
            realC,
        };
      },
      [shouldRotateBoard]
    );

  // ====================================================
  // TURN
  // ====================================================

  const isMyTurn =
    turn === myPlayer;

  // ====================================================
  // MY PIECES
  // ====================================================

  const myPieces = useMemo(
    () =>
      myPlayer === PLAYER_1
        ? [PLAYER_1, KING_1]
        : [PLAYER_2, KING_2],
    [myPlayer]
  );

  // ====================================================
  // PLAYABLE PIECES
  // ====================================================

  const playablePieces =
    useMemo(() => {
      const set =
        new Set();

      allMoves.forEach(
        (move) => {
          if (!move?.from) {
            return;
          }

          const display =
            toDisplayCoordinates(
              move.from.r,
              move.from.c
            );

          set.add(
            `${display.r}-${display.c}`
          );
        }
      );

      return set;
    }, [
      allMoves,
      toDisplayCoordinates,
    ]);

  // ====================================================
  // TARGETS
  // ====================================================

  const targets =
    useMemo(() => {
      const map =
        new Map();

      validMoves.forEach(
        (move) => {
          if (
            !isValidMove(move)
          ) {
            return;
          }

          const last =
            move.path[
              move.path.length - 1
            ];

          const display =
            toDisplayCoordinates(
              last.r,
              last.c
            );

          map.set(
            `${display.r}-${display.c}`,
            move
          );
        }
      );

      return map;
    }, [
      validMoves,
      toDisplayCoordinates,
    ]);

  // ====================================================
  // STATS
  // ====================================================

  const boardStats =
    useMemo(() => {
      let my = 0;
      let enemy = 0;
      let myKings = 0;
      let enemyKings = 0;

      if (!board) {
        return {
          my: 0,
          enemy: 0,
          myKings: 0,
          enemyKings: 0,
        };
      }

      board.forEach(
        (row) => {
          row.forEach(
            (cell) => {
              const mine =
                myPieces.includes(
                  cell
                );

              if (mine) {
                my++;

                if (
                  cell === KING_1 ||
                  cell === KING_2
                ) {
                  myKings++;
                }
              } else if (
                cell !== 0
              ) {
                enemy++;

                if (
                  cell === KING_1 ||
                  cell === KING_2
                ) {
                  enemyKings++;
                }
              }
            }
          );
        }
      );

      return {
        my,
        enemy,
        myKings,
        enemyKings,
      };
    }, [
      board,
      myPieces,
    ]);

  // ====================================================
  // FINISH LOCAL FALLBACK
  // ====================================================

  const finishFromBoard =
    useCallback(
      (
        nextBoard,
        nextTurn,
        nextMoves
      ) => {
        if (
          matchEndedRef.current ||
          !isValidBoard(nextBoard)
        ) {
          return false;
        }

        const boardWinner =
          getBoardWinner(
            nextBoard
          );

        if (boardWinner) {
          matchEndedRef.current =
            true;

          setWinnerSide(
            boardWinner
          );

          setWinnerId(null);
          setDraw(false);
          setGameOver(true);
          setSendingMove(false);

          return true;
        }

        /*
         * Si le joueur qui doit jouer
         * n'a aucun mouvement, il perd.
         *
         * Le backend calcule déjà allMoves.
         * Ceci sert de filet de sécurité
         * pour que l'UI ne reste jamais
         * bloquée.
         */
        if (
          Number(nextTurn) ===
            PLAYER_1 ||
          Number(nextTurn) ===
            PLAYER_2
        ) {
          if (
            Array.isArray(
              nextMoves
            ) &&
            nextMoves.length === 0
          ) {
            const winner =
              oppositePlayer(
                Number(nextTurn)
              );

            /*
             * Attention :
             * au tout premier état,
             * allMoves peut être vide
             * pendant un chargement.
             *
             * On ne déclenche donc
             * cette règle que si le
             * plateau contient bien
             * des pièces des deux côtés.
             */
            const p1 =
              countPieces(
                nextBoard,
                PLAYER_1
              );

            const p2 =
              countPieces(
                nextBoard,
                PLAYER_2
              );

            if (
              p1 > 0 &&
              p2 > 0
            ) {
              matchEndedRef.current =
                true;

              setWinnerSide(
                winner
              );

              setWinnerId(null);
              setDraw(false);
              setGameOver(true);
              setSendingMove(false);

              return true;
            }
          }
        }

        return false;
      },
      []
    );

  // ====================================================
  // SOCKET — SINGLE SHARED CONNECTION
  // ====================================================

  useEffect(() => {
    if (!matchId) {
      return;
    }

    matchEndedRef.current =
      false;

    matchJoinedRef.current =
      false;

    setLoadingError(false);

    const socket =
      connectCheckers();

    const handleConnect =
      () => {
        setConnected(true);
        setLoadingError(false);

        if (
          !matchJoinedRef.current
        ) {
          matchJoinedRef.current =
            true;

          joinCheckersMatch(
            matchId
          );
        }

        clearInterval(
          pingInterval.current
        );

        pingInterval.current =
          setInterval(() => {
            if (
              !socket.connected
            ) {
              return;
            }

            const start =
              performance.now();

            socket.emit(
              "ping:test",
              start
            );

            const handlePong =
              (sentAt) => {
                const ms =
                  Math.floor(
                    performance.now() -
                      Number(
                        sentAt
                      )
                  );

                setPing(ms);
              };

            socket.once(
              "pong:test",
              handlePong
            );
          }, 5000);
      };

    const handleInit =
      (data) => {
        if (
          !data ||
          !isValidBoard(
            data.board
          )
        ) {
          return;
        }

        clearTimeout(
          loadingTimeout.current
        );

        const player =
          normalizePlayerId(
            data.player
          );

        const moves =
          Array.isArray(
            data.allMoves
          )
            ? data.allMoves.filter(
                isValidMove
              )
            : [];

        setBoard(
          data.board
        );

        setTurn(
          Number(data.turn)
        );

        setMyPlayer(
          player
        );

        setLastMove(
          data.lastMove ||
            null
        );

        setAllMoves(
          moves
        );

        setSelected(null);
        setValidMoves([]);

        setPlayerInfo({
          1: {
            name:
              getPlayerName(
                PLAYER_1,
                gameConfig,
                data
              ),
            avatar:
              getPlayerAvatar(
                PLAYER_1,
                gameConfig,
                data
              ),
          },

          2: {
            name:
              getPlayerName(
                PLAYER_2,
                gameConfig,
                data
              ),
            avatar:
              getPlayerAvatar(
                PLAYER_2,
                gameConfig,
                data
              ),
          },
        });

        const initialMessages =
          Array.isArray(
            data.messages
          )
            ? data.messages
                .slice(
                  -MAX_MESSAGES
                )
                .map(
                  (message) => ({
                    username:
                      sanitizeText(
                        message.username ||
                          "Joueur"
                      ),

                    text:
                      sanitizeText(
                        message.text ||
                          ""
                      ),

                    playerId:
                      normalizePlayerId(
                        message.playerId ??
                          message.player
                      ),
                  })
                )
            : [];

        setMessages(
          initialMessages
        );

        setSendingMove(false);

        /*
         * Failsafe immédiat :
         * si on rejoint un match déjà
         * terminé dans la DB.
         */
        finishFromBoard(
          data.board,
          data.turn,
          moves
        );
      };

    const handleUpdate =
      (data) => {
        if (
          !data ||
          !isValidBoard(
            data.board
          )
        ) {
          return;
        }

        clearTimeout(
          moveTimeout.current
        );

        const nextMoves =
          Array.isArray(
            data.allMoves
          )
            ? data.allMoves.filter(
                isValidMove
              )
            : [];

        const nextTurn =
          Number(data.turn);

        setBoard(
          data.board
        );

        setTurn(
          nextTurn
        );

        setAllMoves(
          nextMoves
        );

        setLastMove(
          data.lastMove ||
            null
        );

        setSelected(null);
        setValidMoves([]);
        setSendingMove(false);

        /*
         * IMPORTANT :
         * le backend doit normalement
         * envoyer match:end.
         *
         * Mais si le dernier pion vient
         * d'être capturé et que le backend
         * n'émet pas encore match:end,
         * l'UI termine immédiatement.
         */
        finishFromBoard(
          data.board,
          nextTurn,
          nextMoves
        );
      };

    const handleEnd =
      (data) => {
        if (
          matchEndedRef.current
        ) {
          return;
        }

        if (
          data?.board &&
          isValidBoard(
            data.board
          )
        ) {
          setBoard(
            data.board
          );
        }

        const side =
          normalizeWinnerSide(
            data
          );

        matchEndedRef.current =
          true;

        setWinnerSide(
          side
        );

        setWinnerId(
          data?.winnerId ??
            null
        );

        setDraw(
          data?.result ===
            "draw" ||
            Boolean(data?.draw)
        );

        setGameOver(
          true
        );

        setSelected(null);
        setValidMoves([]);
        setSendingMove(false);

        clearTimeout(
          moveTimeout.current
        );
      };

    const handleChatMessage =
      (msg) => {
        if (
          !msg ||
          !msg.text
        ) {
          return;
        }

        const safeMessage =
          {
            username:
              sanitizeText(
                msg.username ||
                  "Joueur"
              ),

            text:
              sanitizeText(
                msg.text
              ),

            playerId:
              normalizePlayerId(
                msg.playerId ??
                  msg.player
              ),
          };

        setMessages(
          (previous) =>
            [
              ...previous,
              safeMessage,
            ].slice(
              -MAX_MESSAGES
            )
        );

        setUnreadMessages(
          (value) => {
            if (chatOpen) {
              return value;
            }

            return value + 1;
          }
        );

        requestAnimationFrame(
          () => {
            if (
              chatRef.current
            ) {
              chatRef.current.scrollTop =
                chatRef.current.scrollHeight;
            }
          }
        );
      };

    const handleTyping =
      ({ username } = {}) => {
        if (!username) {
          return;
        }

        setTypingPlayer(
          sanitizeText(
            username
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

    const handleChatError =
      ({ message } = {}) => {
        window.dispatchEvent(
          new CustomEvent(
            "toast",
            {
              detail:
                message ||
                "Impossible d'envoyer le message",
            }
          )
        );
      };

    const handleConnectError =
      (error) => {
        console.error(
          "CHECKERS SOCKET CONNECT ERROR:",
          error
        );

        setConnected(false);
        setSendingMove(false);

        /*
         * Ne pas afficher immédiatement
         * une erreur fatale si le socket
         * est simplement en reconnexion.
         */
        if (!board) {
          setLoadingError(
            false
          );
        }
      };

    const handleDisconnect =
      () => {
        setConnected(false);
      };

    const handleSocketError =
      (error) => {
        console.error(
          "CHECKERS SOCKET ERROR:",
          error
        );

        setSendingMove(false);
      };

    socket.on(
      "connect",
      handleConnect
    );

    socket.on(
      "match:init",
      handleInit
    );

    socket.on(
      "match:update",
      handleUpdate
    );

    socket.on(
      "match:end",
      handleEnd
    );

    socket.on(
      "chat:message",
      handleChatMessage
    );

    socket.on(
      "chat:typing",
      handleTyping
    );

    socket.on(
      "chat:error",
      handleChatError
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

    loadingTimeout.current =
      setTimeout(() => {
        if (!board) {
          setLoadingError(
            true
          );
        }
      }, SOCKET_TIMEOUT);

    /*
     * Si le singleton était déjà connecté
     * avant le montage de Dames, on rejoint
     * immédiatement.
     */
    if (
      socket.connected &&
      !matchJoinedRef.current
    ) {
      matchJoinedRef.current =
        true;

      joinCheckersMatch(
        matchId
      );
    }

    return () => {
      /*
       * IMPORTANT :
       * NE PAS disconnect le singleton ici.
       *
       * D'autres écrans / composants peuvent
       * utiliser checkersSocket.
       */
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

      socket.off(
        "connect",
        handleConnect
      );

      socket.off(
        "match:init",
        handleInit
      );

      socket.off(
        "match:update",
        handleUpdate
      );

      socket.off(
        "match:end",
        handleEnd
      );

      socket.off(
        "chat:message",
        handleChatMessage
      );

      socket.off(
        "chat:typing",
        handleTyping
      );

      socket.off(
        "chat:error",
        handleChatError
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
    };

    /*
     * TRÈS IMPORTANT :
     *
     * On ne met PAS :
     *
     * board
     * chatOpen
     * sendingMove
     *
     * dans les dépendances.
     *
     * Sinon le socket est recréé à chaque
     * mouvement ou ouverture du chat.
     */
  }, [
    matchId,
    gameConfig,
  ]);

  // ====================================================
  // CHAT OPEN
  // ====================================================

  useEffect(() => {
    if (!chatOpen) {
      return;
    }

    setUnreadMessages(0);

    requestAnimationFrame(
      () => {
        if (
          chatRef.current
        ) {
          chatRef.current.scrollTop =
            chatRef.current.scrollHeight;
        }
      }
    );
  }, [chatOpen]);

  // ====================================================
  // SELECT
  // ====================================================

  const handleSelect =
    useCallback(
      (displayR, displayC) => {
        if (
          !board ||
          !isMyTurn ||
          gameOver ||
          !conditionsAccepted
        ) {
          return;
        }

        const {
          r,
          c,
        } =
          toRealCoordinates(
            displayR,
            displayC
          );

        const cell =
          board[r][c];

        if (
          !myPieces.includes(
            cell
          )
        ) {
          return;
        }

        if (
          !playablePieces.has(
            `${displayR}-${displayC}`
          )
        ) {
          return;
        }

        const moves =
          allMoves.filter(
            (move) =>
              move.from?.r ===
                r &&
              move.from?.c ===
                c
          );

        setSelected({
          r,
          c,
        });

        setValidMoves(
          moves
        );
      },
      [
        board,
        isMyTurn,
        gameOver,
        conditionsAccepted,
        toRealCoordinates,
        myPieces,
        playablePieces,
        allMoves,
      ]
    );

  // ====================================================
  // MOVE
  // ====================================================

  const playMove =
    useCallback(
      (displayR, displayC) => {
        if (
          sendingMove ||
          !conditionsAccepted ||
          gameOver ||
          !checkersSocket.connected
        ) {
          return;
        }

        const move =
          targets.get(
            `${displayR}-${displayC}`
          );

        if (
          !isValidMove(move)
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

        /*
         * IMPORTANT FIX :
         *
         * Le backend accepte :
         * {
         *   matchId,
         *   move
         * }
         *
         * Et sa validation de secours
         * utilise notamment move.path.
         *
         * On envoie donc LE MOVE COMPLET,
         * pas seulement from/to/id.
         */
        const payloadMove =
          {
            ...move,

            from: {
              ...move.from,
            },

            path:
              Array.isArray(
                move.path
              )
                ? move.path.map(
                    (point) => ({
                      r: point.r,
                      c: point.c,
                    })
                  )
                : [],

            to:
              move.path[
                move.path.length -
                  1
              ],
          };

        sendCheckersMove(
          matchId,
          payloadMove
        );

        setSelected(null);
        setValidMoves([]);
      },
      [
        sendingMove,
        conditionsAccepted,
        gameOver,
        targets,
        matchId,
      ]
    );

  // ====================================================
  // CLICK
  // ====================================================

  const handleClick =
    useCallback(
      (displayR, displayC) => {
        if (
          sendingMove ||
          !connected ||
          !board ||
          !conditionsAccepted ||
          gameOver
        ) {
          return;
        }

        if (
          (displayR +
            displayC) %
            2 ===
          0
        ) {
          return;
        }

        if (!selected) {
          handleSelect(
            displayR,
            displayC
          );

          return;
        }

        const {
          r,
          c,
        } =
          toRealCoordinates(
            displayR,
            displayC
          );

        const clickedCell =
          board[r][c];

        if (
          myPieces.includes(
            clickedCell
          )
        ) {
          handleSelect(
            displayR,
            displayC
          );

          return;
        }

        if (
          targets.has(
            `${displayR}-${displayC}`
          )
        ) {
          playMove(
            displayR,
            displayC
          );

          return;
        }

        setSelected(null);
        setValidMoves([]);
      },
      [
        sendingMove,
        connected,
        board,
        conditionsAccepted,
        gameOver,
        selected,
        handleSelect,
        toRealCoordinates,
        myPieces,
        targets,
        playMove,
      ]
    );

  // ====================================================
  // CHAT SEND
  // ====================================================

  const sendMessage =
    useCallback(() => {
      const text =
        sanitizeText(
          chatInput.trim()
        );

      if (
        !text ||
        !matchId ||
        !checkersSocket.connected
      ) {
        return;
      }

      /*
       * Le backend :
       *
       * socket.on("chat:message")
       *
       * sauvegarde avec addMessage()
       * puis broadcast :
       *
       * io.to(`match_${matchId}`)
       *    .emit("chat:message", message)
       *
       * Donc les deux joueurs reçoivent
       * le même message.
       */
      sendCheckersMessage(
        matchId,
        text
      );

      setChatInput("");
    }, [
      chatInput,
      matchId,
    ]);

  // ====================================================
  // TYPING
  // ====================================================

  const handleTyping =
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
          typingTimeout.current
        );

        if (
          !value.trim() ||
          !matchId ||
          !checkersSocket.connected
        ) {
          return;
        }

        typingTimeout.current =
          setTimeout(() => {
            sendCheckersTyping(
              matchId
            );
          }, 300);
      },
      [matchId]
    );

  // ====================================================
  // REPORT
  // ====================================================

  const handleReport =
    useCallback(
      async () => {
        if (
          reporting ||
          !boardRef.current
        ) {
          return;
        }

        try {
          setReporting(
            true
          );

          const canvas =
            await html2canvas(
              boardRef.current,
              {
                scale: 0.8,
              }
            );

          const blob =
            await new Promise(
              (resolve) =>
                canvas.toBlob(
                  resolve,
                  "image/jpeg",
                  0.7
                )
            );

          if (!blob) {
            throw new Error(
              "REPORT_IMAGE_FAILED"
            );
          }

          const formData =
            new FormData();

          formData.append(
            "image",
            blob,
            "report.jpg"
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
            "Signalement depuis le jeu"
          );

          const res =
            await fetch(
              `${API}/match/report`,
              {
                method: "POST",

                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },

                body: formData,
              }
            );

          if (!res.ok) {
            throw new Error(
              "REPORT_FAILED"
            );
          }

          window.dispatchEvent(
            new CustomEvent(
              "toast",
              {
                detail:
                  "✅ Signalement envoyé",
              }
            )
          );
        } catch (error) {
          console.error(
            "Report error:",
            error
          );

          window.dispatchEvent(
            new CustomEvent(
              "toast",
              {
                detail:
                  "❌ Erreur lors du signalement",
              }
            )
          );
        } finally {
          setReporting(
            false
          );
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

  // ====================================================
  // CONDITIONS
  // ====================================================

  const acceptConditions =
    useCallback(() => {
      setConditionsAccepted(
        true
      );
    }, []);

  // ====================================================
  // LOADING
  // ====================================================

  if (!board) {
    return (
      <div className="dames-loading">
        <div className="dames-loading-orbit">
          ♟
        </div>

        <h2>
          Chargement de la partie
        </h2>

        <p>
          {connected
            ? "Connexion au match..."
            : "Connexion au serveur..."}
        </p>

        {loadingError && (
          <>
            <div className="dames-error">
              Impossible de charger
              le match.
            </div>

            <button
              type="button"
              className="dames-primary-button"
              onClick={() =>
                window.location.reload()
              }
            >
              Reconnecter
            </button>
          </>
        )}
      </div>
    );
  }

  // ====================================================
  // GAME OVER
  // ====================================================

  if (gameOver) {
    const iWon =
      !draw &&
      Number(winnerSide) ===
        Number(myPlayer);

    const iLost =
      !draw &&
      Number(winnerSide) !==
        Number(myPlayer);

    let resultTitle =
      "Partie terminée";

    let resultText =
      "Ce match est complètement terminé.";

    let resultIcon =
      "🏁";

    let buttonText =
      "Démarrer un autre match";

    if (draw) {
      resultIcon = "🤝";

      resultTitle =
        "Match nul";

      resultText =
        "Cette partie est terminée. " +
        "Démarrez un autre match.";

      buttonText =
        "Démarrer un autre match";
    } else if (iWon) {
      resultIcon = "🏆";

      resultTitle =
        "Félicitations, vous avez gagné !";

      resultText =
        "Félicitation, vous avez gagné ce match. " +
        "Créez plus de défis et remportez-en plus.";

      buttonText =
        "Créer un nouveau défi";
    } else if (iLost) {
      resultIcon = "🏁";

      resultTitle =
        "Match terminé";

      resultText =
        "Ce match est complètement terminé. " +
        "Démarrez un autre match.";

      buttonText =
        "Démarrer un autre match";
    }

    return (
      <div className="dames-gameover">
        <div className="dames-gameover-card">
          <div className="dames-gameover-trophy">
            {resultIcon}
          </div>

          <div className="dames-gameover-kicker">
            PARTIE COMPLÈTEMENT TERMINÉE
          </div>

          <h1>
            {resultTitle}
          </h1>

          <p>
            {resultText}
          </p>

          <button
            type="button"
            className="dames-primary-button"
            onClick={resetGame}
          >
            {buttonText}
          </button>
        </div>
      </div>
    );
  }

  // ====================================================
  // PLAYERS
  // ====================================================

  const player1 =
    playerInfo[PLAYER_1];

  const player2 =
    playerInfo[PLAYER_2];

  const topPlayer =
    myPlayer === PLAYER_1
      ? PLAYER_2
      : PLAYER_1;

  const bottomPlayer =
    myPlayer === PLAYER_1
      ? PLAYER_1
      : PLAYER_2;

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <div className="dames-page">

      {/* ================================================
          TOP BAR
      ================================================ */}

      <header className="dames-header">
        <div>
          <div className="dames-brand">
            ♟️ Jeux de Dames
          </div>

          <div className="dames-match-id">
            Match #{matchId}
          </div>
        </div>

        <div className="dames-header-actions">
          <div
            className={`dames-connection ${
              connected
                ? "dames-connection--online"
                : "dames-connection--offline"
            }`}
          >
            <span />

            {connected
              ? "Connecté"
              : "Hors ligne"}
          </div>

          <div className="dames-ping">
            ⚡ {ping}ms
          </div>

          <button
            type="button"
            className="dames-report-button"
            onClick={
              handleReport
            }
            disabled={
              reporting
            }
          >
            {reporting
              ? "..."
              : "🚨 Signaler"}
          </button>
        </div>
      </header>

      {/* ================================================
          GAME AREA
      ================================================ */}

      <main className="dames-game-layout">

        <section className="dames-board-section">

          {/* TOP PLAYER */}

          <PlayerAvatar
            player={topPlayer}
            name={
              topPlayer ===
              PLAYER_1
                ? player1.name
                : player2.name
            }
            avatar={
              topPlayer ===
              PLAYER_1
                ? player1.avatar
                : player2.avatar
            }
            active={
              turn === topPlayer
            }
            isMe={
              topPlayer ===
              myPlayer
            }
          />

          {/* STATUS */}

          <div className="dames-turn-status">
            <div
              className={
                isMyTurn
                  ? "dames-turn-status--mine"
                  : ""
              }
            >
              {isMyTurn
                ? "🟢 À vous de jouer"
                : `⏳ Tour de ${
                    topPlayer ===
                    turn
                      ? topPlayer ===
                        PLAYER_1
                        ? player1.name
                        : player2.name
                      : bottomPlayer ===
                        PLAYER_1
                      ? player1.name
                      : player2.name
                  }`}
            </div>

            {sendingMove && (
              <span>
                Synchronisation...
              </span>
            )}
          </div>

          {/* BOARD */}

          <div className="dames-board-frame">
            <div
              ref={boardRef}
              className="dames-board"
              style={{
                width:
                  cellSize * 10,
                height:
                  cellSize * 10,
              }}
            >
              {displayBoard.map(
                (
                  row,
                  displayR
                ) => (
                  <div
                    key={displayR}
                    className="dames-row"
                  >
                    {row.map(
                      (
                        cell,
                        displayC
                      ) => {
                        const real =
                          toRealCoordinates(
                            displayR,
                            displayC
                          );

                        const key =
                          `${displayR}-${displayC}`;

                        const isSelected =
                          selected?.r ===
                            real.r &&
                          selected?.c ===
                            real.c;

                        const isMove =
                          targets.has(
                            key
                          );

                        const isPlayable =
                          playablePieces.has(
                            key
                          );

                        const isLastMove =
                          lastMove &&
                          (
                            (
                              lastMove
                                .from
                                ?.r ===
                                real.r &&
                              lastMove
                                .from
                                ?.c ===
                                real.c
                            ) ||
                            lastMove.path?.some(
                              (
                                point
                              ) =>
                                point.r ===
                                  real.r &&
                                point.c ===
                                  real.c
                            )
                          );

                        return (
                          <Cell
                            key={key}
                            cell={cell}
                            r={displayR}
                            c={displayC}
                            handleClick={
                              handleClick
                            }
                            selected={
                              isSelected
                            }
                            isMove={
                              isMove
                            }
                            isLastMove={
                              isLastMove
                            }
                            isPlayable={
                              isPlayable
                            }
                            isMyTurn={
                              isMyTurn
                            }
                            cellSize={
                              cellSize
                            }
                          />
                        );
                      }
                    )}
                  </div>
                )
              )}
            </div>
          </div>

          {/* BOTTOM PLAYER */}

          <PlayerAvatar
            player={bottomPlayer}
            name={
              bottomPlayer ===
              PLAYER_1
                ? player1.name
                : player2.name
            }
            avatar={
              bottomPlayer ===
              PLAYER_1
                ? player1.avatar
                : player2.avatar
            }
            active={
              turn ===
              bottomPlayer
            }
            isMe={
              bottomPlayer ===
              myPlayer
            }
          />

          {/* STATS */}

          <div className="dames-stats">
            <div>
              <span>
                Vos pièces
              </span>

              <strong>
                {boardStats.my}
              </strong>
            </div>

            <div>
              <span>
                Vos rois
              </span>

              <strong>
                {boardStats.myKings}
              </strong>
            </div>

            <div>
              <span>
                Adversaire
              </span>

              <strong>
                {boardStats.enemy}
              </strong>
            </div>

            <div>
              <span>
                Rois adverses
              </span>

              <strong>
                {boardStats.enemyKings}
              </strong>
            </div>
          </div>
        </section>
      </main>

      {/* ================================================
          CHAT BUTTON
      ================================================ */}

      <button
        type="button"
        className="dames-chat-fab"
        onClick={() => {
          setChatOpen(true);
          setUnreadMessages(0);
        }}
        aria-label="Ouvrir la discussion"
      >
        💬

        {unreadMessages >
          0 && (
          <span className="dames-chat-badge">
            {unreadMessages >
            9
              ? "9+"
              : unreadMessages}
          </span>
        )}
      </button>

      {/* ================================================
          CHAT
      ================================================ */}

      {chatOpen && (
        <ChatPanel
          messages={
            messages
          }
          chatInput={
            chatInput
          }
          typingPlayer={
            typingPlayer
          }
          onChange={
            handleTyping
          }
          onSend={
            sendMessage
          }
          onClose={() =>
            setChatOpen(
              false
            )
          }
          chatRef={
            chatRef
          }
        />
      )}

      {/* ================================================
          CONDITIONS
      ================================================ */}

      {!conditionsAccepted && (
        <ConditionsModal
          mode={gameMode}
          onAccept={
            acceptConditions
          }
        />
      )}
    </div>
  );
}