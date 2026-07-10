import axios from "axios";

/**
 * =====================================================
 * ENV
 * =====================================================
 */

export const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://backend-ad3t.onrender.com/api";

export const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  "https://backend-ad3t.onrender.com";

/**
 * =====================================================
 * AXIOS DEFAULT
 * =====================================================
 */

const api = axios.create({

  baseURL: API_URL,

  timeout: 20000,

  withCredentials: true,

});

/**
 * =====================================================
 * ADS API
 * =====================================================
 */

const publicAdsApi = axios.create({

  baseURL: `${API_URL}/ads`,

  timeout: 20000,

  withCredentials: true,

});

/**
 * =====================================================
 * TOKEN
 * =====================================================
 */

function getToken() {

  return localStorage.getItem("token");

}

/**
 * =====================================================
 * AUTH INTERCEPTOR
 * =====================================================
 */

const attachToken = (config) => {

  const token = getToken();

  if (token) {

    config.headers.Authorization =
      `Bearer ${token}`;

  }

  return config;

};

api.interceptors.request.use(

  attachToken,

  (error) => Promise.reject(error)

);

publicAdsApi.interceptors.request.use(

  attachToken,

  (error) => Promise.reject(error)

);

/**
 * =====================================================
 * ERROR HELPER
 * =====================================================
 */

function handleError(
  error,
  label = "API Error"
) {

  console.error(

    `❌ ${label}:`,

    error?.response?.data ||
    error.message

  );

  throw error;

}

/**
 * =====================================================
 * CREATE AD
 * =====================================================
 */

export async function createAd(adData) {

  try {

    const response =
      await publicAdsApi.post(

        "/create",

        adData

      );

    return response.data;

  }

  catch (error) {

    handleError(
      error,
      "Create Ad"
    );

  }

}

/**
 * =====================================================
 * GET ALL ADS
 * =====================================================
 */

export async function getAllAds() {

  try {

    const response =
      await publicAdsApi.get("/");

    return response.data.ads || [];

  }

  catch (error) {

    handleError(
      error,
      "Get All Ads"
    );

  }

}

/**
 * =====================================================
 * GET SINGLE AD
 * =====================================================
 */

export async function getAdById(id) {

  try {

    const response =
      await publicAdsApi.get(

        `/${id}`

      );

    return response.data.ad;

  }

  catch (error) {

    handleError(
      error,
      "Get Ad"
    );

  }

}

/**
 * =====================================================
 * UPDATE AD
 * =====================================================
 */

export async function updateAd(
  id,
  data
) {

  try {

    const response =
      await publicAdsApi.put(

        `/${id}`,

        data

      );

    return response.data;

  }

  catch (error) {

    handleError(
      error,
      "Update Ad"
    );

  }

}

/**
 * =====================================================
 * DELETE AD
 * =====================================================
 */

export async function deleteAd(id) {

  try {

    const response =
      await publicAdsApi.delete(

        `/${id}`

      );

    return response.data;

  }

  catch (error) {

    handleError(
      error,
      "Delete Ad"
    );

  }

}

/**
 * =====================================================
 * TOGGLE STATUS
 * =====================================================
 */

export async function toggleAdStatus(id) {

  try {

    const response =
      await publicAdsApi.patch(

        `/${id}/status`

      );

    return response.data;

  }

  catch (error) {

    handleError(
      error,
      "Toggle Status"
    );

  }

}

/**
 * =====================================================
 * GET ACTIVE ADS
 * =====================================================
 */

export async function getActiveAds(
  category = ""
) {

  try {

    const response =
      await publicAdsApi.get(

        "/active",

        {
          params:
            category
              ? { category }
              : {},
        }

      );

    return (
      response.data.ads ||
      []
    );

  }

  catch (error) {

    console.error(

      "❌ Get Active Ads:",

      error?.response?.data ||
      error.message

    );

    return [];

  }

}

/**
 * =====================================================
 * TRACK VIEW
 * =====================================================
 */

export async function trackAdView(id) {

  if (!id) return;

  try {

    await publicAdsApi.post(

      `/${id}/view`,

      {}

    );

  }

  catch (error) {

    console.error(

      "❌ Track View:",

      error?.response?.data ||
      error.message

    );

  }

}

/**
 * =====================================================
 * TRACK CLICK
 * =====================================================
 */

export async function trackAdClick(id) {

  if (!id) return;

  try {

    await publicAdsApi.post(

      `/${id}/click`,

      {}

    );

  }

  catch (error) {

    console.error(

      "❌ Track Click:",

      error?.response?.data ||
      error.message

    );

  }

}

/**
 * =====================================================
 * OPEN AD LINK
 * =====================================================
 */

export async function openAdLink(ad) {

  if (!ad) return;

  try {

    await trackAdClick(ad.id);

    if (ad.link) {

      window.open(

        ad.link,

        "_blank",

        "noopener,noreferrer"

      );

    }

  }

  catch (error) {

    console.error(

      "❌ Open Ad Link:",

      error

    );

  }

}

/**
 * =====================================================
 * HOME FEED ADS
 * =====================================================
 */

export async function getHomeFeedAds() {

  try {

    const response =
      await publicAdsApi.get(
        "/home-feed"
      );

    return response.data.ads || [];

  }

  catch (error) {

    console.error(error);

    return [];

  }

}

/**
 * =====================================================
 * HOME BANNER ADS
 * =====================================================
 */

export async function getHomeBannerAds() {

  try {

    const response =
      await publicAdsApi.get(
        "/home-banner"
      );

    return response.data.ads || [];

  }

  catch (error) {

    console.error(error);

    return [];

  }

}

/**
 * =====================================================
 * CAROUSEL ADS
 * =====================================================
 */

export async function getCarouselAds() {

  try {

    const response =
      await publicAdsApi.get(
        "/carousel"
      );

    return response.data.ads || [];

  }

  catch (error) {

    console.error(error);

    return [];

  }

}

/**
 * =====================================================
 * AUTRES CATEGORIES
 * =====================================================
 */

export async function getPreMatchAds() {

  return await getActiveAds(
    "pre_match"
  );

}

export async function getPostMatchAds() {

  return await getActiveAds(
    "post_match"
  );

}

export async function getSponsoredPosts() {

  return await getActiveAds(
    "sponsored_post"
  );

}

/**
 * =====================================================
 * GET COMMENTS
 * =====================================================
 */

export async function getAdComments(adId) {

  try {

    const response =
      await publicAdsApi.get(

        `/${adId}/comments`

      );

    return (
      response.data.comments ||
      []
    );

  }

  catch (error) {

    console.error(error);

    return [];

  }

}

/**
 * =====================================================
 * ADD COMMENT
 * =====================================================
 */

export async function addAdComment(
  adId,
  comment
) {

  try {

    const response =
      await publicAdsApi.post(

        `/${adId}/comments`,

        {
          comment,
        }

      );

    return response.data;

  }

  catch (error) {

    handleError(
      error,
      "Add Comment"
    );

  }

}

/**
 * =====================================================
 * EXPORTS
 * =====================================================
 */

export {

  publicAdsApi,

};

export default api;