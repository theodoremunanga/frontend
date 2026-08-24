// src/sac/games/football/Ballon.jsx

import React, {
  useEffect,
  useRef,
  useState,
} from "react";

/**
 * ============================================================
 * BALLON
 * ============================================================
 *
 * Balle 2D animée du football.
 *
 * Le backend décide :
 * - ATTACK
 * - SHOT
 * - GOAL
 * - CORNER
 *
 * Le frontend ne fait qu'animer visuellement le ballon.
 *
 * Aucune simulation de résultat ici.
 */

const INITIAL_POSITION = {
  x: 50,
  y: 50,
};

const POSITIONS = {
  HOME: {
    attack: {
      x: 35,
      y: 50,
    },

    shot: {
      x: 25,
      y: 50,
    },

    goal: {
      x: 4,
      y: 50,
    },

    cornerTop: {
      x: 4,
      y: 8,
    },

    cornerBottom: {
      x: 4,
      y: 92,
    },
  },

  AWAY: {
    attack: {
      x: 65,
      y: 50,
    },

    shot: {
      x: 75,
      y: 50,
    },

    goal: {
      x: 96,
      y: 50,
    },

    cornerTop: {
      x: 96,
      y: 8,
    },

    cornerBottom: {
      x: 96,
      y: 92,
    },
  },
};

function Ballon({
  match = null,
  lastEvent = null,
}) {
  /**
   * ==========================================================
   * POSITION
   * ==========================================================
   */

  const [position, setPosition] = useState(
    INITIAL_POSITION
  );

  /**
   * ==========================================================
   * ANIMATION
   * ==========================================================
   */

  const [animation, setAnimation] =
    useState("");

  const [goalAnimation, setGoalAnimation] =
    useState(false);

  const [visible, setVisible] =
    useState(true);

  /**
   * ==========================================================
   * EVENT REF
   * ==========================================================
   *
   * Permet d'éviter de rejouer plusieurs fois le même
   * événement lorsqu'un composant parent se rerender.
   */

  const lastEventRef = useRef(null);

  /**
   * ==========================================================
   * UTILITAIRE
   * ==========================================================
   */

  const getTeam =
    lastEvent?.team === "HOME"
      ? "HOME"
      : lastEvent?.team === "AWAY"
      ? "AWAY"
      : null;

  /**
   * ==========================================================
   * ANIMATION D'UN ÉVÉNEMENT
   * ==========================================================
   */

  useEffect(() => {
    if (!lastEvent) {
      return;
    }

    /**
     * Identifiant local de l'événement.
     *
     * Football.jsx lui donne normalement un id.
     */

    const eventId =
      lastEvent.id ??
      `${lastEvent.minute}-${lastEvent.type}-${lastEvent.team}`;

    if (
      lastEventRef.current === eventId
    ) {
      return;
    }

    lastEventRef.current = eventId;

    const team = getTeam;

    if (!team) {
      return;
    }

    const teamPositions =
      POSITIONS[team];

    /**
     * ========================================================
     * ATTACK
     * ========================================================
     */

    if (
      lastEvent.type === "ATTACK"
    ) {
      setAnimation(
        "football-ball--attack"
      );

      setPosition(
        teamPositions.attack
      );

      return;
    }

    /**
     * ========================================================
     * SHOT
     * ========================================================
     */

    if (
      lastEvent.type === "SHOT"
    ) {
      setAnimation(
        "football-ball--shot"
      );

      setPosition(
        teamPositions.shot
      );

      return;
    }

    /**
     * ========================================================
     * GOAL
     * ========================================================
     *
     * Le ballon accélère vers le but.
     */

    if (
      lastEvent.type === "GOAL"
    ) {
      setAnimation(
        "football-ball--goal"
      );

      setPosition(
        teamPositions.goal
      );

      setGoalAnimation(true);

      /**
       * Petit effet de disparition du ballon
       * après son entrée dans le but.
       */

      const goalTimer =
        setTimeout(() => {
          setVisible(false);
        }, 850);

      /**
       * Réapparition au centre après l'animation.
       */

      const resetTimer =
        setTimeout(() => {
          setPosition(
            INITIAL_POSITION
          );

          setAnimation("");

          setGoalAnimation(false);

          setVisible(true);
        }, 1800);

      return () => {
        clearTimeout(goalTimer);
        clearTimeout(resetTimer);
      };
    }

    /**
     * ========================================================
     * CORNER
     * ========================================================
     */

    if (
      lastEvent.type === "CORNER"
    ) {
      const corner =
        Math.random() < 0.5
          ? teamPositions.cornerTop
          : teamPositions.cornerBottom;

      setAnimation(
        "football-ball--corner"
      );

      setPosition(corner);

      return;
    }

    /**
     * ========================================================
     * EVENT NORMAL
     * ========================================================
     */

    setAnimation(
      "football-ball--normal"
    );
  }, [
    lastEvent,
    getTeam,
  ]);

  /**
   * ==========================================================
   * RESET APRÈS UNE ACTION
   * ==========================================================
   */

  useEffect(() => {
    if (!animation) {
      return;
    }

    if (
      animation ===
      "football-ball--goal"
    ) {
      return;
    }

    const timer =
      setTimeout(() => {
        setAnimation("");
      }, 900);

    return () => {
      clearTimeout(timer);
    };
  }, [animation]);

  /**
   * ==========================================================
   * POSITION CSS
   * ==========================================================
   */

  const style = {
    left: `${position.x}%`,
    top: `${position.y}%`,
  };

  /**
   * ==========================================================
   * RENDER
   * ==========================================================
   */

  return (
    <div
      className={`football-ball-container ${
        goalAnimation
          ? "football-ball-container--goal"
          : ""
      }`}
    >
      {/* ====================================================
          EFFET DE BUT
      ==================================================== */}

      {goalAnimation && (
        <div className="football-ball__goal-effect">
          <span>⚽</span>
          <span>⚡</span>
          <span>⚡</span>
          <span>⚡</span>
        </div>
      )}

      {/* ====================================================
          BALLON
      ==================================================== */}

      {visible && (
        <div
          className={`football-ball ${animation}`}
          style={style}
          data-match-id={
            match?.id ?? ""
          }
        >
          {/* Corps principal */}
          <div className="football-ball__sphere">

            {/* Pentagone central */}
            <div className="football-ball__center" />

            {/* Motifs */}
            <span className="football-ball__patch football-ball__patch--1" />
            <span className="football-ball__patch football-ball__patch--2" />
            <span className="football-ball__patch football-ball__patch--3" />
            <span className="football-ball__patch football-ball__patch--4" />
            <span className="football-ball__patch football-ball__patch--5" />

          </div>

          {/* Ombre */}
          <div className="football-ball__shadow" />
        </div>
      )}
    </div>
  );
}

export default Ballon;