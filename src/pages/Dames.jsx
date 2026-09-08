import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  memo,
} from "react";

import "./Dames.css";

import {
  checkersSocket,
  connectCheckers,
  joinCheckersMatch,
  sendCheckersMove,
} from "../services/checkersSocket";

import DamesSettings from "./DamesSettings";
import DamesModeration from "./DamesModeration";

// ======================================================
// CONFIG
// ======================================================

const PLAYER_1 = 1;
const PLAYER_2 = 2;

const KING_1 = 3;
const KING_2 = 4;

const BOARD_SIZE = 10;

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
  return (
    Array.isArray(board) &&
    board.length === BOARD_SIZE &&
    board.every(
      (row) =>
        Array.isArray(row) &&
        row.length === BOARD_SIZE &&
        row.every((cell) =>
          [0, 1, 2, 3, 4].includes(cell)
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

function sanitizeText(text = "", max = 300) {
  return String(text)
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .slice(0, max);
}

// ======================================================
// PLAYER NORMALIZATION
// ======================================================
//
// IMPORTANT :
// On ne fabrique plus "Joueur 1 / Joueur 2".
//
// Le serveur / gameConfig doit fournir l'identité.
// Si elle n'existe vraiment pas, on affiche "—".
// ======================================================

function normalizePlayer(raw) {
  if (!raw) {
    return {
      id: null,
      name: "—",
      avatar: null,
    };
  }

  if (
    typeof raw === "string" ||
    typeof raw === "number"
  ) {
    return {
      id: Number(raw) || null,
      name: String(raw),
      avatar: null,
    };
  }

  const id =
    raw.id ??
    raw.userId ??
    raw.user_id ??
    null;

  const name =
    raw.username ??
    raw.displayName ??
    raw.name ??
    raw.nickname ??
    null;

  return {
    id: id != null ? Number(id) : null,
    name:
      name &&
      String(name).trim()
        ? sanitizeText(name, 80)
        : "—",
    avatar:
      raw.avatar ??
      raw.avatarUrl ??
      raw.photo ??
      raw.profileImage ??
      null,
  };
}

function resolvePlayers(gameConfig, data) {
  const socketPlayers =
    data?.players || {};

  const configPlayers =
    gameConfig?.players || {};

  const player1 =
    socketPlayers[1] ??
    socketPlayers["1"] ??
    configPlayers[1] ??
    configPlayers["1"] ??
    data?.creator ??
    gameConfig?.creator ??
    gameConfig?.user1 ??
    null;

  const player2 =
    socketPlayers[2] ??
    socketPlayers["2"] ??
    configPlayers[2] ??
    configPlayers["2"] ??
    data?.opponent ??
    gameConfig?.opponent ??
    gameConfig?.user2 ??
    null;

  return {
    1: normalizePlayer(player1),
    2: normalizePlayer(player2),
  };
}

// ======================================================
// AVATAR
// ======================================================

const PlayerAvatar = memo(
  function PlayerAvatar({
    player,
    active,
    isMe,
  }) {
    return (
      <div
        className={[
          "dames-player-card",
          active
            ? "dames-player-card--active"
            : "",
          isMe
            ? "dames-player-card--me"
            : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="dames-player-avatar-wrap">
          {player.avatar ? (
            <img
              src={player.avatar}
              alt={player.name}
              className="dames-player-avatar"
              onError={(event) => {
                event.currentTarget.style.display =
                  "none";
              }}
            />
          ) : (
            <div className="dames-player-avatar dames-player-avatar--fallback">
              {player.id === PLAYER_1
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
          {player.name}
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
        aria-label={`Case ${r + 1}-${c + 1}`}
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
              width: cellSize * 0.74,
              height: cellSize * 0.74,
            }}
          >
            <div className="dames-piece-inner">
              {isKing && "♛"}
            </div>
          </div>
        )}

        {isPlayable && !selected && (
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
// MAIN
// ======================================================

export default function Dames({
  gameConfig,
  resetGame,
}) {
  const { matchId } =
    gameConfig || {};

  // ====================================================
  // STATE
  // ====================================================

  const [board, setBoard] =
    useState(null);

  const [turn, setTurn] =
    useState(null);

  const [myPlayer, setMyPlayer] =
    useState(null);

  const [allMoves, setAllMoves] =
    useState([]);

  const [validMoves, setValidMoves] =
    useState([]);

  const [selected, setSelected] =
    useState(null);

  const [lastMove, setLastMove] =
    useState(null);

  const [connected, setConnected] =
    useState(
      checkersSocket.connected
    );

  const [ping, setPing] =
    useState("--");

  const [remainingTime, setRemainingTime] =
    useState(0);

  const [turnDeadline, setTurnDeadline] =
    useState(null);

  const [gameOver, setGameOver] =
    useState(false);

  const [winnerId, setWinnerId] =
    useState(null);

  const [winnerSide, setWinnerSide] =
    useState(null);

  const [draw, setDraw] =
    useState(false);

  const [finishReason, setFinishReason] =
    useState(null);

  const [playerInfo, setPlayerInfo] =
    useState({
      1: {
        id: null,
        name: "—",
        avatar: null,
      },
      2: {
        id: null,
        name: "—",
        avatar: null,
      },
    });

  const [matchStatus, setMatchStatus] =
    useState("loading");

  const [conditionsAccepted, setConditionsAccepted] =
    useState(false);

  const [conditionsVisible, setConditionsVisible] =
    useState(false);

  const [acceptedPlayers, setAcceptedPlayers] =
    useState([]);

  const [opponentJoined, setOpponentJoined] =
    useState(false);

  const [sendingMove, setSendingMove] =
    useState(false);

  const [loadingError, setLoadingError] =
    useState(false);

  const [cellSize, setCellSize] =
    useState(getCellSize());

  // ====================================================
  // REFS
  // ====================================================

  const boardRef =
    useRef(null);

  const pingInterval =
    useRef(null);

  const loadingTimeout =
    useRef(null);

  const moveTimeout =
    useRef(null);

  const timerInterval =
    useRef(null);

  const matchJoinedRef =
    useRef(false);

  const matchEndedRef =
    useRef(false);

  const startedRef =
    useRef(false);

  // ====================================================
  // MODE
  // ====================================================

  const gameMode =
    useMemo(() => {
      const mode = String(
        gameConfig?.mode ??
          gameConfig?.gameMode ??
          gameConfig?.matchMode ??
          "user"
      )
        .toLowerCase()
        .trim();

      if (
        mode.includes("training") ||
        mode.includes("entrain")
      ) {
        return "training";
      }

      if (
        mode === "ai" ||
        mode === "ia" ||
        mode.includes("computer")
      ) {
        return "ai";
      }

      return "user";
    }, [gameConfig]);

  // ====================================================
  // RESPONSIVE
  // ====================================================

  useEffect(() => {
    const resize = () => {
      setCellSize(getCellSize());
    };

    window.addEventListener(
      "resize",
      resize
    );

    return () => {
      window.removeEventListener(
        "resize",
        resize
      );
    };
  }, []);

  // ====================================================
  // BOARD ORIENTATION
  // ====================================================
  //
  // NE PAS MODIFIER.
  //
  // PLAYER 1 => rotation 180°
  // PLAYER 2 => normale
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

  const toRealCoordinates =
    useCallback(
      (displayR, displayC) => {
        if (!shouldRotateBoard) {
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
        if (!shouldRotateBoard) {
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
    Number(turn) ===
    Number(myPlayer);

  // ====================================================
  // MY PIECES
  // ====================================================

  const myPieces =
    useMemo(() => {
      if (myPlayer === PLAYER_1) {
        return [
          PLAYER_1,
          KING_1,
        ];
      }

      if (myPlayer === PLAYER_2) {
        return [
          PLAYER_2,
          KING_2,
        ];
      }

      return [];
    }, [myPlayer]);

  // ====================================================
  // PLAYABLE PIECES
  // ====================================================

  const playablePieces =
    useMemo(() => {
      const result = new Set();

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

          result.add(
            `${display.r}-${display.c}`
          );
        }
      );

      return result;
    }, [
      allMoves,
      toDisplayCoordinates,
    ]);

  // ====================================================
  // TARGETS
  // ====================================================

  const targets =
    useMemo(() => {
      const result = new Map();

      validMoves.forEach(
        (move) => {
          if (!isValidMove(move)) {
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

          result.set(
            `${display.r}-${display.c}`,
            move
          );
        }
      );

      return result;
    }, [
      validMoves,
      toDisplayCoordinates,
    ]);

  // ====================================================
  // STATS
  // ====================================================

  const boardStats =
    useMemo(() => {
      let mine = 0;
      let enemy = 0;
      let myKings = 0;
      let enemyKings = 0;

      if (!isValidBoard(board)) {
        return {
          mine: 0,
          enemy: 0,
          myKings: 0,
          enemyKings: 0,
        };
      }

      board.forEach(
        (row) => {
          row.forEach(
            (cell) => {
              if (
                myPieces.includes(cell)
              ) {
                mine++;

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
        mine,
        enemy,
        myKings,
        enemyKings,
      };
    }, [
      board,
      myPieces,
    ]);

  // ====================================================
  // SERVER TIMER
  // ====================================================
  //
  // Le frontend ne possède PAS son propre chrono.
  //
  // Il reçoit :
  // - turnStartedAt
  // - turnDeadline
  // - remainingTime
  //
  // puis affiche le temps restant jusqu'à deadline.
  //
  // Il ne déclare JAMAIS le vainqueur.
  // ====================================================

  const syncServerTimer =
    useCallback((data) => {
      clearInterval(
        timerInterval.current
      );

      const deadline =
        Number(
          data?.turnDeadline
        );

      const serverRemaining =
        Number(
          data?.remainingTime
        );

      let resolvedDeadline =
        Number.isFinite(deadline)
          ? deadline
          : null;

      if (
        !resolvedDeadline &&
        Number.isFinite(
          serverRemaining
        )
      ) {
        resolvedDeadline =
          Date.now() +
          Math.max(
            0,
            serverRemaining
          );
      }

      if (!resolvedDeadline) {
        setRemainingTime(0);
        setTurnDeadline(null);
        return;
      }

      setTurnDeadline(
        resolvedDeadline
      );

      const tick = () => {
        if (
          matchEndedRef.current
        ) {
          clearInterval(
            timerInterval.current
          );
          return;
        }

        const seconds =
          Math.max(
            0,
            Math.ceil(
              (
                resolvedDeadline -
                Date.now()
              ) / 1000
            )
          );

        setRemainingTime(
          seconds
        );

        if (seconds <= 0) {
          clearInterval(
            timerInterval.current
          );

          /*
           * IMPORTANT :
           * aucun winner côté frontend.
           *
           * Le backend doit envoyer :
           * match:end
           */
        }
      };

      tick();

      timerInterval.current =
        setInterval(
          tick,
          250
        );
    }, []);

  // ====================================================
  // SOCKET
  // ====================================================

  useEffect(() => {
    if (!matchId) {
      return;
    }

    matchEndedRef.current =
      false;

    startedRef.current =
      false;

    matchJoinedRef.current =
      false;

    setBoard(null);
    setTurn(null);
    setMyPlayer(null);
    setGameOver(false);
    setWinnerId(null);
    setWinnerSide(null);
    setDraw(false);
    setFinishReason(null);
    setRemainingTime(0);
    setTurnDeadline(null);
    setConditionsAccepted(false);
    setConditionsVisible(false);
    setAcceptedPlayers([]);
    setOpponentJoined(false);
    setMatchStatus("loading");
    setLoadingError(false);

    const socket =
      connectCheckers();

    // --------------------------------------------------
    // CONNECT
    // --------------------------------------------------

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
            if (!socket.connected) {
              return;
            }

            const started =
              performance.now();

            socket.emit(
              "ping:test",
              started
            );

            socket.once(
              "pong:test",
              (sentAt) => {
                const latency =
                  Math.floor(
                    performance.now() -
                      Number(sentAt)
                  );

                setPing(latency);
              }
            );
          }, 5000);
      };

    // --------------------------------------------------
    // INIT
    // --------------------------------------------------

    const handleInit =
      (data) => {
        if (!data) {
          return;
        }

        clearTimeout(
          loadingTimeout.current
        );

        if (
          !isValidBoard(
            data.board
          )
        ) {
          return;
        }

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

        const status =
          String(
            data.status ??
              data.matchStatus ??
              "active"
          ).toLowerCase();

        const started =
          Boolean(
            data.started ??
              data.inProgress
          ) ||
          [
            "active",
            "playing",
            "started",
            "running",
          ].includes(status);

        const joined =
          Boolean(
            data.opponentJoined
          ) ||
          Boolean(
            data.user2_id ??
              data.opponentId ??
              data.opponent
          );

        setBoard(data.board);
        setTurn(
          Number(data.turn)
        );
        setMyPlayer(player);
        setAllMoves(moves);
        setLastMove(
          data.lastMove ?? null
        );

        setPlayerInfo(
          resolvePlayers(
            gameConfig,
            data
          )
        );

        setOpponentJoined(
          joined
        );

        setMatchStatus(
          started
            ? "active"
            : joined
              ? "ready"
              : "waiting"
        );

        startedRef.current =
          started;

        if (
          data.conditionsAccepted
        ) {
          setConditionsAccepted(
            true
          );
        }

        setAcceptedPlayers(
          Array.isArray(
            data.acceptedPlayers
          )
            ? data.acceptedPlayers.map(
                Number
              )
            : []
        );

        setConditionsVisible(
          !started &&
            (
              joined ||
              gameMode !== "user"
            )
        );

        if (
          data.turnDeadline ||
          data.remainingTime != null
        ) {
          syncServerTimer(
            data
          );
        }

        setSendingMove(false);

        if (
          data.finished ||
          data.gameOver ||
          data.ended ||
          status === "finished"
        ) {
          handleServerEnd(data);
        }
      };

    // --------------------------------------------------
    // UPDATE
    // --------------------------------------------------

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

        setBoard(data.board);

        setTurn(
          Number(data.turn)
        );

        setAllMoves(
          nextMoves
        );

        setLastMove(
          data.lastMove ?? null
        );

        setSelected(null);
        setValidMoves([]);
        setSendingMove(false);

        if (
          data.players
        ) {
          setPlayerInfo(
            resolvePlayers(
              gameConfig,
              data
            )
          );
        }

        if (
          data.turnDeadline ||
          data.remainingTime != null
        ) {
          syncServerTimer(
            data
          );
        }

        if (
          data.finished ||
          data.gameOver ||
          data.ended ||
          String(
            data.status
          ).toLowerCase() ===
            "finished"
        ) {
          handleServerEnd(data);
        }
      };

    // --------------------------------------------------
    // TIMER SOCKET
    // --------------------------------------------------

    const handleTurnTimer =
      (data) => {
        if (!data) {
          return;
        }

        if (
          data.turn != null
        ) {
          setTurn(
            Number(data.turn)
          );
        }

        syncServerTimer(
          data
        );
      };

    // --------------------------------------------------
    // SERVER END
    // --------------------------------------------------

    function handleServerEnd(
      data
    ) {
      if (
        matchEndedRef.current
      ) {
        return;
      }

      matchEndedRef.current =
        true;

      startedRef.current =
        false;

      clearInterval(
        timerInterval.current
      );

      clearTimeout(
        moveTimeout.current
      );

      setRemainingTime(0);
      setTurnDeadline(null);
      setGameOver(true);
      setSelected(null);
      setValidMoves([]);
      setSendingMove(false);

      const isDraw =
        Boolean(data?.draw) ||
        String(
          data?.result ?? ""
        ).toLowerCase() ===
          "draw";

      setDraw(isDraw);

      setWinnerId(
        data?.winnerId ??
          null
      );

      setWinnerSide(
        normalizePlayerId(
          data?.winnerSide ??
            data?.winnerPlayer
        )
      );

      setFinishReason(
        data?.reason ??
          data?.finishReason ??
          null
      );

      if (
        data?.board &&
        isValidBoard(data.board)
      ) {
        setBoard(
          data.board
        );
      }
    }

    // --------------------------------------------------
    // ERRORS
    // --------------------------------------------------

    const handleConnectError =
      (error) => {
        console.error(
          "CHECKERS SOCKET CONNECT ERROR:",
          error
        );

        setConnected(false);
        setSendingMove(false);
      };

    const handleSocketError =
      (error) => {
        console.error(
          "CHECKERS SOCKET ERROR:",
          error
        );

        setSelected(null);
        setValidMoves([]);
        setSendingMove(false);

        if (
          matchId &&
          socket.connected &&
          !matchEndedRef.current
        ) {
          matchJoinedRef.current =
            false;

          joinCheckersMatch(
            matchId
          );
        }
      };

    const handleDisconnect =
      () => {
        setConnected(false);
      };

    // --------------------------------------------------
    // EVENTS
    // --------------------------------------------------

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
      "turn:timer",
      handleTurnTimer
    );

    socket.on(
      "match:end",
      handleServerEnd
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
        setLoadingError(true);
      }, SOCKET_TIMEOUT);

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
      clearInterval(
        pingInterval.current
      );

      clearInterval(
        timerInterval.current
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
        "turn:timer",
        handleTurnTimer
      );

      socket.off(
        "match:end",
        handleServerEnd
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
  }, [
    matchId,
    gameConfig,
    gameMode,
    syncServerTimer,
  ]);

  // ====================================================
  // SELECT PIECE
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

        setSelected({
          r,
          c,
        });

        setValidMoves(
          allMoves.filter(
            (move) =>
              move.from?.r === r &&
              move.from?.c === c
          )
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
  // PLAY MOVE
  // ====================================================

  const playMove =
    useCallback(
      (
        displayR,
        displayC
      ) => {
        if (
          sendingMove ||
          !conditionsAccepted ||
          gameOver ||
          !checkersSocket.connected ||
          !selected
        ) {
          return;
        }

        const {
          r: targetR,
          c: targetC,
        } =
          toRealCoordinates(
            displayR,
            displayC
          );

        const move =
          validMoves.find(
            (candidate) => {
              if (
                !isValidMove(
                  candidate
                )
              ) {
                return false;
              }

              if (
                candidate.from?.r !==
                  selected.r ||
                candidate.from?.c !==
                  selected.c
              ) {
                return false;
              }

              const last =
                candidate.path[
                  candidate.path.length -
                    1
                ];

              return (
                last?.r === targetR &&
                last?.c === targetC
              );
            }
          );

        if (!move) {
          return;
        }

        setSendingMove(true);

        clearTimeout(
          moveTimeout.current
        );

        moveTimeout.current =
          setTimeout(() => {
            setSendingMove(false);
          }, MOVE_TIMEOUT);

        sendCheckersMove(
          matchId,
          {
            from: {
              r: Number(
                move.from.r
              ),
              c: Number(
                move.from.c
              ),
            },

            path:
              move.path.map(
                (point) => ({
                  r: Number(point.r),
                  c: Number(point.c),
                })
              ),

            captures:
              Array.isArray(
                move.captures
              )
                ? move.captures.map(
                    (capture) => ({
                      r: Number(
                        capture.r
                      ),
                      c: Number(
                        capture.c
                      ),
                    })
                  )
                : [],

            id: move.id,
          }
        );

        setSelected(null);
        setValidMoves([]);
      },
      [
        sendingMove,
        conditionsAccepted,
        gameOver,
        selected,
        validMoves,
        toRealCoordinates,
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
          (displayR + displayC) %
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

        const clicked =
          board[r][c];

        if (
          myPieces.includes(
            clicked
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
  // CONDITIONS
  // ====================================================

  const acceptConditions =
    useCallback(() => {
      if (
        !matchId ||
        !checkersSocket.connected
      ) {
        return;
      }

      checkersSocket.emit(
        "match:conditions:accept",
        {
          matchId:
            Number(matchId),
        }
      );

      setConditionsAccepted(
        true
      );

      setConditionsVisible(
        false
      );
    }, [matchId]);

  // ====================================================
  // LOADING
  // ====================================================

  if (
    !board ||
    matchStatus === "waiting" ||
    matchStatus === "ready"
  ) {
    return (
      <div className="dames-loading">
        <div className="dames-loading-orbit">
          ♟
        </div>

        <h2>
          {matchStatus === "waiting"
            ? "Match en attente"
            : matchStatus === "ready"
              ? "Votre adversaire a rejoint la partie"
              : "Chargement de la partie"}
        </h2>

        <p>
          {connected
            ? "Connexion au match..."
            : "Connexion au serveur..."}
        </p>

        {loadingError && (
          <>
            <div className="dames-error">
              Impossible de charger le
              match.
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

        {conditionsVisible && (
          <DamesSettings
            mode={gameMode}
            conditionsVisible
            onAcceptConditions={
              acceptConditions
            }
            feedbackVisible={false}
          />
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
      winnerSide ===
        myPlayer;

    const iLost =
      !draw &&
      winnerSide !== null &&
      winnerSide !==
        myPlayer;

    let title =
      "Partie terminée";

    let text =
      "Le serveur a terminé cette partie.";

    let icon = "🏁";

    if (draw) {
      icon = "🤝";
      title = "Match nul";
      text =
        "Cette partie est terminée. Aucun joueur ne remporte le match.";
    } else if (iWon) {
      icon = "🏆";
      title =
        "Félicitations, vous avez gagné !";
      text =
        "Le serveur vous a déclaré vainqueur de cette partie.";
    } else if (iLost) {
      icon = "🏁";
      title =
        "Match terminé";
      text =
        "Votre adversaire remporte cette partie.";
    }

    return (
      <div className="dames-gameover">
        <div className="dames-gameover-card">
          <div className="dames-gameover-trophy">
            {icon}
          </div>

          <div className="dames-gameover-kicker">
            PARTIE COMPLÈTEMENT TERMINÉE
          </div>

          <h1>
            {title}
          </h1>

          <p>
            {text}
          </p>

          {finishReason && (
            <div className="dames-feedback-match">
              Motif :{" "}
              {sanitizeText(
                finishReason,
                100
              )}
            </div>
          )}

          <button
            type="button"
            className="dames-primary-button"
            onClick={resetGame}
          >
            Démarrer un autre match
          </button>
        </div>

        <DamesSettings
          mode={gameMode}
          feedbackVisible
          feedbackMatchId={matchId}
          onAcceptConditions={
            acceptConditions
          }
        />
      </div>
    );
  }

  // ====================================================
  // PLAYERS
  // ====================================================

  const topPlayer =
    oppositePlayer(
      myPlayer
    );

  const bottomPlayer =
    myPlayer;

  const topInfo =
    playerInfo[topPlayer] ?? {
      id: null,
      name: "—",
      avatar: null,
    };

  const bottomInfo =
    playerInfo[bottomPlayer] ?? {
      id: null,
      name: "—",
      avatar: null,
    };

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <div className="dames-page">
      {/* HEADER */}

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
        </div>
      </header>

      {/* GAME */}

      <main className="dames-game-layout">
        <section className="dames-board-section">
          <PlayerAvatar
            player={topInfo}
            active={
              turn === topPlayer
            }
            isMe={
              topPlayer ===
              myPlayer
            }
          />

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
                    playerInfo[turn]
                      ?.name || "—"
                  }`}
            </div>

            {sendingMove && (
              <span>
                Synchronisation...
              </span>
            )}

            <span
              className={[
                "dames-turn-timer",
                remainingTime <= 10 &&
                isMyTurn
                  ? "dames-turn-timer--danger"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-live="polite"
            >
              ⏱️{" "}
              {Math.floor(
                remainingTime / 60
              )}
              :
              {String(
                remainingTime % 60
              ).padStart(2, "0")}
            </span>
          </div>

          <div
            className={
              isMyTurn
                ? "dames-board-frame"
                : "dames-board-frame dames-board-frame--locked"
            }
          >
            <div
              ref={boardRef}
              className="dames-board"
              aria-busy={sendingMove}
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
                          Boolean(
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
                                  (point) =>
                                    point.r ===
                                      real.r &&
                                    point.c ===
                                      real.c
                                )
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

          <PlayerAvatar
            player={bottomInfo}
            active={
              turn === bottomPlayer
            }
            isMe={
              bottomPlayer ===
              myPlayer
            }
          />

          <div className="dames-stats">
            <div>
              <span>
                Vos pièces
              </span>
              <strong>
                {boardStats.mine}
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

      {/* MODERATION / CHAT */}

      <DamesModeration
        matchId={matchId}
        myPlayer={myPlayer}
        board={board}
        boardRef={boardRef}
        token={
          localStorage.getItem(
            "token"
          ) ||
          localStorage.getItem(
            "accessToken"
          ) ||
          localStorage.getItem(
            "jwt"
          )
        }
      />

      {/* CONDITIONS */}

      {conditionsVisible && (
        <DamesSettings
          mode={gameMode}
          conditionsVisible
          onAcceptConditions={
            acceptConditions
          }
          feedbackVisible={false}
        />
      )}
    </div>
  );
}