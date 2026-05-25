import {
  useEffect,
  useMemo,
  useState,
} from "react";

import axios from "axios";

import { io } from "socket.io-client";

import styled, {
  keyframes,
} from "styled-components";

import {
  Trophy,
  Users,
  Wallet,
  Activity,
  PlayCircle,
  Timer,
  ShieldAlert,
  RefreshCw,
  Wifi,
  WifiOff,
  Lock,
  Swords,
  Coins,
  Flame,
} from "lucide-react";

// ======================================================
// CONFIG
// ======================================================

const BASE_URL =
  "http://192.168.42.106:3000";

const API =
  `${BASE_URL}/api/competitions`;

// ======================================================
// TOKEN
// ======================================================

function getToken() {
  return (
    localStorage.getItem("token") ||
    sessionStorage.getItem("token") ||
    ""
  );
}

// ======================================================
// AXIOS
// ======================================================

const api = axios.create({
  baseURL: API,
  timeout: 15000,
});

api.interceptors.request.use(
  (config) => {

    const token = getToken();

    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;
  },

  (error) =>
    Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,

  (error) => {

    if (
      error?.response?.status === 401
    ) {
      console.warn(
        "🔒 Unauthorized request"
      );
    }

    return Promise.reject(error);
  }
);

// ======================================================
// SOCKET
// ======================================================

const socket = io(BASE_URL, {
  transports: [
    "websocket",
    "polling",
  ],

  autoConnect: false,

  auth: {
    token: getToken(),
  },
});

// ======================================================
// HELPERS
// ======================================================

function formatCountdown(
  seconds
) {

  const mins = Math.floor(
    seconds / 60
  );

  const secs =
    seconds % 60;

  return `${String(
    mins
  ).padStart(2, "0")}:${String(
    secs
  ).padStart(2, "0")}`;
}

function formatMoney(value) {
  return Number(
    value || 0
  ).toLocaleString("fr-FR");
}

// ======================================================
// NORMALIZE
// ======================================================

function normalizeCompetition(
  competition
) {

  const currentPlayers =
    Number(
      competition.players_count ||
      competition.current_players ||
      competition.players?.length ||
      0
    );

  const maxPlayers =
    Number(
      competition.max_players || 2
    );

  // ======================================================
  // MATCH DATA
  // ======================================================

  const matchId =
    competition.match_id ||
    competition.firstMatchId ||
    competition.first_match_id ||
    competition.current_match_id ||
    null;

  const matches =
    competition.matches || [];

  // ======================================================
  // READY = MATCH EXISTS
  // ======================================================

  const ready =
    !!matchId;

  // ======================================================
  // COUNTDOWN
  // ======================================================

  const countdown =
    Number(
      competition.countdown ??
      competition.remaining_seconds ??
      600
    );

  return {
    ...competition,

    currentPlayers,

    maxPlayers,

    ready,

    countdown,

    match_id: matchId,

    matches,

    entry_fee:
      Number(
        competition.entry_fee || 0
      ),

    prize_pool:
      Number(
        competition.prize_pool || 0
      ),

    status:
      competition.status ||
      "WAITING",
  };
}

// ======================================================
// COMPONENT
// ======================================================

export default function Competitions() {

  // ======================================================
  // STATES
  // ======================================================

  const [competitions, setCompetitions] =
    useState([]);

  const [stats, setStats] =
    useState({
      total_competitions: 0,
      live_competitions: 0,
      total_prize_pool: 0,
    });

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [
    socketConnected,
    setSocketConnected,
  ] = useState(false);

  const [joiningId, setJoiningId] =
    useState(null);

  const [error, setError] =
    useState("");

  // ======================================================
  // FETCH
  // ======================================================

  async function fetchCompetitions(
    silent = false
  ) {

    try {

      if (!silent) {
        setLoading(true);
      }

      setRefreshing(true);

      setError("");

      console.log(
        "📡 Loading competitions..."
      );

      const [
        competitionsRes,
        statsRes,
      ] = await Promise.all([
        api.get("/"),
        api.get("/stats"),
      ]);

      console.log(
        "✅ competitions:",
        competitionsRes.data
      );

      let competitionsData = [];

      if (
        Array.isArray(
          competitionsRes.data
        )
      ) {

        competitionsData =
          competitionsRes.data;

      } else if (
        Array.isArray(
          competitionsRes.data
            ?.competitions
        )
      ) {

        competitionsData =
          competitionsRes.data
            .competitions;

      } else if (
        Array.isArray(
          competitionsRes.data
            ?.data
        )
      ) {

        competitionsData =
          competitionsRes.data
            .data;
      }

      const enriched =
        competitionsData.map(
          normalizeCompetition
        );

      setCompetitions(enriched);

      const statsData =
        statsRes.data?.stats ||
        statsRes.data ||
        {};

      setStats({
        total_competitions:
          statsData.total_competitions ||
          enriched.length,

        live_competitions:
          enriched.filter(
            (c) =>
              c.ready ||
              c.status ===
                "LIVE" ||
              c.status ===
                "IN_PROGRESS"
          ).length,

        total_prize_pool:
          statsData.total_prize_pool ||
          enriched.reduce(
            (sum, c) =>
              sum +
              Number(
                c.prize_pool || 0
              ),
            0
          ),
      });

    } catch (err) {

      console.error(
        "❌ competitions error:",
        err
      );

      console.error(
        "❌ response:",
        err?.response?.data
      );

      if (
        err?.response?.status === 401
      ) {

        setError(
          "Accès non autorisé."
        );

      } else {

        setError(
          err?.response?.data
            ?.message ||
            "Impossible de charger les compétitions."
        );
      }

    } finally {

      setLoading(false);

      setRefreshing(false);
    }
  }

  // ======================================================
  // SOCKET INIT
  // ======================================================

  useEffect(() => {

    fetchCompetitions();

    socket.auth = {
      token: getToken(),
    };

    socket.connect();

    socket.on(
      "connect",
      () => {

        console.log(
          "✅ Socket connected"
        );

        setSocketConnected(true);
      }
    );

    socket.on(
      "disconnect",
      () => {

        console.log(
          "❌ Socket disconnected"
        );

        setSocketConnected(false);
      }
    );

    socket.on(
      "competition_created",
      () =>
        fetchCompetitions(true)
    );

    socket.on(
      "competition_updated",
      () =>
        fetchCompetitions(true)
    );

    socket.on(
      "competition_deleted",
      () =>
        fetchCompetitions(true)
    );

    socket.on(
      "competition_ready",
      () =>
        fetchCompetitions(true)
    );

    socket.on(
      "player_joined",
      () =>
        fetchCompetitions(true)
    );

    socket.on(
      "match_created",
      () =>
        fetchCompetitions(true)
    );

    socket.on(
      "competition_started",
      () =>
        fetchCompetitions(true)
    );

    const interval =
      setInterval(() => {
        fetchCompetitions(true);
      }, 10000);

    return () => {

      clearInterval(interval);

      socket.removeAllListeners();

      socket.disconnect();
    };

  }, []);

  // ======================================================
  // COUNTDOWN
  // ======================================================

  useEffect(() => {

    const timer =
      setInterval(() => {

        setCompetitions(
          (prev) =>
            prev.map((c) => {

              if (
                !c.ready ||
                c.countdown <= 0
              ) {
                return c;
              }

              return {
                ...c,

                countdown:
                  c.countdown - 1,
              };
            })
        );

      }, 1000);

    return () =>
      clearInterval(timer);

  }, []);

  // ======================================================
  // JOIN
  // ======================================================

  async function joinCompetition(
    competitionId
  ) {

    try {

      const token =
        getToken();

      if (!token) {

        alert(
          "Veuillez vous connecter."
        );

        return;
      }

      setJoiningId(
        competitionId
      );

      const response =
        await api.post(
          `/${competitionId}/join`
        );

      console.log(
        "✅ joined:",
        response.data
      );

      alert(
        response?.data
          ?.message ||
          "Participation réussie."
      );

      fetchCompetitions(true);

    } catch (err) {

      console.error(
        "❌ join error:",
        err
      );

      console.error(
        "❌ join response:",
        err?.response?.data
      );

      alert(
        err?.response?.data
          ?.message ||
          err?.response?.data
            ?.error ||
          "Erreur participation."
      );

    } finally {

      setJoiningId(null);
    }
  }

  // ======================================================
  // PLAY
  // ======================================================

  function playCompetition(
    competition
  ) {

    if (!competition.match_id) {

      alert(
        "Match non encore généré."
      );

      return;
    }

    console.log(
      "🎮 MATCH:",
      competition
    );

    alert(
      `🎮 Match prêt : #${competition.match_id}`
    );

    // navigate(
    //   `/match/${competition.match_id}`
    // );
  }

  // ======================================================
  // SORT
  // ======================================================

  const sortedCompetitions =
    useMemo(() => {

      return [
        ...competitions,
      ].sort((a, b) => {

        if (
          a.ready &&
          !b.ready
        ) {
          return -1;
        }

        if (
          !a.ready &&
          b.ready
        ) {
          return 1;
        }

        return (
          b.prize_pool || 0
        ) - (
          a.prize_pool || 0
        );
      });

    }, [competitions]);

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <Container>

      {/* HERO */}

      <Hero>

        <HeroGlow />

        <HeroContent>

          <MainTitle>
            <Trophy size={42} />
            6BetBall Competitions
          </MainTitle>

          <Subtitle>
            Plateforme de compétitions
            eSport temps réel avec
            matchmaking intelligent,
            rounds automatiques,
            countdown live et forfait
            automatique.
          </Subtitle>

          <TopBar>

            <SocketStatus
              $connected={
                socketConnected
              }
            >

              {socketConnected ? (
                <>
                  <Wifi size={16} />
                  Temps réel actif
                </>
              ) : (
                <>
                  <WifiOff size={16} />
                  Hors ligne
                </>
              )}

            </SocketStatus>

            <RefreshButton
              onClick={() =>
                fetchCompetitions()
              }
            >

              <RefreshCw size={16} />

              {refreshing
                ? "Actualisation..."
                : "Actualiser"}

            </RefreshButton>

          </TopBar>

        </HeroContent>

      </Hero>

      {/* ERROR */}

      {error && (
        <ErrorBox>
          <Lock size={18} />
          {error}
        </ErrorBox>
      )}

      {/* STATS */}

      <StatsGrid>

        <StatCard>

          <StatIcon>
            <Trophy size={26} />
          </StatIcon>

          <StatValue>
            {
              stats.total_competitions
            }
          </StatValue>

          <StatLabel>
            Compétitions
          </StatLabel>

        </StatCard>

        <StatCard>

          <StatIcon>
            <Flame size={26} />
          </StatIcon>

          <StatValue>
            {
              stats.live_competitions
            }
          </StatValue>

          <StatLabel>
            Tournois actifs
          </StatLabel>

        </StatCard>

        <StatCard>

          <StatIcon>
            <Coins size={26} />
          </StatIcon>

          <StatValue>
            {formatMoney(
              stats.total_prize_pool
            )}{" "}
            CDF
          </StatValue>

          <StatLabel>
            Prize Pool
          </StatLabel>

        </StatCard>

      </StatsGrid>

      {/* LIST */}

      <Section>

        <SectionTitle>
          <Activity size={24} />
          Compétitions Disponibles
        </SectionTitle>

        {loading ? (

          <Loader>
            Chargement...
          </Loader>

        ) : sortedCompetitions.length ===
          0 ? (

          <Empty>
            Aucun tournoi disponible.
          </Empty>

        ) : (

          <Grid>

            {sortedCompetitions.map(
              (competition) => {

                const isReady =
                  competition.ready;

                return (

                  <Card
                    key={
                      competition.id
                    }
                  >

                    <CardHeader>

                      <CardTitle>
                        <Swords
                          size={18}
                        />
                        {
                          competition.name
                        }
                      </CardTitle>

                      <StatusBadge
                        $ready={
                          isReady
                        }
                      >

                        {isReady
                          ? "READY"
                          : competition.status}

                      </StatusBadge>

                    </CardHeader>

                    <Info>

                      <InfoRow>

                        <Users
                          size={16}
                        />

                        {
                          competition.currentPlayers
                        }
                        /
                        {
                          competition.maxPlayers
                        }

                        joueurs

                      </InfoRow>

                      <InfoRow>

                        <Wallet
                          size={16}
                        />

                        Entry :
                        {" "}
                        {
                          formatMoney(
                            competition.entry_fee
                          )
                        }
                        {" "}
                        CDF

                      </InfoRow>

                      <InfoRow>

                        <Trophy
                          size={16}
                        />

                        Prize :
                        {" "}
                        {
                          formatMoney(
                            competition.prize_pool
                          )
                        }
                        {" "}
                        CDF

                      </InfoRow>

                      {competition.match_id && (
                        <InfoRow>

                          <PlayCircle
                            size={16}
                          />

                          Match ID :
                          {" "}
                          #
                          {
                            competition.match_id
                          }

                        </InfoRow>
                      )}

                    </Info>

                    {isReady ? (

                      <ReadyBox>

                        <ReadyTitle>

                          <PlayCircle
                            size={18}
                          />

                          Match prêt

                        </ReadyTitle>

                        <Countdown>

                          <Timer
                            size={18}
                          />

                          {
                            formatCountdown(
                              competition.countdown
                            )
                          }

                        </Countdown>

                        <Warning>

                          <ShieldAlert
                            size={14}
                          />

                          Après 10 minutes,
                          absence = forfait.

                        </Warning>

                        <PlayButton
                          onClick={() =>
                            playCompetition(
                              competition
                            )
                          }
                        >
                          Jouer Maintenant
                        </PlayButton>

                      </ReadyBox>

                    ) : (

                      <JoinButton
                        disabled={
                          joiningId ===
                          competition.id
                        }
                        onClick={() =>
                          joinCompetition(
                            competition.id
                          )
                        }
                      >

                        {joiningId ===
                        competition.id
                          ? "Participation..."
                          : "Participer"}

                      </JoinButton>

                    )}

                  </Card>
                );
              }
            )}

          </Grid>
        )}

      </Section>

    </Container>
  );
}

// ======================================================
// ANIMATION
// ======================================================

const pulse = keyframes`
  0%{
    transform:scale(1);
  }

  50%{
    transform:scale(1.05);
  }

  100%{
    transform:scale(1);
  }
`;

// ======================================================
// STYLES
// ======================================================

const Container = styled.div`
  min-height: 100vh;
  padding: 24px;
  background:
    linear-gradient(
      180deg,
      #0f172a,
      #020617
    );
  color: white;
`;

const Hero = styled.div`
  position: relative;
  overflow: hidden;
  padding: 42px;
  border-radius: 30px;
  margin-bottom: 30px;
  background:
    linear-gradient(
      135deg,
      #ff6b00,
      #ff9500
    );
`;

const HeroGlow = styled.div`
  position: absolute;
  width: 320px;
  height: 320px;
  top: -120px;
  right: -120px;
  border-radius: 50%;
  background:
    rgba(
      255,
      255,
      255,
      0.12
    );
`;

const HeroContent = styled.div`
  position: relative;
  z-index: 2;
`;

const MainTitle = styled.h1`
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 0;
  font-size: 44px;
`;

const Subtitle = styled.p`
  max-width: 760px;
  margin-top: 16px;
  line-height: 1.8;
  font-size: 15px;
`;

const TopBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 22px;
`;

const SocketStatus = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 999px;
  font-weight: 600;

  background:
    ${(p) =>
      p.$connected
        ? "rgba(16,185,129,0.25)"
        : "rgba(239,68,68,0.25)"};
`;

const RefreshButton = styled.button`
  border: none;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 999px;
  background: white;
  color: black;
  font-weight: bold;
  cursor: pointer;
`;

const ErrorBox = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 22px;
  padding: 16px 18px;
  border-radius: 18px;
  background:
    rgba(
      239,
      68,
      68,
      0.15
    );
  color: #fca5a5;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns:
    repeat(
      auto-fit,
      minmax(240px,1fr)
    );
  gap: 20px;
  margin-bottom: 28px;
`;

const StatCard = styled.div`
  background: #111827;
  border-radius: 24px;
  padding: 26px;
`;

const StatIcon = styled.div`
  margin-bottom: 14px;
`;

const StatValue = styled.div`
  font-size: 34px;
  font-weight: bold;
`;

const StatLabel = styled.div`
  margin-top: 8px;
  opacity: 0.7;
`;

const Section = styled.div`
  margin-top: 24px;
`;

const SectionTitle = styled.h2`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 22px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns:
    repeat(
      auto-fit,
      minmax(330px,1fr)
    );
  gap: 20px;
`;

const Card = styled.div`
  background: #111827;
  border-radius: 24px;
  padding: 24px;
`;

const CardHeader = styled.div`
  display: flex;
  justify-content:
    space-between;
  align-items: center;
  margin-bottom: 22px;
`;

const CardTitle = styled.h3`
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
`;

const StatusBadge = styled.div`
  padding: 7px 14px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: bold;

  background:
    ${(p) =>
      p.$ready
        ? "#2563eb"
        : "#f59e0b"};
`;

const Info = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const InfoRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const JoinButton = styled.button`
  width: 100%;
  margin-top: 24px;
  border: none;
  padding: 15px;
  border-radius: 16px;
  font-weight: bold;
  background:
    linear-gradient(
      135deg,
      #ff6b00,
      #ff9500
    );
  color: white;
  cursor: pointer;
`;

const ReadyBox = styled.div`
  margin-top: 22px;
  padding: 20px;
  border-radius: 20px;
  background:
    rgba(
      37,
      99,
      235,
      0.12
    );
`;

const ReadyTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: bold;
`;

const Countdown = styled.div`
  margin-top: 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 30px;
  font-weight: bold;
  color: #60a5fa;
  animation:
    ${pulse}
    1.5s infinite;
`;

const Warning = styled.div`
  margin-top: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #fca5a5;
`;

const PlayButton = styled.button`
  width: 100%;
  margin-top: 18px;
  border: none;
  padding: 15px;
  border-radius: 16px;
  background:
    linear-gradient(
      135deg,
      #2563eb,
      #3b82f6
    );
  color: white;
  font-weight: bold;
  cursor: pointer;
`;

const Loader = styled.div`
  padding: 50px;
  text-align: center;
  background: #111827;
  border-radius: 24px;
`;

const Empty = styled.div`
  padding: 50px;
  border-radius: 24px;
  background: #111827;
  text-align: center;
  opacity: 0.7;
`;