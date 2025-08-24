import { Stack } from "@chakra-ui/react";
import type { FunctionComponent } from "react";
import { navItems } from "@/config/navigation";
import NavbarHeader from "@/layouts/Navbar/NavbarHeader";
import NavGroup from "@/layouts/Navbar/NavGroup";
import NavItem from "@/layouts/Navbar/NavItem";
import NavSection from "@/layouts/Navbar/NavSection";

interface NavbarProps {
	sidebarWidth: number;
}

const Navbar: FunctionComponent<NavbarProps> = ({ sidebarWidth }) => {
	return (
		<>
			<Stack
				bg="white"
				borderRight="1px solid lightgray"
				bottom={0}
				gap={0}
				left={0}
				minH={{ base: "auto", md: "100vh" }}
				overflowY="auto"
				pos={{ base: "relative", md: "fixed" }}
				top={0}
				w={{ base: "100%", md: `${sidebarWidth}px` }}
				zIndex={1}
			>
				<NavbarHeader />

				{navItems.map((item) => {
					if (item.type === "group") {
						return <NavGroup data={item} key={item.id} />;
					} else if (item.type === "item") {
						return <NavItem data={item} key={item.id} />;
					} else if (item.type === "divider") {
						return <NavSection data={item} />;
					} else {
						return null;
					}
				})}
			</Stack>
		</>
	);
};

export default Navbar;
