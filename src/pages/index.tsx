import { type FunctionComponent, useEffect } from "react"
import { useNavigate } from "react-router"
import useAuth from "@/hooks/useAuth"

interface RootPageProps {}

const RootPage: FunctionComponent<RootPageProps> = () => {
	const navigate = useNavigate()
	const { user, authenticated } = useAuth()

	useEffect(() => {
		console.log("🚀 ~ RootPage ~ authenticated:", authenticated)

		if (!user?.id) {
			navigate("/login")
		} else {
			navigate("/home")
		}
	}, [authenticated, navigate, user?.id])

	return null
}

export default RootPage
