export default function TransactionsTable({
  transactions = [],
}) {

  // =====================================================
  // NOM LISIBLE DU JEU
  // =====================================================

  const getGameLabel = (game) => {

    const normalized =
      String(game || "")
        .trim()
        .toLowerCase();

    const labels = {
      bravman: "BraVMan",
      football: "Football",
      ludo: "Ludo",
      checkers: "Dames",
      dames: "Dames",
    };

    return (
      labels[normalized] ||
      "Transaction"
    );
  };


  // =====================================================
  // ICÔNE DU JEU
  // =====================================================

  const getGameIcon = (game) => {

    const normalized =
      String(game || "")
        .trim()
        .toLowerCase();

    const icons = {
      bravman: "🎯",
      football: "⚽",
      ludo: "🎲",
      checkers: "♟️",
      dames: "♟️",
    };

    return icons[normalized] || "💳";
  };


  // =====================================================
  // TYPE DE TRANSACTION
  // =====================================================
  //
  // Utilisé uniquement pour les anciennes transactions
  // ou les transactions qui n'ont pas de description.
  // =====================================================

  const getTypeLabel = (type) => {

    const normalized =
      String(type || "")
        .trim()
        .toLowerCase();

    const labels = {

      match_win:
        "Victoire",

      match_loss:
        "Défaite",

      match_draw:
        "Match nul",

      deposit:
        "Dépôt",

      withdraw:
        "Retrait",

      withdrawal:
        "Retrait",

      transfer:
        "Transfert",

      refund:
        "Remboursement",

      fee:
        "Frais",

      payment:
        "Paiement",
    };

    return (
      labels[normalized] ||
      "Transaction"
    );
  };


  // =====================================================
  // DESCRIPTION UTILISATEUR
  // =====================================================

  const getDescription = (transaction) => {

    // Le settlement fournit déjà une description
    // propre destinée à l'utilisateur.
    if (
      transaction.description &&
      String(transaction.description).trim()
    ) {
      return transaction.description;
    }


    const game =
      getGameLabel(
        transaction.game
      );

    const type =
      getTypeLabel(
        transaction.type
      );


    if (
      transaction.game
    ) {
      return `${game} — ${type}`;
    }


    return type;
  };


  // =====================================================
  // FORMAT MONTANT
  // =====================================================

  const formatAmount = (amount) => {

    const numericAmount =
      Number(amount || 0);

    return numericAmount.toLocaleString(
      "fr-FR",
      {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }
    );
  };


  // =====================================================
  // COULEUR DU MONTANT
  // =====================================================

  const getAmountColor = (amount) => {

    const numericAmount =
      Number(amount || 0);

    if (numericAmount > 0) {
      return "#22c55e";
    }

    if (numericAmount < 0) {
      return "#ef4444";
    }

    return "#facc15";
  };


  // =====================================================
  // PRÉFIXE DU MONTANT
  // =====================================================

  const getAmountPrefix = (amount) => {

    const numericAmount =
      Number(amount || 0);

    if (numericAmount > 0) {
      return "+";
    }

    return "";
  };


  // =====================================================
  // DATE
  // =====================================================

  const formatDate = (date) => {

    if (!date) {
      return "—";
    }

    const parsedDate =
      new Date(date);

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return "—";
    }

    return parsedDate.toLocaleString(
      "fr-FR"
    );
  };


  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div
      style={{
        background: "#222",
        padding: 20,
        borderRadius: 10,
        overflowX: "auto",
      }}
    >

      <h3
        style={{
          color: "#fff",
          marginTop: 0,
          marginBottom: 20,
        }}
      >
        📊 Historique financier
      </h3>


      {transactions.length === 0 ? (

        <div
          style={{
            color: "#94a3b8",
            textAlign: "center",
            padding: 30,
          }}
        >
          Aucune transaction.
        </div>

      ) : (

        <table
          width="100%"
          style={{
            color: "#fff",
            borderCollapse: "collapse",
          }}
        >

          <thead>

            <tr
              style={{
                borderBottom:
                  "1px solid #475569",
              }}
            >

              <th
                style={{
                  textAlign: "left",
                  padding: "12px 8px",
                }}
              >
                Opération
              </th>


              <th
                style={{
                  textAlign: "right",
                  padding: "12px 8px",
                }}
              >
                Montant
              </th>


              <th
                style={{
                  textAlign: "right",
                  padding: "12px 8px",
                }}
              >
                Date
              </th>

            </tr>

          </thead>


          <tbody>

            {transactions.map(
              (transaction) => {

                const amount =
                  Number(
                    transaction.amount || 0
                  );


                const gameIcon =
                  getGameIcon(
                    transaction.game
                  );


                const description =
                  getDescription(
                    transaction
                  );


                return (

                  <tr
                    key={
                      transaction.id
                    }
                    style={{
                      borderBottom:
                        "1px solid #334155",
                    }}
                  >

                    {/* =================================
                        OPÉRATION
                    ================================= */}

                    <td
                      style={{
                        padding:
                          "14px 8px",
                      }}
                    >

                      <div
                        style={{
                          display:
                            "flex",
                          alignItems:
                            "center",
                          gap: 10,
                        }}
                      >

                        <span
                          style={{
                            fontSize: 22,
                          }}
                        >
                          {gameIcon}
                        </span>


                        <div>

                          <div
                            style={{
                              fontWeight:
                                "bold",
                            }}
                          >
                            {description}
                          </div>


                          {transaction.reference && (
                            <div
                              style={{
                                color:
                                  "#64748b",
                                fontSize:
                                  12,
                                marginTop:
                                  3,
                              }}
                            >
                              {transaction.reference}
                            </div>
                          )}

                        </div>

                      </div>

                    </td>


                    {/* =================================
                        MONTANT
                    ================================= */}

                    <td
                      style={{
                        padding:
                          "14px 8px",
                        textAlign:
                          "right",
                        fontWeight:
                          "bold",
                        fontSize: 16,
                        color:
                          getAmountColor(
                            amount
                          ),
                        whiteSpace:
                          "nowrap",
                      }}
                    >

                      {getAmountPrefix(
                        amount
                      )}

                      {formatAmount(
                        amount
                      )}{" "}

                      CDF

                    </td>


                    {/* =================================
                        DATE
                    ================================= */}

                    <td
                      style={{
                        padding:
                          "14px 8px",
                        textAlign:
                          "right",
                        color:
                          "#94a3b8",
                        whiteSpace:
                          "nowrap",
                      }}
                    >

                      {formatDate(
                        transaction.created_at
                      )}

                    </td>

                  </tr>

                );
              }
            )}

          </tbody>

        </table>

      )}

    </div>
  );
}