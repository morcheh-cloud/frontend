import { API_URL } from "@/config/app.config"
import { Api } from "@/lib/services"

export const Client = new Api({
	baseURL: API_URL,
})
