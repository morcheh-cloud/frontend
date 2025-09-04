import { Box, Stack } from "@chakra-ui/react"
import type { FunctionComponent } from "react"
import { useId } from "react"
import { Outlet } from "react-router"
import LayoutWrapper from "@/layouts/LayoutWrapper"
import Header from "@/layouts/main/Header"
import Navbar from "@/layouts/main/Navbar"

const SIDEBAR_WIDTH = 270

interface MainLayoutProps {}

const MainLayout: FunctionComponent<MainLayoutProps> = () => {
	const mainLayoutId = useId()

	return (
		<>
			<LayoutWrapper>
				<Box h={"100%"} id={mainLayoutId}>
					<Navbar sidebarWidth={SIDEBAR_WIDTH} />

					<Stack
						gap={0}
						height={"100%"}
						id={`${mainLayoutId}-container`}
						ml={{ base: 0, md: `${SIDEBAR_WIDTH}px` }}
					>
						<Header />

						<Box
							display={"flex"}
							flexDirection={"column"}
							height={"100%"}
							mx={"auto"}
							w={"100%"}
						>
							<Outlet />
						</Box>
					</Stack>
				</Box>
			</LayoutWrapper>
		</>
	)
}

export default MainLayout

export function meta() {
	return [
		{ title: "StackOps" },
		{ content: "Welcome to React Router!", name: "description" },
	]
}
