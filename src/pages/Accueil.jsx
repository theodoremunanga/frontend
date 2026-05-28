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
import styles from "./accueilStyles";

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

  const [isOffline, setIsOffline] = useState(
    typeof navigator !== "undefined"
      ? !navigator.onLine
      : false
    );

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

          console.log("HOME ADS:", ads);

        setFeedAds(ads || []);
      } catch (err) {
        console.error(
          "❌ Error loading ads:",
          err
        );
      } finally {
        
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
const fetchData = useCallback(
  async (silent = false) => {
    if (!token) return;

    if (isFetching.current) return;

    if (isOffline) {
      setError("📡 Vous êtes hors ligne");
      return;
    }

    isFetching.current = true;

    if (!silent) {
      setLoading(true);
    }

    try {
      const headers = {
        Authorization: "Bearer " + token,
      };

      const [openRes, myRes] = await Promise.all([
        fetch(`${API}/match/open`, {
          headers,
        }),

        fetch(`${API}/match/my-active`, {
          headers,
        }),
      ]);

      if (
        openRes.status === 401 ||
        myRes.status === 401
      ) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        setError("🔒 Session expirée");
        return;
      }

      const [openData, myData] =
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
  },
  [API, token, isOffline]
);

// ================= INITIAL LOAD =================
useEffect(() => {
  fetchData();
}, [fetchData]);

// ================= AUTO REFRESH =================
useEffect(() => {
  const interval = setInterval(() => {
    if (
      document.visibilityState ===
      "visible"
    ) {
      fetchData(true);
    }
  }, 15000);

  return () => clearInterval(interval);
}, [fetchData]);

// ================= RECONNECT =================
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
    <div style={styles.container}>
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
                                m.bet_amount,
                                u.username
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
                                m.username 
                                  || "Joueur"
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
                                m.bet_amount,
                                  u.username
                              }{" "}
                              CDF
                            </h3>

                            <div
                              style={
                                smallText
                              }
                            >
                              👤{" "}
                              {m.username ||
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

