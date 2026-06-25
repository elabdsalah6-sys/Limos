import axios from "axios";

const RAW_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
const BASE_URL = RAW_BASE_URL.replace(/\/api\/?$/, "");
const API = axios.create({
  baseURL: `${BASE_URL}/api`,
});

API.interceptors.request.use((req) => {
  const user = localStorage.getItem("user");
  if (user) {
    req.headers.Authorization = `Bearer ${JSON.parse(user).token}`;
  }
  return req;
});

export default API;
