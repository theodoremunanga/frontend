// ============================================================
// FOOTBALL
// Système d'Arbitrage Centralisé (SAC)
// ============================================================
//
// Architecture volontairement centralisée.
//
// Football.jsx est le chef d'orchestre du jeu Football.
// Il gère le cycle COMPLET du match.
//
// Les éléments visuels sont séparés :
//   - Players.jsx
//   - Stade.jsx
//   - Ballon.jsx
//
// Mais toute la logique du match reste ici.
//
// Le frontend NE SIMULE PAS le football.
// Le backend est l'autorité.
//
// Backend -> Socket.IO -> Football.jsx
//
// ============================================================

import "./Football.css";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";

import {
  createSacMatch,
  joinSacMatch,
  getSacMatch,
  getSacMatches,
} from "../../sacApi";

import FootballCmd from "./FootballCmd";

import footballSocket from "./footballSocket";

import Players from "./Players";
import Stade from "./Stade";
import Ballon from "./Ballon";


// ============================================================
// CONFIGURATION
// ============================================================

const GAME_ID = "football";

const DEFAULT_STAKE = 200;

const MATCH_REFRESH = 3000;


// ============================================================
// PHASES BACKEND
// ============================================================

const PHASES = {
  FIRST_HALF: "FIRST_HALF",
  HALF_TIME: "HALF_TIME",
  SECOND_HALF: "SECOND_HALF",

  EXTRA_TIME_FIRST: "EXTRA_TIME_FIRST",
  EXTRA_TIME_SECOND: "EXTRA_TIME_SECOND",

  PENALTIES: "PENALTIES",

  FINISHED: "FINISHED",
};


// ============================================================
// STATUTS UI
// ============================================================

const STATUS = {
  MENU: "menu",
  CREATING: "creating",
  WAITING: "waiting",
  READY: "ready",
  STARTING: "starting",
  PLAYING: "playing",
  HALF_TIME: "half_time",
  EXTRA_TIME: "extra_time",
  PENALTIES: "penalties",
  FINISHED: "finished",
  PAUSED: "paused",
  ERROR: "error",
};


// ============================================================
// UTILITAIRES
// ============================================================

const normalizeId = (value) => {
  const id = Number(value);

  return Number.isFinite(id) && id > 0
    ? id
    : null;
};


const getCurrentUserId = () => {
  const token =
    localStorage.getItem("token");

  if (!token) {
    return null;
  }

  try {
    const parts =
      token.split(".");

    if (parts.length < 2) {
      return null;
    }

    const base64Payload =
      parts[1]
        .replace(/-/g, "+")
        .replace(/_/g, "/")
        .padEnd(
          Math.ceil(
            parts[1].length / 4
          ) * 4,
          "="
        );

    const payload =
      JSON.parse(
        atob(base64Payload)
      );

    return normalizeId(
      payload?.id ??
      payload?.userId ??
      payload?.user_id ??
      payload?.sub
    );

  } catch (error) {

    console.error(
      "⚽ FOOTBALL AUTH TOKEN ERROR:",
      error
    );

    return null;
  }
};


// ============================================================
// MATCH ID
// ============================================================

const getMatchId = (match) => {
  return normalizeId(
    match?.id ??
    match?.matchId ??
    match?.match_id
  );
};


// ============================================================
// PLAYERS
// ============================================================

const getCreatorId = (match) => {
  return normalizeId(
    match?.players?.creator ??
    match?.user1_id ??
    match?.creator_id ??
    match?.creatorId
  );
};


const getOpponentId = (match) => {
  return normalizeId(
    match?.players?.opponent ??
    match?.user2_id ??
    match?.opponent_id ??
    match?.opponentId
  );
};


// ============================================================
// PLAYER NAMES
// ============================================================

const getCreatorName = (match) => {
  return (
    match?.players?.creatorName ??
    match?.players?.creator_name ??
    match?.user1_username ??
    match?.creator_username ??
    "Domicile"
  );
};


const getOpponentName = (match) => {
  return (
    match?.players?.opponentName ??
    match?.players?.opponent_name ??
    match?.user2_username ??
    match?.opponent_username ??
    "Extérieur"
  );
};



// ============================================================
// PHASE LABEL
// ============================================================

const getPhaseLabel = (phase) => {

  switch (phase) {

    case PHASES.FIRST_HALF:
      return "1ère mi-temps";

    case PHASES.HALF_TIME:
      return "Mi-temps";

    case PHASES.SECOND_HALF:
      return "2ème mi-temps";

    case PHASES.EXTRA_TIME_FIRST:
      return "Prolongation 1";

    case PHASES.EXTRA_TIME_SECOND:
      return "Prolongation 2";

    case PHASES.PENALTIES:
      return "Tirs au but";

    case PHASES.FINISHED:
      return "Match terminé";

    default:
      return "En attente";
  }
};


// ============================================================
// PHASE -> STATUS UI
// ============================================================

const phaseToStatus = (phase) => {

  switch (phase) {

    case PHASES.FIRST_HALF:
    case PHASES.SECOND_HALF:
      return STATUS.PLAYING;

    case PHASES.HALF_TIME:
      return STATUS.HALF_TIME;

    case PHASES.EXTRA_TIME_FIRST:
    case PHASES.EXTRA_TIME_SECOND:
      return STATUS.EXTRA_TIME;

    case PHASES.PENALTIES:
      return STATUS.PENALTIES;

    case PHASES.FINISHED:
      return STATUS.FINISHED;

    default:
      return STATUS.PLAYING;
  }
};


// ============================================================
// STATUS BACKEND -> STATUS UI
// ============================================================

const backendStatusToUi = (
  backendStatus,
  phase
) => {

  const status =
    String(
      backendStatus || ""
    ).toLowerCase();

  if (status === "paused") {
    return STATUS.PAUSED;
  }

  if (status === "finished") {
    return STATUS.FINISHED;
  }

  if (
    phase === PHASES.PENALTIES
  ) {
    return STATUS.PENALTIES;
  }

  if (
    phase === PHASES.HALF_TIME
  ) {
    return STATUS.HALF_TIME;
  }

  if (
    phase === PHASES.EXTRA_TIME_FIRST ||
    phase === PHASES.EXTRA_TIME_SECOND
  ) {
    return STATUS.EXTRA_TIME;
  }

  if (
    phase === PHASES.FIRST_HALF ||
    phase === PHASES.SECOND_HALF
  ) {
    return STATUS.PLAYING;
  }

  if (
    status === "playing"
  ) {
    return STATUS.PLAYING;
  }

  if (
    status === "starting"
  ) {
    return STATUS.STARTING;
  }

  if (
    status === "ready" ||
    status === "matched"
  ) {
    return STATUS.READY;
  }

  return null;
};


// ============================================================
// FORMAT MINUTE
// ============================================================

const formatMinute = (minute) => {

  const value =
    Number(minute);

  if (!Number.isFinite(value)) {
    return "0'";
  }

  return `${value}'`;
};


// ============================================================
// EVENT LABEL
// ============================================================

const getEventIcon = (type) => {

  switch (type) {

    case "GOAL":
      return "⚽";

    case "SHOT":
      return "🎯";

    case "ATTACK":
      return "⚔️";

    case "CORNER":
      return "🚩";

    case "YELLOW_CARD":
      return "🟨";

    case "RED_CARD":
      return "🟥";

    case "CARD":
      return "🟨";

    default:
      return "•";
  }
};


const getEventLabel = (event) => {

  if (!event) {
    return "";
  }

  const team =
    event.team === "HOME"
      ? "Domicile"
      : event.team === "AWAY"
        ? "Extérieur"
        : "";

  switch (event.type) {

    case "GOAL":
      return `BUT ${team}`;

    case "SHOT":
      return `Tir ${team}`;

    case "ATTACK":
      return `Attaque ${team}`;

    case "CORNER":
      return `Corner ${team}`;

    case "YELLOW_CARD":
      return `Carton jaune ${team}`;

    case "RED_CARD":
      return `Carton rouge ${team}`;

    case "CARD":
      return `Carton ${team}`;

    default:
      return event.type || "Événement";
  }
};


// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export default function Football() {

  // ==========================================================
  // REFS
  // ==========================================================

  const currentMatchIdRef =
    useRef(null);

  const currentUserIdRef =
    useRef(null);

  const currentMatchRef =
    useRef(null);

  const mountedRef =
    useRef(true);

  const refreshTimerRef =
    useRef(null);

  const joinedMatchRef =
    useRef(null);


  // ==========================================================
  // AUTH
  // ==========================================================

  const currentUserId =
    getCurrentUserId();


  // ==========================================================
  // ÉTAT GÉNÉRAL
  // ==========================================================

  const [status, setStatus] =
    useState(STATUS.MENU);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [connected, setConnected] =
    useState(false);


  // ==========================================================
  // MATCHS
  // ==========================================================

  const [matches, setMatches] =
    useState([]);

  const [currentMatch, setCurrentMatch] =
    useState(null);


  // ==========================================================
  // ÉTAT FOOTBALL
  // ==========================================================

  const [gameState, setGameState] =
    useState(null);


  // ==========================================================
  // ÉVÉNEMENTS
  // ==========================================================

  const [events, setEvents] =
    useState([]);


  // ==========================================================
  // DERNIER ÉVÉNEMENT
  // ==========================================================

  const [lastEvent, setLastEvent] =
    useState(null);


  // ==========================================================
  // DERNIER BUT
  // ==========================================================

  const [lastGoal, setLastGoal] =
    useState(null);


  // ==========================================================
  // DERNIER CARTON
  // ==========================================================

  const [lastCard, setLastCard] =
    useState(null);


  // ==========================================================
  // RÉSULTAT
  // ==========================================================

  const [winnerId, setWinnerId] =
    useState(null);

  const [settlement, setSettlement] =
    useState(null);


  // ==========================================================
  // PENALTIES
  // ==========================================================

  const [penalties, setPenalties] =
    useState(null);


  // ==========================================================
  // MISE
  // ==========================================================

  const [stake, setStake] =
    useState(DEFAULT_STAKE);


  // ==========================================================
  // SYNCHRONISATION REFS
  // ==========================================================

  useEffect(() => {

    currentMatchIdRef.current =
      getMatchId(currentMatch);

  }, [currentMatch]);


  useEffect(() => {

    currentMatchRef.current =
      currentMatch;

  }, [currentMatch]);


  useEffect(() => {

    currentUserIdRef.current =
      currentUserId;

  }, [currentUserId]);


  // ==========================================================
  // MATCH ID
  // ==========================================================

  const matchId =
    getMatchId(currentMatch);


  // ==========================================================
  // PLAYERS
  // ==========================================================

  const creatorId =
    getCreatorId(currentMatch);

  const opponentId =
    getOpponentId(currentMatch);


  const homeName =
    getCreatorName(currentMatch);

  const awayName =
    getOpponentName(currentMatch);


  // ==========================================================
  // LOAD MATCHES
  // ==========================================================

  const loadMatches =
    useCallback(
      async () => {

        try {

          const response =
            await getSacMatches(
              GAME_ID
            );

          if (
            response?.success
          ) {

            setMatches(
              Array.isArray(
                response.matches
              )
                ? response.matches
                : []
            );
          }

        } catch (err) {

          console.error(
            "⚽ FOOTBALL LOAD MATCHES ERROR:",
            err
          );
        }

      },
      []
    );


  // ==========================================================
  // LOAD CURRENT MATCH
  // ==========================================================

  const loadCurrentMatch =
    useCallback(
      async (id) => {

        const numericId =
          normalizeId(id);

        if (!numericId) {
          return null;
        }

        try {

          const response =
            await getSacMatch(
              numericId
            );

          if (
            !response?.success
          ) {
            return null;
          }

          const match =
            response.match;

          if (
            !mountedRef.current
          ) {
            return null;
          }

          setCurrentMatch(
            match
          );

          return match;

        } catch (err) {

          console.error(
            "⚽ FOOTBALL LOAD MATCH ERROR:",
            err
          );

          return null;
        }

      },
      []
    );


  // ==========================================================
  // RESET GAME STATE
  // ==========================================================

  const resetGameState =
    useCallback(() => {

      setGameState(null);

      setEvents([]);

      setLastEvent(null);

      setLastGoal(null);

      setLastCard(null);

      setWinnerId(null);

      setSettlement(null);

      setPenalties(null);

    }, []);


  // ==========================================================
  // APPLY SERVER STATE
  // ==========================================================

  const applyState =
    useCallback(
      (state) => {

        if (!state) {
          return;
        }

        setGameState(
          (previous) => ({
            ...(previous || {}),
            ...state,
          })
        );

        const phase =
          state?.phase;

        const nextStatus =
          backendStatusToUi(
            state?.status,
            phase
          );

        if (
          nextStatus &&
          nextStatus !== STATUS.FINISHED
        ) {

          setStatus(
            nextStatus
          );
        }

        if (
          phase === PHASES.FINISHED
        ) {

          setStatus(
            STATUS.FINISHED
          );
        }

      },
      []
    );


  // ==========================================================
  // SOCKET CONNECTION
  // ==========================================================

  useEffect(() => {

    mountedRef.current = true;

    const token =
      localStorage.getItem(
        "token"
      );

    const socket =
      footballSocket.connect(
        token
      );

    if (!socket) {
      return;
    }


    const handleConnect =
      () => {

        if (
          !mountedRef.current
        ) {
          return;
        }

        setConnected(true);
      };


    const handleDisconnect =
      () => {

        if (
          !mountedRef.current
        ) {
          return;
        }

        setConnected(false);
      };


    const handleConnectError =
      (err) => {

        console.error(
          "⚽ FOOTBALL SOCKET CONNECT ERROR:",
          err
        );

        if (
          mountedRef.current
        ) {

          setConnected(false);

          setError(
            "Connexion temps réel indisponible."
          );
        }
      };


    const handleState =
      (state) => {

        if (
          !mountedRef.current
        ) {
          return;
        }

        applyState(
          state
        );
      };


    const handleUpdate =
      (payload) => {

        if (
          !mountedRef.current
        ) {
          return;
        }

        if (!payload) {
          return;
        }

        const nextState = {
          ...(gameState || {}),
          minute:
            payload.minute,
          phase:
            payload.phase,
          home_score:
            payload.homeScore,
          away_score:
            payload.awayScore,
        };


        if (
          payload.possession !==
          undefined
        ) {
          nextState.possession =
            payload.possession;
        }


        setGameState(
          nextState
        );


        if (
          Array.isArray(
            payload.events
          ) &&
          payload.events.length
        ) {

          setEvents(
            (previous) => [
              ...previous,
              ...payload.events.map(
                (event) => ({
                  ...event,
                  minute:
                    payload.minute,
                })
              ),
            ].slice(-50)
          );


          setLastEvent(
            payload.events[
              payload.events.length - 1
            ]
          );
        }


        const nextStatus =
          phaseToStatus(
            payload.phase
          );

        setStatus(
          nextStatus
        );
      };


    const handleGoal =
      (event) => {

        if (
          !mountedRef.current
        ) {
          return;
        }

        setLastGoal(
          event
        );

        setLastEvent(
          event
        );

        setEvents(
          (previous) => [
            ...previous,
            {
              ...event,
              type: "GOAL",
              minute:
                gameState?.minute,
            },
          ].slice(-50)
        );
      };


    const handleCard =
      (event) => {

        if (
          !mountedRef.current
        ) {
          return;
        }

        setLastCard(
          event
        );

        setLastEvent(
          event
        );

        setEvents(
          (previous) => [
            ...previous,
            {
              ...event,
              minute:
                gameState?.minute,
            },
          ].slice(-50)
        );
      };


    const handleStarted =
      (match) => {

        if (
          !mountedRef.current
        ) {
          return;
        }

        if (match) {

          setCurrentMatch(
            match
          );
        }

        setStatus(
          STATUS.PLAYING
        );
      };


    const handlePaused =
      (match) => {

        if (
          !mountedRef.current
        ) {
          return;
        }

        if (match) {

          setCurrentMatch(
            match
          );
        }

        setStatus(
          STATUS.PAUSED
        );
      };


    const handleResumed =
      (match) => {

        if (
          !mountedRef.current
        ) {
          return;
        }

        if (match) {

          setCurrentMatch(
            match
          );
        }

        setStatus(
          STATUS.PLAYING
        );
      };


    const handlePlayerJoined =
      async (payload) => {

        if (
          !mountedRef.current
        ) {
          return;
        }

        const id =
          currentMatchIdRef.current;

        if (!id) {
          return;
        }

        const match =
          await loadCurrentMatch(
            id
          );

        if (!match) {
          return;
        }

        const creator =
          getCreatorId(match);

        const opponent =
          getOpponentId(match);


        if (
          creator &&
          opponent
        ) {

          setStatus(
            STATUS.READY
          );

        } else {

          setStatus(
            STATUS.WAITING
          );
        }
      };


    const handlePlayerLeft =
      async () => {

        if (
          !mountedRef.current
        ) {
          return;
        }

        const id =
          currentMatchIdRef.current;

        if (!id) {
          return;
        }

        const match =
          await loadCurrentMatch(
            id
          );

        if (!match) {
          return;
        }

        const opponent =
          getOpponentId(match);

        if (!opponent) {

          setStatus(
            STATUS.WAITING
          );
        }
      };


    const handleEnd =
      (payload) => {

        if (
          !mountedRef.current
        ) {
          return;
        }

        setWinnerId(
          normalizeId(
            payload?.winnerId
          )
        );

        setSettlement(
          payload?.settlement ??
          null
        );


        setGameState(
          (previous) => ({
            ...(previous || {}),
            minute:
              payload?.minute ??
              previous?.minute,
            phase:
              PHASES.FINISHED,
            home_score:
              payload?.homeScore ??
              previous?.home_score ??
              0,
            away_score:
              payload?.awayScore ??
              previous?.away_score ??
              0,
          })
        );


        setStatus(
          STATUS.FINISHED
        );
      };


    const handlePenaltiesEnd =
      (payload) => {

        if (
          !mountedRef.current
        ) {
          return;
        }

        setPenalties(
          payload?.penalties ??
          null
        );

        setWinnerId(
          normalizeId(
            payload?.winnerId
          )
        );

        setSettlement(
          payload?.settlement ??
          null
        );

        setStatus(
          STATUS.FINISHED
        );
      };


    const handleError =
      (payload) => {

        console.error(
          "⚽ FOOTBALL SOCKET ERROR:",
          payload
        );

        if (
          mountedRef.current
        ) {

          setError(
            payload?.message ||
            "Erreur Football."
          );

          setStatus(
            STATUS.ERROR
          );
        }
      };


    socket.on(
      "connect",
      handleConnect
    );

    socket.on(
      "disconnect",
      handleDisconnect
    );

    socket.on(
      "connect_error",
      handleConnectError
    );


    footballSocket.onState(
      handleState
    );

    footballSocket.onUpdate(
      handleUpdate
    );

    footballSocket.onGoal(
      handleGoal
    );

    footballSocket.onCard(
      handleCard
    );

    footballSocket.onStarted(
      handleStarted
    );

    footballSocket.onPaused(
      handlePaused
    );

    footballSocket.onResumed(
      handleResumed
    );

    footballSocket.onPlayerJoined(
      handlePlayerJoined
    );

    footballSocket.onPlayerLeft(
      handlePlayerLeft
    );

    footballSocket.onEnd(
      handleEnd
    );

    footballSocket.onPenaltiesEnd(
      handlePenaltiesEnd
    );

    footballSocket.onError(
      handleError
    );


    return () => {

      mountedRef.current = false;

      socket.off(
        "connect",
        handleConnect
      );

      socket.off(
        "disconnect",
        handleDisconnect
      );

      socket.off(
        "connect_error",
        handleConnectError
      );


      footballSocket.offState(
        handleState
      );

      footballSocket.offUpdate(
        handleUpdate
      );

      footballSocket.offGoal(
        handleGoal
      );

      footballSocket.offCard(
        handleCard
      );

      footballSocket.offStarted(
        handleStarted
      );

      footballSocket.offPaused(
        handlePaused
      );

      footballSocket.offResumed(
        handleResumed
      );

      footballSocket.offPlayerJoined(
        handlePlayerJoined
      );

      footballSocket.offPlayerLeft(
        handlePlayerLeft
      );

      footballSocket.offEnd(
        handleEnd
      );

      footballSocket.offPenaltiesEnd(
        handlePenaltiesEnd
      );

      footballSocket.offError(
        handleError
      );

    };

  }, [
    applyState,
    loadCurrentMatch,
  ]);


  // ==========================================================
  // LOAD INITIAL LOBBY
  // ==========================================================

  useEffect(() => {

    loadMatches();

    return () => {

      if (
        refreshTimerRef.current
      ) {

        clearInterval(
          refreshTimerRef.current
        );

        refreshTimerRef.current =
          null;
      }
    };

  }, [
    loadMatches,
  ]);


  // ==========================================================
  // REFRESH LOBBY
  // ==========================================================

  useEffect(() => {

    if (
      status !== STATUS.MENU &&
      status !== STATUS.WAITING &&
      status !== STATUS.READY
    ) {
      return;
    }

    refreshTimerRef.current =
      setInterval(
        () => {

          loadMatches();

        },
        MATCH_REFRESH
      );


    return () => {

      if (
        refreshTimerRef.current
      ) {

        clearInterval(
          refreshTimerRef.current
        );

        refreshTimerRef.current =
          null;
      }
    };

  }, [
    status,
    loadMatches,
  ]);


  // ==========================================================
  // CREATE MATCH
  // ==========================================================

  const createMatch =
    useCallback(
      async () => {

        if (loading) {
          return;
        }

        const numericStake =
          Number(stake);

        if (
          !Number.isFinite(
            numericStake
          ) ||
          numericStake <= 0
        ) {

          setError(
            "Montant de mise invalide."
          );

          return;
        }


        try {

          setLoading(true);

          setError("");

          resetGameState();

          setStatus(
            STATUS.CREATING
          );


          const response =
            await createSacMatch({
              game: GAME_ID,
              stake:
                numericStake,
            });


          if (
            !response?.success
          ) {

            throw new Error(
              response?.message ||
              "Création du match impossible."
            );
          }


          if (
            !response?.match
          ) {

            throw new Error(
              "Le SAC n'a retourné aucun match."
            );
          }


          const match =
            response.match;


          setCurrentMatch(
            match
          );


          const id =
            getMatchId(match);

          currentMatchIdRef.current =
            id;


          joinedMatchRef.current =
            null;


          setStatus(
            STATUS.WAITING
          );


          await loadMatches();


          // Le créateur rejoint immédiatement
          // la room temps réel.
          if (id) {

            footballSocket.joinMatch(
              id,
              currentUserId
            );

            joinedMatchRef.current =
              id;
          }


        } catch (err) {

          console.error(
            "⚽ FOOTBALL CREATE ERROR:",
            err
          );

          setError(
            err?.message ||
            "Impossible de créer le match."
          );

          setStatus(
            STATUS.ERROR
          );

        } finally {

          setLoading(false);
        }

      },
      [
        loading,
        stake,
        currentUserId,
        loadMatches,
        resetGameState,
      ]
    );


  // ==========================================================
  // JOIN MATCH
  // ==========================================================

  const joinMatch =
    useCallback(
      async (id) => {

        const numericId =
          normalizeId(id);

        if (
          loading ||
          !numericId
        ) {
          return;
        }


        try {

          setLoading(true);

          setError("");

          resetGameState();


          const response =
            await joinSacMatch({
              game: GAME_ID,
              matchId:
                numericId,
            });


          if (
            !response?.success
          ) {

            throw new Error(
              response?.message ||
              "Impossible de rejoindre le match."
            );
          }


          if (
            !response?.match
          ) {

            throw new Error(
              "Le SAC n'a retourné aucun match après join."
            );
          }


          const match =
            response.match;


          setCurrentMatch(
            match
          );


          currentMatchIdRef.current =
            numericId;


          setStatus(
            STATUS.READY
          );


          footballSocket.joinMatch(
            numericId,
            currentUserId
          );


          joinedMatchRef.current =
            numericId;


          await loadCurrentMatch(
            numericId
          );


          await loadMatches();


        } catch (err) {

          console.error(
            "⚽ FOOTBALL JOIN ERROR:",
            err
          );

          setError(
            err?.message ||
            "Impossible de rejoindre le match."
          );

          setStatus(
            STATUS.ERROR
          );

        } finally {

          setLoading(false);
        }

      },
      [
        loading,
        currentUserId,
        loadCurrentMatch,
        loadMatches,
        resetGameState,
      ]
    );


  // ==========================================================
  // JOIN CURRENT ROOM
  // ==========================================================

  useEffect(() => {

    const id =
      getMatchId(currentMatch);

    if (!id) {
      return;
    }

    if (
      !currentUserId
    ) {
      return;
    }

    if (
      joinedMatchRef.current === id
    ) {
      return;
    }

    footballSocket.joinMatch(
      id,
      currentUserId
    );

    joinedMatchRef.current =
      id;

  }, [
    currentMatch,
    currentUserId,
  ]);


  // ==========================================================
  // START MATCH
  // ==========================================================

  const startMatch =
    useCallback(() => {

      const id =
        currentMatchIdRef.current;

      if (!id) {
        return;
      }

      setError("");

      setStatus(
        STATUS.STARTING
      );

      footballSocket.startMatch(
        id
      );

    }, []);


  // ==========================================================
  // PAUSE
  // ==========================================================

  const pauseMatch =
    useCallback(() => {

      const id =
        currentMatchIdRef.current;

      if (!id) {
        return;
      }

      footballSocket.pauseMatch(
        id
      );

    }, []);


  // ==========================================================
  // RESUME
  // ==========================================================

  const resumeMatch =
    useCallback(() => {

      const id =
        currentMatchIdRef.current;

      if (!id) {
        return;
      }

      footballSocket.resumeMatch(
        id
      );

    }, []);


  // ==========================================================
  // GET STATE
  // ==========================================================

  const refreshCurrentState =
    useCallback(() => {

      const id =
        currentMatchIdRef.current;

      if (!id) {
        return;
      }

      footballSocket.getState(
        id
      );

    }, []);


  // ==========================================================
  // LEAVE CURRENT MATCH
  // ==========================================================

  const leaveCurrentMatch =
    useCallback(() => {

      const id =
        currentMatchIdRef.current;

      if (
        id &&
        currentUserId
      ) {

        footballSocket.leaveMatch(
          id,
          currentUserId
        );
      }


      joinedMatchRef.current =
        null;

      currentMatchIdRef.current =
        null;

      setCurrentMatch(null);

      resetGameState();

      setStatus(
        STATUS.MENU
      );

      setError("");

      loadMatches();

    }, [
      currentUserId,
      resetGameState,
      loadMatches,
    ]);


  // ==========================================================
  // RETOUR APRÈS ERREUR
  // ==========================================================

  const returnToMenu =
    useCallback(() => {

      joinedMatchRef.current =
        null;

      currentMatchIdRef.current =
        null;

      setCurrentMatch(null);

      resetGameState();

      setError("");

      setStatus(
        STATUS.MENU
      );

      loadMatches();

    }, [
      resetGameState,
      loadMatches,
    ]);


  // ==========================================================
  // AUTOMATISATION READY
  // ==========================================================
  //
  // Le créateur peut lancer le match lorsque les deux
  // joueurs sont présents.
  //
  // On ne lance PAS automatiquement plusieurs fois :
  // la ref protège contre les doubles déclenchements.
  //
  // ==========================================================

  const startRequestedRef =
    useRef(false);


  useEffect(() => {

    const id =
      getMatchId(currentMatch);

    if (!id) {
      return;
    }

    const creator =
      getCreatorId(currentMatch);

    const opponent =
      getOpponentId(currentMatch);


    if (
      !creator ||
      !opponent
    ) {
      startRequestedRef.current =
        false;

      return;
    }


    if (
      status !== STATUS.READY
    ) {
      return;
    }


    // Seul le créateur demande le démarrage.
    if (
      currentUserId !== creator
    ) {
      return;
    }


    if (
      startRequestedRef.current
    ) {
      return;
    }


    startRequestedRef.current =
      true;


    startMatch();

  }, [
    currentMatch,
    status,
    currentUserId,
    startMatch,
  ]);


  // ==========================================================
  // DERNIER ÉTAT -> FIN
  // ==========================================================

  useEffect(() => {

    if (!gameState) {
      return;
    }

    if (
      gameState.phase ===
      PHASES.FINISHED
    ) {

      setStatus(
        STATUS.FINISHED
      );
    }

    if (
      gameState.phase ===
      PHASES.PENALTIES
    ) {

      setStatus(
        STATUS.PENALTIES
      );
    }

  }, [
    gameState,
  ]);


  // ==========================================================
  // VALEURS AFFICHAGE
  // ==========================================================

  const minute =
    Number(
      gameState?.minute ?? 0
    );


  const phase =
    gameState?.phase ??
    null;


  const homeScore =
    Number(
      gameState?.home_score ??
      gameState?.homeScore ??
      0
    );


  const awayScore =
    Number(
      gameState?.away_score ??
      gameState?.awayScore ??
      0
    );


  const possession =
    gameState?.possession ??
    null;


  const homeShots =
    Number(
      gameState?.home_shots ??
      gameState?.homeShots ??
      0
    );


  const awayShots =
    Number(
      gameState?.away_shots ??
      gameState?.awayShots ??
      0
    );


  const homeShotsOnTarget =
    Number(
      gameState?.home_shots_on_target ??
      gameState?.homeShotsOnTarget ??
      0
    );


  const awayShotsOnTarget =
    Number(
      gameState?.away_shots_on_target ??
      gameState?.awayShotsOnTarget ??
      0
    );


  // ==========================================================
  // WINNER LABEL
  // ==========================================================

  const winnerLabel =
    useMemo(() => {

      const winner =
        normalizeId(
          winnerId
        );

      if (!winner) {
        return "Match nul";
      }

      if (
        winner === creatorId
      ) {
        return homeName;
      }

      if (
        winner === opponentId
      ) {
        return awayName;
      }

      return `Joueur #${winner}`;

    }, [
      winnerId,
      creatorId,
      opponentId,
      homeName,
      awayName,
    ]);


  // ==========================================================
  // RENDER : HEADER
  // ==========================================================

  const renderHeader =
    () => (

      <div className="football-header">

        <div className="football-header-title">

          <span className="football-ball-icon">
            ⚽
          </span>

          <div>
            <h1>
              Football
            </h1>

            <span className="football-subtitle">
              Système d'Arbitrage Centralisé
            </span>
          </div>

        </div>


        <div
          className={
            connected
              ? "football-connection online"
              : "football-connection offline"
          }
        >

          <span className="football-connection-dot" />

          {connected
            ? "En ligne"
            : "Hors ligne"}

        </div>

      </div>
    );


  // ==========================================================
  // RENDER : LOBBY
  // ==========================================================

  const renderLobby =
    () => (

      <div className="football-lobby">

        <div className="football-lobby-hero">

          <div>

            <span className="football-kicker">
              ⚽ 6BETBALL
            </span>

            <h2>
              Football
              <br />
              Match en temps réel
            </h2>

            <p>
              Affrontez un joueur et suivez
              le match minute par minute.
            </p>

          </div>

        </div>


        <div className="football-create-card">

          <div className="football-card-title">

            <span>
              🏆
            </span>

            <div>

              <h3>
                Créer un match
              </h3>

              <p>
                Choisissez votre mise
              </p>

            </div>

          </div>


          <div className="football-stake-control">

            <label>
              Mise
            </label>

            <div className="football-stake-input">

              <input
                type="number"
                min="1"
                value={stake}
                onChange={(event) =>
                  setStake(
                    event.target.value
                  )
                }
                disabled={loading}
              />

              <span>
                FC
              </span>

            </div>

          </div>


          <button
            type="button"
            className="football-primary-button"
            onClick={createMatch}
            disabled={
              loading ||
              !connected
            }
          >

            {loading
              ? "Création..."
              : "Créer le match"}

          </button>

        </div>


        <div className="football-matches-card">

          <div className="football-section-heading">

            <div>

              <h3>
                Matchs disponibles
              </h3>

              <p>
                Rejoignez un défi en attente
              </p>

            </div>

            <button
              type="button"
              className="football-refresh-button"
              onClick={loadMatches}
              disabled={loading}
            >
              ↻
            </button>

          </div>


          {!matches.length ? (

            <div className="football-empty">

              <div className="football-empty-icon">
                ⚽
              </div>

              <p>
                Aucun match disponible.
              </p>

              <span>
                Créez le premier défi.
              </span>

            </div>

          ) : (

            <div className="football-match-list">

              {matches.map(
                (match) => {

                  const id =
                    getMatchId(match);

                  const matchCreator =
                    getCreatorId(match);

                  const matchOpponent =
                    getOpponentId(match);


                  const matchStatus =
                    String(
                      match?.status || ""
                    ).toLowerCase();


                  const canJoin =
                    id &&
                    matchStatus !== "playing" &&
                    matchStatus !== "finished" &&
                    !matchOpponent &&
                    matchCreator !== currentUserId;


                  return (

                    <div
                      key={id}
                      className="football-match-row"
                    >

                      <div className="football-match-info">

                        <strong>
                          Match #{id}
                        </strong>

                        <span>
                          {match?.stake ??
                           match?.bet_amount ??
                           "—"} FC
                        </span>

                      </div>


                      <div className="football-match-status">

                        {matchOpponent
                          ? "Joueurs prêts"
                          : "En attente"}

                      </div>


                      {canJoin ? (

                        <button
                          type="button"
                          className="football-join-button"
                          onClick={() =>
                            joinMatch(id)
                          }
                          disabled={loading}
                        >
                          Rejoindre
                        </button>

                      ) : (

                        <span className="football-match-locked">
                          🔒
                        </span>

                      )}

                    </div>

                  );
                }
              )}

            </div>

          )}

        </div>

      </div>
    );


  // ==========================================================
  // RENDER : WAITING
  // ==========================================================

  const renderWaiting =
    () => (

      <div className="football-waiting">

        <div className="football-waiting-card">

          <div className="football-waiting-ball">
            ⚽
          </div>

          <span className="football-status-label">
            MATCH #{matchId}
          </span>

          <h2>
            En attente de l'adversaire
          </h2>

          <p>
            Votre défi est créé.
            Le match commencera lorsque
            l'adversaire aura rejoint.
          </p>


          <div className="football-waiting-team">

            <div className="football-player-chip">

              <span>
                🏠
              </span>

              <div>

                <strong>
                  {homeName}
                </strong>

                <small>
                  Domicile
                </small>

              </div>

            </div>


            <div className="football-vs">
              VS
            </div>


            <div className="football-player-chip football-player-empty">

              <span>
                👤
              </span>

              <div>

                <strong>
                  En attente
                </strong>

                <small>
                  Adversaire
                </small>

              </div>

            </div>

          </div>


          <div className="football-loading-dots">
            <span />
            <span />
            <span />
          </div>


          <button
            type="button"
            className="football-secondary-button"
            onClick={leaveCurrentMatch}
          >
            Quitter
          </button>

        </div>

      </div>
    );


  // ==========================================================
  // RENDER : READY
  // ==========================================================

  const renderReady =
    () => (

      <div className="football-ready">

        <div className="football-ready-card">

          <div className="football-ready-icon">
            🏟️
          </div>

          <span className="football-status-label">
            MATCH #{matchId}
          </span>

          <h2>
            Les deux joueurs sont prêts
          </h2>

          <div className="football-ready-score">

            <div>
              <strong>
                {homeName}
              </strong>

              <span>
                Domicile
              </span>
            </div>

            <b>
              VS
            </b>

            <div>
              <strong>
                {awayName}
              </strong>

              <span>
                Extérieur
              </span>
            </div>

          </div>


          {currentUserId === creatorId ? (

            <button
              type="button"
              className="football-primary-button"
              onClick={startMatch}
              disabled={loading}
            >
              ⚽ Lancer le match
            </button>

          ) : (

            <div className="football-waiting-start">

              <span className="football-spinner" />

              <p>
                Le créateur va lancer
                le match...
              </p>

            </div>

          )}


          <button
            type="button"
            className="football-secondary-button"
            onClick={leaveCurrentMatch}
          >
            Quitter
          </button>

        </div>

      </div>
    );


  // ==========================================================
  // RENDER : PENALTIES
  // ==========================================================

  const renderPenalties =
    () => {

      const penaltyData =
        penalties?.kicks ||
        [];

      return (

        <div className="football-penalties-panel">

          <div className="football-penalties-title">

            <span>
              ⚽
            </span>

            <div>

              <h2>
                Tirs au but
              </h2>

              <p>
                Décision du match
              </p>

            </div>

          </div>


          {penaltyData.length ? (

            <div className="football-penalty-list">

              {penaltyData.map(
                (kick, index) => (

                  <div
                    key={`${kick.round ?? "x"}-${kick.side}-${index}`}
                    className="football-penalty-row"
                  >

                    <span>
                      {kick.round
                        ? `Tour ${kick.round}`
                        : "Mort subite"}
                    </span>

                    <strong>
                      {kick.side === "HOME"
                        ? homeName
                        : awayName}
                    </strong>

                    <span
                      className={
                        kick.result === "GOAL"
                          ? "penalty-goal"
                          : "penalty-miss"
                      }
                    >
                      {kick.result === "GOAL"
                        ? "⚽ BUT"
                        : "❌ RATÉ"}
                    </span>

                  </div>

                )
              )}

            </div>

          ) : (

            <div className="football-penalties-waiting">
              Calcul des tirs au but...
            </div>

          )}

        </div>

      );
    };


  // ==========================================================
  // RENDER : RESULT
  // ==========================================================

  const renderResult =
    () => (

      <div className="football-result">

        <div className="football-result-card">

          <div className="football-result-trophy">
            🏆
          </div>

          <span className="football-status-label">
            MATCH TERMINÉ
          </span>

          <h2>
            {winnerId
              ? winnerLabel
              : "Match nul"}
          </h2>


          <div className="football-final-score">

            <div className="football-final-team">

              <strong>
                {homeName}
              </strong>

              <b>
                {homeScore}
              </b>

            </div>


            <span>
              -
            </span>


            <div className="football-final-team">

              <b>
                {awayScore}
              </b>

              <strong>
                {awayName}
              </strong>

            </div>

          </div>


          {settlement && (

            <div className="football-settlement">

              <h3>
                Règlement
              </h3>

              <pre>
                {JSON.stringify(
                  settlement,
                  null,
                  2
                )}
              </pre>

            </div>

          )}


          <button
            type="button"
            className="football-primary-button"
            onClick={returnToMenu}
          >
            Retour aux matchs
          </button>

        </div>

      </div>
    );


  // ==========================================================
  // RENDER : LIVE MATCH
  // ==========================================================

  const renderLiveMatch =
    () => (

      <div className="football-live">

        {/* ==================================================
            TOP BAR
        ================================================== */}

        <div className="football-live-topbar">

          <div>

            <span className="football-live-label">
              MATCH #{matchId}
            </span>

            <strong>
              {getPhaseLabel(
                phase
              )}
            </strong>

          </div>


          <div className="football-live-minute">

            <span>
              {formatMinute(minute)}
            </span>

          </div>


          <div className="football-live-actions">

            {status === STATUS.PAUSED ? (

              <button
                type="button"
                onClick={resumeMatch}
              >
                ▶ Reprendre
              </button>

            ) : status === STATUS.PLAYING ? (

              <button
                type="button"
                onClick={pauseMatch}
              >
                ⏸ Pause
              </button>

            ) : null}


            <button
              type="button"
              onClick={refreshCurrentState}
            >
              ↻
            </button>

          </div>

        </div>


        {/* ==================================================
            SCOREBOARD
        ================================================== */}

        <div className="football-scoreboard">

          <div className="football-team home">

            <div className="football-team-avatar">
              🏠
            </div>

            <strong>
              {homeName}
            </strong>

            <span>
              DOMICILE
            </span>

          </div>


          <div className="football-score-center">

            <div className="football-score">

              <span>
                {homeScore}
              </span>

              <b>
                :
              </b>

              <span>
                {awayScore}
              </span>

            </div>

            <div className="football-live-indicator">

              <span />

              LIVE

            </div>

          </div>


          <div className="football-team away">

            <div className="football-team-avatar">
              ✈️
            </div>

            <strong>
              {awayName}
            </strong>

            <span>
              EXTÉRIEUR
            </span>

          </div>

        </div>


        {/* ==================================================
            STADE
        ================================================== */}

        <div className="football-stadium-container">

          <Stade
            homeScore={homeScore}
            awayScore={awayScore}
            minute={minute}
            phase={phase}
            lastEvent={lastEvent}
            lastGoal={lastGoal}
          />

          <Players
            homePlayer={homeName}
            awayPlayer={awayName}
            homeScore={homeScore}
            awayScore={awayScore}
            phase={phase}
            lastEvent={lastEvent}
            lastGoal={lastGoal}
          />

          <Ballon
            minute={minute}
            phase={phase}
            lastEvent={lastEvent}
            lastGoal={lastGoal}
          />

        </div>


        {/* ==================================================
            GOAL ALERT
        ================================================== */}

        {lastGoal && (

          <div className="football-goal-alert">

            <span>
              ⚽
            </span>

            <div>

              <strong>
                BUT !
              </strong>

              <small>
                {lastGoal.team === "HOME"
                  ? homeName
                  : awayName}
              </small>

            </div>

          </div>

        )}


        {/* ==================================================
            STATISTICS
        ================================================== */}

        <div className="football-statistics">

          <div className="football-section-heading">

            <div>

              <h3>
                Statistiques
              </h3>

              <p>
                Données du moteur Football
              </p>

            </div>

          </div>


          <div className="football-stats-grid">

            <div className="football-stat">

              <span>
                Possession
              </span>

              <div className="football-stat-values">

                <strong>
                  {possession !== null
                    ? `${possession}%`
                    : "—"}
                </strong>

              </div>

            </div>


            <div className="football-stat">

              <span>
                Tirs
              </span>

              <div className="football-stat-values">

                <strong>
                  {homeShots}
                </strong>

                <small>
                  -
                </small>

                <strong>
                  {awayShots}
                </strong>

              </div>

            </div>


            <div className="football-stat">

              <span>
                Tirs cadrés
              </span>

              <div className="football-stat-values">

                <strong>
                  {homeShotsOnTarget}
                </strong>

                <small>
                  -
                </small>

                <strong>
                  {awayShotsOnTarget}
                </strong>

              </div>

            </div>

          </div>

        </div>


        {/* ==================================================
            EVENTS
        ================================================== */}

        <div className="football-events">

          <div className="football-section-heading">

            <div>

              <h3>
                Événements
              </h3>

              <p>
                Chronologie du match
              </p>

            </div>

          </div>


          {!events.length ? (

            <div className="football-events-empty">

              <span>
                ⚽
              </span>

              Aucun événement pour le moment.

            </div>

          ) : (

            <div className="football-event-list">

              {[...events]
                .reverse()
                .map(
                  (event, index) => (

                    <div
                      key={`${event.minute}-${event.type}-${index}`}
                      className={
                        `football-event football-event-${String(
                          event.type || ""
                        ).toLowerCase()}`
                      }
                    >

                      <span className="football-event-minute">
                        {event.minute
                          ? `${event.minute}'`
                          : "—"}
                      </span>

                      <span className="football-event-icon">
                        {getEventIcon(
                          event.type
                        )}
                      </span>

                      <div>

                        <strong>
                          {getEventLabel(
                            event
                          )}
                        </strong>

                        {event.team && (

                          <small>
                            {event.team === "HOME"
                              ? homeName
                              : awayName}
                          </small>

                        )}

                      </div>

                    </div>

                  )
                )}

            </div>

          )}

        </div>


        {/* ==================================================
            PENALTIES
        ================================================== */}

        {status === STATUS.PENALTIES &&
          renderPenalties()}


      </div>
    );


  // ==========================================================
  // ERROR
  // ==========================================================

  const renderError =
    () => (

      <div className="football-error-screen">

        <div className="football-error-card">

          <div className="football-error-icon">
            ⚠️
          </div>

          <h2>
            Une erreur est survenue
          </h2>

          <p>
            {error ||
              "Impossible de continuer le match."}
          </p>


          <div className="football-error-actions">

            <button
              type="button"
              className="football-primary-button"
              onClick={returnToMenu}
            >
              Retour
            </button>

            {matchId && (

              <button
                type="button"
                className="football-secondary-button"
                onClick={() => {

                  setError("");

                  setStatus(
                    STATUS.READY
                  );

                  refreshCurrentState();

                }}
              >
                Réessayer
              </button>

            )}

          </div>

        </div>

      </div>
    );


  // ==========================================================
  // MAIN RENDER
  // ==========================================================

  return (

    <div className="football-page">

      {renderHeader()}


      {error &&
        status !== STATUS.ERROR && (

          <div className="football-global-error">

            <span>
              ⚠️
            </span>

            <span>
              {error}
            </span>

            <button
              type="button"
              onClick={() =>
                setError("")
              }
            >
              ×
            </button>

          </div>

        )}


      <main className="football-content">

        {status === STATUS.MENU &&
          renderLobby()}


        {status === STATUS.CREATING && (

          <div className="football-loading-screen">

            <div className="football-spinner" />

            <h2>
              Création du match...
            </h2>

            <p>
              Le SAC prépare votre défi.
            </p>

          </div>

        )}


        {status === STATUS.WAITING &&
          renderWaiting()}


        {status === STATUS.READY &&
          renderReady()}


        {status === STATUS.STARTING && (

          <div className="football-starting-screen">

            <div className="football-starting-ball">
              ⚽
            </div>

            <span>
              MATCH #{matchId}
            </span>

            <h2>
              Le match va commencer
            </h2>

            <p>
              Préparez-vous...
            </p>

          </div>

        )}


        {(
          status === STATUS.PLAYING ||
          status === STATUS.HALF_TIME ||
          status === STATUS.EXTRA_TIME ||
          status === STATUS.PAUSED ||
          status === STATUS.PENALTIES
        ) &&
          renderLiveMatch()}


        {status === STATUS.FINISHED &&
          renderResult()}


        {status === STATUS.ERROR &&
          renderError()}

      </main>

    </div>
  );
}