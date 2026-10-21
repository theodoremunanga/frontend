
import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./GestionTournois.css";

// ======================================================
// CONFIGURATION API
// ======================================================

const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error("La variable VITE_API_URL est manquante.");
}

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
    }

    return Promise.reject(error);
  }
);

// ======================================================
// OPTIONS MÉTIER : VALEURS BACKEND CONSERVÉES
// ======================================================

const GAME_OPTIONS = [
  { value: "football", label: "Football", icon: "⚽" },
  { value: "basketball", label: "Basket-ball", icon: "🏀" },
  { value: "dames", label: "Jeu de dames", icon: "♟️" },
  { value: "échecs", label: "Échecs", icon: "♟" },
  { value: "quiz", label: "Quiz", icon: "🧠" },
  { value: "fifa", label: "Football virtuel", icon: "🎮" },
  { value: "call_of_duty", label: "Call of Duty", icon: "🎯" },
  { value: "free_fire", label: "Free Fire", icon: "🔥" },
  { value: "pubg", label: "PUBG", icon: "🪖" },
  { value: "mobile_legends", label: "Mobile Legends", icon: "⚔️" },
];

const BRACKET_OPTIONS = [
  { value: "single_elimination", label: "Élimination directe" },
  { value: "double_elimination", label: "Double élimination" },
  { value: "round_robin", label: "Championnat aller-retour" },
  { value: "groups", label: "Phase de groupes" },
];

const TEAM_TYPE_OPTIONS = [
  { value: "solo", label: "Individuel" },
  { value: "duo", label: "Équipe de 2 joueurs" },
  { value: "team", label: "Équipe collective" },
];

const MATCH_TYPE_OPTIONS = [
  { value: "BO1", label: "Un seul match" },
  { value: "BO3", label: "Au meilleur des 3 matchs" },
  { value: "BO5", label: "Au meilleur des 5 matchs" },
];

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Brouillon" },
  { value: "OPEN", label: "Inscriptions ouvertes" },
  { value: "FULL", label: "Complet" },
  { value: "STARTING", label: "Démarrage imminent" },
  { value: "IN_PROGRESS", label: "En cours" },
  { value: "FINISHED", label: "Terminé" },
  { value: "CANCELLED", label: "Annulé" },
];

const VISIBILITY_OPTIONS = [
  { value: "PUBLIC", label: "Public" },
  { value: "PRIVATE", label: "Privé" },
];

const PLAYER_OPTIONS = [4, 8, 16, 32, 64, 128];

const INITIAL_FORM = {
  title: "",
  description: "",
  game_type: "football",
  bracket_type: "single_elimination",
  match_type: "BO1",
  team_type: "solo",
  visibility: "PUBLIC",
  date: "",
  max_players: 4,
  entry_fee: 0,
  prize_pool: 0,
  status: "DRAFT",
};

// ======================================================
// TRADUCTIONS ET NORMALISATION
// ======================================================

const STATUS_LABELS = Object.fromEntries(
  STATUS_OPTIONS.map(({ value, label }) => [value, label])
);

const GAME_LABELS = Object.fromEntries(
  GAME_OPTIONS.map(({ value, label }) => [value, label])
);

const BRACKET_LABELS = Object.fromEntries(
  BRACKET_OPTIONS.map(({ value, label }) => [value, label])
);

const TEAM_LABELS = Object.fromEntries(
  TEAM_TYPE_OPTIONS.map(({ value, label }) => [value, label])
);

const MATCH_LABELS = Object.fromEntries(
  MATCH_TYPE_OPTIONS.map(({ value, label }) => [value, label])
);

const VISIBILITY_LABELS = Object.fromEntries(
  VISIBILITY_OPTIONS.map(({ value, label }) => [value, label])
);

const normalizeEnum = (value, options, fallback) => {
  const normalized = String(value ?? "").trim();

  return options.some((option) => option.value === normalized)
    ? normalized
    : fallback;
};

const normalizeStatus = (value) =>
  normalizeEnum(value, STATUS_OPTIONS, "DRAFT");

const normalizeGame = (value) =>
  normalizeEnum(value, GAME_OPTIONS, "football");

const normalizeBracket = (value) =>
  normalizeEnum(value, BRACKET_OPTIONS, "single_elimination");

const normalizeTeam = (value) =>
  normalizeEnum(value, TEAM_TYPE_OPTIONS, "solo");

const normalizeMatch = (value) =>
  normalizeEnum(value, MATCH_TYPE_OPTIONS, "BO1");

const normalizeVisibility = (value) =>
  normalizeEnum(value, VISIBILITY_OPTIONS, "PUBLIC");

const normalizePlayers = (value) => {
  const parsed = Number(value);

  return PLAYER_OPTIONS.includes(parsed) ? parsed : 4;
};

const safeNumber = (value, fallback = 0) => {
  if (value === "" || value === null || value === undefined) {
    return fallback;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
};

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.error ||
  error?.response?.data?.message ||
  fallback;

// ======================================================
// DATES
// ======================================================

// Utilise la date locale pour éviter un changement de jour
// provoqué par toISOString() et le fuseau horaire.
const toLocalDateInput = (value) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const buildCompetitionDates = (date) => {
  if (!date) {
    return { start_time: null, end_time: null };
  }

  const start = new Date(`${date}T12:00:00`);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime())
  ) {
    return { start_time: null, end_time: null };
  }

  return {
    start_time: start.toISOString(),
    end_time: end.toISOString(),
  };
};

const formatDate = (value) => {
  if (!value) return "Date non définie";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date non définie";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
};

const formatMoney = (value) =>
  `${safeNumber(value).toLocaleString("fr-FR")} CDF`;

const getGameIcon = (game) =>
  GAME_OPTIONS.find((item) => item.value === game)?.icon || "🏆";

// ======================================================
// COMPOSANT PRINCIPAL
// ======================================================

export default function GestionTournois() {
  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingId, setEditingId] = useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [gameFilter, setGameFilter] = useState("all");

  const [form, setForm] = useState({ ...INITIAL_FORM });

  // ----------------------------------------------------
  // CHARGEMENT
  // ----------------------------------------------------

  const fetchCompetitions = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/admin/competitions");

      const data = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.competitions)
          ? response.data.competitions
          : [];

      setCompetitions(data);
    } catch (err) {
      setError(
        getErrorMessage(err, "Impossible de charger les tournois.")
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompetitions();
  }, [fetchCompetitions]);

  // ----------------------------------------------------
  // STATISTIQUES
  // ----------------------------------------------------

  const stats = useMemo(() => {
    return {
      total: competitions.length,
      open: competitions.filter((item) => item.status === "OPEN").length,
      ongoing: competitions.filter(
        (item) => item.status === "IN_PROGRESS"
      ).length,
      finished: competitions.filter(
        (item) => item.status === "FINISHED"
      ).length,
    };
  }, [competitions]);

  // ----------------------------------------------------
  // FILTRES
  // ----------------------------------------------------

  const filteredCompetitions = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("fr");

    return competitions.filter((item) => {
      const searchableText = [
        item.title,
        item.name,
        item.game_type,
        GAME_LABELS[item.game_type],
        item.status,
        STATUS_LABELS[item.status],
        item.bracket_type,
        BRACKET_LABELS[item.bracket_type],
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("fr");

      const matchesSearch = searchableText.includes(term);

      const matchesStatus =
        statusFilter === "all" || item.status === statusFilter;

      const matchesGame =
        gameFilter === "all" || item.game_type === gameFilter;

      return matchesSearch && matchesStatus && matchesGame;
    });
  }, [competitions, search, statusFilter, gameFilter]);

  // ----------------------------------------------------
  // FORMULAIRE
  // ----------------------------------------------------

  const resetForm = () => {
    setForm({ ...INITIAL_FORM });
    setEditingId(null);
    setError("");
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  const validateForm = () => {
    if (!form.title.trim()) {
      return "Le nom du tournoi est obligatoire.";
    }

    if (!form.date) {
      return "Veuillez choisir la date du tournoi.";
    }

    const selectedDate = new Date(`${form.date}T12:00:00`);

    if (Number.isNaN(selectedDate.getTime())) {
      return "La date sélectionnée est invalide.";
    }

    if (!PLAYER_OPTIONS.includes(Number(form.max_players))) {
      return "Veuillez sélectionner un nombre de participants valide.";
    }

    if (
      !Number.isFinite(Number(form.entry_fee)) ||
      Number(form.entry_fee) < 0
    ) {
      return "Les frais de participation doivent être positifs ou nuls.";
    }

    if (
      !Number.isFinite(Number(form.prize_pool)) ||
      Number(form.prize_pool) < 0
    ) {
      return "La cagnotte doit être positive ou nulle.";
    }

    if (!form.game_type || !form.bracket_type || !form.team_type) {
      return "Veuillez compléter les paramètres du tournoi.";
    }

    return null;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      setSuccess("");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      const { start_time, end_time } = buildCompetitionDates(form.date);

      if (!start_time || !end_time) {
        setError("Impossible de préparer les dates du tournoi.");
        return;
      }

      const payload = {
        title: form.title.trim(),
        name: form.title.trim(),
        description: form.description.trim(),

        // Valeurs techniques conservées pour le backend.
        game_type: normalizeGame(form.game_type),
        bracket_type: normalizeBracket(form.bracket_type),
        match_type: normalizeMatch(form.match_type),
        team_type: normalizeTeam(form.team_type),
        visibility: normalizeVisibility(form.visibility),
        status: normalizeStatus(form.status),

        start_time,
        end_time,

        max_players: normalizePlayers(form.max_players),
        entry_fee: safeNumber(form.entry_fee),
        prize_pool: safeNumber(form.prize_pool),
        platform_profit: 0,
      };

      if (!editingId) {
        payload.current_players = 0;
      }

      if (editingId) {
        await api.put(`/admin/competitions/${editingId}`, payload);
        setSuccess("Le tournoi a été modifié avec succès.");
      } else {
        await api.post("/admin/competitions", payload);
        setSuccess("Le tournoi a été créé avec succès.");
      }

      setForm({ ...INITIAL_FORM });
      setEditingId(null);

      await fetchCompetitions();
    } catch (err) {
      setError(
        getErrorMessage(err, "Une erreur est survenue lors de l'enregistrement.")
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // MODIFICATION
  // ----------------------------------------------------

  const handleEdit = (competition) => {
    const rawDate = competition.date || competition.start_time;

    setForm({
      ...INITIAL_FORM,
      title: competition.title || competition.name || "",
      description: competition.description || "",
      game_type: normalizeGame(competition.game_type),
      bracket_type: normalizeBracket(competition.bracket_type),
      match_type: normalizeMatch(competition.match_type),
      team_type: normalizeTeam(competition.team_type),
      visibility: normalizeVisibility(competition.visibility),
      date: toLocalDateInput(rawDate),
      max_players: normalizePlayers(competition.max_players),
      entry_fee: safeNumber(competition.entry_fee),
      prize_pool: safeNumber(competition.prize_pool),
      status: normalizeStatus(competition.status),
    });

    setEditingId(competition.id);
    setError("");
    setSuccess("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ----------------------------------------------------
  // SUPPRESSION
  // ----------------------------------------------------

  const handleDelete = async (competition) => {
    const confirmed = window.confirm(
      `Supprimer définitivement le tournoi « ${
        competition.title || competition.name || "Sans titre"
      } » ? Cette action est irréversible.`
    );

    if (!confirmed) return;

    try {
      setDeletingId(competition.id);
      setError("");
      setSuccess("");

      await api.delete(`/admin/competitions/${competition.id}`);

      setSuccess("Le tournoi a été supprimé.");
      await fetchCompetitions();
    } catch (err) {
      setError(
        getErrorMessage(err, "Impossible de supprimer ce tournoi.")
      );
    } finally {
      setDeletingId(null);
    }
  };

  // ----------------------------------------------------
  // AFFICHAGE
  // ----------------------------------------------------

  return (
    <main className="gt-page">
      <div className="gt-shell">
        <header className="gt-hero">
          <div className="gt-hero-content">
            <div className="gt-eyebrow">
              <span className="gt-live-dot" />
              CENTRE DE COMPÉTITION
            </div>

            <h1>
              La scène des <span>champions.</span>
            </h1>

            <p className="gt-hero-description">
              Organisez les affrontements, gérez les inscriptions
              et préparez le prochain grand rendez-vous.
            </p>

            <div className="gt-hero-tags">
              <span>🏆 Gestion des tournois</span>
              <span>⚡ Administration</span>
              <span>🌐 Multijeux</span>
            </div>
          </div>

          <div className="gt-stadium-art" aria-hidden="true">
            <div className="gt-stadium-orbit gt-orbit-one" />
            <div className="gt-stadium-orbit gt-orbit-two" />

            <div className="gt-champions-ball">
              <svg viewBox="0 0 120 120" role="presentation">
                <defs>
                  <linearGradient id="gtBallGradient" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#fff4c4" />
                    <stop offset="55%" stopColor="#d9ad4e" />
                    <stop offset="100%" stopColor="#76501a" />
                  </linearGradient>
                </defs>

                <circle cx="60" cy="60" r="54" fill="url(#gtBallGradient)" />
                <g fill="#101a39" stroke="#f9e7a8" strokeWidth="1.3">
                  <path d="M60 30 L76 42 L70 61 L50 61 L44 42 Z" />
                  <path d="M44 42 L27 37 L17 52 L29 69 L50 61 Z" />
                  <path d="M76 42 L93 37 L103 52 L91 69 L70 61 Z" />
                  <path d="M29 69 L17 52 L12 76 L30 92 L47 84 L50 61 Z" />
                  <path d="M91 69 L103 52 L108 76 L90 92 L73 84 L70 61 Z" />
                  <path d="M47 84 L60 101 L73 84 L70 61 L50 61 Z" />
                </g>
                <circle cx="60" cy="60" r="54" fill="none" stroke="#fff2bf" strokeWidth="1.5" />
              </svg>
            </div>

            <div className="gt-art-caption">
              <span>LE GRAND JEU</span>
              <strong>À VOUS DE JOUER</strong>
            </div>
          </div>

          <div className="gt-hero-bottom">
            <span>VOTRE COMPÉTITION. VOS RÈGLES.</span>
            <span>01 / ADMINISTRATION</span>
          </div>
        </header>

        {error && (
          <div className="gt-alert gt-alert-error" role="alert">
            <span>!</span>
            <p>{error}</p>
            <button type="button" onClick={() => setError("")} aria-label="Fermer l'erreur">
              ×
            </button>
          </div>
        )}

        {success && (
          <div className="gt-alert gt-alert-success" role="status">
            <span>✓</span>
            <p>{success}</p>
            <button type="button" onClick={() => setSuccess("")} aria-label="Fermer le message">
              ×
            </button>
          </div>
        )}

        <section className="gt-stats" aria-label="Statistiques des tournois">
          <article className="gt-stat-card">
            <div className="gt-stat-icon gt-icon-gold">🏆</div>
            <div>
              <span className="gt-stat-label">TOURNOIS CRÉÉS</span>
              <strong>{stats.total}</strong>
              <small>Dans votre espace</small>
            </div>
          </article>

          <article className="gt-stat-card">
            <div className="gt-stat-icon gt-icon-blue">🌐</div>
            <div>
              <span className="gt-stat-label">INSCRIPTIONS OUVERTES</span>
              <strong>{stats.open}</strong>
              <small>Prêts à accueillir des joueurs</small>
            </div>
          </article>

          <article className="gt-stat-card">
            <div className="gt-stat-icon gt-icon-green">⚡</div>
            <div>
              <span className="gt-stat-label">EN COURS</span>
              <strong>{stats.ongoing}</strong>
              <small>Compétitions actives</small>
            </div>
          </article>

          <article className="gt-stat-card">
            <div className="gt-stat-icon gt-icon-purple">♛</div>
            <div>
              <span className="gt-stat-label">TERMINÉS</span>
              <strong>{stats.finished}</strong>
              <small>Compétitions achevées</small>
            </div>
          </article>
        </section>

        <section className="gt-section-heading">
          <div>
            <span className="gt-section-kicker">ESPACE ORGANISATEUR</span>
            <h2>{editingId ? "Modifier le tournoi" : "Créer un tournoi"}</h2>
            <p>Configurez chaque détail avant le coup d'envoi.</p>
          </div>

          {editingId && (
            <span className="gt-edit-indicator">✎ MODIFICATION EN COURS</span>
          )}
        </section>

        <form className="gt-form-card" onSubmit={handleSubmit}>
          <div className="gt-form-topline">
            <div className="gt-form-top-icon">✦</div>
            <div>
              <h3>Configuration de la compétition</h3>
              <p>Les champs marqués d'un astérisque sont obligatoires.</p>
            </div>
          </div>

          <div className="gt-form-section">
            <div className="gt-form-section-title">
              <span>01</span>
              <div>
                <h4>Identité du tournoi</h4>
                <p>Donnez une identité à votre événement.</p>
              </div>
            </div>

            <div className="gt-field-grid">
              <label className="gt-field gt-field-wide">
                <span>Nom du tournoi <b>*</b></span>
                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="Ex. : Coupe des Champions"
                  maxLength={150}
                  required
                />
              </label>

              <label className="gt-field">
                <span>Jeu concerné <b>*</b></span>
                <select name="game_type" value={form.game_type} onChange={handleChange}>
                  {GAME_OPTIONS.map((game) => (
                    <option key={game.value} value={game.value}>
                      {game.icon} {game.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="gt-field">
                <span>Date de la compétition <b>*</b></span>
                <input
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={handleChange}
                  required
                />
              </label>

              <label className="gt-field gt-field-wide">
                <span>Description</span>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Présentez le tournoi, ses règles et les conditions de participation..."
                  rows={3}
                  maxLength={3000}
                />
                <small>{form.description.length}/3000 caractères</small>
              </label>
            </div>
          </div>

          <div className="gt-form-divider" />

          <div className="gt-form-section">
            <div className="gt-form-section-title">
              <span>02</span>
              <div>
                <h4>Format de la compétition</h4>
                <p>Définissez les règles de qualification et les affrontements.</p>
              </div>
            </div>

            <div className="gt-field-grid">
              <label className="gt-field">
                <span>Système de compétition</span>
                <select
                  name="bracket_type"
                  value={form.bracket_type}
                  onChange={handleChange}
                >
                  {BRACKET_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="gt-field">
                <span>Mode de participation</span>
                <select name="team_type" value={form.team_type} onChange={handleChange}>
                  {TEAM_TYPE_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="gt-field">
                <span>Format des matchs</span>
                <select name="match_type" value={form.match_type} onChange={handleChange}>
                  {MATCH_TYPE_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.value} — {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="gt-field">
                <span>Nombre maximal de participants</span>
                <select
                  name="max_players"
                  value={form.max_players}
                  onChange={handleChange}
                >
                  {PLAYER_OPTIONS.map((count) => (
                    <option key={count} value={count}>
                      {count} participants
                    </option>
                  ))}
                </select>
              </label>

              <label className="gt-field">
                <span>Visibilité du tournoi</span>
                <select
                  name="visibility"
                  value={form.visibility}
                  onChange={handleChange}
                >
                  {VISIBILITY_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="gt-field">
                <span>État du tournoi</span>
                <select name="status" value={form.status} onChange={handleChange}>
                  {STATUS_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="gt-form-divider" />

          <div className="gt-form-section">
            <div className="gt-form-section-title">
              <span>03</span>
              <div>
                <h4>Paramètres financiers</h4>
                <p>Fixez les frais d'inscription et la récompense.</p>
              </div>
            </div>

            <div className="gt-field-grid gt-finance-grid">
              <label className="gt-field">
                <span>Frais de participation</span>
                <div className="gt-money-input">
                  <input
                    type="number"
                    name="entry_fee"
                    min="0"
                    step="1"
                    value={form.entry_fee}
                    onChange={handleChange}
                    required
                  />
                  <span>CDF</span>
                </div>
                <small>Montant demandé à chaque participant.</small>
              </label>

              <label className="gt-field">
                <span>Cagnotte totale</span>
                <div className="gt-money-input">
                  <input
                    type="number"
                    name="prize_pool"
                    min="0"
                    step="1"
                    value={form.prize_pool}
                    onChange={handleChange}
                    required
                  />
                  <span>CDF</span>
                </div>
                <small>Récompense totale annoncée pour le tournoi.</small>
              </label>
            </div>
          </div>

          <div className="gt-preview">
            <div className="gt-preview-emblem">{getGameIcon(form.game_type)}</div>
            <div className="gt-preview-info">
              <span>APERÇU DU TOURNOI</span>
              <h4>{form.title.trim() || "Votre prochain grand tournoi"}</h4>
              <p>
                {GAME_LABELS[form.game_type]} · {BRACKET_LABELS[form.bracket_type]}
              </p>
            </div>
            <div className="gt-preview-prize">
              <span>CAGNOTTE</span>
              <strong>{formatMoney(form.prize_pool)}</strong>
            </div>
          </div>

          <div className="gt-form-actions">
            {editingId && (
              <button
                className="gt-button gt-button-secondary"
                type="button"
                onClick={resetForm}
                disabled={submitting}
              >
                Annuler la modification
              </button>
            )}

            <button
              className="gt-button gt-button-primary"
              type="submit"
              disabled={submitting}
            >
              {submitting
                ? "Enregistrement en cours…"
                : editingId
                  ? "✓ Enregistrer les modifications"
                  : "✦ Créer le tournoi"}
            </button>
          </div>
        </form>

        <section className="gt-tournaments-section">
          <div className="gt-section-heading gt-list-heading">
            <div>
              <span className="gt-section-kicker">PILOTAGE ET SUIVI</span>
              <h2>Vos tournois</h2>
              <p>Retrouvez vos compétitions et gérez-les depuis un seul espace.</p>
            </div>
            <span className="gt-total-pill">
              {filteredCompetitions.length} résultat(s)
            </span>
          </div>

          <div className="gt-filters">
            <label className="gt-search">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                placeholder="Rechercher un tournoi..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Rechercher un tournoi"
              />
            </label>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filtrer par état"
            >
              <option value="all">Tous les états</option>
              {STATUS_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            <select
              value={gameFilter}
              onChange={(event) => setGameFilter(event.target.value)}
              aria-label="Filtrer par jeu"
            >
              <option value="all">Tous les jeux</option>
              {GAME_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              className="gt-refresh-button"
              onClick={fetchCompetitions}
              disabled={loading}
              title="Actualiser la liste"
            >
              ↻ <span>Actualiser</span>
            </button>
          </div>

          {loading ? (
            <div className="gt-empty-state">
              <div className="gt-loader" />
              <h3>Chargement des tournois</h3>
              <p>Récupération des données de compétition…</p>
            </div>
          ) : filteredCompetitions.length === 0 ? (
            <div className="gt-empty-state">
              <div className="gt-empty-icon">🏆</div>
              <h3>Aucun tournoi trouvé</h3>
              <p>
                {competitions.length
                  ? "Essayez de modifier vos filtres de recherche."
                  : "Créez votre premier tournoi pour commencer."}
              </p>
              {(search || statusFilter !== "all" || gameFilter !== "all") && (
                <button
                  type="button"
                  className="gt-button gt-button-secondary"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                    setGameFilter("all");
                  }}
                >
                  Réinitialiser les filtres
                </button>
              )}
            </div>
          ) : (
            <div className="gt-tournament-grid">
              {filteredCompetitions.map((tournament) => {
                const status = normalizeStatus(tournament.status);

                return (
                  <article className="gt-tournament-card" key={tournament.id}>
                    <div className="gt-card-accent" />

                    <div className="gt-card-header">
                      <div className="gt-card-game-icon">
                        {getGameIcon(tournament.game_type)}
                      </div>

                      <span className={`gt-status gt-status-${status.toLowerCase()}`}>
                        <span />
                        {STATUS_LABELS[status]}
                      </span>
                    </div>

                    <div className="gt-card-main">
                      <span className="gt-card-game">
                        {GAME_LABELS[tournament.game_type] || tournament.game_type || "Jeu non défini"}
                      </span>

                      <h3>{tournament.title || tournament.name || "Tournoi sans titre"}</h3>

                      {tournament.description && (
                        <p className="gt-card-description">
                          {tournament.description}
                        </p>
                      )}
                    </div>

                    <div className="gt-card-details">
                      <div>
                        <span>DATE</span>
                        <strong>{formatDate(tournament.date || tournament.start_time)}</strong>
                      </div>
                      <div>
                        <span>PARTICIPANTS</span>
                        <strong>
                          {safeNumber(tournament.current_players)}/
                          {safeNumber(tournament.max_players)}
                        </strong>
                      </div>
                      <div>
                        <span>FORMAT</span>
                        <strong>{MATCH_LABELS[tournament.match_type] || "Un seul match"}</strong>
                      </div>
                      <div>
                        <span>CAGNOTTE</span>
                        <strong>{formatMoney(tournament.prize_pool)}</strong>
                      </div>
                    </div>

                    <div className="gt-card-footer">
                      <div className="gt-card-visibility">
                        {tournament.visibility === "PRIVATE" ? "🔒 Tournoi privé" : "🌐 Tournoi public"}
                      </div>

                      <div className="gt-card-actions">
                        <button
                          type="button"
                          className="gt-icon-button"
                          onClick={() => handleEdit(tournament)}
                          title="Modifier ce tournoi"
                          aria-label={`Modifier ${tournament.title || tournament.name}`}
                        >
                          ✎
                        </button>

                        <button
                          type="button"
                          className="gt-icon-button gt-delete-icon"
                          onClick={() => handleDelete(tournament)}
                          disabled={deletingId === tournament.id}
                          title="Supprimer ce tournoi"
                          aria-label={`Supprimer ${tournament.title || tournament.name}`}
                        >
                          {deletingId === tournament.id ? "…" : "⌫"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <footer className="gt-footer">
          <span>✦ CENTRE DE COMPÉTITION</span>
          <span>ORGANISEZ. AFFRONTEZ. TRIOMPHEZ.</span>
        </footer>
      </div>
    </main>
  );
}
