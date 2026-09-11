import React, { useEffect, useMemo, useState } from "react";
import "./Ambassade.css";

const API_BASE = import.meta.env.VITE_API_URL || "";

const COMMISSION_RATE = 0.015;
const MIN_AMOUNT = 500;

// ======================================================
// FORMAT CDF
// ======================================================

const formatCDF = (value) => {
  const amount = Number(value || 0);

  return (
    new Intl.NumberFormat("fr-FR", {
      maximumFractionDigits: 2,
    }).format(amount) + " CDF"
  );
};

// ======================================================
// TOKEN
// ======================================================

const getToken = () => {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("jwt")
  );
};

// ======================================================
// API REQUEST
// ======================================================

const apiRequest = async (url, options = {}) => {
  const token = getToken();

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,

    headers: {
      "Content-Type": "application/json",

      ...(token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {}),

      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error ||
        data.message ||
        "Une erreur est survenue."
    );
  }

  return data;
};

// ======================================================
// COMPONENT
// ======================================================

export default function Ambassade() {
  // ======================================================
  // FORMULAIRE
  // ======================================================

  const [tid, setTid] = useState("");
  const [amount, setAmount] = useState("");
  const [userId, setUserId] = useState("");

  // ======================================================
  // DESTINATAIRE
  // ======================================================

  /*
   * Le frontend ne connaît pas directement le nom
   * correspondant à l'ID.
   *
   * Exemple :
   *
   * ID 25
   *   ↓
   * GET /api/ambassade/beneficiary/25
   *   ↓
   * KASONGA NTUMBA
   *
   * beneficiary contient les informations retournées
   * par le backend.
   */

  const [beneficiary, setBeneficiary] = useState(null);
  const [loadingBeneficiary, setLoadingBeneficiary] =
    useState(false);

  // ======================================================
  // ÉTATS
  // ======================================================

  const [recovering, setRecovering] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ======================================================
  // HISTORIQUE
  // ======================================================

  const [history, setHistory] = useState([]);

  // ======================================================
  // COMMISSION
  // ======================================================

  const commission = useMemo(() => {
    const value = Number(amount);

    if (!Number.isFinite(value) || value <= 0) {
      return 0;
    }

    return (
      Math.round(
        value * COMMISSION_RATE * 100
      ) / 100
    );
  }, [amount]);

  // ======================================================
  // STATISTIQUES
  // ======================================================

  const totalRecovered = useMemo(() => {
    return history.reduce(
      (total, operation) =>
        total + Number(operation.amount || 0),
      0
    );
  }, [history]);

  const totalCommission = useMemo(() => {
    return history.reduce(
      (total, operation) =>
        total + Number(operation.commission || 0),
      0
    );
  }, [history]);

  // ======================================================
  // CHARGEMENT HISTORIQUE
  //
  // L'historique est purement informatif.
  // Il ne bloque jamais une récupération.
  // ======================================================

  useEffect(() => {
    let cancelled = false;

    const loadHistory = async () => {
      try {
        const data = await apiRequest(
          "/ambassade/history"
        );

        /*
         * IMPORTANT :
         * Le backend retourne :
         *
         * {
         *   success: true,
         *   count: ...,
         *   history: [...]
         * }
         *
         * et non "operations".
         */

        if (
          !cancelled &&
          data &&
          Array.isArray(data.history)
        ) {
          setHistory(data.history);
        }
      } catch {
        // L'historique ne doit jamais empêcher
        // l'Ambassadeur d'effectuer une récupération.
      }
    };

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, []);

  // ======================================================
  // MESSAGES
  // ======================================================

  const resetMessages = () => {
    setError("");
    setSuccess("");
  };

  // ======================================================
  // CHANGEMENT TID
  // ======================================================

  const handleTidChange = (event) => {
    setTid(event.target.value);
    setError("");
    setSuccess("");
  };

  // ======================================================
  // CHANGEMENT MONTANT
  // ======================================================

  const handleAmountChange = (event) => {
    setAmount(event.target.value);
    setError("");
    setSuccess("");
  };

  // ======================================================
  // CHANGEMENT DESTINATAIRE
  // ======================================================

  const handleUserIdChange = (event) => {
    const value = event.target.value;

    setUserId(value);

    /*
     * Dès que l'ID change, l'ancien destinataire
     * n'est plus considéré comme valide.
     *
     * Exemple :
     *
     * 25 → KASONGA NTUMBA
     *
     * puis l'ambassadeur modifie :
     *
     * 25 → 26
     *
     * On efface immédiatement KASONGA NTUMBA.
     */

    setBeneficiary(null);

    setError("");
    setSuccess("");
  };

  // ======================================================
  // RECHERCHE DU DESTINATAIRE
  //
  // Cette fonction NE vérifie PAS le fonds.
  //
  // Elle sert uniquement à transformer :
  //
  // ID utilisateur
  //      ↓
  // nom utilisateur
  //
  // Exemple :
  //
  // 25
  // ↓
  // GET /api/ambassade/beneficiary/25
  // ↓
  // KASONGA NTUMBA
  // ======================================================

  const handleBeneficiaryLookup = async () => {
    const numericUserId = Number(userId);

    // ----------------------------------------------------
    // Aucun ID
    // ----------------------------------------------------

    if (!userId.trim()) {
      setBeneficiary(null);
      return;
    }

    // ----------------------------------------------------
    // ID invalide
    // ----------------------------------------------------

    if (
      !Number.isInteger(numericUserId) ||
      numericUserId <= 0
    ) {
      setBeneficiary(null);
      setError(
        "Veuillez saisir un ID destinataire valide."
      );
      return;
    }

    // ----------------------------------------------------
    // Protection contre les recherches inutiles
    // ----------------------------------------------------

    if (
      beneficiary &&
      Number(beneficiary.id) === numericUserId
    ) {
      return;
    }

    setLoadingBeneficiary(true);
    setBeneficiary(null);
    setError("");

    try {
      const data = await apiRequest(
        `/ambassade/beneficiary/${numericUserId}`
      );

      /*
       * Le backend peut retourner les informations
       * du bénéficiaire sous "beneficiary".
       *
       * Les fallback "user" et "data" rendent le frontend
       * plus tolérant si la structure exacte de la réponse
       * backend évolue légèrement.
       */

      const resolvedBeneficiary =
        data?.beneficiary ||
        data?.user ||
        data?.data?.beneficiary ||
        data?.data?.user ||
        null;

      if (!resolvedBeneficiary) {
        throw new Error(
          data?.error ||
            data?.message ||
            "Destinataire introuvable."
        );
      }

      const resolvedId = Number(
        resolvedBeneficiary.id ??
          resolvedBeneficiary.userId ??
          numericUserId
      );

      /*
       * Le backend doit normalement retourner un ID.
       * On conserve l'ID saisi comme fallback.
       */

      const normalizedBeneficiary = {
        ...resolvedBeneficiary,
        id: resolvedId,
      };

      setBeneficiary(normalizedBeneficiary);
    } catch (err) {
      setBeneficiary(null);

      setError(
        err.message ||
          "Impossible de récupérer les informations du destinataire."
      );
    } finally {
      setLoadingBeneficiary(false);
    }
  };

  // ======================================================
  // NOM DU DESTINATAIRE
  // ======================================================

  const getBeneficiaryName = () => {
    if (!beneficiary) {
      return "";
    }

    /*
     * On privilégie username puisque le backend
     * retourne normalement :
     *
     * username: "KASONGA NTUMBA"
     */

    return (
      beneficiary.username ||
      beneficiary.name ||
      beneficiary.full_name ||
      beneficiary.fullName ||
      ""
    );
  };

  // ======================================================
  // VALIDATION AVANT ENVOI
  //
  // IMPORTANT :
  // Le backend reste responsable de la validation
  // financière réelle.
  //
  // Le frontend vérifie uniquement :
  // - TID
  // - montant
  // - ID
  // - identité du destinataire récupérée
  // ======================================================

  const validateOperation = () => {
    const cleanTid = tid.trim();
    const numericAmount = Number(amount);
    const numericUserId = Number(userId);

    // ----------------------------------------------------
    // TID
    // ----------------------------------------------------

    if (!cleanTid) {
      return "Le TID est obligatoire.";
    }

    // ----------------------------------------------------
    // MONTANT
    // ----------------------------------------------------

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      return "Veuillez saisir un montant valide.";
    }

    if (numericAmount < MIN_AMOUNT) {
      return `Le montant minimum est de ${formatCDF(
        MIN_AMOUNT
      )}.`;
    }

    // ----------------------------------------------------
    // DESTINATAIRE
    // ----------------------------------------------------

    if (
      !Number.isInteger(numericUserId) ||
      numericUserId <= 0
    ) {
      return "Veuillez saisir un ID destinataire valide.";
    }

    // ----------------------------------------------------
    // DESTINATAIRE NON IDENTIFIÉ
    // ----------------------------------------------------

    if (!beneficiary) {
      return (
        "Veuillez renseigner un ID destinataire valide " +
        "afin d'identifier le bénéficiaire."
      );
    }

    /*
     * Vérification importante :
     * le bénéficiaire chargé doit correspondre
     * à l'ID actuellement saisi.
     */

    if (
      Number(beneficiary.id) !== numericUserId
    ) {
      return (
        "L'identité du destinataire ne correspond pas " +
        "à l'ID saisi."
      );
    }

    return null;
  };

  // ======================================================
  // RÉCUPÉRATION
  //
  // Flux :
  //
  // TID
  // montant
  // userId
  //
  //       ↓
  //
  // POST /api/ambassade/recover
  //
  //       ↓
  //
  // BACKEND
  //
  // Le backend vérifie :
  // - TID
  // - statut du fonds
  // - montant réel
  // - utilisateur
  // - compte utilisateur
  // - ambassadeur
  // - portefeuille
  // - transaction
  // - commission
  // ======================================================

  const handleRecover = async (event) => {
    event.preventDefault();

    resetMessages();

    /*
     * Avant toute chose, on s'assure que le destinataire
     * est bien identifié.
     */

    if (
      userId.trim() &&
      !beneficiary &&
      !loadingBeneficiary
    ) {
      await handleBeneficiaryLookup();
    }

    /*
     * Si une recherche est nécessaire mais n'est pas encore
     * terminée, on ne lance surtout pas l'opération.
     */

    if (loadingBeneficiary) {
      setError(
        "Identification du destinataire en cours. Veuillez patienter."
      );
      return;
    }

    const validationError =
      validateOperation();

    if (validationError) {
      setError(validationError);
      return;
    }

    // ====================================================
    // PROTECTION DOUBLE CLIC
    // ====================================================

    if (recovering) {
      return;
    }

    const cleanTid = tid.trim();
    const numericAmount = Number(amount);
    const numericUserId = Number(userId);
    const beneficiaryName =
      getBeneficiaryName();

    // ====================================================
    // CONFIRMATION
    // ====================================================

    const confirmed = window.confirm(
      `Voulez-vous vraiment récupérer ${formatCDF(
        numericAmount
      )} pour ${beneficiaryName} ?\n\n` +
        `TID : ${cleanTid}\n` +
        `Montant : ${formatCDF(numericAmount)}\n` +
        `Destinataire : ${beneficiaryName} (#${numericUserId})\n\n` +
        `Le destinataire recevra 100 % du montant.\n` +
        `Votre commission de 1,5 % sera créditée séparément.\n\n` +
        `Cette opération est définitive.`
    );

    if (!confirmed) {
      return;
    }

    setRecovering(true);

    // ====================================================
    // APPEL BACKEND
    // ====================================================

    try {
      const data = await apiRequest(
        "/ambassade/recover",
        {
          method: "POST",

          body: JSON.stringify({
            tid: cleanTid,
            amount: numericAmount,
            userId: numericUserId,
          }),
        }
      );

      // ==================================================
      // RÉCUPÉRATION DE L'OPÉRATION
      // ==================================================

      const operation =
        data.operation || {};

      const recoveredAmount =
        Number(operation.amount) ||
        numericAmount;

      const recoveredCommission =
        Number(
          operation.ambassador?.commission
        ) ||
        Number(operation.commission) ||
        Math.round(
          recoveredAmount *
            COMMISSION_RATE *
            100
        ) / 100;

      const operationUser =
        operation.user || {};

      // ==================================================
      // NOM FINAL DU DESTINATAIRE
      //
      // Le backend devient la source officielle après
      // la récupération.
      // ==================================================

      const finalBeneficiaryName =
        operationUser.username ||
        operationUser.name ||
        beneficiaryName ||
        `#${numericUserId}`;

      // ==================================================
      // OPÉRATION POUR L'HISTORIQUE LOCAL
      // ==================================================

      const historyOperation = {
        id:
          operation.transactionId ||
          operation.id ||
          `${cleanTid}-${Date.now()}`,

        transactionId:
          operation.transactionId || "",

        tid:
          operation.tid ||
          cleanTid,

        amount: recoveredAmount,

        commission:
          recoveredCommission,

        userId:
          operationUser.id ||
          numericUserId,

        username:
          operationUser.username ||
          operationUser.name ||
          finalBeneficiaryName,

        customId:
          operationUser.custom_id ||
          operationUser.customId ||
          "",

        status:
          operation.status ||
          "completed",

        date:
          operation.createdAt ||
          operation.created_at ||
          new Date().toISOString(),
      };

      // ==================================================
      // HISTORIQUE LOCAL TEMPORAIRE
      //
      // Le backend reste la source officielle.
      // ==================================================

      setHistory((previous) =>
        [
          historyOperation,
          ...previous,
        ].slice(0, 20)
      );

      // ==================================================
      // SUCCÈS
      // ==================================================

      setSuccess(
        data.message ||
          `${formatCDF(
            recoveredAmount
          )} ont été crédités avec succès à ${finalBeneficiaryName}.`
      );

      // ==================================================
      // RESET FORMULAIRE
      // ==================================================

      setTid("");
      setAmount("");
      setUserId("");
      setBeneficiary(null);

      // ==================================================
      // RAFRAÎCHISSEMENT HISTORIQUE
      // ==================================================

      try {
        const historyData =
          await apiRequest(
            "/ambassade/history"
          );

        /*
         * IMPORTANT :
         * Le backend retourne "history".
         */

        if (
          historyData &&
          Array.isArray(
            historyData.history
          )
        ) {
          setHistory(
            historyData.history
          );
        }
      } catch {
        // La récupération est déjà réussie.
        // Une erreur d'historique ne l'annule pas.
      }
    } catch (err) {
      setError(
        err.message ||
          "La récupération du fonds a échoué."
      );
    } finally {
      setRecovering(false);
    }
  };

  // ======================================================
  // RÉINITIALISATION
  // ======================================================

  const clearForm = () => {
    if (recovering) {
      return;
    }

    setTid("");
    setAmount("");
    setUserId("");
    setBeneficiary(null);

    setLoadingBeneficiary(false);

    resetMessages();
  };

  // ======================================================
  // RENDU
  // ======================================================

  return (
    <div className="ambassade-page">

      {/* ==================================================
          HEADER
      ================================================== */}

      <header className="ambassade-header">
        <div>
          <span className="ambassade-kicker">
            SAJCL • FINANCEMENT
          </span>

          <h1>
            Espace Ambassadeur
          </h1>

          <p>
            Créditez les comptes de vos recrues à
            partir des fonds validés par
            l'administration.
          </p>
        </div>

        <div className="ambassade-status">
          <span className="status-dot" />
          Ambassadeur actif
        </div>
      </header>

      {/* ==================================================
          KPI PERSONNELS
      ================================================== */}

      <section className="ambassade-stats">

        <div className="ambassade-stat-card">
          <div className="stat-icon">💰</div>

          <div>
            <span>Fonds récupérés</span>

            <strong>
              {formatCDF(totalRecovered)}
            </strong>
          </div>
        </div>

        <div className="ambassade-stat-card">
          <div className="stat-icon">📈</div>

          <div>
            <span>Mes commissions</span>

            <strong>
              {formatCDF(totalCommission)}
            </strong>
          </div>
        </div>

        <div className="ambassade-stat-card">
          <div className="stat-icon">🔄</div>

          <div>
            <span>Mes opérations</span>

            <strong>
              {history.length}
            </strong>
          </div>
        </div>

        <div className="ambassade-stat-card commission-card">
          <div className="stat-icon">
            1,5%
          </div>

          <div>
            <span>Taux ambassadeur</span>

            <strong>
              Commission
            </strong>
          </div>
        </div>

      </section>

      {/* ==================================================
          CIRCUIT
      ================================================== */}

      <section className="ambassade-flow">

        <div className="flow-step">
          <div className="flow-number">
            1
          </div>

          <div>
            <strong>
              Votre recrue
            </strong>

            <span>
              Verse à la caisse officielle C.O.6
            </span>
          </div>
        </div>

        <div className="flow-line" />

        <div className="flow-step">
          <div className="flow-number">
            2
          </div>

          <div>
            <strong>
              Administration
            </strong>

            <span>
              Valide et enregistre le TID
            </span>
          </div>
        </div>

        <div className="flow-line" />

        <div className="flow-step">
          <div className="flow-number">
            3
          </div>

          <div>
            <strong>
              Ambassadeur
            </strong>

            <span>
              Crédite le compte du destinataire
            </span>
          </div>
        </div>

      </section>

      <main className="ambassade-content">

        {/* ==================================================
            RÉCUPÉRATION
        ================================================== */}

        <section className="recovery-card">

          <div className="card-heading">

            <div>
              <span className="section-label">
                OPÉRATION
              </span>

              <h2>
                Récupérer un fonds
              </h2>

              <p>
                Saisissez le TID, le montant et
                l'ID du destinataire.
              </p>
            </div>

            <div className="secure-badge">
              🔐 Opération sécurisée
            </div>

          </div>

          <form
            onSubmit={handleRecover}
            className="recovery-form"
          >

            {/* ==================================================
                TID
            ================================================== */}

            <div className="field-group tid-field">

              <label htmlFor="tid">
                TID du fonds
              </label>

              <input
                id="tid"
                type="text"
                value={tid}
                onChange={handleTidChange}
                placeholder="Ex. CO260821.1659.T32121"
                autoComplete="off"
                disabled={recovering}
              />

              <small>
                Saisissez le TID communiqué après
                validation du fonds par l'administration.
              </small>

            </div>

            {/* ==================================================
                MONTANT + DESTINATAIRE
            ================================================== */}

            <div className="form-grid">

              {/* ==================================================
                  MONTANT
              ================================================== */}

              <div className="field-group">

                <label htmlFor="amount">
                  Montant
                </label>

                <div className="amount-input">

                  <input
                    id="amount"
                    type="number"
                    min={MIN_AMOUNT}
                    step="1"
                    value={amount}
                    onChange={handleAmountChange}
                    placeholder="Montant en CDF"
                    disabled={recovering}
                  />

                  <span>
                    CDF
                  </span>

                </div>

                <small>
                  Minimum :{" "}
                  {formatCDF(MIN_AMOUNT)}
                </small>

              </div>

              {/* ==================================================
                  DESTINATAIRE
              ================================================== */}

              <div className="field-group">

                <label htmlFor="userId">
                  ID du destinataire
                </label>

                <input
                  id="userId"
                  type="number"
                  min="1"
                  step="1"
                  value={userId}
                  onChange={handleUserIdChange}
                  onBlur={handleBeneficiaryLookup}
                  placeholder="Ex. 25"
                  autoComplete="off"
                  disabled={recovering}
                />

                <small>
                  ID du compte qui recevra
                  100 % du fonds.
                </small>

                {/* ==================================================
                    IDENTITÉ DU DESTINATAIRE
                ================================================== */}

                {loadingBeneficiary && (
                  <div className="beneficiary-status">
                    🔎 Identification du destinataire...
                  </div>
                )}

                {!loadingBeneficiary &&
                  beneficiary && (
                    <div className="beneficiary-found">
                      <span className="beneficiary-icon">
                        ✓
                      </span>

                      <div>
                        <small>
                          Destinataire identifié
                        </small>

                        <strong>
                          {getBeneficiaryName()}
                        </strong>
                      </div>
                    </div>
                  )}

              </div>

            </div>

            {/* ==================================================
                RÉCAPITULATIF FINANCIER
            ================================================== */}

            <div className="commission-box">

              <div className="commission-row">

                <span>
                  Crédit destinataire
                </span>

                <strong>
                  {formatCDF(
                    Number(amount) || 0
                  )}
                </strong>

              </div>

              <div className="commission-row">

                <span>
                  Votre commission
                  <small>
                    1,5 %
                  </small>
                </span>

                <strong className="commission-value">
                  +{" "}
                  {formatCDF(
                    commission
                  )}
                </strong>

              </div>

              <div className="commission-separator" />

              <div className="commission-info">

                <span>
                  ℹ️
                </span>

                <p>
                  Le destinataire reçoit
                  l'intégralité du montant.
                  Votre commission de 1,5 % est
                  générée séparément dans votre
                  portefeuille ambassadeur.
                </p>

              </div>

            </div>

            {/* ==================================================
                ALERTES
            ================================================== */}

            {error && (
              <div className="ambassade-alert error">

                <span>
                  ⚠
                </span>

                {error}

              </div>
            )}

            {success && (
              <div className="ambassade-alert success">

                <span>
                  ✓
                </span>

                {success}

              </div>
            )}

            {/* ==================================================
                ACTIONS
            ================================================== */}

            <div className="form-actions">

              <button
                type="button"
                className="clear-button"
                onClick={clearForm}
                disabled={recovering}
              >
                Réinitialiser
              </button>

              <button
                type="submit"
                className="recover-button"
                disabled={
                  recovering ||
                  loadingBeneficiary ||
                  !tid.trim() ||
                  !amount ||
                  !userId ||
                  !beneficiary
                }
              >
                {recovering
                  ? "Récupération en cours..."
                  : "Récupérer et créditer"}
              </button>

            </div>

          </form>

        </section>

        {/* ==================================================
            HISTORIQUE PERSONNEL
        ================================================== */}

        <section className="history-card">

          <div className="card-heading">

            <div>
              <span className="section-label">
                JOURNAL
              </span>

              <h2>
                Mes dernières récupérations
              </h2>
            </div>

          </div>

          {history.length === 0 ? (

            <div className="empty-history">

              <div className="empty-icon">
                📋
              </div>

              <strong>
                Aucune récupération
              </strong>

              <p>
                Vos opérations apparaîtront ici
                après chaque récupération réussie.
              </p>

            </div>

          ) : (

            <div className="history-list">

              {history.map(
                (operation, index) => (

                  <div
                    className="history-item"
                    key={
                      operation.id ||
                      operation.transactionId ||
                      `${operation.tid}-${index}`
                    }
                  >

                    <div className="history-main">

                      <div className="history-icon">
                        ✓
                      </div>

                      <div>

                        <strong>
                          {formatCDF(
                            operation.amount
                          )}
                        </strong>

                        <span>
                          TID :{" "}
                          {operation.tid}
                        </span>

                        <span>
                          Destinataire{" "}
                          #{operation.userId}

                          {operation.username
                            ? ` • ${operation.username}`
                            : ""}
                        </span>

                      </div>

                    </div>

                    <div className="history-commission">

                      <span>
                        Commission
                      </span>

                      <strong>
                        +{" "}
                        {formatCDF(
                          operation.commission
                        )}
                      </strong>

                    </div>

                  </div>

                )
              )}

            </div>

          )}

        </section>

      </main>

      {/* ==================================================
          RAPPEL
      ================================================== */}

      <footer className="ambassade-footer">

        <div>

          <strong>
            🛡️ Responsabilité Ambassadeur
          </strong>

          <p>
            Vérifiez toujours le TID, le montant
            et l'identité du destinataire avant de confirmer.
            Une récupération validée est définitive.
          </p>

        </div>

        <div className="footer-rule">

          <span>
            Règle financière
          </span>

          <strong>
            100% utilisateur + 1,5% ambassadeur
          </strong>

        </div>

      </footer>

    </div>
  );
}