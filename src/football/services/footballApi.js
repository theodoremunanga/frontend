import api from "../../services/api";


export const getFootballMatches = async () => {

  const response =
    await api.get(
      "/football/matches"
    );


  return response.data;

};



export const getFootballMatch = async (
  matchId
) => {

  const response =
    await api.get(
      `/football/matches/${matchId}`
    );


  return response.data;

};

export const createFootballMatch = async (
  data
) => {

  const response =
    await api.post(
      "/match/create",
      data
    );


  return response.data;

};



export const startFootballMatch = async (
  matchId
) => {

  const response =
    await api.post(
      `/football/matches/${matchId}/start`
    );


  return response.data;

};

