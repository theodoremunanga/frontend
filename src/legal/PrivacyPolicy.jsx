import "./legal.css";

export default function PrivacyPolicy({ setPage }) {
  return (
    <div className="legal-page">

      <div className="legal-container">

        {/* HEADER */}
        <header className="legal-header">

          <div className="legal-brand">
            <h1>6BetBall</h1>

            <span>
              Système d'Arbitrage de Jeux Compétitifs en Ligne
            </span>
          </div>

          <h2>Politique de Confidentialité</h2>

          <p className="legal-version">
            Version : 1.0
          </p>

          <p className="legal-version">
            Dernière mise à jour : 02 Mars 2026
          </p>

        </header>


        {/* NAVIGATION */}
        <div className="legal-navigation">

          <button
            type="button"
            onClick={() => setPage("terms")}
          >
            Conditions d'utilisation
          </button>

          <button
            type="button"
            className="active"
            onClick={() => setPage("privacy")}
          >
            Politique de confidentialité
          </button>

        </div>


        {/* CONTENU */}

        <section className="legal-section">

          <h2>1. INTRODUCTION</h2>

          <p>
            La présente Politique de Confidentialité explique
            comment <strong>Tout Fait Nombre (SARL)</strong>,
            exploitant de <strong>6BetBall</strong>, collecte,
            utilise, protège, conserve et traite les données
            personnelles des utilisateurs.
          </p>

          <p>
            6BetBall est un
            <strong>
              {" "}Système d'Arbitrage de Jeux Compétitifs en
              Ligne (S.A.J.C.L.)
            </strong>.
          </p>

          <p>
            Son fonctionnement nécessite le traitement de
            certaines données permettant notamment :
          </p>

          <ul>
            <li>de créer et gérer les comptes ;</li>
            <li>d'organiser les Matchs ;</li>
            <li>d'identifier les participants ;</li>
            <li>d'assurer l'arbitrage ;</li>
            <li>d'enregistrer les résultats ;</li>
            <li>de sécuriser les compétitions ;</li>
            <li>de prévenir la fraude ;</li>
            <li>de gérer les opérations financières ;</li>
            <li>de garantir le fonctionnement technique.</li>
          </ul>

          <p>
            La présente Politique complète les Conditions
            d'Utilisation de 6BetBall.
          </p>

        </section>


        <section className="legal-section">

          <h2>2. RESPONSABLE DU TRAITEMENT</h2>

          <p>
            Le responsable du traitement est :
          </p>

          <div className="legal-info-box">

            <strong>Tout Fait Nombre (SARL)</strong>

            <br />

            Siège : Kinshasa, République Démocratique du Congo

            <br />

            Plateforme : 6BetBall

            <br />

            E-mail relatif aux données personnelles :
            <strong> admin6betball@gmail.com</strong>

          </div>

        </section>


        <section className="legal-section">

          <h2>3. PRINCIPES DE PROTECTION</h2>

          <p>
            Tout Fait Nombre (SARL) s'efforce de traiter
            les données personnelles selon les principes
            suivants :
          </p>

          <ul>
            <li>collecte limitée aux besoins du service ;</li>
            <li>utilisation conforme aux finalités annoncées ;</li>
            <li>protection contre les accès non autorisés ;</li>
            <li>conservation limitée à la durée nécessaire ;</li>
            <li>exactitude des informations ;</li>
            <li>respect des droits applicables.</li>
          </ul>

        </section>


        <section className="legal-section">

          <h2>4. CATÉGORIES DE DONNÉES COLLECTÉES</h2>

          <h3>4.1. Données du compte</h3>

          <p>
            Nous pouvons collecter :
          </p>

          <ul>
            <li>identifiant utilisateur ;</li>
            <li>nom ou pseudonyme ;</li>
            <li>adresse e-mail ;</li>
            <li>numéro de téléphone lorsqu'il est utilisé ;</li>
            <li>photo ou avatar lorsqu'il est utilisé ;</li>
            <li>informations nécessaires à l'authentification ;</li>
            <li>paramètres et préférences du compte.</li>
          </ul>

        </section>


        <section className="legal-section">

          <h2>5. DONNÉES RELATIVES AUX MATCHS</h2>

          <p>
            Lorsqu'un utilisateur participe à un Match,
            6BetBall peut enregistrer :
          </p>

          <ul>
            <li>identifiant du Match ;</li>
            <li>identifiant des joueurs ;</li>
            <li>Jeu utilisé ;</li>
            <li>date et heure ;</li>
            <li>état du Match ;</li>
            <li>actions nécessaires au fonctionnement du Jeu ;</li>
            <li>score ;</li>
            <li>résultat ;</li>
            <li>durée ;</li>
            <li>événements d'arbitrage ;</li>
            <li>événements d'interruption ;</li>
            <li>données techniques nécessaires à la détermination du résultat.</li>
          </ul>

        </section>


        <section className="legal-section">

          <h2>6. DONNÉES DU SYSTÈME D'ARBITRAGE</h2>

          <p>
            Le SAJCL et son infrastructure centrale
            d'arbitrage peuvent enregistrer des événements
            techniques nécessaires à la supervision des Matchs.
          </p>

          <ul>
            <li>changements d'état ;</li>
            <li>événements de début et de fin ;</li>
            <li>compte à rebours ;</li>
            <li>événements de jeu ;</li>
            <li>résultats ;</li>
            <li>interruptions ;</li>
            <li>erreurs ;</li>
            <li>événements de connexion ;</li>
            <li>informations nécessaires aux vérifications.</li>
          </ul>

        </section>


        <section className="legal-section">

          <h2>7. DONNÉES FINANCIÈRES</h2>

          <p>
            Lorsque l'utilisateur utilise les fonctionnalités
            financières de 6BetBall, nous pouvons traiter des
            informations relatives :
          </p>

          <ul>
            <li>aux dépôts ;</li>
            <li>aux engagements ;</li>
            <li>aux mises ;</li>
            <li>aux gains ;</li>
            <li>aux remboursements ;</li>
            <li>aux retraits ;</li>
            <li>aux soldes ;</li>
            <li>aux identifiants de transactions ;</li>
            <li>à l'état des transactions ;</li>
            <li>à l'historique financier.</li>
          </ul>

        </section>


        <section className="legal-section">

          <h2>8. MOYENS DE PAIEMENT</h2>

          <p>
            6BetBall peut permettre l'utilisation de plusieurs
            moyens de paiement, notamment :
          </p>

          <ul>
            <li>Mobile Money ;</li>
            <li>services de paiement électronique ;</li>
            <li>cryptomonnaies ou actifs numériques lorsque disponibles.</li>
          </ul>

          <p>
            Certaines opérations externes sont effectuées
            manuellement.
          </p>

          <p>
            Lorsque l'opération implique un prestataire externe,
            celui-ci peut également traiter certaines données
            conformément à ses propres conditions.
          </p>

        </section>


        <section className="legal-section">

          <h2>9. AUTOMATISATION DES OPÉRATIONS</h2>

          <p>
            Certaines opérations internes de 6BetBall sont
            automatisées.
          </p>

          <ul>
            <li>changement d'état d'un Match ;</li>
            <li>enregistrement d'un résultat ;</li>
            <li>calcul d'un règlement ;</li>
            <li>attribution d'un gain ;</li>
            <li>remboursement prévu par les règles ;</li>
            <li>mise à jour d'un solde ;</li>
            <li>enregistrement d'un événement financier.</li>
          </ul>

        </section>


        <section className="legal-section">

          <h2>10. DONNÉES TECHNIQUES</h2>

          <p>
            Lors de l'utilisation de la Plateforme, certaines
            informations techniques peuvent être enregistrées :
          </p>

          <ul>
            <li>adresse IP ;</li>
            <li>type d'appareil ;</li>
            <li>système d'exploitation ;</li>
            <li>navigateur ;</li>
            <li>informations de connexion ;</li>
            <li>date et heure de connexion ;</li>
            <li>identifiants techniques ;</li>
            <li>journaux d'erreurs ;</li>
            <li>informations de performance ;</li>
            <li>informations relatives à la sécurité.</li>
          </ul>

        </section>


        <section className="legal-section">

          <h2>11. SÉCURITÉ ET PRÉVENTION DE LA FRAUDE</h2>

          <p>
            Afin de protéger le SAJCL et ses utilisateurs,
            nous pouvons analyser certaines informations
            techniques et comportementales.
          </p>

          <ul>
            <li>comptes multiples ;</li>
            <li>connexions inhabituelles ;</li>
            <li>automatisation non autorisée ;</li>
            <li>comportements suspects ;</li>
            <li>manipulation de Match ;</li>
            <li>tentative de fraude ;</li>
            <li>contournement d'une suspension ;</li>
            <li>attaque ou tentative d'attaque.</li>
          </ul>

        </section>


        <section className="legal-section">

          <h2>12. FINALITÉS DU TRAITEMENT</h2>

          <p>
            Les données personnelles peuvent être utilisées afin de :
          </p>

          <ul>
            <li>gérer et sécuriser les comptes ;</li>
            <li>permettre la participation aux Jeux ;</li>
            <li>assurer l'arbitrage des Matchs ;</li>
            <li>protéger les utilisateurs et les systèmes ;</li>
            <li>prévenir la fraude ;</li>
            <li>enregistrer les transactions ;</li>
            <li>assurer le support ;</li>
            <li>améliorer les services ;</li>
            <li>respecter les obligations légales.</li>
          </ul>

        </section>


        <section className="legal-section">

          <h2>13. BASES DU TRAITEMENT</h2>

          <p>
            Selon le contexte et la législation applicable,
            les traitements peuvent être fondés notamment sur :
          </p>

          <ul>
            <li>l'exécution du service demandé ;</li>
            <li>l'exécution des Conditions d'Utilisation ;</li>
            <li>le respect d'une obligation légale ;</li>
            <li>la sécurité de la Plateforme ;</li>
            <li>la prévention de la fraude ;</li>
            <li>les intérêts légitimes de l'exploitant ;</li>
            <li>le consentement lorsque celui-ci est requis.</li>
          </ul>

        </section>


        <section className="legal-section">

          <h2>14. DONNÉES DES MATCHS ET ARBITRAGE</h2>

          <p>
            Les données relatives aux Matchs peuvent être
            conservées plus longtemps que certaines données
            techniques ordinaires.
          </p>

          <p>
            Cette conservation peut être nécessaire pour :
          </p>

          <ul>
            <li>vérifier un résultat ;</li>
            <li>traiter une contestation ;</li>
            <li>démontrer le déroulement d'un Match ;</li>
            <li>vérifier une transaction ;</li>
            <li>prévenir une fraude ;</li>
            <li>assurer l'intégrité du SAJCL ;</li>
            <li>résoudre un litige.</li>
          </ul>

        </section>


        <section className="legal-section">

          <h2>15. PARTAGE DES DONNÉES</h2>

          <p>
            6BetBall peut faire appel à des prestataires
            techniques ou opérationnels nécessaires au
            fonctionnement de la Plateforme.
          </p>

          <ul>
            <li>hébergement ;</li>
            <li>infrastructure cloud ;</li>
            <li>base de données ;</li>
            <li>déploiement ;</li>
            <li>sécurité ;</li>
            <li>services de communication ;</li>
            <li>paiement ;</li>
            <li>services techniques.</li>
          </ul>

          <p>
            Nous ne vendons pas les données personnelles des
            utilisateurs à des tiers à des fins commerciales.
          </p>

        </section>


        <section className="legal-section">

          <h2>16. INFRASTRUCTURE TECHNIQUE</h2>

          <h3>Render</h3>

          <p>
            Render peut être utilisé pour l'hébergement et
            l'exécution de certains services de l'infrastructure
            de 6BetBall.
          </p>

          <h3>Vercel</h3>

          <p>
            Vercel peut être utilisé pour le déploiement,
            l'hébergement ou la distribution de certaines
            parties de l'application.
          </p>

          <h3>Neon</h3>

          <p>
            Neon peut être utilisé pour l'hébergement et la
            gestion de bases de données PostgreSQL utilisées
            par certains services de 6BetBall.
          </p>

        </section>


        <section className="legal-section">

          <h2>17. TRANSFERTS INTERNATIONAUX</h2>

          <p>
            6BetBall étant accessible dans plusieurs régions
            du monde, certains prestataires techniques peuvent
            traiter des données depuis des infrastructures
            situées en dehors de la République Démocratique du Congo.
          </p>

          <p>
            Lorsque cela est applicable, Tout Fait Nombre (SARL)
            prend les mesures raisonnables nécessaires afin de
            protéger les données transférées.
          </p>

        </section>


        <section className="legal-section">

          <h2>18. CONSERVATION DES DONNÉES</h2>

          <h3>Données de compte</h3>

          <p>
            Elles peuvent être conservées pendant la durée
            d'existence du compte et pendant la période nécessaire
            au traitement des conséquences de sa fermeture.
          </p>

          <h3>Données de Match</h3>

          <p>
            Les informations nécessaires à l'historique et à
            l'arbitrage peuvent être conservées pendant une durée
            prolongée afin de préserver l'intégrité du SAJCL.
          </p>

          <h3>Données financières</h3>

          <p>
            Les données relatives aux transactions peuvent être
            conservées pendant la durée nécessaire à la traçabilité
            financière, à la résolution des litiges et au respect
            des obligations applicables.
          </p>

          <h3>Données de sécurité</h3>

          <p>
            Les journaux techniques et de sécurité peuvent être
            conservés pendant une durée limitée adaptée à leur finalité.
          </p>

          <p>
            Lorsque les données ne sont plus nécessaires, elles
            peuvent être supprimées, anonymisées ou archivées
            lorsque la conservation est légalement nécessaire.
          </p>

        </section>


        <section className="legal-section">

          <h2>19. SÉCURITÉ</h2>

          <p>
            Tout Fait Nombre (SARL) met en œuvre des mesures
            techniques et organisationnelles raisonnables destinées
            à protéger les données contre :
          </p>

          <ul>
            <li>l'accès non autorisé ;</li>
            <li>la perte ;</li>
            <li>la destruction ;</li>
            <li>la modification ;</li>
            <li>la divulgation ;</li>
            <li>l'utilisation abusive.</li>
          </ul>

          <p>
            Aucune infrastructure informatique ne peut cependant
            garantir une sécurité absolue.
          </p>

        </section>


        <section className="legal-section">

          <h2>20. COOKIES ET TECHNOLOGIES SIMILAIRES</h2>

          <p>
            6BetBall peut utiliser des cookies ou technologies
            similaires nécessaires au fonctionnement de la Plateforme.
          </p>

          <ul>
            <li>maintenir une session ;</li>
            <li>sécuriser le compte ;</li>
            <li>mémoriser certaines préférences ;</li>
            <li>améliorer les performances ;</li>
            <li>mesurer l'utilisation des services.</li>
          </ul>

        </section>


        <section className="legal-section">

          <h2>21. COMMUNICATIONS</h2>

          <p>
            6BetBall peut envoyer des communications nécessaires
            au fonctionnement du service :
          </p>

          <ul>
            <li>confirmation de compte ;</li>
            <li>récupération de compte ;</li>
            <li>alertes de sécurité ;</li>
            <li>informations relatives à un Match ;</li>
            <li>informations relatives à une transaction ;</li>
            <li>informations importantes concernant le service.</li>
          </ul>

        </section>


        <section className="legal-section">

          <h2>22. DROITS DES UTILISATEURS</h2>

          <p>
            Selon la législation applicable, l'utilisateur peut
            disposer de droits concernant ses données personnelles,
            notamment :
          </p>

          <ul>
            <li>demander l'accès à certaines données ;</li>
            <li>demander leur rectification ;</li>
            <li>demander leur suppression lorsque cela est légalement possible ;</li>
            <li>demander la limitation de certains traitements ;</li>
            <li>s'opposer à certains traitements ;</li>
            <li>retirer un consentement lorsque cela est applicable.</li>
          </ul>

        </section>


        <section className="legal-section">

          <h2>23. SUPPRESSION DU COMPTE</h2>

          <p>
            L'utilisateur peut demander la suppression de son
            compte selon les mécanismes disponibles sur 6BetBall
            ou en contactant le service compétent.
          </p>

          <p>
            La suppression du compte ne signifie pas nécessairement
            la suppression immédiate de toutes les données.
          </p>

          <p>
            Certaines données peuvent être conservées lorsque
            cela est nécessaire à la sécurité, à la prévention
            de la fraude, à la conservation de preuves, à la
            traçabilité des transactions, à la résolution d'un
            litige ou au respect d'une obligation légale.
          </p>

        </section>


        <section className="legal-section">

          <h2>24. PERSONNES DE MOINS DE 18 ANS</h2>

          <p>
            6BetBall est réservé aux personnes âgées de
            <strong> 18 ans ou plus</strong>.
          </p>

          <p>
            Nous ne destinons pas les fonctionnalités de la
            Plateforme aux personnes de moins de 18 ans.
          </p>

        </section>


        <section className="legal-section">

          <h2>25. DONNÉES PUBLIQUES ET PROFIL</h2>

          <p>
            Certaines informations liées au profil d'un utilisateur
            peuvent être visibles par d'autres participants lorsque
            cela est nécessaire au fonctionnement des compétitions.
          </p>

          <ul>
            <li>pseudonyme ;</li>
            <li>avatar ;</li>
            <li>statistiques ;</li>
            <li>résultats ;</li>
            <li>classement ;</li>
            <li>informations liées aux Matchs.</li>
          </ul>

        </section>


        <section className="legal-section">

          <h2>26. SÉCURITÉ DES TRANSACTIONS</h2>

          <p>
            Les données relatives aux dépôts, mises, gains,
            remboursements et retraits peuvent être utilisées
            pour vérifier l'intégrité des opérations.
          </p>

          <p>
            En cas d'anomalie, certaines opérations peuvent être
            temporairement suspendues afin de permettre une vérification.
          </p>

        </section>


        <section className="legal-section">

          <h2>27. MODIFICATION DE LA POLITIQUE</h2>

          <p>
            Cette Politique peut être modifiée afin de tenir
            compte de l'évolution de 6BetBall, du SAJCL, des
            fonctionnalités, des systèmes techniques, des
            prestataires ou de la législation.
          </p>

        </section>


        <section className="legal-section">

          <h2>28. CONTACT</h2>

          <div className="legal-info-box">

            <strong>Tout Fait Nombre (SARL)</strong>

            <br />

            6BetBall — Système d'Arbitrage de Jeux Compétitifs
            en Ligne (S.A.J.C.L.)

            <br />

            Kinshasa, République Démocratique du Congo

            <br />

            E-mail : admin6betball@gmail.com

          </div>

        </section>


        <section className="legal-section">

          <h2>29. DROIT APPLICABLE</h2>

          <p>
            La présente Politique est interprétée conformément
            au droit applicable en République Démocratique du Congo,
            sous réserve des dispositions impératives éventuellement
            applicables à l'utilisateur en raison de son lieu de résidence.
          </p>

        </section>


        <section className="legal-section">

          <h2>30. VERSION ET DATE D'ENTRÉE EN VIGUEUR</h2>

          <p>
            <strong>Version :</strong> 1.0
          </p>

          <p>
            <strong>Date d'entrée en vigueur :</strong> 02 Mars 2026
          </p>

          <p>
            <strong>Dernière mise à jour :</strong> 02 Mars 2026
          </p>

        </section>


        {/* FOOTER */}

        <footer className="legal-footer">

          <p>
            © Tout Fait Nombre (SARL) — 6BetBall
          </p>

          <p>
            Système d'Arbitrage de Jeux Compétitifs en Ligne
            (S.A.J.C.L.)
          </p>

          <button
            type="button"
            onClick={() => setPage("register")}
          >
            ← Retour à l'inscription
          </button>

        </footer>

      </div>

    </div>
  );
}