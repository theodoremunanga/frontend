// src/sac/games/football/Players.jsx

import React, { useMemo } from "react";

/**
 * ============================================================
 * PLAYERS
 * ============================================================
 *
 * Représentation des deux joueurs sur le terrain.
 *
 * Football.jsx = logique mère
 * Stade.jsx    = terrain
 * Players.jsx  = joueurs
 *
 * Aucune logique Socket ici.
 * Aucune simulation ici.
 * Aucune modification du score ici.
 */

function Players({
  match = null,

  homePlayer = null,
  awayPlayer = null,
}) {
  /**
   * ==========================================================
   * INFORMATIONS JOUEURS
   * ==========================================================
   */

  const homeName = useMemo(() => {
    return (
      homePlayer?.username ??
      homePlayer?.name ??
      homePlayer?.pseudo ??
      "Joueur 1"
    );
  }, [homePlayer]);

  const awayName = useMemo(() => {
    return (
      awayPlayer?.username ??
      awayPlayer?.name ??
      awayPlayer?.pseudo ??
      "Joueur 2"
    );
  }, [awayPlayer]);

  /**
   * ==========================================================
   * POSITION DE BASE
   * ==========================================================
   *
   * Pour l'instant les joueurs restent dans leur moitié.
   *
   * Plus tard, ces coordonnées pourront être alimentées
   * par un véritable état de déplacement.
   */

  const homePosition = {
    left: "28%",
    top: "50%",
  };

  const awayPosition = {
    left: "72%",
    top: "50%",
  };

  /**
   * ==========================================================
   * RENDER
   * ==========================================================
   */

  return (
    <div
      className="football-players"
      data-match-id={match?.id ?? ""}
    >
      {/* ====================================================
          JOUEUR HOME
      ==================================================== */}

      <div
        className="football-player football-player--home"
        style={homePosition}
        data-side="HOME"
        data-user-id={homePlayer?.id ?? ""}
      >
        <div className="football-player__body">

          <div className="football-player__head" />

          <div className="football-player__torso">
            <span className="football-player__number">
              1
            </span>
          </div>

          <div className="football-player__legs">
            <span />
            <span />
          </div>

        </div>

        <div className="football-player__shadow" />

        <div className="football-player__name">
          {homeName}
        </div>

        <div className="football-player__side">
          HOME
        </div>
      </div>

      {/* ====================================================
          JOUEUR AWAY
      ==================================================== */}

      <div
        className="football-player football-player--away"
        style={awayPosition}
        data-side="AWAY"
        data-user-id={awayPlayer?.id ?? ""}
      >
        <div className="football-player__body">

          <div className="football-player__head" />

          <div className="football-player__torso">
            <span className="football-player__number">
              2
            </span>
          </div>

          <div className="football-player__legs">
            <span />
            <span />
          </div>

        </div>

        <div className="football-player__shadow" />

        <div className="football-player__name">
          {awayName}
        </div>

        <div className="football-player__side">
          AWAY
        </div>
      </div>
    </div>
  );
}

export default Players;