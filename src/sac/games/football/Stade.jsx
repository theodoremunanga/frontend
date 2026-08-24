// src/sac/games/football/Stade.jsx

import React from "react";

/**
 * ============================================================
 * STADE
 * ============================================================
 *
 * Représentation visuelle du terrain de football.
 *
 * Football.jsx reste le composant mère.
 *
 * Stade.jsx :
 * - dessine le terrain
 * - affiche les lignes
 * - affiche les surfaces
 * - affiche les buts
 * - accueille Players
 * - accueille Ballon
 *
 * Aucune simulation ici.
 * Aucun socket ici.
 * Aucun timer ici.
 */

function Stade({
  children,
  match = null,
  phase = null,
}) {
  return (
    <div
      className="football-stade"
      data-phase={phase || ""}
      data-match-id={match?.id || ""}
    >
      {/* ======================================================
          ENVIRONNEMENT DU STADE
      ====================================================== */}

      <div className="football-stade__environment">

        {/* Tribune supérieure */}
        <div className="football-stade__tribune football-stade__tribune--top">
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>

        {/* Tribune gauche */}
        <div className="football-stade__tribune football-stade__tribune--left">
          <span />
          <span />
          <span />
          <span />
        </div>

        {/* Tribune droite */}
        <div className="football-stade__tribune football-stade__tribune--right">
          <span />
          <span />
          <span />
          <span />
        </div>

        {/* Tribune inférieure */}
        <div className="football-stade__tribune football-stade__tribune--bottom">
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      </div>

      {/* ======================================================
          TERRAIN
      ====================================================== */}

      <div className="football-stade__pitch">

        {/* Ligne extérieure */}
        <div className="football-stade__field">

          {/* ==================================================
              BUT GAUCHE
          ================================================== */}

          <div className="football-stade__goal football-stade__goal--left">
            <div className="football-stade__net" />
          </div>

          {/* ==================================================
              SURFACE DE RÉPARATION GAUCHE
          ================================================== */}

          <div className="football-stade__penalty-area football-stade__penalty-area--left">
            <div className="football-stade__goal-area football-stade__goal-area--left" />

            <div className="football-stade__penalty-spot football-stade__penalty-spot--left" />

            <div className="football-stade__penalty-arc football-stade__penalty-arc--left" />
          </div>

          {/* ==================================================
              MILIEU
          ================================================== */}

          <div className="football-stade__center-line" />

          <div className="football-stade__center-circle">
            <div className="football-stade__center-spot" />
          </div>

          {/* ==================================================
              SURFACE DE RÉPARATION DROITE
          ================================================== */}

          <div className="football-stade__penalty-area football-stade__penalty-area--right">
            <div className="football-stade__goal-area football-stade__goal-area--right" />

            <div className="football-stade__penalty-spot football-stade__penalty-spot--right" />

            <div className="football-stade__penalty-arc football-stade__penalty-arc--right" />
          </div>

          {/* ==================================================
              BUT DROIT
          ================================================== */}

          <div className="football-stade__goal football-stade__goal--right">
            <div className="football-stade__net" />
          </div>

          {/* ==================================================
              CORNERS
          ================================================== */}

          <div className="football-stade__corner football-stade__corner--top-left" />
          <div className="football-stade__corner football-stade__corner--bottom-left" />
          <div className="football-stade__corner football-stade__corner--top-right" />
          <div className="football-stade__corner football-stade__corner--bottom-right" />

          {/* ==================================================
              JOUEURS + BALLON
          ==================================================
          
          Football.jsx injectera ici :

              <Players />
              <Ballon />

          via children.
          */}

          <div className="football-stade__objects">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Stade;