import React, { useCallback, useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import api from "../services/api";
import "./Assistant.css";

const SESSION_KEY = "6betball_ai_chat_session";
const CONVERSATION_KEY = "6betball_ai_chat_conversation";
const MAX_MESSAGE_LENGTH = 4000;

function readStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    if (value !== null && value !== undefined && value !== "") {
      localStorage.setItem(key, String(value));
    } else {
      localStorage.removeItem(key);
    }
  } catch {
    // Le chat reste utilisable si le stockage est indisponible.
  }
}

function getErrorMessage(error) {
  const responseData =
    error?.response?.data ||
    error?.originalError?.response?.data;

  if (responseData?.error) {
    return responseData.error;
  }

  if (error?.timeout) {
    return "Le serveur met trop de temps à répondre. Réessaie.";
  }

  if (error?.network || !error?.originalError?.response) {
    return "Connexion impossible. Vérifie le réseau et le serveur.";
  }

  return (
    error?.message ||
    "L'assistance est momentanément indisponible. Réessaie."
  );
}

function normalizeId(value) {
  const id = Number(value);

  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export default function Assistant({ user = null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [conversationId, setConversationId] = useState(null);

  const [sessionToken, setSessionToken] = useState(
    () => readStorage(SESSION_KEY)
  );

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const [loadingHistory, setLoadingHistory] = useState(false);
  const [sending, setSending] = useState(false);

  const [error, setError] = useState("");
  const [serviceAvailable, setServiceAvailable] = useState(true);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Empêche plusieurs initialisations simultanées.
  const initializingRef = useRef(false);

  // Empêche une boucle infinie si le chargement échoue.
  const initializationAttemptedRef = useRef(false);

  const userId = normalizeId(
    user?.id ?? user?.userId ?? user?.user_id
  );

  const username =
    user?.username ||
    user?.userName ||
    user?.name ||
    user?.pseudo ||
    null;

  // Une conversation locale différente pour chaque utilisateur connecté.
  const conversationStorageKey = userId
    ? `${CONVERSATION_KEY}_user_${userId}`
    : CONVERSATION_KEY;

  // ============================================================
  // AFFICHAGE
  // ============================================================

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending, scrollToBottom]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 150);

    return () => clearTimeout(timer);
  }, [isOpen]);

  // ============================================================
  // DISPONIBILITÉ DU SERVICE
  // ============================================================

  const checkService = useCallback(async () => {
    try {
      const response = await api.get("/chatball/status");

      setServiceAvailable(
        response.data?.data?.available !== false
      );

      return true;
    } catch {
      setServiceAvailable(false);
      return false;
    }
  }, []);

  // ============================================================
  // CHARGEMENT DE L'HISTORIQUE
  //
  // IMPORTANT :
  // Le backend accepte sessionToken dans req.query.
  // On n'envoie donc plus x-ai-chat-session dans les headers.
  // ============================================================

  const loadMessages = useCallback(
    async (id, token) => {
      const response = await api.get(
        `/chatball/conversations/${id}/messages`,
        {
          params:
            !userId && token
              ? { sessionToken: token }
              : {},
        }
      );

      if (!response.data?.success) {
        throw new Error(
          "Impossible de charger l'historique de conversation."
        );
      }

      const rows = response.data?.data;

      if (!Array.isArray(rows)) {
        throw new Error("Historique de conversation invalide.");
      }

      const formattedMessages = rows
        .filter(
          (item) =>
            item.role === "user" ||
            item.role === "assistant"
        )
        .map((item) => ({
          id: item.id,
          role: item.role,
          content: item.content,
          status: item.status,
          createdAt: item.created_at,
        }));

      setMessages(formattedMessages);

      return formattedMessages;
    },
    [userId]
  );

  // ============================================================
  // CRÉATION D'UNE CONVERSATION
  //
  // Le backend accepte sessionToken dans le corps JSON.
  // Le JWT de l'utilisateur connecté reste géré par services/api.
  // ============================================================

  const createConversation = useCallback(async () => {
    const existingToken = !userId ? sessionToken : null;

    const response = await api.post(
      "/chatball/conversations",
      existingToken
        ? { sessionToken: existingToken }
        : {}
    );

    const data = response.data?.data;

    if (
      !response.data?.success ||
      !data?.id
    ) {
      throw new Error(
        response.data?.error ||
          "Impossible de créer la conversation."
      );
    }

    const id = normalizeId(data.id);

    if (!id) {
      throw new Error(
        "Le serveur a retourné un identifiant de conversation invalide."
      );
    }

    const newToken = data.sessionToken || null;

    setConversationId(id);
    setSessionToken(newToken);

    writeStorage(conversationStorageKey, id);

    if (!userId) {
      writeStorage(SESSION_KEY, newToken);
    }

    setMessages([]);
    setError("");

    return {
      id,
      token: newToken,
    };
  }, [
    conversationStorageKey,
    sessionToken,
    userId,
  ]);

  // ============================================================
  // INITIALISATION
  //
  // - Restaure la conversation existante.
  // - Vérifie les droits d'accès à l'historique.
  // - Crée une conversation si nécessaire.
  // - Ne relance pas l'initialisation en boucle en cas d'erreur.
  // ============================================================

  const initializeConversation = useCallback(async () => {
    if (initializingRef.current) {
      return;
    }

    initializingRef.current = true;
    initializationAttemptedRef.current = true;

    setLoadingHistory(true);
    setError("");

    try {
      await checkService();

      let token = !userId ? sessionToken : null;

      const savedId = readStorage(conversationStorageKey);
      let id = normalizeId(savedId);

      if (id) {
        try {
          await loadMessages(id, token);

          setConversationId(id);

          return;
        } catch (historyError) {
          const status = historyError?.response?.status;

          // Ces statuts indiquent que l'ancienne conversation
          // ne peut plus être utilisée.
          if ([400, 401, 404, 409].includes(status)) {
            writeStorage(conversationStorageKey, null);

            if (!userId) {
              writeStorage(SESSION_KEY, null);

              token = null;
              setSessionToken(null);
            }
          } else {
            // Une erreur réseau ou CORS ne doit pas provoquer
            // la création répétée de conversations.
            throw historyError;
          }
        }
      }

      const created = await createConversation();

      await loadMessages(
        created.id,
        created.token
      );
    } catch (initError) {
      console.error(
        "[6BetBall Assistant] Erreur d'initialisation :",
        initError
      );

      setError(getErrorMessage(initError));
    } finally {
      setLoadingHistory(false);
      initializingRef.current = false;
    }
  }, [
    checkService,
    conversationStorageKey,
    createConversation,
    loadMessages,
    sessionToken,
    userId,
  ]);

  // ============================================================
  // OUVERTURE DU CHAT
  // ============================================================

  useEffect(() => {
    if (
      isOpen &&
      !conversationId &&
      !loadingHistory &&
      !initializationAttemptedRef.current
    ) {
      initializeConversation();
    }
  }, [
    isOpen,
    conversationId,
    loadingHistory,
    initializeConversation,
  ]);

  // ============================================================
  // ENVOI D'UN MESSAGE
  //
  // Le backend accepte :
  // - content
  // - clientMessageId
  // - sessionToken pour les visiteurs anonymes
  //
  // Aucun header x-ai-chat-session n'est nécessaire.
  // ============================================================

  const sendMessage = async (event) => {
    event?.preventDefault();

    const content = input.trim();

    if (
      !content ||
      sending ||
      loadingHistory
    ) {
      return;
    }

    if (content.length > MAX_MESSAGE_LENGTH) {
      setError(
        "Ton message ne peut pas dépasser 4 000 caractères."
      );
      return;
    }

    setError("");

    let activeConversationId = conversationId;
    let activeToken = !userId ? sessionToken : null;

    setSending(true);
    setInput("");

    const temporaryId = `temp-${Date.now()}`;

    setMessages((current) => [
      ...current,
      {
        id: temporaryId,
        role: "user",
        content,
        status: "sending",
        createdAt: new Date().toISOString(),
      },
    ]);

    try {
      // Créer une conversation uniquement si nécessaire.
      if (!activeConversationId) {
        const created = await createConversation();

        activeConversationId = created.id;
        activeToken = created.token;
      }

      const payload = {
        content,
        clientMessageId: uuidv4(),
      };

      if (!userId && activeToken) {
        payload.sessionToken = activeToken;
      }

      const response = await api.post(
        `/chatball/conversations/${activeConversationId}/messages`,
        payload
      );

      const data = response.data?.data;

      if (
        !response.data?.success ||
        !data?.reply ||
        typeof data.reply.content !== "string"
      ) {
        throw new Error(
          response.data?.error ||
            "La réponse de l'assistant est invalide."
        );
      }

      setMessages((current) => {
        const withoutTemporary = current.filter(
          (item) => item.id !== temporaryId
        );

        return [
          ...withoutTemporary,
          {
            id: data.message?.id || temporaryId,
            role: "user",
            content,
            status: "completed",
            createdAt:
              data.message?.created_at ||
              new Date().toISOString(),
          },
          {
            id: data.reply.id || `reply-${Date.now()}`,
            role: "assistant",
            content: data.reply.content,
            status: data.reply.status || "completed",
            createdAt:
              data.reply.created_at ||
              new Date().toISOString(),
          },
        ];
      });
    } catch (sendError) {
      console.error(
        "[6BetBall Assistant] Erreur d'envoi :",
        sendError
      );

      setMessages((current) =>
        current.map((item) =>
          item.id === temporaryId
            ? {
                ...item,
                status: "failed",
              }
            : item
        )
      );

      setInput(content);
      setError(getErrorMessage(sendError));
    } finally {
      setSending(false);

      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  };

  // ============================================================
  // NOUVELLE CONVERSATION
  // ============================================================

  const startNewConversation = async () => {
    if (sending || loadingHistory) {
      return;
    }

    initializationAttemptedRef.current = false;

    setMessages([]);
    setConversationId(null);
    setError("");

    writeStorage(conversationStorageKey, null);

    // On conserve le jeton anonyme : il identifie la session,
    // et le backend peut le réutiliser pour la nouvelle conversation.
    await initializeConversation();
  };

  // ============================================================
  // FORMATAGE DE L'HEURE
  // ============================================================

  const formatTime = (value) => {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ============================================================
  // INTERFACE
  // ============================================================

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          className="assistant-launcher"
          onClick={() => setIsOpen(true)}
          aria-label="Ouvrir l'assistance IA 6BetBall"
          title="Assistance IA"
        >
          <span
            className="assistant-launcher-icon"
            aria-hidden="true"
          >
            ✦
          </span>

          <span className="assistant-launcher-label">
            Assistance IA
          </span>

          <span className="assistant-launcher-dot" />
        </button>
      )}

      {isOpen && (
        <section
          className="assistant-panel"
          role="dialog"
          aria-modal="false"
          aria-label="6BetBall Assistance IA"
        >
          <header className="assistant-header">
            <div className="assistant-brand">
              <div
                className="assistant-avatar"
                aria-hidden="true"
              >
                ✦
              </div>

              <div className="assistant-brand-info">
                <strong>6BetBall Assistance</strong>

                <span className="assistant-online">
                  <span
                    className={`assistant-status-dot ${
                      serviceAvailable ? "" : "is-offline"
                    }`}
                  />

                  {serviceAvailable
                    ? "Assistant disponible"
                    : "Connexion à vérifier"}
                </span>
              </div>
            </div>

            <div className="assistant-header-actions">
              <button
                type="button"
                className="assistant-icon-button"
                onClick={startNewConversation}
                title="Nouvelle conversation"
                aria-label="Nouvelle conversation"
                disabled={sending || loadingHistory}
              >
                ↻
              </button>

              <button
                type="button"
                className="assistant-icon-button"
                onClick={() => {
                  setIsOpen(false);

                  // Autorise une nouvelle tentative à la prochaine
                  // ouverture si la précédente initialisation a échoué.
                  if (!conversationId) {
                    initializationAttemptedRef.current = false;
                  }
                }}
                title="Fermer"
                aria-label="Fermer l'assistance"
              >
                ×
              </button>
            </div>
          </header>

          <div className="assistant-welcome">
            <div className="assistant-welcome-icon">
              ✦
            </div>

            <h2>
              Bonjour{username ? ` ${username}` : ""} !
            </h2>

            <p>
              Bienvenue sur 6BetBall. Comment puis-je
              t'aider aujourd'hui ?
            </p>

            <div className="assistant-topics">
              <span>Dépôts</span>
              <span>Retraits</span>
              <span>Compte</span>
              <span>Jeux</span>
            </div>
          </div>

          <div
            className="assistant-messages"
            aria-live="polite"
            aria-relevant="additions text"
          >
            {loadingHistory && (
              <div className="assistant-loading">
                <span className="assistant-spinner" />
                Chargement de la conversation...
              </div>
            )}

            {!loadingHistory && messages.length === 0 && (
              <div className="assistant-empty">
                <p>
                  Pose-moi une question sur le fonctionnement
                  de 6BetBall.
                </p>

                <div className="assistant-suggestions">
                  {[
                    "Comment effectuer un dépôt ?",
                    "Comment retirer mon argent ?",
                    "Comment utiliser les jeux ?",
                  ].map((suggestion) => (
                    <button
                      type="button"
                      key={suggestion}
                      onClick={() => setInput(suggestion)}
                      disabled={sending}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`assistant-message-row ${
                  message.role === "user"
                    ? "is-user"
                    : "is-assistant"
                }`}
              >
                {message.role === "assistant" && (
                  <span className="assistant-message-avatar">
                    ✦
                  </span>
                )}

                <div className="assistant-message-content">
                  <div className="assistant-bubble">
                    {message.content}
                  </div>

                  <span className="assistant-message-time">
                    {message.status === "sending"
                      ? "Envoi..."
                      : message.status === "failed"
                      ? "Échec de l'envoi"
                      : formatTime(message.createdAt)}
                  </span>
                </div>
              </div>
            ))}

            {sending && (
              <div className="assistant-message-row is-assistant">
                <span className="assistant-message-avatar">
                  ✦
                </span>

                <div
                  className="assistant-typing"
                  aria-label="Réponse en cours"
                >
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {error && (
            <div
              className="assistant-error"
              role="alert"
            >
              <span>{error}</span>

              <button
                type="button"
                onClick={() => setError("")}
                aria-label="Masquer le message d'erreur"
              >
                ×
              </button>
            </div>
          )}

          <form
            className="assistant-composer"
            onSubmit={sendMessage}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Écris ton message..."
              aria-label="Ton message à l'assistant"
              maxLength={MAX_MESSAGE_LENGTH}
              rows={1}
              disabled={sending || loadingHistory}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey &&
                  !event.nativeEvent.isComposing
                ) {
                  event.preventDefault();
                  sendMessage(event);
                }
              }}
            />

            <button
              type="submit"
              className="assistant-send-button"
              disabled={
                !input.trim() ||
                sending ||
                loadingHistory
              }
              aria-label="Envoyer le message"
              title="Envoyer"
            >
              ➤
            </button>
          </form>

          <footer className="assistant-footer">
            <span>6BetBall · Assistance utilisateur</span>
            <span>
              Entrée pour envoyer · Maj + Entrée pour une ligne
            </span>
          </footer>
        </section>
      )}
    </>
  );
}