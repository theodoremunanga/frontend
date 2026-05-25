import { useEffect, useState } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

export default function Transactions({ refreshKey }) {
  const [txs, setTxs] = useState([]);

  const token = localStorage.getItem("token");

  const load = async () => {
    try {
      const res = await axios.get(`${API_URL}/transactions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTxs(res.data);
    } catch (err) {
      console.error(err);
      alert("Erreur chargement transactions");
    }
  };

  useEffect(() => {
    load();
  }, [refreshKey]); // 🔥 live refresh

  return (
    <div>
      <h4>📋 Transactions</h4>

      {txs.length === 0 ? (
        <p>Aucune transaction</p>
      ) : (
        txs.map(tx => (
          <div key={tx.id}>
            {tx.type} - {tx.amount} CDF - {tx.status}
            <br />
            👤 {tx.username} ({tx.phone})
          </div>
        ))
      )}
    </div>
  );
}