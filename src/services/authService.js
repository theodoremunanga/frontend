import api from "../services/api";

export const login = async (email, password) => {
  const res = await api.post("/auth/login", { email, password });

  sessionStorage.setItem("token", res.data.token);
  localStorage.setItem("role", res.data.role);

  return res.data;
};