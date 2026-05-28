import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";

import socket from "../socket";

import SponsoredBanner from "../components/ads/SponsoredBanner";
import AdCarousel from "../components/ads/AdCarousel";
import AdComments from "../components/ads/AdComments";

import {
  getHomeFeedAds,
  trackAdView,
  openAdLink,
} from "../services/adService";

// ================= GAMES =================
const games = [
  {
    name: "Dames",
    icon: "♟️",
    id: "dames",
    available: true,
    description:
      "Le jeu officiel actuellement disponible sur 6BetBall.",
    players: "2 Joueurs",
    difficulty: "PRO",
  },

  {
    name: "Football",
    icon: "⚽",
    id: "football",
    available: false,
    description:
      "Disponible prochainement dans une future mise à jour.",
  },

  {
    name: "Jeu de six",
    icon: "🎲",
    id: "six",
    available: false,
    description:
      "Disponible prochainement dans une future mise à jour.",
  },

  {
    name: "Cartes",
    icon: "🃏",
    id: "cartes",
    available: false,
    description:
      "Disponible prochainement dans une future mise à jour.",
  },
];

export default function Accueil({
  setPage,
  setGameConfig,
}) {
  // ================= STATES =================
  const [inputs, setInputs] =
    useState({});

  const [error, setError] =
    useState("");

  const [
    openChallenges,
    setOpenChallenges,
  ] = useState([]);

  const [myGames, setMyGames] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [
    isOffline,
    setIsOffline,
  ] = useState(
    !navigator.onLine
  );

  // ================= ADS =================
  const [feedAds, setFeedAds] =
    useState([]);

  const [loadingAds, setLoadingAds] =
    useState(true);

  const viewedAds = useRef(
    new Set()
  );

  const isFetching = useRef(false);

  const MIN_BET = 500;

  const token =
    localStorage.getItem("token");

  const username =
    localStorage.getItem(
      "username"
    ) || "Joueur";

  const role =
    localStorage.getItem("role") ||
    "PLAYER";

  // ================= API =================
  const API = (
    import.meta.env
      .VITE_API_URL ||
    "https://backend-ad3t.onrender.com/api"
  ).replace(/\/+$/, "");

  const BASE_URL = API.replace(
    /\/api$/,
    ""
  );

  // ================= OFFLINE BANNER =================
  const offlineBanner = {
    background:
      "linear-gradient(to right,#b45309,#d97706)",
    padding: 14,
    borderRadius: 14,
    marginBottom: 20,
    textAlign: "center",
    fontWeight: "bold",
  };

  // ================= NETWORK LISTENER =================
  useEffect(() => {
    const goOnline = () => {
      setIsOffline(false);
    };

    const goOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener(
      "online",
      goOnline
    );

    window.addEventListener(
      "offline",
      goOffline
    );

    return () => {
      window.removeEventListener(
        "online",
        goOnline
      );

      window.removeEventListener(
        "offline",
        goOffline
      );
    };
  }, []);

  // ================= LOAD ADS =================
  useEffect(() => {
    const loadAds = async () => {
      try {
        const ads =
          await getHomeFeedAds();

        setFeedAds(ads || []);
      } catch (err) {
        console.error(
          "❌ Error loading ads:",
          err
        );
      } finally {
        setLoadingAds(false);
      }
    };

    loadAds();
  }, []);

  // ================= TRACK VIEW =================
  const handleAdView = async (
    id
  ) => {
    if (!id) return;

    if (
      viewedAds.current.has(id)
    )
      return;

    viewedAds.current.add(id);

    try {
      await trackAdView(id);
    } catch (err) {
      console.error(
        "Track ad failed:",
        err
      );
    }
  };

  // ================= LOAD DATA =================
  const fetchData = useCallback(
    async (
      silent = false
    ) => {
      if (!token) {
        setLoading(false);
        return;
      }

      if (
        isFetching.current
      )
        return;

      if (isOffline) {
        setError(
          "📡 Vous êtes hors ligne"
        );
        return;
      }

      isFetching.current = true;

      if (!silent) {
        setLoading(true);
      }

      try {
        const headers = {
          Authorization:
            "Bearer " + token,
        };

        const [
          openRes,
          myRes,
        ] =
          await Promise.all([
            fetch(
              `${API}/match/open`,
              {
                headers,
              }
            ),

            fetch(
              `${API}/match/my-active`,
              {
                headers,
              }
            ),
          ]);

        if (
          openRes.status ===
            401 ||
          myRes.status === 401
        ) {
          localStorage.removeItem(
            "token"
          );

          localStorage.removeItem(
            "user"
          );

          setError(
            "🔒 Session expirée"
          );

          setLoading(false);

          return;
        }

        const [
          openData,
          myData,
        ] =
          await Promise.all([
            openRes
              .json()
              .catch(() => ({})),

            myRes
              .json()
              .catch(() => ({})),
          ]);

        if (openRes.ok) {
          setOpenChallenges(
            openData.matches ||
              []
          );
        }

        if (myRes.ok) {
          setMyGames(
            myData.matches || []
          );
        }

        setError("");
      } catch (err) {
        console.error(
          "HOME FETCH ERROR:",
          err
        );

        setError(
          "❌ Connexion serveur impossible"
        );
      } finally {
        isFetching.current = false;
        setLoading(false);
      }
    },
    [token, isOffline, API]
  );

  // ================= INIT =================
  useEffect(() => {
    fetchData();

    const interval =
      setInterval(() => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          fetchData(true);
        }
      }, 15000);

    return () =>
      clearInterval(interval);
  }, [fetchData]);

  // ================= REFRESH WHEN BACK ONLINE =================
  useEffect(() => {
    if (!isOffline) {
      fetchData(true);
    }
  }, [isOffline, fetchData]);

  // ================= SOCKET REALTIME =================
  useEffect(() => {
    if (!token) return;

    const refreshFeed = () => {
      fetchData(true);
    };

    socket.on(
      "match_created",
      refreshFeed
    );

    socket.on(
      "match_joined",
      refreshFeed
    );

    socket.on(
      "match_finished",
      refreshFeed
    );

    return () => {
      socket.off(
        "match_created",
        refreshFeed
      );

      socket.off(
        "match_joined",
        refreshFeed
      );

      socket.off(
        "match_finished",
        refreshFeed
      );
    };
  }, [fetchData, token]);

  // ================= INPUTS =================
  const updateInput = (
    gameId,
    field,
    value
  ) => {
    setInputs((prev) => ({
      ...prev,

      [gameId]: {
        ...prev[gameId],
        [field]: value,
      },
    }));
  };

  const getAmount = (
    gameId
  ) =>
    inputs[gameId]?.amount || "";

  const getMode = (gameId) =>
    inputs[gameId]?.mode ||
    "user";

  const getJoId = (gameId) =>
    inputs[gameId]?.joId || "";

  // ================= GAME NAVIGATION =================
  const goToGame = (
    match
  ) => {
    if (!match?.id) {
      return setError(
        "❌ matchId invalide"
      );
    }

    setGameConfig({
      matchId: match.id,
      game: match.game,
      mode: "playing",
      bet:
        match.bet ||
        match.bet_amount,
    });

    setTimeout(
      () => setPage("game"),
      0
    );
  };

  // ================= JOIN =================
  const joinMatchById =
    async (match) => {
      if (!match?.id) return;

      if (isOffline) {
        return setError(
          "📡 Hors ligne"
        );
      }

      try {
        const res = await fetch(
          `${API}/match/join`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                "Bearer " +
                token,
            },

            body: JSON.stringify({
              matchId:
                match.id,
            }),
          }
        );

        const data =
          await res
            .json()
            .catch(() => ({}));

        if (
          !res.ok ||
          data.error
        ) {
          return setError(
            data?.error ||
              "❌ Impossible de rejoindre"
          );
        }

        await fetchData(true);

        goToGame({
          ...match,
          id:
            data.matchId ||
            match.id,
        });
      } catch (err) {
        console.error(err);

        setError(
          "❌ Connexion serveur"
        );
      }
    };

  // ================= CREATE =================
  const handleCreateChallenge =
    async (gameId) => {
      if (
        gameId !== "dames"
      ) {
        return setError(
          "🚧 Seul le jeu Dames est disponible actuellement."
        );
      }

      if (isOffline) {
        return setError(
          "📡 Hors ligne"
        );
      }

      const raw =
        getAmount(gameId);

      const amount = raw
        ? Number(raw)
        : null;

      const mode =
        getMode(gameId);

      const joId =
        getJoId(gameId);

      if (
        !amount ||
        amount < MIN_BET
      ) {
        return setError(
          `⚠️ Mise minimum : ${MIN_BET} CDF`
        );
      }

      if (
        mode === "jo" &&
        !joId
      ) {
        return setError(
          "⚠️ ID du JO requis"
        );
      }

      try {
        const res = await fetch(
          `${API}/match/create`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                "Bearer " +
                token,
            },

            body: JSON.stringify({
              game: gameId,
              bet: amount,
              mode,
              joId,
            }),
          }
        );

        const data =
          await res
            .json()
            .catch(() => ({}));

        if (
          !res.ok ||
          data?.error
        ) {
          return setError(
            data?.error ||
              "❌ Création échouée"
          );
        }

        await fetchData(true);

        if (
          mode === "user"
        ) {
          setGameConfig({
            matchId:
              data.matchId,
            game: gameId,
            mode: "waiting",
            bet: amount,
          });

          setTimeout(
            () =>
              setPage(
                "waiting"
              ),
            0
          );
        } else {
          goToGame({
            id: data.matchId,
            game: gameId,
            bet: amount,
          });
        }
      } catch (err) {
        console.error(err);

        setError(
          "❌ Connexion serveur"
        );
      }
    };

  // ================= FEED MERGE =================
  const feedSections =
    useMemo(() => {
      const sections = [
        {
          type: "myGames",
        },

        {
          type:
            "openChallenges",
        },

        {
          type: "games",
        },
      ];

      if (!feedAds.length)
        return sections;

      const merged = [];

      sections.forEach(
        (section, index) => {
          merged.push(section);

          if (
            feedAds[index]
          ) {
            merged.push({
              type: "ad",
              ad: feedAds[index],
            });
          }
        }
      );

      return merged;
    }, [feedAds]);

  // ================= STATS =================
  const stats = useMemo(() => {
    return {
      open:
        openChallenges.length,

      active:
        myGames.length,

      games: 1,
    };
  }, [
    openChallenges,
    myGames,
  ]);

  // ================= HELPERS =================
  const getGameLabel = (
    game
  ) => {
    switch (game) {
      case "dames":
        return "♟️ Dames";

      case "football":
        return "⚽ Football";

      case "cartes":
        return "🃏 Cartes";

      default:
        return `🎮 ${game}`;
    }
  };

  // ================= LOADING =================
  if (loading) {
    return (
      <div
        style={
          loadingContainer
        }
      >
        <div style={spinner}>
        </div>

        <h2>
          Chargement de
          6BetBall...
        </h2>
      </div>
    );
  }

  // ================= UI =================
  return (
    <div style={container}>
      <SponsoredBanner />

      <div style={hero}>
        <div
          style={
            heroOverlay
          }
        ></div>

        <div
          style={
            heroContent
          }
        >
          <div style={topBar}>
            <div>
              <h1
                style={title}
              >
                🎮 6BetBall
              </h1>

              <p
                style={
                  subtitle
                }
              >
                Plateforme
                compétitive
                nouvelle
                génération.
              </p>
            </div>

            <div
              style={
                profileCard
              }
            >
              <div
                style={
                  avatar
                }
              >
                👤
              </div>

              <div>
                <div
                  style={{
                    fontWeight:
                      "bold",
                  }}
                >
                  {
                    username
                  }
                </div>

                <div
                  style={{
                    fontSize: 12,
                    opacity: 0.8,
                  }}
                >
                  {role}
                </div>
              </div>
            </div>
          </div>

          <div
            style={
              statsGrid
            }
          >
            <StatCard
              value={
                stats.active
              }
              label="Mes parties"
              icon="🎮"
            />

            <StatCard
              value={
                stats.open
              }
              label="Défis ouverts"
              icon="🔥"
            />

            <StatCard
              value={
                stats.games
              }
              label="Jeu disponible"
              icon="♟️"
            />
          </div>
        </div>
      </div>

      <div
        style={
          adsWrapper
        }
      >
        <AdCarousel />
      </div>

      <div style={content}>
        {error && (
          <div
            style={
              errorStyle
            }
          >
            {error}
          </div>
        )}

        {isOffline && (
          <div
            style={
              offlineBanner
            }
          >
            📡 Mode hors ligne
          </div>
        )}

        {/* ================= MES PARTIES ================= */}

        <SectionTitle
          icon="🎮"
          title="Mes parties actives"
        />

        {myGames.length ===
        0 ? (
          <div
            style={
              emptyBox
            }
          >
            Aucune partie
            active
          </div>
        ) : (
          <div
            style={
              horizontalScroll
            }
          >
            {myGames.map(
              (m) => (
                <div
                  key={m.id}
                  style={
                    challengeCard
                  }
                >
                  <div
                    style={
                      gameBadge
                    }
                  >
                    {getGameLabel(
                      m.game
                    )}
                  </div>

                  <h3>
                    💰{" "}
                    {m.bet ||
                      m.bet_amount ||
                      0}{" "}
                    CDF
                  </h3>

                  <div
                    style={
                      smallText
                    }
                  >
                    👤{" "}
                    {m.creator_name ||
                      m.username ||
                      m.user_name ||
                      "Joueur"}
                  </div>

                  {m.opponent_name && (
                    <div
                      style={
                        smallText
                      }
                    >
                      ⚔️ vs{" "}
                      {
                        m.opponent_name
                      }
                    </div>
                  )}

                  <button
                    style={
                      primaryButton
                    }
                    onClick={() =>
                      goToGame(
                        m
                      )
                    }
                  >
                    ▶️
                    Reprendre
                  </button>
                </div>
              )
            )}
          </div>
        )}

        {/* ================= OPEN CHALLENGES ================= */}

        <SectionTitle
          icon="🔥"
          title="Défis disponibles"
        />

        {openChallenges.length ===
        0 ? (
          <div
            style={
              emptyBox
            }
          >
            Aucun défi
            disponible
          </div>
        ) : (
          <div
            style={
              horizontalScroll
            }
          >
            {openChallenges.map(
              (m) => (
                <div
                  key={m.id}
                  style={
                    challengeCard
                  }
                >
                  <div
                    style={
                      gameBadge
                    }
                  >
                    {getGameLabel(
                      m.game
                    )}
                  </div>

                  <h3>
                    💰{" "}
                    {m.bet ||
                      m.bet_amount ||
                      0}{" "}
                    CDF
                  </h3>

                  <div
                    style={
                      smallText
                    }
                  >
                    👤{" "}
                    {m.creator_name ||
                      m.username ||
                      m.user_name ||
                      "Joueur"}
                  </div>

                  <button
                    style={
                      joinButton
                    }
                    onClick={() =>
                      joinMatchById(
                        m
                      )
                    }
                  >
                    🔗
                    Rejoindre
                  </button>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ================= SMALL COMPONENTS =================
function StatCard({
  value,
  label,
  icon,
}) {
  return (
    <div style={statCard}>
      <div style={statIcon}>
        {icon}
      </div>

      <div style={statValue}>
        {value}
      </div>

      <div style={statLabel}>
        {label}
      </div>
    </div>
  );
}

function SectionTitle({
  icon,
  title,
}) {
  return (
    <div
      style={sectionTitle}
    >
      <span>{icon}</span>
      <span>{title}</span>
    </div>
  );
}

// ================= STYLES =================
const container = {
  minHeight: "100vh",
  background:
    "linear-gradient(to bottom, #020617, #0f172a)",
  color: "white",
};

const adsWrapper = {
  maxWidth: 1300,
  margin: "20px auto",
  padding: "0 20px",
};

const hero = {
  position: "relative",
  paddingBottom: 40,
  overflow: "hidden",
};

const heroOverlay = {
  position: "absolute",
  inset: 0,
  background:
    "radial-gradient(circle at top, rgba(59,130,246,0.35), transparent 60%)",
};

const heroContent = {
  position: "relative",
  zIndex: 2,
  maxWidth: 1300,
  margin: "0 auto",
  padding: "40px 20px",
};

const topBar = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
  gap: 20,
  flexWrap: "wrap",
};

const title = {
  fontSize: 52,
  fontWeight: 900,
  marginBottom: 10,
};

const subtitle = {
  opacity: 0.8,
  fontSize: 18,
};

const profileCard = {
  display: "flex",
  alignItems: "center",
  gap: 15,
  background:
    "rgba(255,255,255,0.08)",
  padding: "12px 18px",
  borderRadius: 20,
};

const avatar = {
  width: 50,
  height: 50,
  borderRadius: "50%",
  background:
    "linear-gradient(to bottom right, #2563eb, #7c3aed)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 22,
};

const statsGrid = {
  marginTop: 30,
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(180px,1fr))",
  gap: 20,
};

const statCard = {
  background:
    "rgba(255,255,255,0.06)",
  border:
    "1px solid rgba(255,255,255,0.08)",
  borderRadius: 24,
  padding: 24,
};

const statIcon = {
  fontSize: 26,
};

const statValue = {
  fontSize: 36,
  fontWeight: 900,
  marginTop: 12,
};

const statLabel = {
  opacity: 0.7,
};

const content = {
  maxWidth: 1300,
  margin: "0 auto",
  padding: "0 20px 60px",
};

const sectionTitle = {
  fontSize: 28,
  fontWeight: 900,
  marginBottom: 18,
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const horizontalScroll = {
  display: "flex",
  gap: 20,
  overflowX: "auto",
  paddingBottom: 10,
  marginBottom: 40,
};

const challengeCard = {
  minWidth: 250,
  background:
    "linear-gradient(to bottom, rgba(30,41,59,0.95), rgba(15,23,42,0.95))",
  borderRadius: 26,
  padding: 24,
  border:
    "1px solid rgba(255,255,255,0.06)",
  display: "flex",
  flexDirection: "column",
  gap: 14,
};

const gameBadge = {
  background: "#2563eb",
  width: "fit-content",
  padding: "6px 12px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: "bold",
};

const smallText = {
  fontSize: 13,
  opacity: 0.8,
};

const primaryButton = {
  marginTop: 10,
  padding: 14,
  borderRadius: 14,
  border: "none",
  background:
    "linear-gradient(to right, #22c55e, #16a34a)",
  color: "white",
  fontWeight: "bold",
  cursor: "pointer",
};

const joinButton = {
  ...primaryButton,
  background:
    "linear-gradient(to right, #2563eb, #1d4ed8)",
};

const emptyBox = {
  background:
    "rgba(255,255,255,0.05)",
  padding: 25,
  borderRadius: 24,
  textAlign: "center",
  opacity: 0.7,
  marginBottom: 40,
};

const errorStyle = {
  background:
    "linear-gradient(to right, #7f1d1d, #991b1b)",
  padding: 16,
  borderRadius: 18,
  marginBottom: 25,
  textAlign: "center",
  fontWeight: "bold",
};

const loadingContainer = {
  minHeight: "100vh",
  background: "#020617",
  color: "white",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  gap: 20,
};

const spinner = {
  width: 70,
  height: 70,
  border:
    "6px solid rgba(255,255,255,0.1)",
  borderTop:
    "6px solid #2563eb",
  borderRadius: "50%",
};