// ============================================================
// CHAT
// ============================================================

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  connectChatSocket,
  disconnectChatSocket,
  joinConversation,
  leaveConversation,
  sendMessage,
  markMessagesAsRead,
  checkUserPresence,
  onNewMessage,
  onMessageSent,
  onMessageError,
  onConversationMessage,
  onUserOnline,
  onUserOffline,
  onPresenceReady,
  onPresenceResult,
  onConversationJoined,
  onConversationError,
  onMessagesRead,
} from "../services/chatSocket";

import "./Chat.css";

// ============================================================
// CONFIG
// ============================================================

const API_URL =
  import.meta.env.VITE_API_URL || "";

// ============================================================
// TOKEN
// ============================================================

function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    null
  );
}

// ============================================================
// CURRENT USER ID
// ============================================================
//
// Le backend identifie l'expéditeur avec senderId.
// Le frontend doit donc connaître l'utilisateur connecté.
//
// ============================================================

function getCurrentUserId() {
  const token = getToken();

  if (!token) {
    return null;
  }

  try {
    const parts = token.split(".");

    if (parts.length !== 3) {
      return null;
    }

    const payload = JSON.parse(
      atob(
        parts[1]
          .replace(/-/g, "+")
          .replace(/_/g, "/")
      )
    );

    const rawId =
      payload.id ??
      payload.userId ??
      payload.user_id ??
      payload.sub ??
      null;

    const userId = Number(rawId);

    return Number.isInteger(userId) && userId > 0
      ? userId
      : null;
      
    } catch (error) {
      console.error(
        "CHAT JWT ERROR:",
        error
      );

      return null;
    }
  }

// ============================================================
// API
// ============================================================

async function apiRequest(
  endpoint,
  options = {}
) {
  const token = getToken();

  const response = await fetch(
    `${API_URL}${endpoint}`,
    {
      ...options,

      headers: {
        "Content-Type":
          "application/json",

        ...(token
          ? {
              Authorization:
                `Bearer ${token}`,
            }
          : {}),

        ...(options.headers || {}),
      },
    }
  );

  const data =
    await response
      .json()
      .catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error ||
        data.message ||
        "Une erreur est survenue."
    );
  }

  return data;
}

// ============================================================
// FORMAT DATE
// ============================================================

function formatTime(date) {
  if (!date) {
    return "";
  }

  const value =
    new Date(date);

  if (
    Number.isNaN(
      value.getTime()
    )
  ) {
    return "";
  }

  return value.toLocaleTimeString(
    "fr-FR",
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

// ============================================================
// FORMAT NOM
// ============================================================

function getContactName(
  contact
) {
  if (!contact) {
    return "Utilisateur";
  }

  return (
    contact.name ||
    [
      contact.firstName,
      contact.lastName,
    ]
      .filter(Boolean)
      .join(" ") ||
    contact.username ||
    contact.phone ||
    "Utilisateur"
  );
}

// ============================================================
// NORMALISATION ID
// ============================================================

function sameId(a, b) {
  if (
    a === null ||
    a === undefined ||
    b === null ||
    b === undefined
  ) {
    return false;
  }

  return Number(a) === Number(b);
}

// ============================================================
// COMPONENT
// ============================================================

export default function Chat() {
  // ----------------------------------------------------------
  // CURRENT USER
  // ----------------------------------------------------------

  const [
    currentUserId,
    setCurrentUserId,
  ] = useState(
    () => getCurrentUserId()
  );

  // ----------------------------------------------------------
  // UI
  // ----------------------------------------------------------

  const [
    selectedConversation,
    setSelectedConversation,
  ] = useState(null);

  const [
    showNewConversation,
    setShowNewConversation,
  ] = useState(false);

  // ----------------------------------------------------------
  // DATA
  // ----------------------------------------------------------

  const [
    conversations,
    setConversations,
  ] = useState([]);

  const [
    messages,
    setMessages,
  ] = useState([]);

  // ----------------------------------------------------------
  // FORM
  // ----------------------------------------------------------

  const [
    phone,
    setPhone,
  ] = useState("");

  const [
    message,
    setMessage,
  ] = useState("");

  // ----------------------------------------------------------
  // STATES
  // ----------------------------------------------------------

  const [
    loadingConversations,
    setLoadingConversations,
  ] = useState(true);

  const [
    loadingMessages,
    setLoadingMessages,
  ] = useState(false);

  const [
    searchingContact,
    setSearchingContact,
  ] = useState(false);

  const [
    sending,
    setSending,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    socketConnected,
    setSocketConnected,
  ] = useState(false);

  // ----------------------------------------------------------
  // PRESENCE
  // ----------------------------------------------------------

  const [
    onlineUsers,
    setOnlineUsers,
  ] = useState(
    () => new Set()
  );

  // ----------------------------------------------------------
  // REFS
  // ----------------------------------------------------------

  const messagesEndRef =
    useRef(null);

  const selectedConversationRef =
    useRef(null);

  // ==========================================================
  // REFRESH CURRENT USER
  // ==========================================================

  useEffect(() => {
    setCurrentUserId(
      getCurrentUserId()
    );
  }, []);

  // ==========================================================
  // SCROLL
  // ==========================================================

  const scrollToBottom =
    useCallback(() => {
      messagesEndRef.current?.scrollIntoView(
        {
          behavior: "smooth",
        }
      );
    }, []);

  useEffect(() => {
    scrollToBottom();
  }, [
    messages,
    scrollToBottom,
  ]);

  // ==========================================================
  // CHARGER CONVERSATIONS
  // ==========================================================

  const loadConversations =
    useCallback(
      async () => {
        try {
          setLoadingConversations(
            true
          );

          setError("");

          const data =
            await apiRequest(
              "/conversations"
            );

          setConversations(
            Array.isArray(
              data.conversations
            )
              ? data.conversations
              : []
          );
        } catch (err) {
          console.error(
            "CHAT CONVERSATIONS ERROR:",
            err
          );

          setError(
            err.message ||
              "Impossible de charger les conversations."
          );
        } finally {
          setLoadingConversations(
            false
          );
        }
      },
      []
    );

  // ==========================================================
  // INITIALISATION SOCKET
  // ==========================================================

  useEffect(() => {
    const socket =
      connectChatSocket();

    if (!socket) {
      setSocketConnected(false);
      return undefined;
    }

    const handleConnect =
      () => {
        setSocketConnected(true);

        console.log(
          "💬 CHAT: connexion établie."
        );
      };

    const handleDisconnect =
      () => {
        setSocketConnected(false);

        console.log(
          "💬 CHAT: connexion interrompue."
        );
      };

    socket.on(
      "connect",
      handleConnect
    );

    socket.on(
      "disconnect",
      handleDisconnect
    );

    setSocketConnected(
      socket.connected
    );

    return () => {
      socket.off(
        "connect",
        handleConnect
      );

      socket.off(
        "disconnect",
        handleDisconnect
      );

      disconnectChatSocket();
    };
  }, []);

  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    loadConversations();
  }, [
    loadConversations,
  ]);

  // ==========================================================
  // PRESENCE DES CONTACTS
  // ==========================================================

  useEffect(() => {
    if (
      !socketConnected ||
      conversations.length === 0
    ) {
      return;
    }

    conversations.forEach(
      (conversation) => {
        const contactId =
          conversation.contact?.id;

        if (
          contactId === null ||
          contactId === undefined
        ) {
          return;
        }

        checkUserPresence(
          contactId
        );
      }
    );
  }, [
    socketConnected,
    conversations,
  ]);

  // ==========================================================
  // SOCKET EVENTS
  // ==========================================================

  useEffect(() => {
    // --------------------------------------------------------
    // MESSAGE NEW
    // --------------------------------------------------------

    const cleanupNewMessage =
      onNewMessage(
        (incoming) => {
          if (!incoming) {
            return;
          }

          loadConversations();

          const activeConversation =
            selectedConversationRef.current;

          if (
            !activeConversation ||
            !sameId(
              incoming.conversationId,
              activeConversation.id
            )
          ) {
            return;
          }

          setMessages(
            (current) => {
              if (
                current.some(
                  (item) =>
                    sameId(
                      item.id,
                      incoming.id
                    )
                )
              ) {
                return current;
              }

              return [
                ...current,
                incoming,
              ];
            }
          );

          // Si la conversation est ouverte,
          // le nouveau message est immédiatement lu.
          markMessagesAsRead(
            incoming.conversationId
          );
        }
      );

    // --------------------------------------------------------
    // CONVERSATION MESSAGE
    // --------------------------------------------------------

    const cleanupConversationMessage =
      onConversationMessage(
        (incoming) => {
          if (!incoming) {
            return;
          }

          loadConversations();

          const activeConversation =
            selectedConversationRef.current;

          if (
            !activeConversation ||
            !sameId(
              incoming.conversationId,
              activeConversation.id
            )
          ) {
            return;
          }

          setMessages(
            (current) => {
              if (
                current.some(
                  (item) =>
                    sameId(
                      item.id,
                      incoming.id
                    )
                )
              ) {
                return current;
              }

              return [
                ...current,
                incoming,
              ];
            }
          );

          markMessagesAsRead(
            incoming.conversationId
          );
        }
      );

    // --------------------------------------------------------
    // MESSAGE SENT
    // --------------------------------------------------------

    const cleanupSent =
      onMessageSent(
        (payload) => {
          setSending(false);

          loadConversations();

          // Le backend peut renvoyer le message
          // dans la confirmation message:sent.
          const sentMessage =
            payload?.message ||
            payload;

          if (
            !sentMessage ||
            sentMessage.id ===
              undefined
          ) {
            return;
          }

          const activeConversation =
            selectedConversationRef.current;

          if (
            !activeConversation ||
            !sameId(
              sentMessage.conversationId,
              activeConversation.id
            )
          ) {
            return;
          }

          setMessages(
            (current) => {
              if (
                current.some(
                  (item) =>
                    sameId(
                      item.id,
                      sentMessage.id
                    )
                )
              ) {
                return current;
              }

              return [
                ...current,
                sentMessage,
              ];
            }
          );
        }
      );

    // --------------------------------------------------------
    // MESSAGE ERROR
    // --------------------------------------------------------

    const cleanupError =
      onMessageError(
        (payload) => {
          setSending(false);

          setError(
            payload?.error ||
              payload?.message ||
              "Impossible d'envoyer le message."
          );
        }
      );

    // --------------------------------------------------------
    // USER ONLINE
    // --------------------------------------------------------

    const cleanupOnline =
      onUserOnline(
        (payload) => {
          const userId =
            payload?.userId;

          if (
            userId === null ||
            userId === undefined
          ) {
            return;
          }

          setOnlineUsers(
            (current) => {
              const next =
                new Set(current);

              next.add(
                Number(userId)
              );

              return next;
            }
          );
        }
      );

    // --------------------------------------------------------
    // USER OFFLINE
    // --------------------------------------------------------

    const cleanupOffline =
      onUserOffline(
        (payload) => {
          const userId =
            payload?.userId;

          if (
            userId === null ||
            userId === undefined
          ) {
            return;
          }

          setOnlineUsers(
            (current) => {
              const next =
                new Set(current);

              next.delete(
                Number(userId)
              );

              return next;
            }
          );
        }
      );

    // --------------------------------------------------------
    // PRESENCE READY
    // --------------------------------------------------------

    const cleanupPresenceReady =
      onPresenceReady(
        (payload) => {
          const userId =
            payload?.userId;

          if (
            userId === null ||
            userId === undefined
          ) {
            return;
          }

          setOnlineUsers(
            (current) => {
              const next =
                new Set(current);

              next.add(
                Number(userId)
              );

              return next;
            }
          );
        }
      );

    // --------------------------------------------------------
    // PRESENCE RESULT
    // --------------------------------------------------------

    const cleanupPresenceResult =
      onPresenceResult(
        (payload) => {
          const userId =
            payload?.userId;

          if (
            userId === null ||
            userId === undefined
          ) {
            return;
          }

          const online =
            payload?.online === true ||
            payload?.isOnline === true;

          setOnlineUsers(
            (current) => {
              const next =
                new Set(current);

              if (online) {
                next.add(
                  Number(userId)
                );
              } else {
                next.delete(
                  Number(userId)
                );
              }

              return next;
            }
          );
        }
      );

    // --------------------------------------------------------
    // CONVERSATION JOINED
    // --------------------------------------------------------

    const cleanupConversationJoined =
      onConversationJoined(
        () => {
          // Événement informatif.
          // Le chargement des messages est déjà
          // assuré par l'API REST.
        }
      );

    // --------------------------------------------------------
    // CONVERSATION ERROR
    // --------------------------------------------------------

    const cleanupConversationError =
      onConversationError(
        (payload) => {
          setError(
            payload?.error ||
              payload?.message ||
              "Erreur de conversation."
          );
        }
      );

    // --------------------------------------------------------
    // READ
    // --------------------------------------------------------

    const cleanupRead =
      onMessagesRead(
        (payload) => {
          const activeConversation =
            selectedConversationRef.current;

          if (
            !activeConversation ||
            !sameId(
              payload?.conversationId,
              activeConversation.id
            )
          ) {
            return;
          }

          const messageIds =
            Array.isArray(
              payload?.messageIds
            )
              ? payload.messageIds
              : [];

          setMessages(
            (current) =>
              current.map(
                (item) => {
                  const shouldMarkRead =
                    messageIds.some(
                      (id) =>
                        sameId(
                          id,
                          item.id
                        )
                    );

                  if (
                    !shouldMarkRead
                  ) {
                    return item;
                  }

                  return {
                    ...item,
                    read: true,
                  };
                }
              )
          );
        }
      );

    // --------------------------------------------------------
    // CLEANUP
    // --------------------------------------------------------

    return () => {
      cleanupNewMessage?.();
      cleanupConversationMessage?.();
      cleanupSent?.();
      cleanupError?.();
      cleanupOnline?.();
      cleanupOffline?.();
      cleanupPresenceReady?.();
      cleanupPresenceResult?.();
      cleanupConversationJoined?.();
      cleanupConversationError?.();
      cleanupRead?.();
    };
  }, [
    loadConversations,
  ]);

  // ==========================================================
  // OUVRIR CONVERSATION
  // ==========================================================

  const openConversation =
    async (conversation) => {
      if (!conversation) {
        return;
      }

      // ------------------------------------------------------
      // Quitter l'ancienne room
      // ------------------------------------------------------

      const previousConversation =
        selectedConversationRef.current;

      if (
        previousConversation &&
        !sameId(
          previousConversation.id,
          conversation.id
        )
      ) {
        leaveConversation(
          previousConversation.id
        );
      }

      // ------------------------------------------------------
      // Définir la conversation active
      // ------------------------------------------------------

      setSelectedConversation(
        conversation
      );

      selectedConversationRef.current =
        conversation;

      setMessages([]);

      setLoadingMessages(true);

      setError("");

      try {
        // ----------------------------------------------------
        // Historique REST
        // ----------------------------------------------------

        const data =
          await apiRequest(
            `/conversations/${conversation.id}/messages`
          );

        console.log(
          "💬 CHAT HISTORY RESPONSE:",
          {
            conversationId: conversation.id,
            data,
            messages: data?.messages,
            count: Array.isArray(data?.messages)
              ? data.messages.length
              : 0,
          }
        );

        const history =
          Array.isArray(data?.messages)
            ? data.messages
            : [];

        setMessages(history);

        // ----------------------------------------------------
        // Room Socket.IO
        // ----------------------------------------------------

        if (socketConnected) {
          joinConversation(
            conversation.id
          );

          markMessagesAsRead(
            conversation.id
          );
        }
      } catch (err) {
        console.error(
          "OPEN CONVERSATION ERROR:",
          err
        );

        setError(
          err.message ||
            "Impossible de charger cette conversation."
        );
      } finally {
        setLoadingMessages(false);
      }
    };

  // ==========================================================
  // NOUVELLE CONVERSATION
  // ==========================================================

  const startNewConversation =
    async () => {
      const cleanPhone =
        phone.trim();

      if (!cleanPhone) {
        setError(
          "Insérez le numéro du contact."
        );

        return;
      }

      try {
        setSearchingContact(true);

        setError("");

        // ----------------------------------------------------
        // Le backend crée ou récupère la conversation.
        // Contrat :
        // POST /conversations
        // { phone }
        // ----------------------------------------------------

        const data =
          await apiRequest(
            "/conversations",
            {
              method: "POST",

              body: JSON.stringify({
                phone: cleanPhone,
              }),
            }
          );

        const conversation =
          data.conversation;

        if (!conversation) {
          throw new Error(
            "Le backend n'a pas retourné la conversation."
          );
        }

        setPhone("");

        setShowNewConversation(
          false
        );

        await loadConversations();

        await openConversation(
          conversation
        );
      } catch (err) {
        console.error(
          "NEW CONVERSATION ERROR:",
          err
        );

        setError(
          err.message ||
            "Impossible de démarrer la conversation."
        );
      } finally {
        setSearchingContact(false);
      }
    };

  // ==========================================================
  // ENVOYER MESSAGE
  // ==========================================================

  const handleSendMessage =
    () => {
      const cleanMessage =
        message.trim();

      if (!cleanMessage) {
        return;
      }

      if (
        !selectedConversation
      ) {
        return;
      }

      if (!socketConnected) {
        setError(
          "La connexion temps réel est indisponible."
        );

        return;
      }

      setSending(true);

      setError("");

      // ------------------------------------------------------
      // Contrat Socket.IO :
      // message:send
      // {
      //   conversationId,
      //   content
      // }
      // ------------------------------------------------------

      const sent =
        sendMessage(
          selectedConversation.id,
          cleanMessage
        );

      if (!sent) {
        setSending(false);

        setError(
          "Impossible d'envoyer le message."
        );

        return;
      }

      setMessage("");
    };

  // ==========================================================
  // ENTER
  // ==========================================================

  const handleMessageKeyDown =
    (event) => {
      if (
        event.key === "Enter" &&
        !event.shiftKey
      ) {
        event.preventDefault();

        handleSendMessage();
      }
    };

  // ==========================================================
  // RETOUR
  // ==========================================================

  const handleBack =
    () => {
      const conversation =
        selectedConversationRef.current;

      if (conversation) {
        leaveConversation(
          conversation.id
        );
      }

      setSelectedConversation(
        null
      );

      selectedConversationRef.current =
        null;

      setMessages([]);

      setMessage("");

      setSending(false);

      setError("");

      loadConversations();
    };

  // ==========================================================
  // CONTACT ONLINE
  // ==========================================================

  const isContactOnline =
    (contactId) => {
      if (
        contactId === null ||
        contactId === undefined
      ) {
        return false;
      }

      return onlineUsers.has(
        Number(contactId)
      );
    };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="chat-page">

      {/* ====================================================
          HEADER
      ==================================================== */}

      <header className="chat-header">
        <div>
          <h1>
            Messages
          </h1>

          <span
            className={`chat-connection ${
              socketConnected
                ? "is-online"
                : "is-offline"
            }`}
          >
            <span className="chat-connection-dot" />

            {socketConnected
              ? "Connecté"
              : "Hors connexion"}
          </span>
        </div>

        {!selectedConversation && (
          <button
            type="button"
            className="chat-new-button"
            onClick={() =>
              setShowNewConversation(
                true
              )
            }
          >
            <span>＋</span>
            Nouvelle conversation
          </button>
        )}
      </header>

      {/* ====================================================
          ERROR
      ==================================================== */}

      {error && (
        <div className="chat-error">
          {error}

          <button
            type="button"
            onClick={() =>
              setError("")
            }
            aria-label="Fermer"
          >
            ×
          </button>
        </div>
      )}

      {/* ====================================================
          NEW CONVERSATION
      ==================================================== */}

      {showNewConversation &&
        !selectedConversation && (
          <section className="chat-new-panel">

            <div className="chat-new-panel-header">
              <div>
                <h2>
                  Nouvelle conversation
                </h2>

                <p>
                  Insérez le numéro que
                  vous voulez contacter
                </p>
              </div>

              <button
                type="button"
                className="chat-close-button"
                onClick={() => {
                  setShowNewConversation(
                    false
                  );

                  setPhone("");
                }}
              >
                ×
              </button>
            </div>

            <label className="chat-field">
              <span>
                Contact :
              </span>

              <input
                type="tel"
                value={phone}
                onChange={(event) =>
                  setPhone(
                    event.target.value
                  )
                }
                placeholder="+243 987654321"
                autoComplete="tel"
                autoFocus
                onKeyDown={(event) => {
                  if (
                    event.key ===
                    "Enter"
                  ) {
                    startNewConversation();
                  }
                }}
              />
            </label>

            <button
              type="button"
              className="chat-start-button"
              onClick={
                startNewConversation
              }
              disabled={
                searchingContact
              }
            >
              {searchingContact
                ? "Recherche..."
                : "Démarrer la conversation"}
            </button>

          </section>
        )}

      {/* ====================================================
          MAIN
      ==================================================== */}

      <main className="chat-main">

        {/* ==================================================
            CONVERSATION LIST
        ================================================== */}

        {!selectedConversation && (
          <section className="chat-conversation-list">

            {loadingConversations ? (
              <div className="chat-empty">
                Chargement...
              </div>
            ) : conversations.length ===
              0 ? (
              <div className="chat-empty">

                <div className="chat-empty-icon">
                  💬
                </div>

                <h2>
                  Aucune conversation
                </h2>

                <p>
                  Pour discuter avec
                  quelqu'un, utilisez
                  son numéro de téléphone.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    setShowNewConversation(
                      true
                    )
                  }
                >
                  ＋ Nouvelle conversation
                </button>

              </div>
            ) : (
              conversations.map(
                (conversation) => {
                  const contact =
                    conversation.contact;

                  const online =
                    isContactOnline(
                      contact?.id
                    );

                  return (
                    <button
                      type="button"
                      key={
                        conversation.id
                      }
                      className="chat-conversation"
                      onClick={() =>
                        openConversation(
                          conversation
                        )
                      }
                    >

                      <div className="chat-avatar">
                        {getContactName(
                          contact
                        )
                          .charAt(0)
                          .toUpperCase()}

                        {online && (
                          <span className="chat-avatar-online" />
                        )}
                      </div>

                      <div className="chat-conversation-info">

                        <div className="chat-conversation-top">
                          <strong>
                            {getContactName(
                              contact
                            )}
                          </strong>

                          {conversation.lastMessageAt && (
                            <time>
                              {formatTime(
                                conversation.lastMessageAt
                              )}
                            </time>
                          )}
                        </div>

                        <div className="chat-conversation-bottom">

                          <span className="chat-phone">
                            {contact?.phone ||
                              ""}
                          </span>

                          {conversation.lastMessage && (
                            <span className="chat-last-message">
                              {
                                conversation.lastMessage
                              }
                            </span>
                          )}

                        </div>

                      </div>

                    </button>
                  );
                }
              )
            )}

          </section>
        )}

        {/* ==================================================
            CONVERSATION
        ================================================== */}

        {selectedConversation && (
          <section className="chat-window">

            {/* ================================================
                CHAT HEADER
            ================================================ */}

            <header className="chat-window-header">

              <button
                type="button"
                className="chat-back-button"
                onClick={
                  handleBack
                }
                aria-label="Retour"
              >
                ←
              </button>

              <div className="chat-window-avatar">
                {getContactName(
                  selectedConversation.contact
                )
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div className="chat-window-contact">

                <strong>
                  {getContactName(
                    selectedConversation.contact
                  )}
                </strong>

                <span>
                  {selectedConversation.contact
                    ?.phone ||
                    ""}

                  {" · "}

                  {isContactOnline(
                    selectedConversation
                      .contact?.id
                  ) ? (
                    <>
                      <i className="chat-status-online" />
                      En ligne
                    </>
                  ) : (
                    "Hors ligne"
                  )}
                </span>

              </div>

            </header>

            {/* ================================================
                MESSAGES
            ================================================ */}

            <div className="chat-messages">

              {loadingMessages ? (
                <div className="chat-empty">
                  Chargement des messages...
                </div>
              ) : messages.length ===
                0 ? (
                <div className="chat-empty chat-empty-conversation">

                  <div className="chat-empty-icon">
                    👋
                  </div>

                  <h2>
                    Aucun message
                  </h2>

                  <p>
                    Commencez la
                    conversation.
                  </p>

                </div>
              ) : (
                messages.map(
                  (item) => {
                    // ------------------------------------------------
                    // IMPORTANT :
                    // le backend fournit senderId.
                    // On compare avec currentUserId.
                    // ------------------------------------------------

                    const senderId =
                      item.senderId ??
                      item.sender_id ??
                      item.userId ??
                      item.user_id ??
                      item.sender?.id ??
                      null;

                    const mine =
                      sameId(
                        senderId,
                        currentUserId
                      );

                    const isRead =
                      item.read === true;

                    return (
                      <div
                        key={item.id}
                        className={`chat-message-row ${
                          mine
                            ? "is-mine"
                            : "is-theirs"
                        }`}
                      >
                        <div className="chat-message-bubble">

                          <div>
                            {item.deleted
                              ? "Message supprimé"
                              : item.content}
                          </div>

                          <time>
                            {formatTime(
                              item.createdAt
                            )}

                            {mine && (
                              <span
                                className={
                                  isRead
                                    ? "chat-read"
                                    : "chat-sent"
                                }
                              >
                                {isRead
                                  ? "✓✓"
                                  : "✓"}
                              </span>
                            )}
                          </time>

                        </div>
                      </div>
                    );
                  }
                )
              )}

              <div
                ref={
                  messagesEndRef
                }
              />

            </div>

            {/* ================================================
                COMPOSER
            ================================================ */}

            <footer className="chat-composer">

              <textarea
                value={message}
                onChange={(event) =>
                  setMessage(
                    event.target.value
                  )
                }
                onKeyDown={
                  handleMessageKeyDown
                }
                placeholder="Écrire un message..."
                maxLength={5000}
                rows={1}
                disabled={
                  !socketConnected ||
                  sending
                }
              />

              <button
                type="button"
                onClick={
                  handleSendMessage
                }
                disabled={
                  !message.trim() ||
                  !socketConnected ||
                  sending
                }
                aria-label="Envoyer"
              >
                {sending
                  ? "..."
                  : "➤"}
              </button>

            </footer>

          </section>
        )}

      </main>
    </div>
  );
}