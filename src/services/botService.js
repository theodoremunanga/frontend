import api from "./api";


import { subscribeBot, getActiveBot } from "../services/botService";

export const subscribeBot = async (bot, period, price) => {
  const res = await api.post("/bots/subscribe", {
    bot,
    period,
    price
  });

  return res.data;
};

export const getActiveBot = async () => {
  const res = await api.get("/bots/active");
  return res.data;
};

const handleSubscribe = async () => {
  try {
    if (!selectedBot) {
      return setMessage("⚠️ Sélectionne un bot");
    }

    const total = selectedBot.price * period;

    await subscribeBot(selectedBot.name, period, total);

    const bot = await getActiveBot();
    setActiveBot(bot);

    setMessage("✅ Abonnement réussi");

  } catch (err) {
    setMessage(err.response?.data?.error || "Erreur");
  }
};