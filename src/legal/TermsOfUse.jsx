import "./legal.css";

export default function TermsOfUse({ setPage }) {
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

          <h2>Conditions d'Utilisation</h2>

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
            className="active"
            onClick={() => setPage("terms")}
          >
            Conditions d'utilisation
          </button>

          <button
            type="button"
            onClick={() => setPage("privacy")}
          >
            Politique de confidentialité
          </button>

        </div>


        {/* CONTENU */}

        <section className="legal-section">

          <h2>1. IDENTIFICATION ET OBJET</h2>

          <p>
            Les présentes Conditions d'Utilisation définissent
            les règles applicables à l'accès et à l'utilisation
            de <strong>6BetBall</strong>, plateforme numérique
            exploitée par :
          </p>

          <div className="legal-info-box">

            <strong>Tout Fait Nombre (SARL)</strong>

            <br />

            République Démocratique du Congo

            <br />

            Kinshasa

          </div>

          <p>
            6BetBall constitue un
            <strong>
              {" "}Système d'Arbitrage de Jeux Compétitifs en
              Ligne (S.A.J.C.L.)
            </strong>
            destiné à permettre l'organisation, la mise en
            relation, la supervision, l'arbitrage, l'enregistrement
            des résultats et, lorsque les fonctionnalités
            financières sont disponibles, le règlement de
            confrontations compétitives entre utilisateurs.
          </p>

          <p>
            Le SAJCL constitue l'architecture fonctionnelle
            centrale de 6BetBall.
          </p>

          <p>
            En utilisant 6BetBall, l'utilisateur reconnaît avoir
            pris connaissance des présentes Conditions et accepte
            de les respecter.
          </p>

        </section>


        <section className="legal-section">

          <h2>2. DÉFINITIONS</h2>

          <h3>« 6BetBall »</h3>

          <p>
            Désigne la plateforme numérique exploitée par
            Tout Fait Nombre (SARL).
          </p>

          <h3>« SAJCL »</h3>

          <p>
            Désigne le Système d'Arbitrage de Jeux Compétitifs
            en Ligne.
          </p>

          <h3>« SAC »</h3>

          <p>
            Désigne le Système d'Arbitrage Centralisé, composant
            technique central du SAJCL chargé notamment de
            superviser le cycle de vie des Matchs, leurs
            événements, leurs résultats et, lorsque cela est
            applicable, leur règlement.
          </p>

          <h3>« Jeu »</h3>

          <p>
            Désigne tout jeu compétitif intégré à 6BetBall.
          </p>

          <h3>« Match »</h3>

          <p>
            Désigne une confrontation organisée entre un ou
            plusieurs utilisateurs selon les règles d'un Jeu.
          </p>

          <h3>« Joueur »</h3>

          <p>
            Désigne tout utilisateur participant à un Match.
          </p>

          <h3>« Mise »</h3>

          <p>
            Désigne le montant engagé par un utilisateur dans
            le cadre d'un Match lorsque cette fonctionnalité
            est disponible.
          </p>

          <h3>« Gain »</h3>

          <p>
            Désigne le montant attribué à un utilisateur
            conformément au résultat d'un Match et aux règles
            applicables.
          </p>

          <h3>« Solde »</h3>

          <p>
            Désigne la valeur comptabilisée dans le compte
            utilisateur de 6BetBall.
          </p>

          <h3>« Transaction »</h3>

          <p>
            Désigne toute opération financière enregistrée sur
            la Plateforme, notamment dépôt, engagement, gain,
            remboursement, ajustement ou retrait.
          </p>

        </section>


        <section className="legal-section">

          <h2>3. ACCEPTATION DES CONDITIONS</h2>

          <p>
            L'utilisation de 6BetBall implique l'acceptation
            des présentes Conditions.
          </p>

          <p>
            L'utilisateur reconnaît également que les règles
            particulières applicables à chaque Jeu font partie
            intégrante du fonctionnement de la Plateforme.
          </p>

        </section>


        <section className="legal-section">

          <h2>4. CONDITIONS D'ÂGE</h2>

          <p>
            6BetBall est exclusivement destiné aux personnes
            âgées de <strong>18 ans ou plus</strong>.
          </p>

          <p>
            Toute personne âgée de moins de 18 ans ne peut créer,
            utiliser ou exploiter un compte 6BetBall.
          </p>

          <p>
            L'utilisateur déclare avoir au moins 18 ans au
            moment de la création de son compte.
          </p>

        </section>


        <section className="legal-section">

          <h2>5. DISPONIBILITÉ INTERNATIONALE</h2>

          <p>
            6BetBall peut être accessible dans plusieurs pays
            d'Afrique ainsi que dans certains pays d'Europe,
            d'Amérique, d'Asie et d'autres régions du monde.
          </p>

          <p>
            Toutefois, l'accessibilité technique de la Plateforme
            dans un pays ne signifie pas que toutes ses
            fonctionnalités sont légalement disponibles dans
            ce pays.
          </p>

          <p>
            Certaines fonctionnalités peuvent être limitées,
            suspendues, désactivées ou interdites selon la
            législation applicable.
          </p>

          <p>
            L'utilisateur est responsable de vérifier qu'il est
            légalement autorisé à utiliser les fonctionnalités
            auxquelles il accède depuis son territoire.
          </p>

        </section>


        <section className="legal-section">

          <h2>6. CRÉATION DU COMPTE</h2>

          <p>
            Certaines fonctionnalités nécessitent la création
            d'un compte utilisateur.
          </p>

          <p>
            L'utilisateur doit fournir des informations exactes,
            sincères et actualisées.
          </p>

          <ul>
            <li>fournir de fausses informations ;</li>
            <li>usurper l'identité d'une autre personne ;</li>
            <li>utiliser les informations d'un tiers sans autorisation ;</li>
            <li>contourner les restrictions appliquées à un compte ;</li>
            <li>créer des comptes destinés à tromper le système.</li>
          </ul>

        </section>


        <section className="legal-section">

          <h2>7. COMPTES MULTIPLES</h2>

          <p>
            Un utilisateur ne peut pas créer ou utiliser
            plusieurs comptes dans le but de contourner les
            règles de 6BetBall.
          </p>

          <p>
            La détection de plusieurs comptes associés à une
            même personne, appareil, identité, comportement ou
            autre élément pertinent peut entraîner la
            suspension des comptes concernés.
          </p>

          <p>
            La création d'un compte supplémentaire ne constitue
            pas un moyen légitime de contourner une suspension
            ou une restriction.
          </p>

        </section>


        <section className="legal-section">

          <h2>8. SÉCURITÉ DU COMPTE</h2>

          <ul>
            <li>conserver ses identifiants de manière confidentielle ;</li>
            <li>ne pas communiquer ses moyens d'authentification ;</li>
            <li>signaler toute activité suspecte ;</li>
            <li>utiliser uniquement son propre compte.</li>
          </ul>

        </section>


        <section className="legal-section">

          <h2>9. FONCTIONNEMENT DU SAJCL</h2>

          <p>
            Le SAJCL constitue le système central de fonctionnement
            des compétitions proposées par 6BetBall.
          </p>

          <ol>
            <li>création d'un Match ;</li>
            <li>enregistrement des participants ;</li>
            <li>vérification des conditions de participation ;</li>
            <li>lancement du Match ;</li>
            <li>transmission des événements de jeu ;</li>
            <li>surveillance de l'état du Match ;</li>
            <li>enregistrement du résultat ;</li>
            <li>gestion des interruptions ;</li>
            <li>application des règles d'arbitrage ;</li>
            <li>préparation du règlement financier lorsqu'il est applicable.</li>
          </ol>

        </section>


        <section className="legal-section">

          <h2>10. SYSTÈME D'ARBITRAGE CENTRALISÉ (SAC)</h2>

          <p>
            Le SAC est une composante technique centrale du SAJCL.
          </p>

          <p>
            Il peut notamment déterminer et enregistrer les
            états d'un Match :
          </p>

          <ul>
            <li>création ;</li>
            <li>attente ;</li>
            <li>correspondance des joueurs ;</li>
            <li>compte à rebours ;</li>
            <li>démarrage ;</li>
            <li>déroulement ;</li>
            <li>fin ;</li>
            <li>résultat ;</li>
            <li>règlement ;</li>
            <li>annulation.</li>
          </ul>

        </section>


        <section className="legal-section">

          <h2>11. JEUX COMPÉTITIFS</h2>

          <p>
            Chaque Jeu intégré à 6BetBall peut disposer de règles
            particulières définissant notamment :
          </p>

          <ul>
            <li>le nombre de joueurs ;</li>
            <li>la durée ;</li>
            <li>les conditions de victoire ;</li>
            <li>les conditions de défaite ;</li>
            <li>le système de score ;</li>
            <li>les conditions de lancement ;</li>
            <li>les conditions d'interruption ;</li>
            <li>les conditions d'annulation.</li>
          </ul>

        </section>


        <section className="legal-section">

          <h2>12. CRÉATION ET REJOINDRE UN MATCH</h2>

          <p>
            Un utilisateur peut, lorsque la fonctionnalité est
            disponible, créer un Match.
          </p>

          <p>
            La création peut nécessiter la définition de
            paramètres tels que le Jeu, le montant engagé,
            la durée et les conditions de participation.
          </p>

          <p>
            Un autre utilisateur peut rejoindre le Match
            conformément aux conditions affichées.
          </p>

        </section>


        <section className="legal-section">

          <h2>13. DÉROULEMENT D'UN MATCH</h2>

          <p>
            Une fois les conditions de démarrage réunies,
            le SAJCL peut lancer automatiquement le Match.
          </p>

          <ul>
            <li>phase de préparation ;</li>
            <li>compte à rebours ;</li>
            <li>phase de compétition ;</li>
            <li>phase de fin ;</li>
            <li>détermination du résultat ;</li>
            <li>règlement lorsque celui-ci est applicable.</li>
          </ul>

        </section>


        <section className="legal-section">

          <h2>14. RÉSULTAT D'UN MATCH</h2>

          <p>
            Le résultat est déterminé conformément aux règles
            du Jeu, aux événements enregistrés, aux mécanismes
            d'arbitrage du SAJCL et aux données techniques
            disponibles.
          </p>

          <p>
            Un utilisateur ne peut pas modifier manuellement
            le résultat d'un Match.
          </p>

        </section>


        <section className="legal-section">

          <h2>15. MISES ET ENJEUX</h2>

          <p>
            Lorsque les fonctionnalités financières sont
            activées pour un Jeu, les utilisateurs peuvent
            être autorisés à engager un montant avant un Match.
          </p>

          <p>
            Les fonctionnalités financières peuvent être
            désactivées dans certains territoires.
          </p>

          <p>
            Aucune fonctionnalité financière ne doit être
            utilisée lorsque son utilisation est interdite
            par la législation applicable.
          </p>

        </section>


        <section className="legal-section">

          <h2>16. DÉPÔTS</h2>

          <p>
            Les dépôts peuvent être effectués manuellement
            selon les moyens disponibles sur 6BetBall.
          </p>

          <ul>
            <li>Mobile Money ;</li>
            <li>services de paiement électronique ;</li>
            <li>cryptomonnaies ou actifs numériques lorsque disponibles.</li>
          </ul>

          <p>
            Un dépôt manuel peut nécessiter une vérification
            avant son inscription définitive au solde.
          </p>

        </section>


        <section className="legal-section">

          <h2>17. RETRAITS</h2>

          <p>
            Les retraits sont effectués manuellement selon les
            moyens disponibles sur 6BetBall.
          </p>

          <p>
            Un retrait peut être soumis à une vérification avant
            exécution.
          </p>

          <ul>
            <li>identité du titulaire du compte ;</li>
            <li>origine de la demande ;</li>
            <li>solde disponible ;</li>
            <li>historique des transactions ;</li>
            <li>mécanismes de sécurité ;</li>
            <li>restrictions légales ou réglementaires.</li>
          </ul>

        </section>


        <section className="legal-section">

          <h2>18. AUTOMATISATION DES OPÉRATIONS INTERNES</h2>

          <p>
            Certaines opérations internes peuvent être
            automatisées, notamment :
          </p>

          <ul>
            <li>l'enregistrement des engagements ;</li>
            <li>le blocage des montants nécessaires ;</li>
            <li>le calcul du résultat ;</li>
            <li>l'attribution d'un gain ;</li>
            <li>le remboursement ;</li>
            <li>la mise à jour du solde ;</li>
            <li>le règlement d'un Match ;</li>
            <li>l'enregistrement des mouvements financiers.</li>
          </ul>

        </section>


        <section className="legal-section">

          <h2>19. REMBOURSEMENTS</h2>

          <p>
            Un remboursement peut être effectué lorsque les
            règles du Jeu ou les mécanismes du SAJCL prévoient
            l'annulation ou l'impossibilité de règlement d'un Match.
          </p>

          <ul>
            <li>interruption technique critique ;</li>
            <li>impossibilité de déterminer correctement le résultat ;</li>
            <li>annulation du Match ;</li>
            <li>erreur technique reconnue ;</li>
            <li>situation de sécurité nécessitant l'annulation.</li>
          </ul>

        </section>


        <section className="legal-section">

          <h2>20. FRAUDE ET MANIPULATION</h2>

          <p>
            Toute tentative de manipulation du SAJCL est interdite.
          </p>

          <ul>
            <li>bots non autorisés ;</li>
            <li>logiciels de triche ;</li>
            <li>modification non autorisée des communications ;</li>
            <li>exploitation volontaire d'une faille ;</li>
            <li>manipulation du résultat ;</li>
            <li>collusion entre joueurs ;</li>
            <li>comptes multiples pour obtenir un avantage ;</li>
            <li>falsification d'une transaction ;</li>
            <li>falsification de preuves de paiement.</li>
          </ul>

          <p>
            6BetBall peut suspendre immédiatement les comptes
            concernés lorsqu'une fraude ou une tentative de
            fraude est détectée ou raisonnablement suspectée.
          </p>

        </section>


        <section className="legal-section">

          <h2>21. DÉCONNEXION ET INCIDENT TECHNIQUE</h2>

          <p>
            Les problèmes de connexion ou de fonctionnement
            peuvent résulter notamment de la connexion Internet,
            de l'appareil, du réseau, d'un fournisseur externe,
            d'une panne serveur, d'une maintenance ou d'un
            incident technique.
          </p>

          <p>
            Lorsqu'un mécanisme d'arbitrage permet de déterminer
            automatiquement le traitement applicable, celui-ci
            peut être appliqué au Match.
          </p>

        </section>


        <section className="legal-section">

          <h2>22. TRANSACTIONS ET HISTORIQUE</h2>

          <p>
            Les opérations financières et événements importants
            peuvent être enregistrés dans l'historique du compte.
          </p>

          <p>
            L'utilisateur doit vérifier régulièrement son
            historique et signaler toute anomalie dans un délai
            raisonnable.
          </p>

        </section>


        <section className="legal-section">

          <h2>23. UTILISATION DES CRYPTOMONNAIES</h2>

          <p>
            Lorsque les cryptomonnaies sont disponibles, leur
            utilisation est soumise aux caractéristiques
            techniques et aux règles du service concerné.
          </p>

          <ul>
            <li>délais du réseau ;</li>
            <li>frais de réseau ;</li>
            <li>confirmations nécessaires ;</li>
            <li>fluctuations de valeur ;</li>
            <li>erreurs d'adresse ;</li>
            <li>limitations du réseau concerné.</li>
          </ul>

        </section>


        <section className="legal-section">

          <h2>24. COMPORTEMENT DES UTILISATEURS</h2>

          <p>
            Les utilisateurs doivent utiliser 6BetBall de manière
            loyale et respectueuse.
          </p>

          <ul>
            <li>harceler d'autres utilisateurs ;</li>
            <li>menacer ou intimider ;</li>
            <li>diffuser des contenus illégaux ;</li>
            <li>perturber la Plateforme ;</li>
            <li>utiliser la Plateforme pour une activité frauduleuse ;</li>
            <li>usurper l'identité d'un autre utilisateur.</li>
          </ul>

        </section>


        <section className="legal-section">

          <h2>25. PROPRIÉTÉ INTELLECTUELLE</h2>

          <p>
            Les éléments de 6BetBall, notamment son nom, ses
            logos, interfaces, logiciels, designs, contenus,
            animations, systèmes, bases de données et composants
            techniques sont protégés par les droits applicables.
          </p>

          <p>
            Le SAJCL, son architecture, ses mécanismes et ses
            éléments logiciels constituent des composants
            développés pour l'écosystème 6BetBall.
          </p>

        </section>


        <section className="legal-section">

          <h2>26. SERVICES TECHNIQUES TIERS</h2>

          <p>
            6BetBall peut utiliser des prestataires techniques
            afin d'assurer son fonctionnement.
          </p>

          <ul>
            <li>Render pour certains services d'hébergement et d'exécution ;</li>
            <li>Vercel pour certains services de déploiement et distribution ;</li>
            <li>Neon pour certains services liés aux bases PostgreSQL.</li>
          </ul>

        </section>


        <section className="legal-section">

          <h2>27. DISPONIBILITÉ DE LA PLATEFORME</h2>

          <p>
            6BetBall met en œuvre des moyens raisonnables afin
            d'assurer la disponibilité et la stabilité de ses services.
          </p>

          <p>
            Toutefois, aucune disponibilité permanente ou absence
            totale d'erreur ne peut être garantie.
          </p>

        </section>


        <section className="legal-section">

          <h2>28. SUSPENSION OU FERMETURE D'UN COMPTE</h2>

          <p>
            Tout Fait Nombre (SARL) peut suspendre ou fermer
            un compte notamment lorsque :
          </p>

          <ul>
            <li>les Conditions sont violées ;</li>
            <li>plusieurs comptes sont utilisés ;</li>
            <li>une fraude est suspectée ;</li>
            <li>une transaction semble irrégulière ;</li>
            <li>le compte présente un risque de sécurité ;</li>
            <li>une restriction est contournée ;</li>
            <li>la loi ou une autorité compétente l'exige.</li>
          </ul>

        </section>


        <section className="legal-section">

          <h2>29. CONSÉQUENCES D'UNE SUSPENSION</h2>

          <p>
            Lorsqu'un compte est suspendu, certaines fonctionnalités
            peuvent être temporairement désactivées :
          </p>

          <ul>
            <li>participation aux Matchs ;</li>
            <li>création de Matchs ;</li>
            <li>dépôts ;</li>
            <li>retraits ;</li>
            <li>certaines opérations financières.</li>
          </ul>

        </section>


        <section className="legal-section">

          <h2>30. RESPONSABILITÉ DE L'UTILISATEUR</h2>

          <p>
            L'utilisateur est responsable de l'utilisation qu'il
            fait de son compte et de la Plateforme.
          </p>

          <ul>
            <li>protéger ses identifiants ;</li>
            <li>respecter les règles des Jeux ;</li>
            <li>respecter les lois de son pays ;</li>
            <li>vérifier ses transactions ;</li>
            <li>vérifier les informations avant validation ;</li>
            <li>ne pas contourner les restrictions.</li>
          </ul>

        </section>


        <section className="legal-section">

          <h2>31. LIMITATION DE RESPONSABILITÉ</h2>

          <p>
            Dans les limites permises par la loi applicable,
            Tout Fait Nombre (SARL) ne saurait être tenue
            responsable d'une interruption ou d'un dommage
            résultant exclusivement d'un événement indépendant
            de son contrôle raisonnable.
          </p>

          <p>
            Aucune disposition des présentes Conditions ne vise
            à exclure une responsabilité qui ne peut légalement
            être exclue.
          </p>

        </section>


        <section className="legal-section">

          <h2>32. MODIFICATION DES SERVICES</h2>

          <p>
            Tout Fait Nombre (SARL) peut modifier, suspendre ou
            supprimer temporairement ou définitivement certaines
            fonctionnalités de 6BetBall.
          </p>

        </section>


        <section className="legal-section">

          <h2>33. MODIFICATION DES CONDITIONS</h2>

          <p>
            Les présentes Conditions peuvent être mises à jour
            lorsque cela est nécessaire.
          </p>

          <p>
            La version publiée sur 6BetBall constitue la version
            applicable à compter de sa date d'entrée en vigueur.
          </p>

        </section>


        <section className="legal-section">

          <h2>34. POLITIQUE DE CONFIDENTIALITÉ</h2>

          <p>
            L'utilisation de 6BetBall est également soumise à
            la Politique de Confidentialité de 6BetBall.
          </p>

          <button
            type="button"
            className="legal-inline-link"
            onClick={() => setPage("privacy")}
          >
            Consulter la Politique de Confidentialité
          </button>

        </section>


        <section className="legal-section">

          <h2>35. DROIT APPLICABLE</h2>

          <p>
            Les présentes Conditions sont régies, sous réserve
            des règles impératives éventuellement applicables,
            par le <strong>droit de la République Démocratique
            du Congo</strong>.
          </p>

          <p>
            Tout différend relatif à l'utilisation de 6BetBall
            doit, dans la mesure du possible, faire l'objet
            d'une tentative de règlement amiable.
          </p>

          <p>
            À défaut d'accord amiable, le différend pourra être
            soumis aux juridictions compétentes de
            <strong>
              {" "}Kinshasa, République Démocratique du Congo
            </strong>,
            sous réserve des règles impératives éventuellement
            applicables.
          </p>

        </section>


        <section className="legal-section">

          <h2>36. CONTACT</h2>

          <div className="legal-info-box">

            <strong>Tout Fait Nombre (SARL)</strong>

            <br />

            Plateforme : 6BetBall

            <br />

            Siège : Kinshasa, République Démocratique du Congo

            <br />

            E-mail : admin6betball@gmail.com

            <br />

            WhatsApp : +243973596027

          </div>

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