import type { FunctionComponent } from "react"
import AppContext from "@/context/AppContext"

interface AppProviderProps extends React.PropsWithChildren {}

const AppProvider: FunctionComponent<AppProviderProps> = ({ children }) => {
	return (
		<>
			<AppContext.Provider value={{}}>{children}</AppContext.Provider>
		</>
	)
}

export default AppProvider
