import { useState } from "react";
import api from "../services/api";

export default function Withdraw({ refresh }) {
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!amount || Number(amount) < 500) {
      return alert("Montant minimum = 500");
    }

    try {
      setLoading(true);

      const res = await api.post("/wallet/withdraw", {
        amount: Number(amount),
        phone,
      });

      alert(res.data.message);
      setAmount(""); setPhone("");
      refresh && refresh();

    } catch (err) {
      alert(err.response?.data?.error || "Erreur retrait");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3>💸 Retrait</h3>
      <input value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Montant"/>
      <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Téléphone"/>
      <button onClick={submit} disabled={loading}>
        {loading ? "..." : "Retirer"}
      </button>
    </div>
  );
}