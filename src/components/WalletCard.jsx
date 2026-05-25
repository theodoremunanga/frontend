export default function WalletCard({ wallet }) {
  return (
    <div style={{
      padding: 20,
      background: "#111",
      color: "#fff",
      borderRadius: 10,
      marginBottom: 20
    }}>
      <h2>💰 Mon Solde</h2>

      <p>Disponible: {wallet.balance} CDF</p>
      <p>Bloqué: {wallet.balance_locked} CDF</p>
    </div>
  );
}