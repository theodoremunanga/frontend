// ================= JO ELIGIBILITY =================

export function checkJOEligibility() {
  try {
    // 🔐 récupération sécurisée
    const rawDays = localStorage.getItem("daysPlayed");
    const rawWins = localStorage.getItem("wins");
    const rawBalance = localStorage.getItem("balance");

    // 🔄 conversion sécurisée
    const days = Number(rawDays);
    const wins = Number(rawWins);
    const balance = Number(rawBalance);

    // 🛡️ fallback si NaN
    const safeDays = isNaN(days) ? 0 : days;
    const safeWins = isNaN(wins) ? 0 : wins;
    const safeBalance = isNaN(balance) ? 0 : balance;

    // ✅ logique d’éligibilité
    const isEligible =
      safeDays >= 30 &&
      safeWins >= 20 &&
      safeBalance >= 200000;

    // 🧠 debug utile (tu peux supprimer après)
    console.log("JO CHECK:", {
      days: safeDays,
      wins: safeWins,
      balance: safeBalance,
      isEligible,
    });

    return {
      isEligible,
      details: {
        days: safeDays,
        wins: safeWins,
        balance: safeBalance,
      },
    };

  } catch (err) {
    console.error("JO ELIGIBILITY ERROR:", err);

    return {
      isEligible: false,
      details: {
        days: 0,
        wins: 0,
        balance: 0,
      },
    };
  }
}