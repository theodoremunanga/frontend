import { useState } from "react";
import api from "../api";

export default function Deposit({ refresh }) {
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!amount || Number(amount) < 500) {
      return alert("Montant minimum = 500");
    }

    if (!phone) {
      return alert("Téléphone requis");
    }

    try {
      setLoading(true);

      const res = await api.post("/wallet/deposit", {
        amount: Number(amount),
        phone,
        reference,
      });

      alert(res.data.message);
      setAmount(""); setPhone(""); setReference("");
      refresh && refresh();

    } catch (err) {
      alert(err.response?.data?.error || "Erreur dépôt");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3>💰 Dépôt</h3>
      <input value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Montant"/>
      <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Téléphone"/>
      <input value={reference} onChange={e=>setReference(e.target.value)} placeholder="Référence"/>
      <button onClick={submit} disabled={loading}>
        {loading ? "..." : "Déposer"}
      </button>
    </div>
  );
}