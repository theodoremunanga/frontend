import { useEffect, useState } from "react";

export default function Admin() {
  const [txs, setTxs] = useState([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const token = localStorage.getItem("token");

    const res = await fetch("http://api/admin/transactions", {
      headers: {
        Authorization: "Bearer " + token
      }
    });

    const data = await res.json();
    setTxs(data);
  }

  async function approveDeposit(id) {
    const token = localStorage.getItem("token");

    await fetch(`http://api/admin/approve-deposit/${id}`, {
      method: "POST",
      headers: { Authorization: "Bearer " + token }
    });

    load();
  }

  async function approveWithdraw(id) {
    const token = localStorage.getItem("token");

    await fetch(`http://localhost:3000/api/admin/approve-withdraw/${id}`, {
      method: "POST",
      headers: { Authorization: "Bearer " + token }
    });

    load();
  }

  return (
    <div>
      <h2>👑 Admin Panel</h2>

      {txs.map(t => (
        <div key={t.id} style={{ border: "1px solid gray", margin: 10 }}>
          <p>{t.type} - {t.amount} CDF</p>
          <p>📞 {t.phone}</p>
          <p>Status: {t.status}</p>

          {t.status === "pending" && (
            <>
              {t.type === "deposit" && (
                <button onClick={() => approveDeposit(t.id)}>Valider dépôt</button>
              )}
              {t.type === "withdraw" && (
                <button onClick={() => approveWithdraw(t.id)}>Valider retrait</button>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}