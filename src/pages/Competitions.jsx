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
// ENV CONFIG
// ======================================================

const API_BASE =
  (
    import.meta.env.VITE_API_URL ||
    "https://backend-ad3t.onrender.com/api"
  ).replace(/\/$/, "");

const SOCKET_URL =
  API_BASE.replace("/api", "");

const API =
  `${API_BASE}/competitions`;

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
  timeout: 20000,
  headers: {
    "Content-Type":
      "application/json",
  },
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
        "🔒 Session expirée"
      );
    }

    return Promise.reject(error);
  }
);

// ======================================================
// SOCKET
// ======================================================

const socket = io(SOCKET_URL, {
  transports: [
    "websocket",
    "polling",
  ],

  autoConnect: false,

  reconnection: true,

  reconnectionAttempts: 10,

  reconnectionDelay: 2000,

  timeout: 20000,

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

  const matchId =
    competition.match_id ||
    competition.firstMatchId ||
    competition.first_match_id ||
    competition.current_match_id ||
    null;

  const matches =
    competition.matches || [];

  const ready =
    !!matchId;

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

      if (
        err?.code ===
        "ERR_NETWORK"
      ) {
        setError(
          "Le serveur backend est inaccessible."
        );

      } else if (
        err?.response?.status === 401
      ) {

        setError(
          "Session expirée."
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

    const refreshEvents = [
      "competition_created",
      "competition_updated",
      "competition_deleted",
      "competition_ready",
      "player_joined",
      "match_created",
      "competition_started",
    ];

    refreshEvents.forEach((evt) => {
      socket.on(evt, () =>
        fetchCompetitions(true)
      );
    });

    const interval =
      setInterval(() => {
        fetchCompetitions(true);
      }, 15000);

    return () => {

      clearInterval(interval);

      refreshEvents.forEach(
        (evt) =>
          socket.off(evt)
      );

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

    window.location.href =
      `/match/${competition.match_id}`;
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

  return (
    <Container>

      <Hero>

        <HeroGlow />

        <HeroContent>

          <MainTitle>
            <Trophy size={42} />
            6BetBall Competitions
          </MainTitle>

          <Subtitle>
            Plateforme eSport temps réel.
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

      {error && (
        <ErrorBox>
          <Lock size={18} />
          {error}
        </ErrorBox>
      )}

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