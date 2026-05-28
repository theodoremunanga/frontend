import { useState, useEffect } from "react";
import api from "../../services/api";

export default function BotsPage({ setPage }) {
  const [balance, setBalance] = useState(0);
  const [selectedBot, setSelectedBot] = useState(null);
  const [period, setPeriod] = useState(1);
  const [message, setMessage] = useState("");
  const [activeBot, setActiveBot] = useState(null);
  const [history, setHistory] = useState([]);

useEffect(() => {
  const loadData = async () => {
    try {
      const profile = await api.get("/profile");

      setBalance(profile.data.wallet.balance);

      const bot = await getActiveBot();
      setActiveBot(bot);

    } catch (err) {
      console.error(err);
    }
  };

  loadData();
}, []);

  const bots = [
    { id: 1, name: "Bot AI1", price: 5000 },
    { id: 2, name: "Bot AI2", price: 10000 },
    { id: 3, name: "Bot AI3", price: 20000 },
    { id: 4, name: "Bot AI4", price: 50000 },
  ];

  const handleSubscribe = () => {
    if (!selectedBot) return setMessage("⚠️ Sélectionne un bot");

    const total = selectedBot.price * period;

    if (balance < total) return setMessage("❌ Solde insuffisant");

    const newBalance = balance - total;
    setBalance(newBalance);
    localStorage.setItem("balance", newBalance);

    const expiration = Date.now() + period * 24 * 60 * 60 * 1000;

    const newActiveBot = {
      bot: selectedBot.name,
      period,
      expiresAt: expiration,
    };

    const newHistory = [
      {
        bot: selectedBot.name,
        period,
        total,
        date: new Date().toLocaleString(),
      },
      ...history,
    ];

    localStorage.setItem("activeBot", JSON.stringify(newActiveBot));
    localStorage.setItem("botHistory", JSON.stringify(newHistory));

    setActiveBot(newActiveBot);
    setHistory(newHistory);

    setMessage(`✅ Abonnement réussi à ${selectedBot.name}`);
  };

  const isExpired = activeBot && Date.now() > activeBot.expiresAt;

  return (
    <div className="max-w-md mx-auto p-5 space-y-4">
      <h2 className="text-2xl font-bold">🤖 Bots IA</h2>

      <div className="bg-gray-100 p-3 rounded-xl">
        💰 Solde : {balance.toLocaleString()} CDF
      </div>

      {/* ACTIVE BOT */}
      {activeBot && (
        <div className={`p-3 rounded-xl ${isExpired ? "bg-red-100" : "bg-green-100"}`}>
          🤖 Bot actif : {activeBot.bot} <br />
          ⏳ Expire : {new Date(activeBot.expiresAt).toLocaleString()} <br />
          {isExpired && "❌ Expiré"}
        </div>
      )}

      {/* BOT LIST */}
      <div className="space-y-2">
        {bots.map((bot) => (
          <button
            key={bot.id}
            onClick={() => setSelectedBot(bot)}
            className={`w-full p-3 rounded-xl text-left border transition ${
              selectedBot?.id === bot.id
                ? "bg-blue-600 text-white"
                : "bg-white"
            }`}
          >
            {bot.name} - {bot.price.toLocaleString()} CDF / période
          </button>
        ))}
      </div>

      {/* PERIOD */}
      <div>
        <label className="block mb-1">📅 Période</label>
        <select
          value={period}
          onChange={(e) => setPeriod(parseInt(e.target.value))}
          className="w-full p-2 rounded-xl border"
        >
          <option value={1}>1 jour</option>
          <option value={3}>3 jours</option>
          <option value={7}>7 jours</option>
        </select>
      </div>

      {/* TOTAL */}
      {selectedBot && (
        <div className="bg-green-100 p-3 rounded-xl">
          Total : {(selectedBot.price * period).toLocaleString()} CDF
        </div>
      )}

      {/* ACTION */}
      <button
        onClick={handleSubscribe}
        className="w-full bg-blue-600 text-white p-3 rounded-2xl"
      >
        💳 S’abonner
      </button>

      {message && <div className="text-center text-sm">{message}</div>}

      {/* HISTORY */}
      <div>
        <h3 className="font-semibold">📜 Historique</h3>
        <div className="space-y-1 max-h-40 overflow-auto">
          {history.map((h, i) => (
            <div key={i} className="text-sm bg-gray-50 p-2 rounded">
              {h.bot} - {h.total.toLocaleString()} CDF <br />
              🕒 {h.date}
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => setPage("menu")}
        className="w-full mt-3 text-gray-600"
      >
        ⬅️ Retour
      </button>
    </div>
  );
}
