import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";

import socket from "../socket";

const fetchData = useCallback(
  async (silent = false) => {
},
[api, token, isOffline]
);

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
  const [inputs, setInputs] = useState({});
  const [error, setError] = useState("");

  const [openChallenges, setOpenChallenges] =
    useState([]);

  const [myGames, setMyGames] = useState([]);

  const [loading, setLoading] =
    useState(true);

  // ================= ADS =================
  const [feedAds, setFeedAds] =
    useState([]);

  const [loadingAds, setLoadingAds] =
    useState(true);

  const viewedAds = useRef(new Set());

  const MIN_BET = 500;

  const token =
    localStorage.getItem("token");

  const username =
    localStorage.getItem("username") ||
    "Joueur";

  const role =
    localStorage.getItem("role") ||
    "PLAYER";

  const offlineBanner = {
   background:
     "linear-gradient(to right,#b45309,#d97706)",
   padding: 14,
   borderRadius: 14,
   marginBottom: 20,
   textAlign: "center",
   fontWeight: "bold",
 };

 const API = (
  import.meta.env.VITE_API_URL ||
  "https://backend-ad3t.onrender.com/api"
).replace(/\/+$/, "");

  const BASE_URL = API.replace(
    /\/api$/,
    ""
  );

  const isFetching = useRef(false);

  // ================= LOAD ADS =================
  useEffect(() => {
    const loadAds = async () => {
      try {
        const ads =
          await getHomeFeedAds();

          console.log("HOME ADS:", ads);

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
  const handleAdView = async (id) => {
    if (!id) return;

    if (viewedAds.current.has(id)) return;

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
  const fetchData = async (
    silent = false
  ) => {
   if (!token) return;

   if (isFetching.current) return;

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
    ] = await Promise.all([
      fetch(`${API}/match/open`, {
        headers,
      }),

      fetch(
        `${API}/match/my-active`,
        {
          headers,
        }
      ),
    ]);

    if (
      openRes.status === 401 ||
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

      return;
    }

    const [
      openData,
      myData,
    ] = await Promise.all([
      openRes
        .json()
        .catch(() => ({})),

      myRes
        .json()
        .catch(() => ({})),
    ]);

    if (openRes.ok) {
      setOpenChallenges(
        openData.matches || []
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
};

 useEffect(() => {
  fetchData();

  const interval = setInterval(
    () => {
      if (
        document.visibilityState ===
        "visible"
      ) {
        fetchData(true);
      }
    },
    15000
  );

  useEffect(() => {
  if (!isOffline) {
    fetchData(true);
  }
  }, [isOffline, fetchData]);

  return () =>
    clearInterval(interval);
}, [fetchData]);

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

  const getAmount = (gameId) =>
    inputs[gameId]?.amount || "";

  const getMode = (gameId) =>
    inputs[gameId]?.mode || "user";

  const getJoId = (gameId) =>
    inputs[gameId]?.joId || "";

  // ================= GAME NAVIGATION =================
  const goToGame = (match) => {
    if (!match?.id) {
      return setError(
        "❌ matchId invalide"
      );
    }

    setGameConfig({
      matchId: match.id,
      game: match.game,
      mode: "playing",
      bet: match.bet,
    });

    setTimeout(
      () => setPage("game"),
      0
    );
  };

  // ================= JOIN =================
  const joinMatchById = async (
    match
  ) => {
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
              "Bearer " + token,
          },

          body: JSON.stringify({
            matchId: match.id,
          }),
        }
      );

      const data = await res
        .json()
        .catch(() => ({}));

      if (!res.ok || data.error) {
        return setError(
          data?.error ||
            "❌ Impossible de rejoindre"
        );
      }

      const joinedMatch = {
        id:
          data.matchId || match.id,

        game: match.game,
        bet: match.bet,
      };

      await fetchData();

      goToGame(joinedMatch);
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
      if (gameId !== "dames") {
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

      const mode = getMode(gameId);

      const joId = getJoId(gameId);

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
                "Bearer " + token,
            },

            body: JSON.stringify({
              game: gameId,
              bet: amount,
              mode,
              joId,
            }),
          }
        );

        const data = await res
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

        if (!data?.matchId) {
          return setError(
            "❌ matchId manquant"
          );
        }

        const match = {
          id: data.matchId,
          game: gameId,
          bet: amount,
        };

        await fetchData();

        if (mode === "user") {
          setGameConfig({
            matchId: match.id,
            game: gameId,
            mode: "waiting",
            bet: amount,
          });

          setTimeout(
            () => setPage("waiting"),
            0
          );
        } else if (
          mode === "ai"
        ) {
          await fetch(
            `${API}/bot/create`,
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
                matchId: match.id,
                level: "hard",
                user_id: 999,
              }),
            }
          );

          goToGame(match);
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
          type: "openChallenges",
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
            (index + 1) % 1 === 0 &&
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

      active: myGames.length,

      games: 1,
    };
  }, [
    openChallenges,
    myGames,
  ]);

  // ================= LOADING =================
  if (loading) {
    return (
      <div style={loadingContainer}>
        <div style={spinner}></div>

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
      {/* ================= ADS TOP ================= */}
      <SponsoredBanner />

      {/* ================= HERO ================= */}
      <div style={hero}>
        <div style={heroOverlay}></div>

        <div style={heroContent}>
          <div style={topBar}>
            <div>
              <h1 style={title}>
                🎮 6BetBall
              </h1>

              <p style={subtitle}>
                Plateforme
                compétitive nouvelle
                génération.
                Authentique,
                Honnête et Sûre !
              </p>
            </div>

            <div style={profileCard}>
              <div style={avatar}>
                👤
              </div>

              <div>
                <div
                  style={{
                    fontWeight:
                      "bold",
                  }}
                >
                  {username}
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

          {/* STATS */}
          <div style={statsGrid}>
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

      {/* ================= ADS CAROUSEL ================= */}
      <div style={adsWrapper}>
        <AdCarousel />
      </div>

      {/* ================= CONTENT ================= */}
      <div style={content}>
        {error && (
          <div style={errorStyle}>
            {error}
          </div>
        )}

        {isOffline && (
          <div style={offlineBanner}>
            📡 Mode hors ligne
          </div>
        )}

        {/* ================= DYNAMIC FEED ================= */}
        {feedSections.map(
          (section, index) => {
            // ================= AD =================
            if (
              section.type === "ad"
            ) {
              const ad =
                section.ad;

              return (
                <div
                  key={`ad-${ad.id}`}
                  onMouseEnter={() =>
                    handleAdView(
                      ad.id
                    )
                  }
                  style={feedAdCard}
                >
                  <div
                    style={
                      adTop
                    }
                  >
                    <div
                      style={
                        sponsoredBadge
                      }
                    >
                      Sponsored
                    </div>

                    {ad.advertiser && (
                      <div
                        style={
                          advertiserName
                        }
                      >
                        {
                          ad.advertiser
                        }
                      </div>
                    )}
                  </div>

                  <h2
                    style={
                      adTitle
                    }
                  >
                    {ad.title}
                  </h2>

                  {ad.image && (
                    <img
                      src={
                        ad.image.startsWith("http")
                          ? ad.image
                          : `${BASE_URL}${ad.image}`
                  }
                  alt={ad.title}
                  style={adImage}
                  onError={(e) =>
                    console.log(
                      "❌ IMAGE ERROR:",
                     e.target.src
                    )
                  }
               />
             )}

                  <p
                    style={
                      adDescription
                    }
                  >
                    {
                      ad.description
                    }
                  </p>

                  {ad.link && (
                    <button
                      style={adButton}
                      onClick={() =>
                        openAdLink(ad)
                      }
                    >
                     🔗 Voir plus
                    </button>
                 )}

                <AdComments
                  ad={ad}
                  currentUser={{
                    username,
                  }}
               />
                </div>
              );
            }

            // ================= MY GAMES =================
            if (
              section.type ===
              "myGames"
            ) {
              return (
                <div
                  key={`section-${index}`}
                >
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
                      actuellement
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
                            key={
                              m.id
                            }
                            style={
                              challengeCard
                            }
                          >
                            <div
                              style={
                                gameBadge
                              }
                            >
                              ♟️
                              Dames
                            </div>

                            <h3>
                              💰{" "}
                              {
                                m.bet
                              }{" "}
                              CDF
                            </h3>

                            <div
                              style={
                                smallText
                              }
                            >
                              👤{" "}
                              {
                                m.creator_name
                              }
                            </div>

                            {m.opponent_name && (
                              <div
                                style={
                                  smallText
                                }
                              >
                                ⚔️
                                vs{" "}
                                {
                                  m.opponent_name
                                }
                              </div>
                            )}

                            <div
                              style={{
                                ...statusBadge,

                                background:
                                  m.status ===
                                  "waiting"
                                    ? "#f59e0b"
                                    : "#22c55e",
                              }}
                            >
                              {m.status ===
                              "waiting"
                                ? "EN ATTENTE"
                                : "PRÊT"}
                            </div>

                            {m.status ===
                            "waiting" ? (
                              <button
                                style={
                                  disabledButton
                                }
                                disabled
                              >
                                ⏳ En
                                attente
                              </button>
                            ) : (
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
                            )}
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              );
            }

            // ================= OPEN CHALLENGES =================
            if (
              section.type ===
              "openChallenges"
            ) {
              return (
                <div
                  key={`section-${index}`}
                >
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
                            key={
                              m.id
                            }
                            style={
                              challengeCard
                            }
                          >
                            <div
                              style={
                                gameBadge
                              }
                            >
                              ♟️
                              Dames
                            </div>

                            <h3>
                              💰{" "}
                              {
                                m.bet
                              }{" "}
                              CDF
                            </h3>

                            <div
                              style={
                                smallText
                              }
                            >
                              👤{" "}
                              {m.creator_name ||
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
              );
            }

            // ================= GAMES =================
            if (
              section.type ===
              "games"
            ) {
              return (
                <div
                  key={`section-${index}`}
                >
                  <SectionTitle
                    icon="🎲"
                    title="Jeux disponibles"
                  />

                  <div
                    style={grid}
                  >
                    {games.map(
                      (game) => {
                        const disabled =
                          !game.available;

                        return (
                          <div
                            key={
                              game.id
                            }
                            style={{
                              ...gameCard,

                              opacity:
                                disabled
                                  ? 0.55
                                  : 1,

                              border:
                                disabled
                                  ? "1px solid rgba(255,255,255,0.05)"
                                  : "1px solid rgba(59,130,246,0.4)",
                            }}
                          >
                            <div
                              style={
                                gameTop
                              }
                            >
                              <div
                                style={
                                  gameIcon
                                }
                              >
                                {
                                  game.icon
                                }
                              </div>

                              <div>
                                <h2>
                                  {
                                    game.name
                                  }
                                </h2>

                                <p
                                  style={
                                    gameDescription
                                  }
                                >
                                  {
                                    game.description
                                  }
                                </p>
                              </div>
                            </div>

                            <div
                              style={{
                                ...availabilityBadge,

                                background:
                                  game.available
                                    ? "#22c55e"
                                    : "#ef4444",
                              }}
                            >
                              {game.available
                                ? "🟢 DISPONIBLE"
                                : "🚧 BIENTÔT"}
                            </div>

                            {disabled ? (
                              <div
                                style={
                                  disabledContainer
                                }
                              >
                                <div
                                  style={
                                    disabledText
                                  }
                                >
                                  Ce
                                  jeu
                                  sera
                                  disponible
                                  prochainement
                                  sur
                                  6BetBall.
                                </div>

                                <button
                                  style={
                                    disabledButtonLarge
                                  }
                                  disabled
                                >
                                  🔒
                                  Indisponible
                                </button>
                              </div>
                            ) : (
                              <>
                                <input
                                  type="number"
                                  placeholder="💰 Mise"
                                  value={getAmount(
                                    game.id
                                  )}
                                  onChange={(
                                    e
                                  ) =>
                                    updateInput(
                                      game.id,
                                      "amount",
                                      e
                                        .target
                                        .value
                                    )
                                  }
                                  style={
                                    input
                                  }
                                />

                                <select
                                  value={getMode(
                                    game.id
                                  )}
                                  onChange={(
                                    e
                                  ) =>
                                    updateInput(
                                      game.id,
                                      "mode",
                                      e
                                        .target
                                        .value
                                    )
                                  }
                                  style={
                                    input
                                  }
                                >
                                  <option value="user">
                                    👤
                                    vs
                                    Joueur
                                  </option>

                                  <option value="ai">
                                    🤖
                                    vs
                                    IA
                                  </option>

                                  <option value="jo">
                                    🧑‍💼
                                    via
                                    JO
                                  </option>
                                </select>

                                {getMode(
                                  game.id
                                ) ===
                                  "jo" && (
                                  <input
                                    type="text"
                                    placeholder="ID du JO"
                                    value={getJoId(
                                      game.id
                                    )}
                                    onChange={(
                                      e
                                    ) =>
                                      updateInput(
                                        game.id,
                                        "joId",
                                        e
                                          .target
                                          .value
                                      )
                                    }
                                    style={
                                      input
                                    }
                                  />
                                )}

                                <button
                                  onClick={() =>
                                    handleCreateChallenge(
                                      game.id
                                    )
                                  }
                                  style={
                                    launchButton
                                  }
                                >
                                  🎯
                                  Lancer
                                  Partie
                                </button>
                              </>
                            )}
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              );
            }

            return null;
          }
        )}

        {/* ================= FOOTER ================= */}
        <div style={footer}>
          <div>
            🎮 6BetBall © 2026
          </div>

          <div
            style={{
              opacity: 0.7,
              marginTop: 6,
            }}
          >
            Plateforme
            compétitive sécurisée
          </div>
        </div>
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
    <div style={sectionTitle}>
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

const feedAdCard = {
  background:
    "linear-gradient(to bottom, rgba(30,41,59,0.96), rgba(15,23,42,0.96))",
  borderRadius: 28,
  padding: 24,
  marginBottom: 40,
  border:
    "1px solid rgba(255,255,255,0.08)",
};

const adTop = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 18,
};

const sponsoredBadge = {
  background:
    "linear-gradient(to right,#eab308,#f59e0b)",
  color: "#111827",
  padding: "6px 12px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: "bold",
};

const advertiserName = {
  opacity: 0.7,
  fontSize: 14,
};

const adTitle = {
  fontSize: 28,
  fontWeight: 900,
  marginBottom: 20,
};

const adImage = {
  width: "100%",
  borderRadius: 20,
  marginBottom: 20,
  maxHeight: 450,
  objectFit: "cover",
};

const adDescription = {
  opacity: 0.85,
  lineHeight: 1.7,
  marginBottom: 20,
};

const adButton = {
  padding: "14px 22px",
  border: "none",
  borderRadius: 16,
  background:
    "linear-gradient(to right,#2563eb,#4f46e5)",
  color: "white",
  fontWeight: "bold",
  cursor: "pointer",
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
  justifyContent: "space-between",
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
  background: "rgba(255,255,255,0.08)",
  padding: "12px 18px",
  borderRadius: 20,
  backdropFilter: "blur(12px)",
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
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 24,
  padding: 24,
  backdropFilter: "blur(10px)",
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
  border: "1px solid rgba(255,255,255,0.06)",
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

const statusBadge = {
  padding: "6px 10px",
  borderRadius: 999,
  width: "fit-content",
  fontSize: 12,
  fontWeight: "bold",
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

const disabledButton = {
  ...primaryButton,
  background: "#475569",
  cursor: "not-allowed",
};

const grid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(340px,1fr))",
  gap: 25,
};

const emptyBox = {
  background: "rgba(255,255,255,0.05)",
  padding: 25,
  borderRadius: 24,
  textAlign: "center",
  opacity: 0.7,
  marginBottom: 40,
};

const footer = {
  marginTop: 70,
  paddingTop: 30,
  borderTop:
    "1px solid rgba(255,255,255,0.08)",
  textAlign: "center",
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
  border: "6px solid rgba(255,255,255,0.1)",
  borderTop: "6px solid #2563eb",
  borderRadius: "50%",
  animation: "spin 1s linear infinite",
};

const gameCard = {
  background:
    "linear-gradient(to bottom, rgba(30,41,59,0.95), rgba(15,23,42,0.95))",
  borderRadius: 30,
  padding: 28,
  boxShadow:
    "0 15px 40px rgba(0,0,0,0.25)",
};

const gameTop = {
  display: "flex",
  gap: 18,
  marginBottom: 20,
};

const gameIcon = {
  fontSize: 50,
};

const gameDescription = {
  opacity: 0.75,
  marginTop: 6,
  lineHeight: 1.5,
};

const availabilityBadge = {
  width: "fit-content",
  padding: "8px 14px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: "bold",
  marginBottom: 20,
};

const input = {
  width: "100%",
  padding: 15,
  marginBottom: 15,
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "#1e293b",
  color: "white",
  fontSize: 15,
};

const launchButton = {
  width: "100%",
  padding: 16,
  borderRadius: 18,
  border: "none",
  background:
    "linear-gradient(to right, #2563eb, #4f46e5)",
  color: "white",
  fontWeight: "bold",
  fontSize: 16,
  cursor: "pointer",
};

const disabledContainer = {
  display: "flex",
  flexDirection: "column",
  gap: 18,
};

const disabledText = {
  opacity: 0.7,
  lineHeight: 1.6,
};

const disabledButtonLarge = {
  width: "100%",
  padding: 16,
  borderRadius: 18,
  border: "none",
  background: "#334155",
  color: "#94a3b8",
  fontWeight: "bold",
};