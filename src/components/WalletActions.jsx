import { useState } from "react";
import api from "../services/api";

export default function WalletActions({ refresh }) {
  const [open, setOpen] = useState(null); // "deposit" | "withdraw"
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [method, setMethod] = useState("");
  const [reference, setReference] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 📱 NUMÉROS DES MOYENS DE PAIEMENT
  const methods = {
    airtel: "0973596027",
    mpesa: "pas encore disponible",
    orange: "pas encore disponible",
    usdt: "pas encore disponible"
  };

  const reset = () => {
    setAmount("");
    setPhone("");
    setMethod("");
    setReference("");
    setError("");
  };

  const close = () => {
    setOpen(null);
    reset();
  };

  const copyNumber = () => {
    if (!method) return;
    navigator.clipboard.writeText(methods[method]);
    alert("📋 Numéro copié !");
  };

  const validate = () => {
    if (!amount || isNaN(amount)) {
      return "Montant invalide";
    }

    if (Number(amount) < 500) {
      return "Montant minimum = 500";
    }

    if (!method && open === "deposit") {
      return "Choisir un moyen de paiement";
    }

    if (!reference && open === "deposit") {
      return "Référence obligatoire";
    }

    if (!phone && open === "withdraw") {
      return "Numéro requis";
    }

    return null;
  };

  const submit = async () => {
    const validationError = validate();
    if (validationError) return setError(validationError);

    try {
      setLoading(true);
      setError("");

      let res;

      // ================= DEPOT =================
      if (open === "deposit") {
        res = await api.post("/payment/deposit", {
          amount: Number(amount),
          method,
          reference
        });
      }

      // ================= RETRAIT =================
      if (open === "withdraw") {
        res = await api.post("/wallet/withdraw", {
          amount: Number(amount),
          phone
        });
      }

      alert(res.data?.message || "Demande envoyée ✅");

      close();
      refresh && refresh();

    } catch (err) {
      console.error("WALLET ACTION ERROR:", err);

      setError(
        err.response?.data?.error ||
        err.message ||
        "Erreur serveur"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">

      {/* ACTION BUTTONS */}
      <div className="flex gap-2">
        <button
          onClick={() => {
            setOpen("deposit");
            reset();
          }}
          className="bg-green-600 text-white px-3 py-1 rounded"
        >
          Dépôt
        </button>

        <button
          onClick={() => {
            setOpen("withdraw");
            reset();
          }}
          className="bg-red-600 text-white px-3 py-1 rounded"
        >
          Retrait
        </button>
      </div>

      {/* FORM */}
      {open && (
        <div className="p-3 border rounded space-y-3 bg-gray-100">

          <h4 className="font-bold">
            {open === "deposit" ? "💰 Dépôt" : "💸 Retrait"}
          </h4>

          {/* MONTANT */}
          <input
            type="number"
            placeholder="Montant"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full p-2 border rounded"
          />

          {/* ================= DEPOT ================= */}
          {open === "deposit" && (
            <>
              {/* CHOIX MOYEN */}
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="">Choisir un moyen</option>
                <option value="airtel">Airtel Money</option>
                <option value="mpesa">M-Pesa</option>
                <option value="orange">Orange Money</option>
                <option value="usdt">USDT (Tether)</option>
              </select>

              {/* AFFICHAGE NUMERO */}
              {method && (
                <div className="bg-yellow-100 p-3 rounded">
                  <p className="text-sm">Envoyer à :</p>

                  <div className="flex justify-between items-center">
                    <b>{methods[method]}</b>

                    <button
                      onClick={copyNumber}
                      className="bg-blue-500 text-white px-2 py-1 rounded text-sm"
                    >
                      Copier
                    </button>
                  </div>

                  <p className="text-xs mt-2 text-gray-600">
                    ⚠ Envoyez par Retrait de {amount || 0} CDF au +243 973596027 auprès de Agent TUADILA GERARD MICHEL 
                  </p>
                </div>
              )}

              {/* REFERENCE */}
              <input
                type="text"
                placeholder="Référence transaction (obligatoire)"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full p-2 border rounded"
              />
            </>
          )}

          {/* ================= RETRAIT ================= */}
          {open === "withdraw" && (
            <input
              type="text"
              placeholder="insérez votre numéro AirtelMoney"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full p-2 border rounded"
            />
          )}

          {/* ERROR */}
          {error && (
            <p className="text-red-600 text-sm">{error}</p>
          )}

          {/* BUTTONS */}
          <div className="flex gap-2">
            <button
              onClick={submit}
              disabled={loading}
              className="bg-blue-600 text-white px-3 py-1 rounded"
            >
              {loading ? "Envoi..." : "Valider"}
            </button>

            <button
              onClick={close}
              disabled={loading}
              className="bg-gray-400 px-3 py-1 rounded"
            >
              Annuler
            </button>
          </div>

        </div>
      )}
    </div>
  );
}