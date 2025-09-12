import { API_URL } from "@/config/app.config";
import { Api } from "@/lib/services";

export const ClientApi = new Api({
  baseURL: API_URL,
});
