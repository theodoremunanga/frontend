import { useEffect, useState } from "react";
import { authFetch } from "../utils/authFetch";
import WalletActions from "./WalletActions";

export function Wallet({ refreshKey, onRefresh }) {
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadWallet = async () => {
    try {
      setLoading(true);

      const res = await authFetch("/api/profile");
      const data = await res.json();

      console.log("WALLET API 👉", data); // 🔍 DEBUG

      setWallet(data.wallet || data);

    } catch (err) {
      console.error("WALLET ERROR:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWallet();
  }, [refreshKey]);

  if (loading) return <p>Chargement...</p>;
  if (!wallet) return <p>Erreur wallet</p>;

  return (
    <div>
      <h2>Wallet</h2>

      <p>Disponible: {wallet?.balance ?? 0}</p>
      <p>Bloqué: {wallet?.balance_locked ?? 0}</p>

      <WalletActions refresh={onRefresh} />
    </div>
  );
}