import { HStack, Separator, Text } from "@chakra-ui/react";
import { type FunctionComponent, memo } from "react";
import type { NavItemType } from "@/config/navigation";

type NavSectionItem = Extract<NavItemType, { type: "divider" }>;

interface NavSectionProps {
	data: NavSectionItem;
}

const NavSection: FunctionComponent<NavSectionProps> = ({ data }) => {
	return (
		<>
			<HStack mb={2} pl={2.5}>
				<Text fontSize={12} fontWeight={500} opacity={0.3}>
					{data.title}
				</Text>
				<Separator w={"100%"} />
			</HStack>
		</>
	);
};

export default memo(NavSection);
