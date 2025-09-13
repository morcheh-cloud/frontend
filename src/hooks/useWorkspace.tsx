import { useContext } from "react"
import AuthContext from "@/context/AuthContext"

const useUser = () => {
	return useContext(AuthContext).user
}

export default useUser
