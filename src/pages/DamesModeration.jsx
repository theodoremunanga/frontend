import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  checkersSocket,
  sendCheckersMessage,
  sendCheckersTyping,
  reportCheckersMatch,
} from "../services/checkersSocket";

const MAX_MESSAGES = 100;
const MAX_CHAT_LENGTH = 300;

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

function normalizePlayerId(value) {
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

        {/* HEADER */}
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

        {/* MESSAGES */}
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

        {/* COMPOSER */}
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

    // --------------------------------------------------
    // MESSAGE
    // --------------------------------------------------

    const handleMessage =
      (message = {}) => {
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
              ? 0
              : current + 1
        );
      };

    // --------------------------------------------------
    // TYPING
    // --------------------------------------------------

    const handleTyping =
      (data = {}) => {
        const username =
          data.username;

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

    // --------------------------------------------------
    // CHAT ERROR
    // --------------------------------------------------

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
  }, [
    chatOpen,
    messages,
  ]);

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
  // REPORT MATCH
  // ====================================================
  //
  // IMPORTANT :
  // - aucun changement du résultat
  // - aucun abandon
  // - aucun changement de tour
  // - aucun règlement de match
  //
  // Le signalement est simplement transmis
  // au backend via le socket.
  // ====================================================

  const reportMatch =
    useCallback(async () => {
      if (
        reporting ||
        !matchId ||
        !checkersSocket.connected
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

        const payload = {
          matchId: Number(matchId),

          playerSide:
            normalizePlayerId(
              myPlayer
            ),

          board:
            board ?? [],

          description:
            sanitizeText(
              reason.trim(),
              1000
            ),
        };

        reportCheckersMatch(
          payload
        );

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
    }, [
      reporting,
      matchId,
      myPlayer,
      board,
    ]);

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <>
      {/* ==================================================
          REPORT
          ================================================== */}

      <button
        type="button"
        className="dames-report-button"
        onClick={reportMatch}
        disabled={
          reporting ||
          !matchId
        }
      >
        {reporting
          ? "..."
          : "🚨 Signaler"}
      </button>

      {/* ==================================================
          CHAT FAB
          ================================================== */}

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

      {/* ==================================================
          CHAT
          ================================================== */}

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
