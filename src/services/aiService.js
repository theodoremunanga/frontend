import api from "./api";

export const getAISettings = () =>
  api.get("/ai/settings");

export const updateAISettings = (data) =>
  api.put("/ai/settings", data);

export const getAIWallet = () =>
  api.get("/ai/wallet");

export const creditBot = (amount) =>
  api.post("/ai/credit", {
    amount,
  });

export const debitBot = (amount) =>
  api.post("/ai/debit", {
    amount,
  });

export const transferToSystem = (amount) =>
  api.post("/ai/transfer-system", {
    amount,
  });