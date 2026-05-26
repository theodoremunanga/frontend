import api from "../services/api";

export const deposit = (amount, phone) =>
  api.post("/deposit", { amount, phone });

export const withdraw = (amount, phone) =>
  api.post("/withdraw", { amount, phone });

await deposit(amount, phone);