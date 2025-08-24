import {
	Button,
	Collapsible,
	Stack,
	Text,
	useDisclosure,
} from "@chakra-ui/react";
import { ChevronUp } from "lucide-react";
import { type FunctionComponent, memo } from "react";
import type { NavItemType } from "@/config/navigation";
import NavItem from "@/layouts/Navbar/NavItem";

interface NavGroupProps {
	data: Extract<NavItemType, { type: "group" }>;
}

const NavGroup: FunctionComponent<NavGroupProps> = ({ data }) => {
	const Icon = data.icon;
	const { onToggle, open } = useDisclosure();

	return (
		<>
			<Collapsible.Root onOpenChange={onToggle} open={open} unmountOnExit>
				<Collapsible.Trigger w={"100%"}>
					<Button
						borderRadius={0}
						disabled={data.disabled}
						justifyContent={"start"}
						variant={open ? "subtle" : "ghost"}
						w={"100%"}
					>
						<Icon
							style={{
								opacity: 0.9,
							}}
						/>

						<Text fontWeight={400} ml={1}>
							{data.title}
						</Text>

						<ChevronUp
							style={{
								marginLeft: "auto",
								opacity: 0.4,
								transform: open ? "rotate(180deg)" : "rotate(0deg)",
								transition: "transform 0.2s",
							}}
						/>
					</Button>
				</Collapsible.Trigger>

				<Collapsible.Content>
					<Stack gap={0} pl={2}>
						{data.children.map((item) => {
							return <NavItem data={item} key={item.id} />;
						})}
					</Stack>
				</Collapsible.Content>
			</Collapsible.Root>
		</>
	);
};

export default memo(NavGroup);
