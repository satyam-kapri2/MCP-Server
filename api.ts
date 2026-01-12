import axios from "axios";

export const api = axios.create({
  baseURL: "https://www.harito.life/api/v1",
  timeout: 5000,
});
