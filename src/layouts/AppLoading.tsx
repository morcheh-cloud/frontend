import { Box, Spinner } from "@chakra-ui/react"
import { type FunctionComponent, useEffect, useState } from "react"

interface AppLoadingProps {}

const AppLoading: FunctionComponent<AppLoadingProps> = () => {
	const [loading, setLoading] = useState(false)

	useEffect(() => {
		const timer = setTimeout(() => {
			setLoading(true)
		}, 1000)
		return () => clearTimeout(timer)
	}, [])

	if (!loading) {
		return null
	}

	return (
		<>
			<Box
				h={"100vh"}
				w={"100vw"}
				display={"flex"}
				justifyContent={"center"}
				alignItems={"center"}
			>
				<Spinner size={"xl"} />
			</Box>
		</>
	)
}

export default AppLoading
