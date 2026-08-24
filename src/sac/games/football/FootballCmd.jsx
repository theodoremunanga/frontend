// src/sac/games/football/FootballCmd.jsx

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

/**
 * ============================================================
 * FOOTBALL COMMAND
 * ============================================================
 *
 * Manette digitale du Football.
 *
 * IMPORTANT :
 * Ce composant est volontairement séparé de Football.jsx.
 *
 * Il pourra évoluer vers :
 *
 * - onClick
 * - onLongPress
 * - répétition automatique
 * - tactile
 * - clavier
 * - joystick virtuel
 * - commandes de jeu
 *
 * Football.jsx reste la mère.
 * FootballCmd.jsx reste la manette.
 */

const LONG_PRESS_DELAY = 500;
const REPEAT_DELAY = 120;

function FootballCmd({
  match,

  isPlaying = false,

  isPaused = false,

  disabled = false,

  onStart,

  onPause,

  onResume,

  onLeave,
}) {
  /**
   * ==========================================================
   * LONG PRESS
   * ==========================================================
   */

  const longPressTimer =
    useRef(null);

  const repeatTimer =
    useRef(null);

  const longPressTriggered =
    useRef(false);

  /**
   * ==========================================================
   * ÉTAT UI
   * ==========================================================
   */

  const [activeCommand, setActiveCommand] =
    useState(null);

  /**
   * ==========================================================
   * NETTOYAGE
   * ==========================================================
   */

  const clearTimers = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(
        longPressTimer.current
      );

      longPressTimer.current = null;
    }

    if (repeatTimer.current) {
      clearInterval(
        repeatTimer.current
      );

      repeatTimer.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  /**
   * ==========================================================
   * LONG PRESS
   * ==========================================================
   *
   * Architecture déjà prête pour de vraies commandes.
   */

  const handlePressStart = useCallback(
    (command, callback) => {
      if (disabled) return;

      longPressTriggered.current =
        false;

      setActiveCommand(command);

      clearTimers();

      longPressTimer.current =
        setTimeout(() => {
          longPressTriggered.current =
            true;

          /**
           * Première exécution du long press
           */
          if (callback) {
            callback({
              type: "LONG_PRESS",
              command,
            });
          }

          /**
           * Répétition pendant maintien
           */
          repeatTimer.current =
            setInterval(() => {
              if (callback) {
                callback({
                  type: "LONG_PRESS_REPEAT",
                  command,
                });
              }
            }, REPEAT_DELAY);
        }, LONG_PRESS_DELAY);
    },
    [
      disabled,
      clearTimers,
    ]
  );

  /**
   * ==========================================================
   * RELEASE
   * ==========================================================
   */

  const handlePressEnd = useCallback(
    (command, callback) => {
      if (disabled) return;

      const wasLongPress =
        longPressTriggered.current;

      clearTimers();

      setActiveCommand(null);

      /**
       * Si ce n'était PAS un long press,
       * on considère l'action comme un click.
       */

      if (
        !wasLongPress &&
        callback
      ) {
        callback({
          type: "CLICK",
          command,
        });
      }

      longPressTriggered.current =
        false;
    },
    [
      disabled,
      clearTimers,
    ]
  );

  /**
   * ==========================================================
   * CANCEL
   * ==========================================================
   */

  const handleCancel = useCallback(() => {
    clearTimers();

    setActiveCommand(null);

    longPressTriggered.current =
      false;
  }, [clearTimers]);

  /**
   * ==========================================================
   * WRAPPER COMMANDE
   * ==========================================================
   */

  const createPressHandlers = (
    command,
    callback
  ) => ({
    onMouseDown: () =>
      handlePressStart(
        command,
        callback
      ),

    onMouseUp: () =>
      handlePressEnd(
        command,
        callback
      ),

    onMouseLeave: handleCancel,

    onTouchStart: (event) => {
      event.preventDefault();

      handlePressStart(
        command,
        callback
      );
    },

    onTouchEnd: (event) => {
      event.preventDefault();

      handlePressEnd(
        command,
        callback
      );
    },

    onTouchCancel: handleCancel,
  });

  /**
   * ==========================================================
   * ACTIONS CYCLE MATCH
   * ==========================================================
   */

  const commandStart = () => {
    if (onStart) {
      onStart();
    }
  };

  const commandPause = () => {
    if (onPause) {
      onPause();
    }
  };

  const commandResume = () => {
    if (onResume) {
      onResume();
    }
  };

  const commandLeave = () => {
    if (onLeave) {
      onLeave();
    }
  };

  /**
   * ==========================================================
   * RENDER
   * ==========================================================
   */

  return (
    <section className="football-cmd">
      <div className="football-cmd__header">
        <span>
          🎮 Commande
        </span>

        <small>
          {match?.phase ?? ""}
        </small>
      </div>

      <div className="football-cmd__body">

        {/* ==================================================
            START
        ================================================== */}

        {!isPlaying &&
          !isPaused && (
            <button
              type="button"
              className={`football-cmd__button football-cmd__button--start ${
                activeCommand === "START"
                  ? "is-active"
                  : ""
              }`}
              disabled={disabled}
              {...createPressHandlers(
                "START",
                commandStart
              )}
            >
              ▶
              <span>
                Démarrer
              </span>
            </button>
          )}

        {/* ==================================================
            PAUSE
        ================================================== */}

        {isPlaying && (
          <button
            type="button"
            className={`football-cmd__button football-cmd__button--pause ${
              activeCommand === "PAUSE"
                ? "is-active"
                : ""
            }`}
            disabled={disabled}
            {...createPressHandlers(
              "PAUSE",
              commandPause
            )}
          >
            ⏸
            <span>
              Pause
            </span>
          </button>
        )}

        {/* ==================================================
            RESUME
        ================================================== */}

        {isPaused && (
          <button
            type="button"
            className={`football-cmd__button football-cmd__button--resume ${
              activeCommand === "RESUME"
                ? "is-active"
                : ""
            }`}
            disabled={disabled}
            {...createPressHandlers(
              "RESUME",
              commandResume
            )}
          >
            ▶
            <span>
              Reprendre
            </span>
          </button>
        )}

        {/* ==================================================
            QUITTER
        ================================================== */}

        <button
          type="button"
          className={`football-cmd__button football-cmd__button--leave ${
            activeCommand === "LEAVE"
              ? "is-active"
              : ""
          }`}
          disabled={disabled}
          {...createPressHandlers(
            "LEAVE",
            commandLeave
          )}
        >
          ✕
          <span>
            Quitter
          </span>
        </button>
      </div>

      {/* ====================================================
          INDICATEUR LONG PRESS
      ==================================================== */}

      {activeCommand && (
        <div className="football-cmd__active">
          Maintien : {activeCommand}
        </div>
      )}
    </section>
  );
}

export default FootballCmd;