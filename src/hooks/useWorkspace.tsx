import { useContext } from "react"
import AuthContext from "@/context/AuthContext"

const useWorkspace = () => {
	return useContext(AuthContext).workspace
}

export default useWorkspace
