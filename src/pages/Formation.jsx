// ============================================================
// 6BETBALL — FORMATION AMBASSADEUR
// Interface informative — Aucun appel backend
// ============================================================

import { useMemo, useState } from "react";

import "./Formation.css";

// ============================================================
// CONSTANTES
// ============================================================

const APP_NAME = "6BetBall";
const ADMIN_CONTACT = "243973596027";

// ============================================================
// COMPONENT
// ============================================================

export default function Formation() {
  // ----------------------------------------------------------
  // FORMULAIRE CANDIDATURE
  // ----------------------------------------------------------

  const [fullName, setFullName] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [duration, setDuration] = useState("");

  // ----------------------------------------------------------
  // COPIE
  // ----------------------------------------------------------

  const [copiedItem, setCopiedItem] = useState("");

  // ==========================================================
  // MESSAGE DE CANDIDATURE
  // ==========================================================

  const applicationMessage = useMemo(() => {
    const safeName =
      fullName.trim() || "votre nom complet";

    const safeCountry =
      country.trim() || "votre pays";

    const safeCity =
      city.trim() || "votre ville";

    const safeDuration =
      duration.trim() || "votre durée d'utilisation";

    return `Moi, ${safeName}, résidant de ${safeCountry}, dans la ville de ${safeCity}, je suis utilisateur de la plateforme ${APP_NAME} depuis ${safeDuration}.

Je comprends les fonctionnalités générales et les règles de base de ${APP_NAME} ainsi que le fonctionnement de ses différents services.

Par la présente, je demande officiellement à l'Administration de ${APP_NAME} de bien vouloir examiner ma candidature et, sous réserve du respect des conditions applicables, de me nommer Ambassadeur ${APP_NAME}.

Je reconnais qu'être Ambassadeur sur ${APP_NAME} implique notamment :

• respecter les Conditions d'utilisation et la Politique de confidentialité de ${APP_NAME} ;

• représenter la plateforme de manière honnête, responsable et respectueuse ;

• recruter et orienter de nouveaux utilisateurs vers ${APP_NAME} ;

• initier les nouveaux utilisateurs aux fonctionnalités générales de la plateforme et les accompagner dans leur prise en main ;

• expliquer aux nouveaux utilisateurs les règles essentielles relatives à l'utilisation de la plateforme ;

• contribuer au développement de la communauté ${APP_NAME} de manière loyale et transparente ;

• récupérer les fonds envoyés à la C.O.6 vers le compte de l'utilisateur bénéficiaire, conformément aux procédures et conditions établies par ${APP_NAME}.

Je comprends également que le statut d'Ambassadeur est accordé par l'Administration après examen de la demande et qu'il implique le respect permanent des règles, procédures et exigences applicables au programme.

Je m'engage à utiliser mes fonctions d'Ambassadeur de manière responsable et à ne pas utiliser ce statut pour tromper, manipuler ou induire en erreur les utilisateurs de ${APP_NAME}.

En foi de quoi, je dépose ma demande auprès de l'Administration de ${APP_NAME}.

Nom complet : ${safeName}
Pays : ${safeCountry}
Ville : ${safeCity}
Durée d'utilisation de ${APP_NAME} : ${safeDuration}`;

  }, [
    fullName,
    country,
    city,
    duration,
  ]);

  // ==========================================================
  // COPY HELPER
  // ==========================================================

  const copyToClipboard = async (
    text,
    item
  ) => {
    try {
      await navigator.clipboard.writeText(text);

      setCopiedItem(item);

      window.setTimeout(() => {
        setCopiedItem("");
      }, 2200);
    } catch (error) {
      console.warn(
        "6BetBall — copie impossible :",
        error
      );
    }
  };

  // ==========================================================
  // SCROLL
  // ==========================================================

  const scrollToApplication = () => {
    const element =
      document.getElementById(
        "formation-application"
      );

    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="formation-page">
      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="formation-header">
        <div className="formation-header__brand">
          <div className="formation-header__logo">
            6
          </div>

          <div>
            <div className="formation-header__title">
              <strong>Bet</strong>
              <span>Ball</span>
            </div>

            <small>
              PROGRAMME AMBASSADEUR
            </small>
          </div>
        </div>

        <div className="formation-header__badge">
          🤝 Ambassadeur
        </div>
      </header>

      {/* ======================================================
          INTRODUCTION
      ====================================================== */}

      <main className="formation-main">
        <section className="formation-hero">
          <div className="formation-hero__eyebrow">
            PROGRAMME 6BETBALL
          </div>

          <h1>
            Devenir Ambassadeur
            <br />
            <span>6BetBall</span>
          </h1>

          <p>
            Découvrez le fonctionnement de la
            plateforme, comprenez le rôle d'un
            Ambassadeur et préparez votre demande
            auprès de l'Administration.
          </p>

          <div className="formation-hero__actions">
            <button
              type="button"
              className="formation-button formation-button--primary"
              onClick={scrollToApplication}
            >
              🤝 Préparer ma demande
              <span>→</span>
            </button>
          </div>
        </section>

        {/* ====================================================
            INTRODUCTION 6BETBALL
        ==================================================== */}

        <section className="formation-section">
          <div className="formation-section__heading">
            <span className="formation-section__number">
              01
            </span>

            <div>
              <span className="formation-section__eyebrow">
                COMMENCER
              </span>

              <h2>
                Comprendre 6BetBall
              </h2>
            </div>
          </div>

          <div className="formation-card">
            <p>
              <strong>
                {APP_NAME}
              </strong>{" "}
              est une plateforme qui permet aux
              utilisateurs de créer leur compte,
              gérer leur espace personnel, effectuer
              les opérations financières disponibles
              et participer à des parties
              compétitives avec d'autres utilisateurs.
            </p>

            <p>
              Avant de demander à devenir
              Ambassadeur, il est important de
              connaître les fonctionnalités générales
              de la plateforme et de savoir guider
              correctement un nouvel utilisateur.
            </p>

            <div className="formation-note">
              <span>💡</span>

              <div>
                <strong>
                  L'objectif du programme
                </strong>

                <p>
                  Un Ambassadeur n'est pas simplement
                  un utilisateur supplémentaire. Il
                  contribue à faire connaître
                  {APP_NAME}, accompagne les nouveaux
                  utilisateurs et participe au
                  développement de la communauté.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================
            CREATION COMPTE
        ==================================================== */}

        <section className="formation-section">
          <div className="formation-section__heading">
            <span className="formation-section__number">
              02
            </span>

            <div>
              <span className="formation-section__eyebrow">
                ÉTAPE 1
              </span>

              <h2>
                Créer son compte
              </h2>
            </div>
          </div>

          <div className="formation-steps">
            <article className="formation-step">
              <div className="formation-step__icon">
                👤
              </div>

              <div>
                <span>
                  01
                </span>

                <h3>
                  Inscription
                </h3>

                <p>
                  Créez votre compte avec les
                  informations demandées par
                  {APP_NAME}. Utilisez des informations
                  exactes et qui vous appartiennent.
                </p>
              </div>
            </article>

            <article className="formation-step">
              <div className="formation-step__icon">
                🔐
              </div>

              <div>
                <span>
                  02
                </span>

                <h3>
                  Sécurisation
                </h3>

                <p>
                  Protégez vos identifiants et
                  évitez de communiquer votre mot de
                  passe ou vos informations de
                  connexion à une autre personne.
                </p>
              </div>
            </article>

            <article className="formation-step">
              <div className="formation-step__icon">
                ✅
              </div>

              <div>
                <span>
                  03
                </span>

                <h3>
                  Accès à la plateforme
                </h3>

                <p>
                  Une fois votre compte disponible,
                  vous pouvez accéder à votre espace
                  personnel et découvrir les services
                  proposés par {APP_NAME}.
                </p>
              </div>
            </article>
          </div>
        </section>

        {/* ====================================================
            DEPOT / RETRAIT
        ==================================================== */}

        <section className="formation-section">
          <div className="formation-section__heading">
            <span className="formation-section__number">
              03
            </span>

            <div>
              <span className="formation-section__eyebrow">
                ÉTAPE 2
              </span>

              <h2>
                Dépôt et retrait
              </h2>
            </div>
          </div>

          <div className="formation-two-columns">
            <article className="formation-info-card">
              <div className="formation-info-card__icon">
                💰
              </div>

              <h3>
                Effectuer un dépôt
              </h3>

              <p>
                Le dépôt permet d'alimenter votre
                compte afin d'utiliser les services
                financiers proposés par
                {APP_NAME}.
              </p>

              <ul>
                <li>
                  Accédez à votre Profil.
                </li>

                <li>
                  Consultez les instructions de
                  dépôt disponibles.
                </li>

                <li>
                  Respectez les informations et
                  montants indiqués par la plateforme.
                </li>

                <li>
                  Vérifiez toujours l'opération
                  avant de la confirmer.
                </li>
              </ul>
            </article>

            <article className="formation-info-card">
              <div className="formation-info-card__icon">
                🏦
              </div>

              <h3>
                Effectuer un retrait
              </h3>

              <p>
                Le retrait permet de récupérer les
                fonds disponibles sur votre compte
                conformément aux conditions et
                procédures de {APP_NAME}.
              </p>

              <ul>
                <li>
                  Vérifiez votre solde disponible.
                </li>

                <li>
                  Accédez à la fonction de retrait.
                </li>

                <li>
                  Saisissez les informations
                  demandées avec attention.
                </li>

                <li>
                  Vérifiez les détails avant
                  validation.
                </li>
              </ul>
            </article>
          </div>

          <div className="formation-warning">
            <span>⚠️</span>

            <div>
              <strong>
                Règle de sécurité importante
              </strong>

              <p>
                Un Ambassadeur ne doit jamais
                demander le mot de passe d'un
                utilisateur. Les opérations doivent
                toujours être réalisées selon les
                procédures officielles de
                {APP_NAME}.
              </p>
            </div>
          </div>
        </section>

        {/* ====================================================
            CREER UNE PARTIE
        ==================================================== */}

        <section className="formation-section">
          <div className="formation-section__heading">
            <span className="formation-section__number">
              04
            </span>

            <div>
              <span className="formation-section__eyebrow">
                ÉTAPE 3
              </span>

              <h2>
                Créer une partie
              </h2>
            </div>
          </div>

          <div className="formation-process">
            <div className="formation-process__item">
              <span>
                1
              </span>

              <div>
                <h3>
                  Choisir un jeu
                </h3>

                <p>
                  Depuis l'accueil de 6BetBall 
                  Sélectionnez le jeu auquel vous
                  souhaitez jouer.
                </p>
              </div>
            </div>

            <div className="formation-process__arrow">
              ↓
            </div>

            <div className="formation-process__item">
              <span>
                2
              </span>

              <div>
                <h3>
                  Configurer la partie
                </h3>

                <p>
                  Définissez les paramètres proposés
                  par le jeu, notamment les conditions
                  de participation lorsqu'elles sont
                  disponibles.
                </p>
              </div>
            </div>

            <div className="formation-process__arrow">
              ↓
            </div>

            <div className="formation-process__item">
              <span>
                3
              </span>

              <div>
                <h3>
                  Créer la partie
                </h3>

                <p>
                  Validez la création et attendez
                  qu'un autre joueur rejoigne la
                  partie conformément aux règles du
                  jeu.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================
            REJOINDRE UNE PARTIE
        ==================================================== */}

        <section className="formation-section">
          <div className="formation-section__heading">
            <span className="formation-section__number">
              05
            </span>

            <div>
              <span className="formation-section__eyebrow">
                ÉTAPE 4
              </span>

              <h2>
                Rejoindre une partie
              </h2>
            </div>
          </div>

          <div className="formation-card">
            <div className="formation-check-list">
              <div>
                <span>✓</span>
                <p>
                  Consultez les parties disponibles.
                </p>
              </div>

              <div>
                <span>✓</span>
                <p>
                  Vérifiez les paramètres de la
                  partie avant de rejoindre.
                </p>
              </div>

              <div>
                <span>✓</span>
                <p>
                  Assurez-vous que les conditions
                  demandées sont compatibles avec
                  votre compte.
                </p>
              </div>

              <div>
                <span>✓</span>
                <p>
                  Confirmez votre participation.
                </p>
              </div>

              <div>
                <span>✓</span>
                <p>
                  Une fois la partie lancée, respectez
                  les règles et les délais du jeu.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================
            ESPRIT DU PROGRAMME
        ==================================================== */}

        <section className="formation-section formation-section--highlight">
          <div className="formation-section__heading">
            <span className="formation-section__number">
              06
            </span>

            <div>
              <span className="formation-section__eyebrow">
                PROGRAMME
              </span>

              <h2>
                Qu'est-ce qu'un Ambassadeur ?
              </h2>
            </div>
          </div>

          <div className="formation-ambassador-grid">
            <article>
              <span className="formation-ambassador-grid__icon">
                📢
              </span>

              <h3>
                Recruter
              </h3>

              <p>
                Faire connaître {APP_NAME} et
                orienter de nouveaux utilisateurs
                vers la plateforme.
              </p>
            </article>

            <article>
              <span className="formation-ambassador-grid__icon">
                🎓
              </span>

              <h3>
                Initier
              </h3>

              <p>
                Aider les nouveaux utilisateurs à
                comprendre les fonctionnalités
                générales et les règles essentielles
                de la plateforme.
              </p>
            </article>

            <article>
              <span className="formation-ambassador-grid__icon">
                🤝
              </span>

              <h3>
                Accompagner
              </h3>

              <p>
                Répondre aux premières questions et
                orienter les utilisateurs vers les
                canaux officiels lorsque cela est
                nécessaire.
              </p>
            </article>

            <article>
              <span className="formation-ambassador-grid__icon">
                💰
              </span>

              <h3>
                Récupérer les fonds
              </h3>

              <p>
                Récupérer les fonds envoyés à la
                C.O.6 vers le compte de l'utilisateur
                bénéficiaire, selon les procédures
                prévues.
              </p>
            </article>
          </div>
        </section>

        {/* ====================================================
            RESPONSABILITES
        ==================================================== */}

        <section className="formation-section">
          <div className="formation-section__heading">
            <span className="formation-section__number">
              07
            </span>

            <div>
              <span className="formation-section__eyebrow">
                ENGAGEMENT
              </span>

              <h2>
                Les responsabilités
              </h2>
            </div>
          </div>

          <div className="formation-responsibilities">
            <div>
              <strong>
                01
              </strong>

              <p>
                Respecter les Conditions d'utilisation
                de {APP_NAME}.
              </p>
            </div>

            <div>
              <strong>
                02
              </strong>

              <p>
                Respecter la Politique de
                confidentialité de {APP_NAME}.
              </p>
            </div>

            <div>
              <strong>
                03
              </strong>

              <p>
                Fournir des informations honnêtes
                aux utilisateurs.
              </p>
            </div>

            <div>
              <strong>
                04
              </strong>

              <p>
                Ne jamais demander ou utiliser les
                identifiants personnels d'un
                utilisateur.
              </p>
            </div>

            <div>
              <strong>
                05
              </strong>

              <p>
                Respecter les procédures de
                récupération des fonds.
              </p>
            </div>

            <div>
              <strong>
                06
              </strong>

              <p>
                Préserver une relation respectueuse
                avec les utilisateurs et
                l'Administration.
              </p>
            </div>
          </div>
        </section>

        {/* ====================================================
            AVANT DE POSTULER
        ==================================================== */}

        <section className="formation-section">
          <div className="formation-section__heading">
            <span className="formation-section__number">
              08
            </span>

            <div>
              <span className="formation-section__eyebrow">
                AVANT LA DEMANDE
              </span>

              <h2>
                Êtes-vous prêt ?
              </h2>
            </div>
          </div>

          <div className="formation-readiness">
            <div className="formation-readiness__intro">
              <p>
                Avant d'envoyer votre candidature,
                assurez-vous de connaître les
                fonctionnalités essentielles de
                {APP_NAME}.
              </p>
            </div>

            <div className="formation-readiness__list">
              <div>
                <span>✓</span>
                <p>
                  Je sais créer et utiliser mon
                  compte.
                </p>
              </div>

              <div>
                <span>✓</span>
                <p>
                  Je comprends le fonctionnement des
                  dépôts et retraits.
                </p>
              </div>

              <div>
                <span>✓</span>
                <p>
                  Je sais créer une partie.
                </p>
              </div>

              <div>
                <span>✓</span>
                <p>
                  Je sais rejoindre une partie.
                </p>
              </div>

              <div>
                <span>✓</span>
                <p>
                  Je comprends les règles générales
                  d'utilisation de {APP_NAME}.
                </p>
              </div>

              <div>
                <span>✓</span>
                <p>
                  Je suis prêt à accompagner de
                  nouveaux utilisateurs.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================
            CANDIDATURE
        ==================================================== */}

        <section
          id="formation-application"
          className="formation-section formation-application"
        >
          <div className="formation-section__heading">
            <span className="formation-section__number">
              09
            </span>

            <div>
              <span className="formation-section__eyebrow">
                CANDIDATURE
              </span>

              <h2>
                Demander à devenir Ambassadeur
              </h2>
            </div>
          </div>

          <div className="formation-application__intro">
            <p>
              Si vous souhaitez rejoindre le
              Programme de Recrutement des
              Ambassadeurs {APP_NAME}, préparez votre
              message avec vos informations
              personnelles.
            </p>

            <p>
              Le message ci-dessous est une base
              préparée pour faciliter votre demande.
              Complétez les champs puis copiez le
              message final.
            </p>
          </div>

          {/* FORM */}

          <div className="formation-form">
            <div className="formation-form__header">
              <span>
                📝
              </span>

              <div>
                <h3>
                  Vos informations
                </h3>

                <p>
                  Ces informations servent à
                  personnaliser votre demande.
                </p>
              </div>
            </div>

            <div className="formation-form__grid">
              <label>
                <span>
                  Nom complet
                </span>

                <input
                  type="text"
                  value={fullName}
                  onChange={(event) =>
                    setFullName(
                      event.target.value
                    )
                  }
                  placeholder="Votre nom complet"
                  autoComplete="name"
                />
              </label>

              <label>
                <span>
                  Pays de résidence
                </span>

                <input
                  type="text"
                  value={country}
                  onChange={(event) =>
                    setCountry(
                      event.target.value
                    )
                  }
                  placeholder="Ex. République démocratique du Congo"
                  autoComplete="country-name"
                />
              </label>

              <label>
                <span>
                  Ville
                </span>

                <input
                  type="text"
                  value={city}
                  onChange={(event) =>
                    setCity(
                      event.target.value
                    )
                  }
                  placeholder="Votre ville"
                  autoComplete="address-level2"
                />
              </label>

              <label>
                <span>
                  Depuis combien de temps utilisez-vous
                  6BetBall ?
                </span>

                <input
                  type="text"
                  value={duration}
                  onChange={(event) =>
                    setDuration(
                      event.target.value
                    )
                  }
                  placeholder="Ex. 6 mois"
                />
              </label>
            </div>
          </div>

          {/* CONTACT ADMIN */}

          <div className="formation-contact">
            <div className="formation-contact__icon">
              📩
            </div>

            <div className="formation-contact__content">
              <span>
                CONTACT DE L'ADMINISTRATION
              </span>

              <strong>
                {ADMIN_CONTACT}
              </strong>

              <p>
                Envoyez votre demande à ce numéro
                depuis l'espace de messagerie de
                {APP_NAME}.
              </p>
            </div>

            <button
              type="button"
              className="formation-button formation-button--secondary"
              onClick={() =>
                copyToClipboard(
                  ADMIN_CONTACT,
                  "number"
                )
              }
            >
              {copiedItem === "number"
                ? "✓ Numéro copié"
                : "📋 Copier le numéro"}
            </button>
          </div>

          {/* MESSAGE */}

          <div className="formation-message">
            <div className="formation-message__header">
              <div>
                <span>
                  MESSAGE DE CANDIDATURE
                </span>

                <h3>
                  Votre demande à l'Administration
                </h3>
              </div>

              <button
                type="button"
                className="formation-copy-button"
                onClick={() =>
                  copyToClipboard(
                    applicationMessage,
                    "message"
                  )
                }
              >
                {copiedItem === "message"
                  ? "✓ Message copié"
                  : "📋 Copier le message"}
              </button>
            </div>

            <div className="formation-message__body">
              <pre>
                {applicationMessage}
              </pre>
            </div>
          </div>

          {/* FINAL INSTRUCTIONS */}

          <div className="formation-final">
            <div className="formation-final__icon">
              🚀
            </div>

            <div>
              <h3>
                Votre demande est prête
              </h3>

              <p>
                Copiez le numéro de
                l'Administration ainsi que votre
                message, puis envoyez-les depuis
                l'espace de messagerie de
                {APP_NAME}.
              </p>

              <p>
                L'attribution du statut
                <strong>
                  {" "}Ambassadeur
                </strong>{" "}
                relève de l'Administration après
                examen de votre demande.
              </p>
            </div>
          </div>
        </section>

        {/* ====================================================
            RAPPEL
        ==================================================== */}

        <section className="formation-reminder">
          <div className="formation-reminder__icon">
            🔐
          </div>

          <div>
            <strong>
              Authentique • Honnête • Sûr
            </strong>

            <p>
              Le programme Ambassadeur repose sur
              la confiance, la responsabilité et le
              respect des utilisateurs.
            </p>
          </div>
        </section>
      </main>

      {/* ======================================================
          FOOTER
      ====================================================== */}

      <footer className="formation-footer">
        <div className="formation-footer__brand">
          <span>
            6
          </span>

          <strong>
            BetBall
          </strong>
        </div>

        <p>
          Programme Ambassadeur • {APP_NAME}
        </p>

        <small>
          © {new Date().getFullYear()}{" "}
          {APP_NAME}. Tous droits réservés.
        </small>
      </footer>
    </div>
  );
}