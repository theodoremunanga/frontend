import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import html2canvas from "html2canvas";

import {
  checkersSocket,
  sendCheckersMessage,
  sendCheckersTyping,
} from "../services/checkersSocket";

const MAX_MESSAGES = 100;
const MAX_CHAT_LENGTH = 300;

const API =
  import.meta.env.VITE_API_URL || "";

// ======================================================
// HELPERS
// ======================================================

function sanitizeText(
  text = "",
  max = MAX_CHAT_LENGTH
) {
  return String(text)
    .replace(
      /[\u0000-\u001F\u007F]/g,
      ""
    )
    .slice(0, max);
}

function normalizePlayerId(
  value
) {
  const id = Number(value);

  return id === 1 || id === 2
    ? id
    : null;
}

// ======================================================
// CHAT PANEL
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
                Aucun message pour
                le moment.
              </p>

              <small>
                Soyez courtois avec
                votre adversaire.
              </small>
            </div>
          ) : (
            messages.map(
              (message, index) => (
                <div
                  key={
                    message.id ??
                    `${index}-${message.text}`
                  }
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
            maxLength={
              MAX_CHAT_LENGTH
            }
            onChange={onChange}
            placeholder="Écrire un message..."
            onKeyDown={(event) => {
              if (
                event.key ===
                "Enter"
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
// MODERATION
// ======================================================

export default function DamesModeration({
  matchId,
  myPlayer,
  board,
  boardRef,
  token,
}) {
  const [
    chatOpen,
    setChatOpen,
  ] = useState(false);

  const [
    unreadMessages,
    setUnreadMessages,
  ] = useState(0);

  const [
    messages,
    setMessages,
  ] = useState([]);

  const [
    chatInput,
    setChatInput,
  ] = useState("");

  const [
    typingPlayer,
    setTypingPlayer,
  ] = useState(null);

  const [
    reporting,
    setReporting,
  ] = useState(false);

  const chatRef =
    useRef(null);

  const typingTimeout =
    useRef(null);

  // ====================================================
  // SOCKET CHAT
  // ====================================================

  useEffect(() => {
    if (!matchId) {
      return;
    }

    const handleMessage =
      (message) => {
        if (
          !message ||
          !message.text
        ) {
          return;
        }

        const safeMessage = {
          id:
            message.id ??
            message.messageId ??
            null,

          username:
            sanitizeText(
              message.username ??
                "—",
              80
            ),

          text:
            sanitizeText(
              message.text
            ),

          playerId:
            normalizePlayerId(
              message.playerId ??
                message.player
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
          (current) =>
            chatOpen
              ? current
              : current + 1
        );
      };

    const handleTyping =
      ({ username } = {}) => {
        if (!username) {
          return;
        }

        setTypingPlayer(
          sanitizeText(
            username,
            80
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

    checkersSocket.on(
      "chat:message",
      handleMessage
    );

    checkersSocket.on(
      "chat:typing",
      handleTyping
    );

    checkersSocket.on(
      "chat:error",
      handleChatError
    );

    return () => {
      checkersSocket.off(
        "chat:message",
        handleMessage
      );

      checkersSocket.off(
        "chat:typing",
        handleTyping
      );

      checkersSocket.off(
        "chat:error",
        handleChatError
      );

      clearTimeout(
        typingTimeout.current
      );
    };
  }, [
    matchId,
    chatOpen,
  ]);

  // ====================================================
  // SCROLL CHAT
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
  // SEND MESSAGE
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
  // INPUT / TYPING
  // ====================================================

  const handleTyping =
    useCallback(
      (event) => {
        const value =
          sanitizeText(
            event.target.value
          );

        setChatInput(value);

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
  //
  // Le signalement ne modifie jamais
  // le résultat de la partie.
  //
  // Il transmet les éléments nécessaires
  // à l'administration.
  // ====================================================

  const reportMatch =
    useCallback(
      async () => {
        if (
          reporting ||
          !boardRef?.current ||
          !matchId
        ) {
          return;
        }

        const reason =
          window.prompt(
            "Pourquoi souhaitez-vous signaler cette partie ?"
          );

        if (
          !reason ||
          !reason.trim()
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
            String(
              myPlayer ?? ""
            )
          );

          formData.append(
            "board",
            JSON.stringify(
              board ?? []
            )
          );

          formData.append(
            "description",
            sanitizeText(
              reason.trim(),
              1000
            )
          );

          const response =
            await fetch(
              `${API}/match/report`,
              {
                method: "POST",

                headers: {
                  ...(token
                    ? {
                        Authorization:
                          `Bearer ${token}`,
                      }
                    : {}),
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
            "CHECKERS REPORT ERROR:",
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
          setReporting(false);
        }
      },
      [
        reporting,
        boardRef,
        matchId,
        myPlayer,
        board,
        token,
      ]
    );

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <>
      {/* REPORT */}

      <button
        type="button"
        className="dames-report-button"
        onClick={reportMatch}
        disabled={reporting}
      >
        {reporting
          ? "..."
          : "🚨 Signaler"}
      </button>

      {/* CHAT FAB */}

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

        {unreadMessages > 0 && (
          <span className="dames-chat-badge">
            {unreadMessages > 9
              ? "9+"
              : unreadMessages}
          </span>
        )}
      </button>

      {/* CHAT */}

      {chatOpen && (
        <ChatPanel
          messages={messages}
          chatInput={chatInput}
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
            setChatOpen(false)
          }
          chatRef={chatRef}
        />
      )}
    </>
  );
}