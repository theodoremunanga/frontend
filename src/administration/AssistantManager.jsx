
import React, { useCallback, useEffect, useState } from "react";
import api from "../services/api";
import "./AssistantManager.css";

const BASE = "/chatball/admin";

const emptyKnowledge = {
  category: "",
  title: "",
  content: "",
  keywords: "",
  language: "fr",
  is_active: true,
  is_verified: false,
};

function getErrorMessage(error) {
  return (
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.message ||
    "Une erreur est survenue."
  );
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("fr-FR");
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("fr-FR");
}

export default function AssistantManager() {
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [knowledge, setKnowledge] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0,
  });

  const [knowledgeQuery, setKnowledgeQuery] = useState("");
  const [conversationQuery, setConversationQuery] = useState("");
  const [conversationStatus, setConversationStatus] = useState("");
  const [knowledgeFilter, setKnowledgeFilter] = useState("all");

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyKnowledge);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [conversationMessages, setConversationMessages] = useState([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadStats = useCallback(async () => {
    const response = await api.get(`${BASE}/stats`);
    setStats(response.data?.data || null);
  }, []);

  const loadKnowledge = useCallback(async () => {
    const params = {
      q: knowledgeQuery || undefined,
      page: pagination.page,
      limit: pagination.limit,
    };

    if (knowledgeFilter === "active") params.active = true;
    if (knowledgeFilter === "inactive") params.active = false;
    if (knowledgeFilter === "verified") params.verified = true;
    if (knowledgeFilter === "unverified") params.verified = false;

    const response = await api.get(`${BASE}/knowledge`, { params });
    setKnowledge(response.data?.data || []);
    setPagination((old) => ({
      ...old,
      ...(response.data?.pagination || {}),
    }));
  }, [knowledgeQuery, knowledgeFilter, pagination.page, pagination.limit]);

  const loadConversations = useCallback(async () => {
    const response = await api.get(`${BASE}/conversations`, {
      params: {
        q: conversationQuery || undefined,
        status: conversationStatus || undefined,
        page: pagination.page,
        limit: pagination.limit,
      },
    });

    setConversations(response.data?.data || []);
    setPagination((old) => ({
      ...old,
      ...(response.data?.pagination || {}),
    }));
  }, [
    conversationQuery,
    conversationStatus,
    pagination.page,
    pagination.limit,
  ]);

  const refreshCurrent = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      if (tab === "overview") {
        await loadStats();
      } else if (tab === "knowledge") {
        await loadKnowledge();
      } else if (tab === "conversations") {
        await loadConversations();
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [tab, loadStats, loadKnowledge, loadConversations]);

  useEffect(() => {
    refreshCurrent();
  }, [refreshCurrent]);

  function changeTab(nextTab) {
    setTab(nextTab);
    setError("");
    setNotice("");
    setPagination((old) => ({ ...old, page: 1 }));
  }

  function startCreate() {
    setEditing(null);
    setForm({ ...emptyKnowledge });
    setError("");
    setNotice("");
  }

  function startEdit(item) {
    setEditing(item.id);
    setForm({
      category: item.category || "",
      title: item.title || "",
      content: item.content || "",
      keywords: Array.isArray(item.keywords)
        ? item.keywords.join(", ")
        : String(item.keywords || ""),
      language: item.language || "fr",
      is_active: Boolean(item.is_active),
      is_verified: Boolean(item.is_verified),
    });
    setError("");
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateForm(event) {
    const { name, value, type, checked } = event.target;
    setForm((old) => ({
      ...old,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function saveKnowledge(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    const payload = {
      ...form,
      keywords: form.keywords
        .split(",")
        .map((word) => word.trim())
        .filter(Boolean),
    };

    try {
      if (editing) {
        await api.put(`${BASE}/knowledge/${editing}`, payload);
        setNotice("Connaissance mise à jour.");
      } else {
        await api.post(`${BASE}/knowledge`, payload);
        setNotice("Connaissance ajoutée.");
      }

      setEditing(null);
      setForm({ ...emptyKnowledge });
      await loadKnowledge();
      await loadStats();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleKnowledge(item, field) {
    setError("");
    setNotice("");

    try {
      await api.patch(`${BASE}/knowledge/${item.id}/status`, {
        [field]: !item[field],
      });
      setNotice("Statut de la connaissance mis à jour.");
      await loadKnowledge();
      await loadStats();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function deleteKnowledge(item) {
    const confirmed = window.confirm(
      `Supprimer définitivement la connaissance « ${item.title} » ?`
    );

    if (!confirmed) return;

    setError("");
    setNotice("");

    try {
      await api.delete(`${BASE}/knowledge/${item.id}`);
      setNotice("Connaissance supprimée.");
      await loadKnowledge();
      await loadStats();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function openConversation(item) {
    setSelectedConversation(item);
    setConversationMessages([]);
    setError("");

    try {
      const response = await api.get(
        `${BASE}/conversations/${item.id}/messages`
      );

      const data = response.data?.data || {};
      setSelectedConversation(data.conversation || item);
      setConversationMessages(data.messages || []);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function changeConversationStatus(item) {
    const nextStatus = item.status === "open" ? "closed" : "open";

    setError("");
    setNotice("");

    try {
      await api.patch(`${BASE}/conversations/${item.id}/status`, {
        status: nextStatus,
      });

      setNotice(
        nextStatus === "closed"
          ? "Conversation fermée."
          : "Conversation rouverte."
      );

      await loadConversations();

      if (selectedConversation?.id === item.id) {
        setSelectedConversation((old) => ({
          ...old,
          status: nextStatus,
        }));
      }
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  function changePage(nextPage) {
    setPagination((old) => ({
      ...old,
      page: Math.max(1, nextPage),
    }));
  }

  return (
    <section className="assistant-manager">
      <header className="am-header">
        <div>
          <span className="am-eyebrow">6BETBALL · ADMINISTRATION</span>
          <h1>Gestion de Chatball IA</h1>
          <p>
            Contrôle des connaissances, suivi des échanges et surveillance
            du service d’assistance.
          </p>
        </div>

        <button
          type="button"
          className="am-button am-button-secondary"
          onClick={refreshCurrent}
          disabled={loading}
        >
          {loading ? "Actualisation…" : "↻ Actualiser"}
        </button>
      </header>

      <nav className="am-tabs" aria-label="Gestion de Chatball">
        <button
          className={tab === "overview" ? "active" : ""}
          onClick={() => changeTab("overview")}
        >
          Vue générale
        </button>
        <button
          className={tab === "knowledge" ? "active" : ""}
          onClick={() => changeTab("knowledge")}
        >
          Connaissances
        </button>
        <button
          className={tab === "conversations" ? "active" : ""}
          onClick={() => changeTab("conversations")}
        >
          Conversations
        </button>
      </nav>

      {error && (
        <div className="am-alert am-alert-error" role="alert">
          {error}
        </div>
      )}

      {notice && (
        <div className="am-alert am-alert-success" role="status">
          {notice}
        </div>
      )}

      {tab === "overview" && (
        <div className="am-overview">
          <div className="am-stat-grid">
            {[
              ["Conversations", stats?.total_conversations],
              ["En cours", stats?.open_conversations],
              ["Messages utilisateurs", stats?.user_messages],
              ["Réponses IA", stats?.assistant_messages],
              ["Connaissances", stats?.total_knowledge],
              ["Connaissances actives", stats?.active_knowledge],
              ["Connaissances vérifiées", stats?.verified_knowledge],
              ["Erreurs de traitement", stats?.failed_messages],
              ["Conversations · 24 h", stats?.conversations_last_24h],
            ].map(([label, value]) => (
              <article className="am-stat-card" key={label}>
                <span>{label}</span>
                <strong>{stats ? formatNumber(value) : "—"}</strong>
              </article>
            ))}
          </div>

          <div className="am-panel am-overview-note">
            <h2>Contrôle des connaissances</h2>
            <p>
              Pour qu’une information soit proposée au moteur actuel,
              elle doit être active, vérifiée et dans la langue prise en
              charge par le moteur.
            </p>
            <button
              className="am-button"
              onClick={() => changeTab("knowledge")}
            >
              Gérer les connaissances
            </button>
          </div>

          <div className="am-panel">
            <h2>Surveillance des échanges</h2>
            <p>
              Consulte les questions, les réponses enregistrées et les
              erreurs de traitement. Les conversations anonymes sont
              également listées.
            </p>
            <button
              className="am-button"
              onClick={() => changeTab("conversations")}
            >
              Voir les conversations
            </button>
          </div>
        </div>
      )}

      {tab === "knowledge" && (
        <div className="am-knowledge-layout">
          <form className="am-panel am-knowledge-form" onSubmit={saveKnowledge}>
            <div className="am-panel-heading">
              <div>
                <h2>{editing ? "Modifier une connaissance" : "Nouvelle connaissance"}</h2>
                <p>Les informations vérifiées peuvent alimenter les réponses de l’assistant.</p>
              </div>

              {editing && (
                <button
                  type="button"
                  className="am-text-button"
                  onClick={startCreate}
                >
                  Annuler
                </button>
              )}
            </div>

            <label>
              Catégorie *
              <input
                name="category"
                value={form.category}
                onChange={updateForm}
                required
                maxLength={120}
                placeholder="Ex. : comptes, jeux, paiements"
              />
            </label>

            <label>
              Titre *
              <input
                name="title"
                value={form.title}
                onChange={updateForm}
                required
                maxLength={255}
                placeholder="Titre clair et précis"
              />
            </label>

            <label>
              Contenu *
              <textarea
                name="content"
                value={form.content}
                onChange={updateForm}
                required
                maxLength={30000}
                rows={7}
                placeholder="Écris ici l'information que l'assistant doit connaître…"
              />
              <small>{form.content.length}/30000 caractères</small>
            </label>

            <label>
              Mots-clés
              <input
                name="keywords"
                value={form.keywords}
                onChange={updateForm}
                placeholder="compte, dépôt, retrait"
              />
              <small>Sépare les mots-clés par des virgules.</small>
            </label>

            <label>
              Langue
              <select
                name="language"
                value={form.language}
                onChange={updateForm}
              >
                <option value="fr">Français (fr)</option>
                <option value="en">Anglais (en)</option>
                <option value="sw">Swahili (sw)</option>
              </select>
            </label>

            <div className="am-checkbox-row">
              <label className="am-checkbox">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={form.is_active}
                  onChange={updateForm}
                />
                Connaissance active
              </label>

              <label className="am-checkbox">
                <input
                  type="checkbox"
                  name="is_verified"
                  checked={form.is_verified}
                  onChange={updateForm}
                />
                Connaissance vérifiée
              </label>
            </div>

            <button
              type="submit"
              className="am-button am-button-full"
              disabled={saving}
            >
              {saving
                ? "Enregistrement…"
                : editing
                  ? "Enregistrer les modifications"
                  : "Ajouter la connaissance"}
            </button>
          </form>

          <div className="am-panel am-knowledge-list">
            <div className="am-panel-heading">
              <div>
                <h2>Base de connaissances</h2>
                <p>{formatNumber(pagination.total)} résultat(s)</p>
              </div>
            </div>

            <div className="am-toolbar">
              <input
                value={knowledgeQuery}
                onChange={(e) => {
                  setKnowledgeQuery(e.target.value);
                  setPagination((old) => ({ ...old, page: 1 }));
                }}
                placeholder="Rechercher une connaissance…"
              />

              <select
                value={knowledgeFilter}
                onChange={(e) => {
                  setKnowledgeFilter(e.target.value);
                  setPagination((old) => ({ ...old, page: 1 }));
                }}
              >
                <option value="all">Toutes</option>
                <option value="active">Actives</option>
                <option value="inactive">Inactives</option>
                <option value="verified">Vérifiées</option>
                <option value="unverified">Non vérifiées</option>
              </select>
            </div>

            {knowledge.length === 0 && !loading ? (
              <div className="am-empty">Aucune connaissance trouvée.</div>
            ) : (
              <div className="am-knowledge-items">
                {knowledge.map((item) => (
                  <article className="am-knowledge-item" key={item.id}>
                    <div className="am-item-top">
                      <div>
                        <span className="am-category">{item.category}</span>
                        <h3>{item.title}</h3>
                      </div>
                      <span className="am-item-id">#{item.id}</span>
                    </div>

                    <p className="am-content-preview">{item.content}</p>

                    {Array.isArray(item.keywords) &&
                      item.keywords.length > 0 && (
                        <div className="am-keywords">
                          {item.keywords.map((word) => (
                            <span key={word}>{word}</span>
                          ))}
                        </div>
                      )}

                    <div className="am-status-row">
                      <span className={item.is_active ? "am-pill green" : "am-pill gray"}>
                        {item.is_active ? "Active" : "Inactive"}
                      </span>
                      <span className={item.is_verified ? "am-pill blue" : "am-pill amber"}>
                        {item.is_verified ? "Vérifiée" : "À vérifier"}
                      </span>
                      <span className="am-date">
                        Modifiée : {formatDate(item.updated_at)}
                      </span>
                    </div>

                    <div className="am-actions">
                      <button
                        className="am-button am-button-small am-button-secondary"
                        onClick={() => startEdit(item)}
                      >
                        Modifier
                      </button>
                      <button
                        className="am-button am-button-small am-button-secondary"
                        onClick={() => toggleKnowledge(item, "is_active")}
                      >
                        {item.is_active ? "Désactiver" : "Activer"}
                      </button>
                      <button
                        className="am-button am-button-small am-button-secondary"
                        onClick={() => toggleKnowledge(item, "is_verified")}
                      >
                        {item.is_verified ? "Retirer vérification" : "Vérifier"}
                      </button>
                      <button
                        className="am-button am-button-small am-button-danger"
                        onClick={() => deleteKnowledge(item)}
                      >
                        Supprimer
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}

            <Pagination
              pagination={pagination}
              onPageChange={changePage}
            />
          </div>
        </div>
      )}

      {tab === "conversations" && (
        <div className="am-conversation-layout">
          <div className="am-panel am-conversation-list">
            <div className="am-panel-heading">
              <div>
                <h2>Conversations des utilisateurs</h2>
                <p>{formatNumber(pagination.total)} résultat(s)</p>
              </div>
            </div>

            <div className="am-toolbar">
              <input
                value={conversationQuery}
                onChange={(e) => {
                  setConversationQuery(e.target.value);
                  setPagination((old) => ({ ...old, page: 1 }));
                }}
                placeholder="Titre, identifiant ou utilisateur…"
              />

              <select
                value={conversationStatus}
                onChange={(e) => {
                  setConversationStatus(e.target.value);
                  setPagination((old) => ({ ...old, page: 1 }));
                }}
              >
                <option value="">Tous les statuts</option>
                <option value="open">Ouvertes</option>
                <option value="closed">Fermées</option>
              </select>
            </div>

            {conversations.length === 0 && !loading ? (
              <div className="am-empty">Aucune conversation trouvée.</div>
            ) : (
              <div className="am-conversation-items">
                {conversations.map((item) => (
                  <button
                    key={item.id}
                    className={`am-conversation-item ${
                      selectedConversation?.id === item.id ? "selected" : ""
                    }`}
                    onClick={() => openConversation(item)}
                  >
                    <div className="am-item-top">
                      <strong>{item.title || `Conversation #${item.id}`}</strong>
                      <span className={item.status === "open" ? "am-pill green" : "am-pill gray"}>
                        {item.status === "open" ? "Ouverte" : "Fermée"}
                      </span>
                    </div>
                    <span>
                      {item.username_snapshot ||
                        (item.user_id ? `Utilisateur #${item.user_id}` : "Visiteur anonyme")}
                    </span>
                    <span>
                      {formatNumber(item.message_count)} message(s) · {formatDate(item.latest_message_at || item.created_at)}
                    </span>
                    <span className="am-item-id">Conversation #{item.id}</span>
                  </button>
                ))}
              </div>
            )}

            <Pagination
              pagination={pagination}
              onPageChange={changePage}
            />
          </div>

          <div className="am-panel am-message-panel">
            {!selectedConversation ? (
              <div className="am-empty am-empty-large">
                <span className="am-empty-icon">☷</span>
                <h2>Historique des échanges</h2>
                <p>Sélectionne une conversation pour lire ses messages.</p>
              </div>
            ) : (
              <>
                <div className="am-panel-heading am-message-heading">
                  <div>
                    <span className="am-eyebrow">
                      CONVERSATION #{selectedConversation.id}
                    </span>
                    <h2>{selectedConversation.title || "Conversation"}</h2>
                    <p>
                      {selectedConversation.username_snapshot ||
                        (selectedConversation.user_id
                          ? `Utilisateur #${selectedConversation.user_id}`
                          : "Visiteur anonyme")}
                      {" · "}
                      Créée le {formatDate(selectedConversation.created_at)}
                    </p>
                  </div>

                  <button
                    className="am-button am-button-small am-button-secondary"
                    onClick={() => changeConversationStatus(selectedConversation)}
                  >
                    {selectedConversation.status === "open"
                      ? "Fermer"
                      : "Rouvrir"}
                  </button>
                </div>

                <div className="am-message-thread">
                  {conversationMessages.length === 0 ? (
                    <div className="am-empty">Aucun message dans cette conversation.</div>
                  ) : (
                    conversationMessages.map((message) => (
                      <article
                        key={message.id}
                        className={`am-message ${
                          message.role === "assistant" ? "assistant" : "user"
                        }`}
                      >
                        <div className="am-message-meta">
                          <strong>
                            {message.role === "assistant"
                              ? "Chatball IA"
                              : message.role === "user"
                                ? "Utilisateur"
                                : message.role}
                          </strong>
                          <span>{formatDate(message.created_at)}</span>
                        </div>
                        <p>{message.content}</p>
                        {message.status && (
                          <span className={`am-message-status ${message.status}`}>
                            {message.status}
                          </span>
                        )}
                        {message.metadata &&
                          message.role === "assistant" && (
                            <details className="am-message-details">
                              <summary>Détails techniques</summary>
                              <pre>
                                {JSON.stringify(message.metadata, null, 2)}
                              </pre>
                            </details>
                          )}
                      </article>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function Pagination({ pagination, onPageChange }) {
  const page = Number(pagination.page || 1);
  const totalPages = Number(pagination.totalPages || 0);

  if (totalPages <= 1) return null;

  return (
    <div className="am-pagination">
      <button
        className="am-button am-button-secondary am-button-small"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        Précédent
      </button>

      <span>
        Page {page} sur {totalPages}
      </span>

      <button
        className="am-button am-button-secondary am-button-small"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Suivant
      </button>
    </div>
  );
}
