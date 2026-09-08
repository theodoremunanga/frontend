import {
  useCallback,
  useState,
} from "react";

import * as avisApi from "../services/avisApi";

// ======================================================
// CONDITIONS
// ======================================================

function getConditions(mode) {
  if (mode === "training") {
    return {
      icon: "🎯",
      title: "Mode entraînement",
      text:
        "Bienvenue dans votre espace d'entraînement aux Jeux de Dames. " +
        "Profitez de cette partie pour améliorer votre stratégie et perfectionner votre maîtrise du jeu. " +
        "Chaque joueur dispose de 1 minute 30 secondes pour jouer à son tour.",
      notice:
        "En cliquant sur « Commencer », vous reconnaissez avoir pris connaissance des règles du jeu ainsi que des conditions d'utilisation du SAJCL.",
    };
  }

  if (mode === "ai") {
    return {
      icon: "🤖",
      title: "Jeu contre l'IA",
      text:
        "Vous allez affronter l'intelligence artificielle des Jeux de Dames. " +
        "Chaque tour dispose de 1 minute 30 secondes.",
      notice:
        "En cliquant sur « Commencer », vous acceptez les conditions d'utilisation du jeu ainsi que la politique de confidentialité du SAJCL.",
    };
  }

  return {
    icon: "♟️",
    title: "Bienvenue aux Jeux de Dames",
    text:
      "Jouez avec sincérité, honnêteté et fair-play. " +
      "Respectez votre adversaire et les règles du jeu. " +
      "Chaque joueur dispose de 1 minute 30 secondes pour jouer à chaque tour.",
    notice:
      "En cliquant sur « Commencer », vous acceptez les conditions d'utilisation de ce jeu ainsi que la politique de confidentialité du SAJCL.",
  };
}

// ======================================================
// CONDITIONS MODAL
// ======================================================

function ConditionsModal({
  mode,
  onAccept,
}) {
  const conditions =
    getConditions(mode);

  return (
    <div className="dames-modal-backdrop">
      <div className="dames-conditions-modal">
        <div className="dames-conditions-icon">
          {conditions.icon}
        </div>

        <div className="dames-conditions-kicker">
          SAJCL • JEUX DE DAMES
        </div>

        <h2>
          {conditions.title}
        </h2>

        <p className="dames-conditions-text">
          {conditions.text}
        </p>

        <div className="dames-conditions-notice">
          <span>ℹ️</span>
          <p>
            {conditions.notice}
          </p>
        </div>

        <div className="dames-conditions-rules">
          <div>
            <span>✓</span>
            Fair-play obligatoire
          </div>

          <div>
            <span>✓</span>
            Respect de l'adversaire
          </div>

          <div>
            <span>✓</span>
            Signalement disponible
          </div>

          <div>
            <span>⏱️</span>
            1 min 30 s maximum par tour
          </div>

          <div>
            <span>🚪</span>
            Les décisions de fin viennent du serveur
          </div>
        </div>

        <button
          type="button"
          className="dames-primary-button"
          onClick={onAccept}
        >
          Commencer la partie
        </button>
      </div>
    </div>
  );
}

// ======================================================
// FEEDBACK
// ======================================================

function FeedbackPanel({
  matchId,
  onClose,
}) {
  const [rating, setRating] =
    useState(0);

  const [comment, setComment] =
    useState("");

  const [submitting, setSubmitting] =
    useState(false);

  const [submitted, setSubmitted] =
    useState(false);

  // ====================================================
  // SAVE AVIS — UNIQUE SOURCE
  // ====================================================

  const submit =
    useCallback(
      async () => {
        if (
          submitting ||
          !rating ||
          !matchId
        ) {
          return;
        }

        try {
          setSubmitting(true);

          await avisApi.createAvis({
            game: "checkers",

            matchId:
              Number(matchId),

            rating:
              Number(rating),

            comment:
              comment.trim() ||
              null,

            context:
              "match",
          });

          setSubmitted(true);
        } catch (error) {
          console.error(
            "CHECKERS FEEDBACK ERROR:",
            error
          );

          window.dispatchEvent(
            new CustomEvent(
              "toast",
              {
                detail:
                  "❌ Impossible d'enregistrer votre avis.",
              }
            )
          );
        } finally {
          setSubmitting(false);
        }
      },
      [
        submitting,
        rating,
        matchId,
        comment,
      ]
    );

  if (submitted) {
    return (
      <div className="dames-feedback-card">
        <div className="dames-feedback-icon">
          💚
        </div>

        <h2>
          Merci pour votre avis !
        </h2>

        <p>
          Votre retour aidera SAJCL
          à améliorer l'expérience
          des Jeux de Dames et
          de 6BetBall.
        </p>

        <button
          type="button"
          className="dames-primary-button"
          onClick={onClose}
        >
          Continuer
        </button>
      </div>
    );
  }

  return (
    <div className="dames-feedback-card">
      <div className="dames-feedback-icon">
        ⭐
      </div>

      <div className="dames-conditions-kicker">
        SAJCL • VOTRE AVIS COMPTE
      </div>

      <h2>
        Comment avez-vous trouvé
        les Jeux de Dames ?
      </h2>

      <p>
        Votre impression nous aidera
        à améliorer l'expérience
        6BetBall.
      </p>

      <div className="dames-feedback-match">
        Partie #{matchId}
      </div>

      <div className="dames-feedback-rating-title">
        Combien d'étoiles mérite ce jeu ?
      </div>

      <div
        className="dames-feedback-stars"
        role="radiogroup"
        aria-label="Évaluation"
      >
        {[1, 2, 3, 4, 5].map(
          (star) => (
            <button
              key={star}
              type="button"
              className={
                star <= rating
                  ? "dames-feedback-star dames-feedback-star--active"
                  : "dames-feedback-star"
              }
              onClick={() =>
                setRating(star)
              }
              aria-label={`${star} étoile${
                star > 1
                  ? "s"
                  : ""
              }`}
            >
              ★
            </button>
          )
        )}
      </div>

      <textarea
        className="dames-feedback-textarea"
        value={comment}
        maxLength={500}
        onChange={(event) =>
          setComment(
            event.target.value
          )
        }
        placeholder="Votre impression..."
      />

      <div className="dames-feedback-actions">
        <button
          type="button"
          className="dames-secondary-button"
          onClick={onClose}
          disabled={submitting}
        >
          Plus tard
        </button>

        <button
          type="button"
          className="dames-primary-button"
          onClick={submit}
          disabled={
            submitting ||
            !rating
          }
        >
          {submitting
            ? "Enregistrement..."
            : "Envoyer mon avis"}
        </button>
      </div>
    </div>
  );
}

// ======================================================
// COMPONENT
// ======================================================

export default function DamesSettings({
  mode = "user",
  conditionsVisible = false,
  onAcceptConditions,
  feedbackVisible = false,
  feedbackMatchId = null,
}) {
  const [
    feedbackOpen,
    setFeedbackOpen,
  ] = useState(
    feedbackVisible
  );

  if (
    !conditionsVisible &&
    !feedbackVisible &&
    !feedbackOpen
  ) {
    return null;
  }

  return (
    <>
      {conditionsVisible && (
        <ConditionsModal
          mode={mode}
          onAccept={
            onAcceptConditions
          }
        />
      )}

      {feedbackVisible &&
        feedbackOpen && (
          <div className="dames-modal-backdrop">
            <FeedbackPanel
              matchId={
                feedbackMatchId
              }
              onClose={() =>
                setFeedbackOpen(
                  false
                )
              }
            />
          </div>
        )}
    </>
  );
}