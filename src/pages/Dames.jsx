import { io } from "socket.io-client";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  memo,
} from "react";

import html2canvas from "html2canvas";

// ======================================================
// CONFIG
// ======================================================

const API =
  import.meta.env.VITE_API_URL;

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  API?.replace(/\/api$/, "");

const PLAYER_1 = 1;
const PLAYER_2 = 2;

const KING_1 = 3;
const KING_2 = 4;

const BOARD_SIZE = 10;

const MAX_CHAT_LENGTH = 300;
const MAX_MESSAGES = 100;

const SOCKET_TIMEOUT = 15000;

// ======================================================
// VALIDATORS
// ======================================================

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
  if (!move) {
    return false;
  }

  if (!move.from) {
    return false;
  }

  if (!Array.isArray(move.path)) {
    return false;
  }

  if (move.path.length === 0) {
    return false;
  }

  return true;
}

function sanitizeText(text) {
  return text
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .slice(0, MAX_CHAT_LENGTH);
}

// ======================================================
// MEMO CELL
// ======================================================

const Cell = memo(function Cell({
  cell,
  r,
  c,
  handleClick,
  selected,
  isMove,
  isLastMove,
  isPlayable,
  isMyTurn,
}) {
  const isDark = (r + c) % 2 === 1;

  const isWhite =
    cell === PLAYER_1 ||
    cell === KING_1;

  const isKing =
    cell === KING_1 ||
    cell === KING_2;

  return (
    <div
      onClick={() =>
        handleClick(r, c)
      }
      style={{
        width: 68,
        height: 68,

        background:
          !isDark
            ? "#f1dfc0"
            : selected
            ? "#eab308"
            : isMove
            ? "#22c55e"
            : isLastMove
            ? "#2563eb"
            : "#7c4a2d",

        display: "flex",

        alignItems: "center",

        justifyContent:
          "center",

        position: "relative",

        cursor:
          isDark &&
          isMyTurn
            ? "pointer"
            : "default",

        transition:
          "all 0.15s ease",

        boxSizing:
          "border-box",

        border: selected
          ? "3px solid #fde047"
          : "1px solid rgba(0,0,0,0.08)",
      }}
    >
      {cell !== 0 && (
        <div
          style={{
            width: 50,
            height: 50,

            borderRadius: "50%",

            background: isWhite
              ? "linear-gradient(145deg,#f9fafb,#d1d5db)"
              : "linear-gradient(145deg,#111827,#000)",

            border: isWhite
              ? "2px solid #9ca3af"
              : "2px solid #4b5563",

            display: "flex",

            alignItems: "center",

            justifyContent:
              "center",

            boxShadow:
              "0 8px 18px rgba(0,0,0,0.4)",
          }}
        >
          {isKing && (
            <span
              style={{
                fontSize: 22,
              }}
            >
              👑
            </span>
          )}
        </div>
      )}

      {isPlayable &&
        !selected && (
          <div
            style={{
              position:
                "absolute",

              width: 12,
              height: 12,

              borderRadius:
                "50%",

              background:
                "#facc15",

              top: 6,
              right: 6,
            }}
          />
        )}

      {isMove && (
        <div
          style={{
            position:
              "absolute",

            width: 18,
            height: 18,

            borderRadius:
              "50%",

            background:
              "#fff",

            opacity: 0.9,
          }}
        />
      )}
    </div>
  );
});

// ======================================================
// COMPONENT
// ======================================================

export default function Dames({
  gameConfig,
  resetGame,
}) {
  const { matchId } =
    gameConfig || {};

  const token =
    localStorage.getItem("token");

  // ======================================================
  // STATES
  // ======================================================

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
    useState(false);

  const [ping, setPing] =
    useState("--");

  const [gameOver, setGameOver] =
    useState(false);

  const [winner, setWinner] =
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

  // ======================================================
  // REFS
  // ======================================================

  const socketRef = useRef(null);

  const boardRef = useRef(null);

  const chatRef = useRef(null);

  const typingTimeout =
    useRef(null);

  const pingInterval =
    useRef(null);

  const loadingTimeout =
    useRef(null);

  const moveTimeout =
    useRef(null);

  // ======================================================
  // HELPERS
  // ======================================================

  const isMyTurn =
    turn === myPlayer;

  const myPieces = useMemo(() => {
    return myPlayer === PLAYER_1
      ? [PLAYER_1, KING_1]
      : [PLAYER_2, KING_2];
  }, [myPlayer]);

  // ======================================================
  // PLAYABLE
  // ======================================================

  const playablePieces =
    useMemo(() => {
      const set = new Set();

      allMoves.forEach((m) => {
        if (!m?.from) {
          return;
        }

        set.add(
          `${m.from.r}-${m.from.c}`
        );
      });

      return set;
    }, [allMoves]);

  // ======================================================
  // TARGETS
  // ======================================================

  const targets = useMemo(() => {
    const map = new Map();

    validMoves.forEach((move) => {
      if (!isValidMove(move)) {
        return;
      }

      const last =
        move.path[
          move.path.length - 1
        ];

      map.set(
        `${last.r}-${last.c}`,
        move
      );
    });

    return map;
  }, [validMoves]);

  // ======================================================
  // STATS
  // ======================================================

  const boardStats = useMemo(() => {
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

    board.forEach((row) => {
      row.forEach((cell) => {
        const mine =
          myPieces.includes(cell);

        if (mine) {
          my++;

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
      my,
      enemy,
      myKings,
      enemyKings,
    };
  }, [board, myPieces]);

  // ======================================================
  // SOCKET
  // ======================================================

  useEffect(() => {
    if (!matchId || !token) {
      return;
    }

    if (socketRef.current) {
      socketRef.current.off();

      socketRef.current.disconnect();
    }   
       console.log(
        "MATCH ID:",
        matchId
     );

      console.log(
        "API:",
        API
     );

     console.log(
       "SOCKET URL:",
       SOCKET_URL
     );

    const socket = io(
      SOCKET_URL,
      {
        auth: { token },

        transports: [
          "websocket",
        ],

        reconnection: true,

        reconnectionAttempts: 10,

        reconnectionDelay: 1000,

        timeout:
          SOCKET_TIMEOUT,

        autoConnect: true,

        forceNew: true,
      }
    );

    socketRef.current = socket;

     // ======================================================
     // DEBUG SOCKET
     // ======================================================

     socket.on("connect", () => {
        console.log(
        "✅ SOCKET CONNECTED:",
        socket.id
      );
    });

      socket.on("connect_error", (err) => {
        console.error(
        "❌ CONNECT ERROR:",
        err
      );
    });

    socket.on("error", (err) => {
      console.error(
      "❌ SOCKET ERROR:",
     err
    );
  });

    socket.onAny((event, ...args) => {
      console.log(
      "📩 SOCKET EVENT:",
      event,
      args
    );
  });

    // ======================================================
    // CONNECT
    // ======================================================

    socket.on("connect", () => {
      setConnected(true);

      setLoadingError(false);

      console.log(
        "➡️ JOIN MATCH:",
        matchId
      );

      socket.emit(
       "joinMatch",
        { matchId }
      );

      clearInterval(
        pingInterval.current
      );

      pingInterval.current =
        setInterval(() => {
          const start = performance.now();

          socket.emit("ping:test", start);

          socket.once("pong:test", (sentAt) => {
            const ms = Math.floor(
              performance.now() - sentAt
            );

            setPing(ms);
          });
        }, 5000);
    });

    // ======================================================
    // INIT
    // ======================================================


    

    socket.on(
      "match:init",
      (data) => {
         console.log(
           "🔥 MATCH INIT RECEIVED:",
           data
         );

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

        setBoard(data.board);

        setTurn(data.turn);

        setMyPlayer(data.player);

        setLastMove(
          data.lastMove || null
        );

        setAllMoves(
          Array.isArray(
            data.allMoves
          )
            ? data.allMoves.filter(
                isValidMove
              )
            : []
        );

        setMessages(
          Array.isArray(
            data.messages
          )
            ? data.messages
                .slice(
                  -MAX_MESSAGES
                )
                .map((m) => ({
                  username:
                    sanitizeText(
                      m.username ||
                        "Joueur"
                    ),

                  text:
                    sanitizeText(
                      m.text || ""
                    ),

                  playerId:
                    m.playerId,
                }))
            : []
        );

        setSendingMove(false);
      }
    );

    // ======================================================
    // UPDATE
    // ======================================================
   

    socket.on(
      "match:update",
      (data) => {

         console.log(
           "🔥 MATCH UPDATE RECEIVED:",
           data
         );

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

        setBoard(data.board);

        setTurn(data.turn);

        setAllMoves(
          Array.isArray(
            data.allMoves
          )
            ? data.allMoves.filter(
                isValidMove
              )
            : []
        );

        setLastMove(
          data.lastMove || null
        );

        setSelected(null);

        setValidMoves([]);

        setSendingMove(false);
      }
    );

    // ======================================================
    // END
    // ======================================================

    socket.on(
      "match:end",
      ({
        winnerId,
        draw,
        board,
      }) => {
        if (
          board &&
          isValidBoard(board)
        ) {
          setBoard(board);
        }

        setGameOver(true);

        setWinner(winnerId);

        setDraw(draw);

        setSendingMove(false);
      }
    );

    // ======================================================
    // CHAT
    // ======================================================

    socket.on(
      "chat:message",
      (msg) => {
        if (!msg?.text) {
          return;
        }

        const safeMessage = {
          username:
            sanitizeText(
              msg.username ||
                "Joueur"
            ),

          text: sanitizeText(
            msg.text
          ),

          playerId:
            msg.playerId,
        };

        setMessages((prev) =>
          [
            ...prev,
            safeMessage,
          ].slice(
            -MAX_MESSAGES
          )
        );

        requestAnimationFrame(() => {
          if (
            chatRef.current
          ) {
            chatRef.current.scrollTop =
              chatRef.current
                .scrollHeight;
          }
        });
      }
    );

    // ======================================================
    // TYPING
    // ======================================================

    socket.on(
      "chat:typing",
      ({ username }) => {
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
      }
    );

    // ======================================================
    // ERRORS
    // ======================================================

    socket.on(
      "connect_error",
      (err) => {
       console.error(
         "SOCKET CONNECT ERROR:",
         err?.message || err
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
      (message) => {
        console.error(
          "SOCKET SERVER ERROR:",
          message
        );

        setSendingMove(false);

        if (!board) {
          setLoadingError(true);
        }
      }
    );

    // ======================================================
    // FAILSAFE
    // ======================================================

    loadingTimeout.current =
      setTimeout(() => {
        setLoadingError(true);
      }, 15000);

    // ======================================================
    // CLEANUP
    // ======================================================

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

      socket.off();

      socket.disconnect();
    };
  }, [matchId, token]);

  // ======================================================
  // SELECT
  // ======================================================

  const handleSelect =
    useCallback(
      (r, c) => {
        if (
          !board ||
          !isMyTurn ||
          gameOver
        ) {
          return;
        }

        const cell =
          board[r][c];

        if (
          !myPieces.includes(cell)
        ) {
          return;
        }

        if (
          !playablePieces.has(
            `${r}-${c}`
          )
        ) {
          return;
        }

        const moves =
          allMoves.filter(
            (m) =>
              m.from?.r === r &&
              m.from?.c === c
          );

        setSelected({ r, c });

        setValidMoves(moves);
      },
      [
        board,
        isMyTurn,
        gameOver,
        myPieces,
        playablePieces,
        allMoves,
      ]
    );

  // ======================================================
  // MOVE
  // ======================================================

  const playMove =
    useCallback(
      (r, c) => {
        if (
          sendingMove
        ) {
          return;
        }

        const move =
          targets.get(
            `${r}-${c}`
          );

        if (
          !isValidMove(move)
        ) {
          return;
        }

        setSendingMove(true);

        moveTimeout.current =
          setTimeout(() => {
            setSendingMove(false);
          }, 7000);

        socketRef.current?.emit(
          "move",
          {
            matchId,

            move: {
              from:
                move.from,

              to:
                move.path[
                  move.path
                    .length -
                    1
                ],

              id: move.id,
            },
          },
          (response) => {
            if (
              !response?.ok
            ) {
              clearTimeout(
                moveTimeout.current
              );

              setSendingMove(
                false
              );
            }
          }
        );

        setSelected(null);

        setValidMoves([]);
      },
      [
        targets,
        sendingMove,
        matchId,
      ]
    );

  // ======================================================
  // CLICK
  // ======================================================

  const handleClick = (
    r,
    c
  ) => {
    if (
      sendingMove ||
      !connected ||
      !board
    ) {
      return;
    }

    if (
      (r + c) % 2 === 0
    ) {
      return;
    }

    if (!selected) {
      handleSelect(r, c);

      return;
    }

    const clickedCell =
      board[r][c];

    if (
      myPieces.includes(
        clickedCell
      )
    ) {
      handleSelect(r, c);

      return;
    }

    if (
      targets.has(
        `${r}-${c}`
      )
    ) {
      playMove(r, c);

      return;
    }

    setSelected(null);

    setValidMoves([]);
  };

  // ======================================================
  // CHAT SEND
  // ======================================================

  const sendMessage = () => {
    let text =
      sanitizeText(
        chatInput.trim()
      );

    if (!text) {
      return;
    }

    socketRef.current?.emit(
      "chat:message",
      {
        matchId,
        text,
      }
    );

    setChatInput("");
  };

  // ======================================================
  // TYPING
  // ======================================================

  const handleTyping = (
    e
  ) => {
    const value =
      sanitizeText(
        e.target.value
      );

    setChatInput(value);

    clearTimeout(
      typingTimeout.current
    );

    typingTimeout.current =
      setTimeout(() => {
        socketRef.current?.emit(
          "chat:typing",
          {
            matchId,
          }
        );
      }, 700);
  };

  // ======================================================
  // REPORT
  // ======================================================

  const handleReport =
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

        
        const formData = new FormData();

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
              method:
                "POST",

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
      } catch (err) {
        console.error(err);

        window.dispatchEvent(
          new CustomEvent(
            "toast",
            {
              detail:
                "❌ Erreur signalement",
            }
          )
        );
      } finally {
        setReporting(false);
      }
    };

  // ======================================================
  // LOADING
  // ======================================================

  if (!board) {
    return (
      <div
        style={{
          minHeight: "100vh",

          background:
            "#020617",

          display: "flex",

          flexDirection:
            "column",

          alignItems: "center",

          justifyContent:
            "center",

          color: "white",

          gap: 20,
        }}
      >
        <div
          style={{
            fontSize: 28,
          }}
        >
          ⏳ Chargement...
        </div>

        <div
          style={{
            opacity: 0.7,
          }}
        >
          {connected
            ? "Connexion au match..."
            : "Connexion au serveur..."}
        </div>

        {loadingError && (
          <>
            <div
              style={{
                color:
                  "#ef4444",
              }}
            >
              Impossible de charger le match
            </div>

            <button
              onClick={() =>
                window.location.reload()
              }
              style={{
                padding:
                  "12px 18px",

                border: "none",

                borderRadius: 12,

                cursor:
                  "pointer",
              }}
            >
              Reconnecter
            </button>
          </>
        )}
      </div>
    );
  }

  // ======================================================
  // END GAME
  // ======================================================

  if (gameOver) {
    const text = draw
      ? "🤝 Match nul"
      : Number(winner) ===
        Number(myPlayer)
      ? "🎉 Victoire"
      : "😢 Défaite";

    return (
      <div
        style={{
          minHeight: "100vh",

          background:
            "linear-gradient(135deg,#020617,#0f172a)",

          padding: 40,

          color: "white",
        }}
      >
        <h1
          style={{
            fontSize: 52,
            marginBottom: 30,
          }}
        >
          {text}
        </h1>

        <button
          onClick={resetGame}
          style={{
            padding:
              "14px 24px",

            border: "none",

            borderRadius: 14,

            cursor: "pointer",

            color: "white",

            fontWeight: 700,

            background:
              "linear-gradient(135deg,#2563eb,#1d4ed8)",
          }}
        >
          Retour
        </button>
      </div>
    );
  }

  // ======================================================
  // MAIN
  // ======================================================

  return (
    <div
      style={{
        minHeight: "100vh",

        background:
          "radial-gradient(circle at top,#0f172a,#020617)",

        color: "white",

        padding: 24,
      }}
    >
      <div
        style={{
          maxWidth: 1700,

          margin: "0 auto",

          display: "flex",

          gap: 28,
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: "flex",

              justifyContent:
                "space-between",

              alignItems: "center",

              marginBottom: 24,

              background:
                "rgba(255,255,255,0.05)",

              border:
                "1px solid rgba(255,255,255,0.08)",

              padding: 20,

              borderRadius: 20,
            }}
          >
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: 36,
                }}
              >
                ♟️ Dames
              </h1>

              <div
                style={{
                  marginTop: 8,
                  color:
                    "#9ca3af",
                }}
              >
                Match #{matchId}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 12,
              }}
            >
              <div
                style={{
                  padding:
                    "12px 18px",

                  borderRadius: 14,

                  background:
                    "rgba(255,255,255,0.06)",
                }}
              >
                {isMyTurn
                  ? "🟢 Ton tour"
                  : "⏳ Adversaire"}
              </div>

              <div
                style={{
                  padding:
                    "12px 18px",

                  borderRadius: 14,

                  background:
                    "rgba(255,255,255,0.06)",
                }}
              >
                ⚡ {ping}ms
              </div>

              <button
                onClick={
                  handleReport
                }
                disabled={
                  reporting
                }
                style={{
                  padding:
                    "12px 18px",

                  border: "none",

                  borderRadius: 14,

                  cursor:
                    "pointer",
                }}
              >
                🚨 Report
              </button>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 14,
              marginBottom: 24,
            }}
          >
            {[
              {
                label:
                  "Tes pièces",
                value:
                  boardStats.my,
              },

              {
                label:
                  "Tes rois",
                value:
                  boardStats.myKings,
              },

              {
                label:
                  "Adversaire",
                value:
                  boardStats.enemy,
              },

              {
                label:
                  "Rois ennemis",
                value:
                  boardStats.enemyKings,
              },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  flex: 1,

                  background:
                    "rgba(255,255,255,0.05)",

                  border:
                    "1px solid rgba(255,255,255,0.08)",

                  borderRadius: 18,

                  padding: 18,
                }}
              >
                <div
                  style={{
                    color:
                      "#9ca3af",

                    marginBottom: 8,
                  }}
                >
                  {s.label}
                </div>

                <div
                  style={{
                    fontSize: 30,
                    fontWeight: 700,
                  }}
                >
                  {s.value}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              display:
                "inline-block",

              padding: 18,

              borderRadius: 24,

              background:
                "linear-gradient(145deg,#111827,#1f2937)",
            }}
          >
            <div ref={boardRef}>
              {board.map(
                (row, r) => (
                  <div
                    key={r}
                    style={{
                      display:
                        "flex",
                    }}
                  >
                    {row.map(
                      (
                        cell,
                        c
                      ) => {
                        const key =
                          `${r}-${c}`;

                        const isSelected =
                          selected?.r ===
                            r &&
                          selected?.c ===
                            c;

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
                                r &&
                              lastMove
                                .from
                                ?.c ===
                                c
                            ) ||
                            lastMove.path?.some(
                              (
                                p
                              ) =>
                                p.r ===
                                  r &&
                                p.c ===
                                  c
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
                            r={r}
                            c={c}
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
                          />
                        );
                      }
                    )}
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        <div
          style={{
            width: 380,
            height: 820,

            background:
              "linear-gradient(180deg,#0f172a,#111827)",

            borderRadius: 24,

            padding: 18,

            display: "flex",

            flexDirection:
              "column",
          }}
        >
          <div
            ref={chatRef}
            style={{
              flex: 1,
              overflowY: "auto",
            }}
          >
            {messages.map(
              (m, i) => (
                <div
                  key={i}
                  style={{
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      opacity: 0.8,
                    }}
                  >
                    {m.username}
                  </div>

                  <div>
                    {m.text}
                  </div>
                </div>
              )
            )}

            {typingPlayer && (
              <div
                style={{
                  color:
                    "#9ca3af",
                  fontSize: 13,
                }}
              >
                ✍️{" "}
                {
                  typingPlayer
                }{" "}
                écrit...
              </div>
            )}
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              marginTop: 14,
            }}
          >
            <input
              value={chatInput}
              maxLength={
                MAX_CHAT_LENGTH
              }
              onChange={
                handleTyping
              }
              placeholder="Écrire..."
              onKeyDown={(
                e
              ) => {
                if (
                  e.key ===
                  "Enter"
                ) {
                  e.preventDefault();

                  sendMessage();
                }
              }}
              style={{
                flex: 1,

                border: "none",

                outline: "none",

                borderRadius: 14,

                padding:
                  "14px 16px",

                background:
                  "#0b1220",

                color:
                  "white",
              }}
            />

            <button
              onClick={
                sendMessage
              }
              style={{
                width: 54,

                border: "none",

                borderRadius: 14,

                cursor:
                  "pointer",
              }}
            >
              ➤
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}