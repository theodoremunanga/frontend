import {
  useEffect,
  useMemo,
  useState,
} from "react";

import styled from "styled-components";
import axios from "axios";

// ======================================================
// API URL
// ======================================================

const API_URL =
  import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error(
    "❌ VITE_API_URL is missing"
  );
}

// ======================================================
// AXIOS INSTANCE
// ======================================================

const api = axios.create({
  baseURL: `${API_URL}`,

  timeout: 15000,

  withCredentials: true,

  headers: {
    "Content-Type":
      "application/json",
  },
});

// ======================================================
// TOKEN INTERCEPTOR
// ======================================================

api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem(
        "token"
      );

    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;
  },

  (error) => {
    return Promise.reject(error);
  }
);

// ======================================================
// RESPONSE INTERCEPTOR
// ======================================================

api.interceptors.response.use(
  (response) => response,

  (error) => {
    console.error(
      "❌ Tournament API Error:",
      error
    );

    // session expired
    if (
      error.response?.status ===
      401
    ) {
      localStorage.removeItem(
        "token"
      );
    }

    return Promise.reject(error);
  }
);

// ======================================================
// CONSTANTS
// ======================================================

const STATUS_OPTIONS = [
  "DRAFT",
  "OPEN",
  "FULL",
  "STARTING",
  "IN_PROGRESS",
  "FINISHED",
  "CANCELLED",
];

const GAME_OPTIONS = [
  "football",
  "basketball",
  "dames",
  "échecs",
  "quiz",
  "fifa",
  "call_of_duty",
  "free_fire",
  "pubg",
  "mobile_legends",
];

// ======================================================
// BRACKET TYPES
// ======================================================

const BRACKET_OPTIONS = [
  "single_elimination",
  "double_elimination",
  "round_robin",
  "groups",
];

// ======================================================
// TEAM TYPES
// ======================================================

const TEAM_TYPE_OPTIONS = [
  "solo",
  "duo",
  "team",
];

// ======================================================
// MATCH FORMAT TYPES
// ======================================================

const MATCH_TYPE_OPTIONS = [
  "BO1",
  "BO3",
  "BO5",
];

const VISIBILITY_OPTIONS = [
  "PUBLIC",
  "PRIVATE",
];

const PLAYER_OPTIONS = [
  4,
  8,
  16,
  32,
  64,
  128,
];

// ======================================================
// INITIAL FORM
// ======================================================

const INITIAL_FORM = {
  title: "",
  description: "",

  game_type: "football",

  bracket_type:
    "single_elimination",

  // BO1 / BO3 / BO5
  match_type: "BO1",

  // solo / duo / team
  team_type: "solo",

  visibility: "PUBLIC",

  date: "",

  max_players: 4,

  entry_fee: 0,

  prize_pool: 0,

  status: "DRAFT",
};

// ======================================================
// DATE HELPERS
// ======================================================
const normalizeStatus = (status) => {
  const allowed = [
    "DRAFT",
    "OPEN",
    "FULL",
    "STARTING",
    "IN_PROGRESS",
    "FINISHED",
    "CANCELLED",
  ];

  const normalized = String(status || "")
    .trim()
    .toUpperCase();

  return allowed.includes(normalized)
    ? normalized
    : "DRAFT";
};

const STATUS_LABELS = {
  DRAFT: "Planifié",
  OPEN: "Ouvert",
  FULL: "Complet",
  STARTING: "Démarrage",
  IN_PROGRESS: "En cours",
  FINISHED: "Terminé",
  CANCELLED: "Annulé",
};


const buildCompetitionDates = (
  date
) => {
  if (!date) {
    return {
      start_time: null,
      end_time: null,
    };
  }

  const start = new Date(
    `${date}T12:00:00`
  );

  const end = new Date(
    start.getTime() +
      2 * 60 * 60 * 1000
  );

  return {
    start_time:
      start.toISOString(),

    end_time:
      end.toISOString(),
  };
};

// ======================================================
// SAFE HELPERS
// ======================================================

const safeNumber = (
  value,
  fallback = 0
) => {
  const parsed = Number(value);

  return Number.isNaN(parsed)
    ? fallback
    : parsed;
};

// ======================================================
// NORMALIZERS
// ======================================================


const normalizeBracketType = (
  type
) => {
  const allowed = [
    "single_elimination",
    "double_elimination",
    "round_robin",
    "groups",
  ];

  return allowed.includes(type)
    ? type
    : "single_elimination";
};

const normalizeMatchType = (
  type
) => {
  const allowed = [
    "BO1",
    "BO3",
    "BO5",
  ];

  return allowed.includes(type)
    ? type
    : "BO1";
};

const normalizeTeamType = (
  type
) => {
  const allowed = [
    "solo",
    "duo",
    "team",
  ];

  return allowed.includes(type)
    ? type
    : "solo";
};

const normalizeVisibility = (
  visibility
) => {
  const allowed = [
    "PUBLIC",
    "PRIVATE",
  ];

  const normalized = String(
    visibility || ""
  )
    .trim()
    .toUpperCase();

  return allowed.includes(normalized)
    ? normalized
    : "PUBLIC";
};

const normalizeMaxPlayers = (
  value
) => {
  const allowed = [
    4,
    8,
    16,
    32,
    64,
    128,
  ];

  const parsed = Number(value);

  return allowed.includes(parsed)
    ? parsed
    : 4;
};

// ======================================================
// COMPONENT
// ======================================================

export default function GestionCompetitions() {
  // ======================================================
  // STATES
  // ======================================================

  const [competitions, setCompetitions] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [editingId, setEditingId] =
    useState(null);

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [gameFilter, setGameFilter] =
    useState("all");

  const [form, setForm] =
    useState(INITIAL_FORM);

  // ======================================================
  // FETCH COMPETITIONS
  // ======================================================

  useEffect(() => {
    fetchCompetitions();
  }, []);

  const fetchCompetitions = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await api.get(
        "/admin/competitions"
      );

      const data = Array.isArray(
        res.data
      )
        ? res.data
        : Array.isArray(
            res.data?.competitions
          )
        ? res.data.competitions
        : [];

      setCompetitions(data);
    } catch (err) {
      console.error(
        "Erreur chargement competitions:",
        err
      );

      setError(
        err?.response?.data?.error ||
          "Impossible de charger les compétitions."
      );
    } finally {
      setLoading(false);
    }
  };

  // ======================================================
  // FILTERED COMPETITIONS
  // ======================================================

  const filteredCompetitions =
    useMemo(() => {
      return competitions.filter((c) => {
        const searchText = `
          ${c.title || ""}
          ${c.game_type || ""}
          ${c.status || ""}
          ${c.bracket_type || ""}
          ${c.match_type || ""}
          ${c.team_type || ""}
        `
          .toLowerCase()
          .trim();

        const matchesSearch =
          searchText.includes(
            search.toLowerCase()
          );

        const matchesStatus =
          statusFilter === "all"
            ? true
            : c.status ===
              statusFilter;

        const matchesGame =
          gameFilter === "all"
            ? true
            : c.game_type ===
              gameFilter;

        return (
          matchesSearch &&
          matchesStatus &&
          matchesGame
        );
      });
    }, [
      competitions,
      search,
      statusFilter,
      gameFilter,
    ]);

  // ======================================================
  // RESET FORM
  // ======================================================

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setEditingId(null);
    setError("");
  };

  // ======================================================
  // HANDLE CHANGE
  // ======================================================

  const handleChange = (e) => {
    const { name, value } =
      e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ======================================================
  // VALIDATION
  // ======================================================

  const validateForm = () => {
    if (!form.title.trim()) {
      return "Le nom de la compétition est obligatoire.";
    }

    if (!form.date) {
      return "Veuillez sélectionner une date.";
    }

    if (
      safeNumber(
        form.max_players
      ) < 2
    ) {
      return "Le nombre minimum de joueurs est de 4.";
    }

    if (
      safeNumber(
        form.entry_fee
      ) < 0
    ) {
      return "Les frais d'entrée sont invalides.";
    }

    if (
      safeNumber(
        form.prize_pool
      ) < 0
    ) {
      return "La cagnotte est invalide.";
    }

    return null;
  };

  // ======================================================
  // SUBMIT
  // ======================================================

  const handleSubmit = async (
    e
  ) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      const validationError =
        validateForm();

      if (validationError) {
        setError(validationError);
        return;
      }

      // ==================================================
      // BUILD DATES
      // ==================================================

      const {
        start_time,
        end_time,
      } = buildCompetitionDates(
        form.date
      );

      if (
        !start_time ||
        !end_time
      ) {
        setError(
          "Impossible de générer les dates."
        );

        return;
      }

      // ==================================================
      // PAYLOAD
      // ==================================================

      const payload = {
        title:
          form.title?.trim() ||
          "",

        name:
          form.title?.trim() ||
          "",

        description:
          form.description?.trim() ||
          "",

        game_type:
          form.game_type ||
          "football",

        bracket_type:
          normalizeBracketType(
            form.bracket_type
          ),

        // ==================================================
        // IMPORTANT
        // BO1 / BO3 / BO5
        // ==================================================

        match_type:
          normalizeMatchType(
            form.match_type
          ),

        // ==================================================
        // TEAM MODE
        // solo / duo / team
        // ==================================================

        visibility:
          normalizeVisibility(
          form.visibility
         ),

        status:
          normalizeStatus(
            form.status
          ),

      
        start_time,
        end_time,

        max_players:
          normalizeMaxPlayers(
          form.max_players
          ),

        current_players:
          editingId
            ? undefined
            : 0,

        entry_fee:
          safeNumber(
            form.entry_fee
          ),

        prize_pool:
          safeNumber(
            form.prize_pool
          ),

        platform_profit: 0,
      };

      // ==================================================
      // REMOVE UNDEFINED
      // ==================================================

      Object.keys(payload).forEach(
        (key) => {
          if (
            payload[key] ===
            undefined
          ) {
            delete payload[key];
          }
        }
      );

      console.log(
        "✅ Competition payload:",
        payload
      );

      // ==================================================
      // API CALL
      // ==================================================

      if (editingId) {
        await api.put(
          `/admin/competitions/${editingId}`,
          payload
        );

        setSuccess(
          "✅ Compétition modifiée avec succès."
        );
      } else {
        await api.post(
          "/admin/competitions",
          payload
        );

        setSuccess(
          "✅ Compétition créée avec succès."
        );
      }

      resetForm();

      await fetchCompetitions();
    } catch (err) {
      console.error(
        "Erreur enregistrement:",
        err
      );

      console.log(
        "BACKEND ERROR:",
        err?.response?.data
      );

      setError(
        err?.response?.data?.error ||
          err?.response?.data
            ?.message ||
          err?.message ||
          "Erreur lors de l'enregistrement."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ======================================================
  // EDIT
  // ======================================================

  const handleEdit = (
    competition
  ) => {
    const rawDate =
      competition.date ||
      competition.start_time;

    let formattedDate = "";

    if (rawDate) {
      formattedDate = new Date(
        rawDate
      )
        .toISOString()
        .split("T")[0];
    }

    setForm({
      title:
        competition.title || "",

      description:
        competition.description ||
        "",

      game_type:
        competition.game_type ||
        "football",

      bracket_type:
        normalizeBracketType(
          competition.bracket_type
        ),

      match_type:
        normalizeMatchType(
          competition.match_type
        ),


      visibility:
        normalizeVisibility(
        competition.visibility
       ),

      date: formattedDate,

      max_players:
       normalizeMaxPlayers(
       competition.max_players
       ),

      entry_fee:
        competition.entry_fee ||
        0,

      prize_pool:
        competition.prize_pool ||
        0,

      status:
        normalizeStatus(
          competition.status
        ),
    });

    setEditingId(
      competition.id
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // ======================================================
  // DELETE
  // ======================================================

  const handleDelete = async (
    id
  ) => {
    const confirmDelete =
      window.confirm(
        "Voulez-vous vraiment supprimer cette compétition ?"
      );

    if (!confirmDelete) return;

    try {
      setLoading(true);

      await api.delete(
        `/admin/competitions/${id}`
      );

      setSuccess(
        "🗑 Compétition supprimée."
      );

      await fetchCompetitions();
    } catch (err) {
      console.error(
        "Erreur suppression:",
        err
      );

      setError(
        err?.response?.data?.error ||
          "Erreur lors de la suppression."
      );
    } finally {
      setLoading(false);
    }
  };

  // ======================================================
  // STATUS COLOR
  // ======================================================

  const getStatusColor = (
    status
  ) => {
    switch (status) {
      case "DRAFT":
        return "#facc15";

      case "OPEN":
        return "#070707";

      case "FULL":
        return "#22c55e";

      case "STARTING":
        return "#ef4444";

      case "IN_PROGRESS":
        return "#39b859";

      case "FINISHED":
        return "#1a6fe6";

      case "CANCELLED":
        return "#bb1515";

      default:
        return "#ffffff";
    }
  };

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <PageContainer>
      <Header>
        <HeaderTitle>
          🏆 Gestion des
          Compétitions
        </HeaderTitle>

        <HeaderSubtitle>
          Créez, gérez et
          surveillez vos
          compétitions en temps
          réel.
        </HeaderSubtitle>
      </Header>

      {error && (
        <Alert $type="error">
        {error}
        </Alert>
      )}

      {success && (
        <Alert $type="success">
          {success}
        </Alert>
     )}

      <FormContainer
        onSubmit={
          handleSubmit
        }
      >
        <FormTitle>
          {editingId
            ? "✏️ Modifier la compétition"
            : "🚀 Nouvelle compétition"}
        </FormTitle>

        <Grid>
          <Input
            type="text"
            name="title"
            placeholder="Nom de la compétition"
            value={form.title}
            onChange={
              handleChange
            }
            required
          />

          <Select
            name="game_type"
            value={
              form.game_type
            }
            onChange={
              handleChange
            }
          >
            {GAME_OPTIONS.map(
              (game) => (
                <option
                  key={game}
                  value={game}
                >
                  {game}
                </option>
              )
            )}
          </Select>

          <Select
            name="bracket_type"
            value={
              form.bracket_type
            }
            onChange={
              handleChange
            }
          >
            {BRACKET_OPTIONS.map(
              (type) => (
                <option
                  key={type}
                  value={type}
                >
                  {type}
                </option>
              )
            )}
          </Select>

          {/* ========================================= */}
          {/* TEAM TYPE */}
          {/* ========================================= */}

          <Select
            name="team_type"
            value={
              form.team_type
            }
            onChange={
              handleChange
            }
          >
            {TEAM_TYPE_OPTIONS.map(
              (type) => (
                <option
                  key={type}
                  value={type}
                >
                  {type}
                </option>
              )
            )}
          </Select>

          {/* ========================================= */}
          {/* MATCH TYPE */}
          {/* ========================================= */}

          <Select
            name="match_type"
            value={
              form.match_type
            }
            onChange={
              handleChange
            }
          >
            {MATCH_TYPE_OPTIONS.map(
              (type) => (
                <option
                  key={type}
                  value={type}
                >
                  {type}
                </option>
              )
            )}
          </Select>

          <Select
            name="status"
            value={
              form.status
            }
            onChange={
              handleChange
            }
          >
            {STATUS_OPTIONS.map(
              (status) => (
                <option
                  key={status}
                  value={status}
                >
                  {status}
                </option>
              )
            )}
          </Select>

          <Select
            name="visibility"
            value={
              form.visibility
            }
            onChange={
              handleChange
            }
          >
            {VISIBILITY_OPTIONS.map(
              (visibility) => (
                <option
                  key={
                    visibility
                  }
                  value={
                    visibility
                  }
                >
                  {visibility}
                </option>
              )
            )}
          </Select>

          <Input
            type="date"
            name="date"
            value={form.date}
            onChange={
              handleChange
            }
            required
          />

          <Select
            name="max_players"
            value={form.max_players}
            onChange={handleChange}
          >
            {PLAYER_OPTIONS.map((count) => (
              <option
               key={count}
               value={count}
              >
               {count} joueurs
             </option>
            ))}
         </Select>

          <Input
            type="number"
            name="entry_fee"
            placeholder="Frais d'entrée (CDF)"
            value={
              form.entry_fee
            }
            onChange={
              handleChange
            }
            min="0"
            required
          />

          <Input
            type="number"
            name="prize_pool"
            placeholder="Cagnotte (CDF)"
            value={
              form.prize_pool
            }
            onChange={
              handleChange
            }
            min="0"
            required
          />
        </Grid>

        <TextArea
          name="description"
          placeholder="Description de la compétition..."
          value={
            form.description
          }
          onChange={
            handleChange
          }
          rows={4}
        />

        <ButtonsRow>
          <SubmitButton
            type="submit"
            disabled={
              submitting
            }
          >
            {submitting
              ? "⏳ Chargement..."
              : editingId
              ? "💾 Sauvegarder"
              : "🚀 Créer"}
          </SubmitButton>

          {editingId && (
            <CancelButton
              type="button"
              onClick={
                resetForm
              }
            >
              ❌ Annuler
            </CancelButton>
          )}
        </ButtonsRow>
      </FormContainer>

      <FiltersContainer>
        <SearchInput
          type="text"
          placeholder="🔍 Rechercher une compétition..."
          value={search}
          onChange={(e) =>
            setSearch(
              e.target.value
            )
          }
        />

        <FilterSelect
          value={
            statusFilter
          }
          onChange={(e) =>
            setStatusFilter(
              e.target.value
            )
          }
        >
          <option value="all">
            Tous les statuts
          </option>

          {STATUS_OPTIONS.map(
            (status) => (
              <option
                key={status}
                value={status}
              >
                {status}
              </option>
            )
          )}
        </FilterSelect>

        <FilterSelect
          value={gameFilter}
          onChange={(e) =>
            setGameFilter(
              e.target.value
            )
          }
        >
          <option value="all">
            Tous les jeux
          </option>

          {GAME_OPTIONS.map(
            (game) => (
              <option
                key={game}
                value={game}
              >
                {game}
              </option>
            )
          )}
        </FilterSelect>
      </FiltersContainer>

      <TournamentsList>
        {loading &&
        filteredCompetitions.length ===
          0 ? (
          <NoData>
            ⏳ Chargement...
          </NoData>
        ) : filteredCompetitions.length ===
          0 ? (
          <NoData>
            Aucune compétition trouvée.
          </NoData>
        ) : (
          filteredCompetitions.map(
            (t) => (
              <TournamentCard
                key={t.id}
              >
                <TournamentInfo>
                  <TournamentName>
                    {t.title}
                  </TournamentName>

                  <TournamentMeta>
                    🎮 Jeu :
                    <strong>
                      {" "}
                      {
                        t.game_type
                      }
                    </strong>
                  </TournamentMeta>

                  <TournamentMeta>
                    🧩 Bracket :
                    <strong>
                      {" "}
                      {
                        t.bracket_type
                      }
                    </strong>
                  </TournamentMeta>

                  
                  <TournamentMeta>
                    ⚔️ Match :
                    <strong>
                      {" "}
                      {t.match_type ||
                        "BO1"}
                    </strong>
                  </TournamentMeta>

                  <TournamentMeta>
                    📅{" "}
                    {t.date
                      ? new Date(
                          t.date
                        ).toLocaleDateString(
                          "fr-FR"
                        )
                      : t.start_time
                      ? new Date(
                          t.start_time
                        ).toLocaleDateString(
                          "fr-FR"
                        )
                      : "Date inconnue"}
                  </TournamentMeta>

                  <TournamentMeta>
                    👤{" "}
                    {t.current_players ||
                      0}
                    /
                    {t.max_players ||
                      0}{" "}
                    joueurs
                  </TournamentMeta>

                  <TournamentMeta>
                    💵 Entrée :{" "}
                    {Number(
                      t.entry_fee ||
                        0
                    ).toLocaleString(
                      "fr-FR"
                    )}{" "}
                    CDF
                  </TournamentMeta>

                  <TournamentMeta>
                    🏆 Cagnotte :{" "}
                    {Number(
                      t.prize_pool ||
                        0
                    ).toLocaleString(
                      "fr-FR"
                    )}{" "}
                    CDF
                  </TournamentMeta>

                  <TournamentMeta>
                    📌 Statut :{" "}
                    <Status
                      color={getStatusColor(
                        t.status
                      )}
                    >
                      {STATUS_LABELS[t.status] || t.status}
                    </Status>
                  </TournamentMeta>

                  {t.description && (
                    <Description>
                      {
                        t.description
                      }
                    </Description>
                  )}
                </TournamentInfo>

                <Actions>
                  <ActionButton
                    onClick={() =>
                      handleEdit(
                        t
                      )
                    }
                  >
                    ✏️ Modifier
                  </ActionButton>

                  <DeleteButton
                    onClick={() =>
                      handleDelete(
                        t.id
                      )
                    }
                  >
                    🗑 Supprimer
                  </DeleteButton>
                </Actions>
              </TournamentCard>
            )
          )
        )}
      </TournamentsList>
    </PageContainer>
  );
}

// ======================================================
// STYLES
// ======================================================

const PageContainer = styled.div`
  padding: 2rem;
  min-height: 100vh;
  color: white;
`;

const Header = styled.div`
  margin-bottom: 2rem;
`;

const HeaderTitle = styled.h1`
  font-size: 2.4rem;
  font-weight: 800;
  margin-bottom: 0.5rem;

  background: linear-gradient(
    135deg,
    #f59e0b,
    #f97316
  );

  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const HeaderSubtitle = styled.p`
  color: #94a3b8;
  font-size: 15px;
`;

const Alert = styled.div`
  padding: 1rem;
  border-radius: 14px;
  margin-bottom: 1rem;
  font-weight: 600;

  background: ${({ $type }) =>
    $type === "error"
      ? "rgba(239,68,68,0.15)"
      : "rgba(34,197,94,0.15)"};

  border: 1px solid
    ${({ $type }) =>
      $type === "error"
        ? "rgba(239,68,68,0.4)"
        : "rgba(34,197,94,0.4)"};

  color: ${({ $type }) =>
    $type === "error"
      ? "#fca5a5"
      : "#86efac"};
`;

const FormContainer = styled.form`
  background: rgba(
    255,
    255,
    255,
    0.05
  );

  border: 1px solid
    rgba(255, 255, 255, 0.08);

  backdrop-filter: blur(10px);

  padding: 2rem;
  border-radius: 24px;
  margin-bottom: 2rem;
`;

const FormTitle = styled.h3`
  margin-bottom: 1.5rem;
  font-size: 1.4rem;
  font-weight: 700;
`;

const Grid = styled.div`
  display: grid;

  grid-template-columns: repeat(
    auto-fit,
    minmax(240px, 1fr)
  );

  gap: 1rem;
`;

const Input = styled.input`
  padding: 14px 16px;

  border-radius: 14px;

  border: 1px solid
    rgba(255, 255, 255, 0.08);

  background: rgba(
    255,
    255,
    255,
    0.05
  );

  color: white;
  outline: none;
  font-size: 15px;

  &:focus {
    border-color: #f59e0b;
  }

  &::placeholder {
    color: #94a3b8;
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  margin-top: 1rem;

  padding: 14px 16px;

  border-radius: 14px;

  border: 1px solid
    rgba(255, 255, 255, 0.08);

  background: rgba(
    255,
    255,
    255,
    0.05
  );

  color: white;
  outline: none;
  resize: vertical;

  &:focus {
    border-color: #f59e0b;
  }

  &::placeholder {
    color: #94a3b8;
  }
`;

const Select = styled.select`
  padding: 14px 16px;

  border-radius: 14px;

  border: 1px solid
    rgba(255, 255, 255, 0.08);

  background: rgba(
    15,
    23,
    42,
    0.95
  );

  color: white;
  outline: none;
  font-size: 15px;

  &:focus {
    border-color: #f59e0b;
  }
`;

const ButtonsRow = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  margin-top: 1.5rem;
`;

const SubmitButton = styled.button`
  padding: 14px 20px;

  border: none;
  border-radius: 14px;

  background: linear-gradient(
    135deg,
    #f59e0b,
    #ea580c
  );

  color: white;
  font-weight: 700;
  cursor: pointer;
  transition: 0.2s;

  &:hover {
    transform: translateY(-2px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const CancelButton = styled.button`
  padding: 14px 20px;

  border: none;
  border-radius: 14px;

  background: rgba(
    239,
    68,
    68,
    0.2
  );

  color: #fca5a5;
  font-weight: 700;
  cursor: pointer;
`;

const FiltersContainer = styled.div`
  display: grid;

  grid-template-columns: 2fr 1fr 1fr;

  gap: 1rem;
  margin-bottom: 1.5rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const SearchInput = styled(Input)`
  width: 100%;
`;

const FilterSelect = styled(Select)`
  width: 100%;
`;

const TournamentsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const TournamentCard = styled.div`
  background: rgba(
    255,
    255,
    255,
    0.05
  );

  border: 1px solid
    rgba(255, 255, 255, 0.08);

  backdrop-filter: blur(10px);

  border-radius: 20px;
  padding: 1.5rem;

  display: flex;

  justify-content: space-between;
  align-items: center;

  gap: 1rem;
  flex-wrap: wrap;
`;

const TournamentInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const TournamentName = styled.h2`
  margin: 0;
  font-size: 1.3rem;
  font-weight: 800;
`;

const TournamentMeta = styled.div`
  color: #cbd5e1;
  font-size: 14px;
`;

const Description = styled.p`
  margin-top: 0.5rem;
  color: #94a3b8;
  line-height: 1.5;
`;

const Status = styled.span`
  font-weight: 700;
  color: ${(props) =>
    props.color};
`;

const Actions = styled.div`
  display: flex;
  gap: 0.8rem;
  flex-wrap: wrap;
`;

const ActionButton = styled.button`
  padding: 12px 16px;

  border: none;
  border-radius: 12px;

  background: linear-gradient(
    135deg,
    #2563eb,
    #1d4ed8
  );

  color: white;
  font-weight: 700;
  cursor: pointer;
`;

const DeleteButton = styled.button`
  padding: 12px 16px;

  border: none;
  border-radius: 12px;

  background: linear-gradient(
    135deg,
    #dc2626,
    #b91c1c
  );

  color: white;
  font-weight: 700;
  cursor: pointer;
`;

const NoData = styled.div`
  padding: 2rem;
  text-align: center;

  border-radius: 16px;

  background: rgba(
    255,
    255,
    255,
    0.05
  );

  color: #94a3b8;
`;