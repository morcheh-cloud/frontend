import { Box, Stack } from "@chakra-ui/react";
import type { FunctionComponent } from "react";
import { useId } from "react";
import { type MetaArgs, Outlet } from "react-router";
import Header from "@/layouts/Header";
import Navbar from "@/layouts/Navbar";

const SIDEBAR_WIDTH = 270;
const HEADER_HEIGHT = 40;

interface MainLayoutProps {}

const MainLayout: FunctionComponent<MainLayoutProps> = () => {
	const mainLayoutId = useId();
	return (
		<>
			<Box h={"100%"} id={mainLayoutId}>
				<Navbar sidebarWidth={SIDEBAR_WIDTH} />

				<Stack
					height={"100%"}
					id={`${mainLayoutId}-container`}
					ml={{ base: 0, md: `${SIDEBAR_WIDTH}px` }}
				>
					<Header height={`${HEADER_HEIGHT}px`} />

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
		</>
	);
};

export default MainLayout;

export function meta({ params }: MetaArgs) {
	return [
		{ title: "StackOps" },
		{ content: "Welcome to React Router!", name: "description" },
	];
}
