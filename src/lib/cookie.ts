import Cookies from "js-cookie"

const TOKEN_KEY = "accessToken"

export const SaveJwtToken = (token: string, saveInCookie: boolean) => {
	if (saveInCookie) {
		Cookies.set(TOKEN_KEY, token, {
			expires: 365,
			path: "/",
			sameSite: "strict",
			secure: true,
		})
	} else {
		sessionStorage.setItem(TOKEN_KEY, token)
	}
}

export const GetJwtToken = (): string | undefined => {
	return (
		Cookies.get(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || undefined
	)
}

export const RemoveJwtToken = () => {
	Cookies.remove(TOKEN_KEY, { path: "/" })
	sessionStorage.removeItem(TOKEN_KEY)
}

export const SetCookie = (
	name: string,
	value: string,
	days = 1,
	options: Cookies.CookieAttributes = {},
) => {
	Cookies.set(name, value, {
		expires: days,
		path: "/",
		sameSite: "strict",
		secure: true,
		...options,
	})
}

export const GetCookie = (name: string): string | undefined => {
	return Cookies.get(name)
}

export const DeleteCookie = (name: string) => {
	Cookies.remove(name, { path: "/" })
}
