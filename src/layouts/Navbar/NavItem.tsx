import { Badge, Button, Text } from "@chakra-ui/react"
import type { FunctionComponent } from "react"
import { useLocation, useNavigate } from "react-router"
import type { NavItemType } from "@/config/nav.config"

interface NavItemProps {
	data: NavItemType
	onClick?: (data: NavItemType) => void
}

const NavItem: FunctionComponent<NavItemProps> = ({ data, onClick }) => {
	const navigate = useNavigate()
	const location = useLocation()

	if (data.type === "divider") {
		return
	}

	const Icon = data.icon
	const isActive = !!data.url && location.pathname === data.url

	return (
		<>
			<Button
				borderRadius={0}
				color={isActive ? "white" : undefined}
				colorPalette={isActive ? "teal" : undefined}
				disabled={data.disabled}
				justifyContent={"start"}
				onClick={() => {
					if (data.url) {
						navigate({
							pathname: data.url,
						})
					}

					onClick?.(data)
				}}
				variant={isActive ? "solid" : "ghost"}
			>
				<Icon />

				<Text fontWeight={isActive ? 600 : 400} ml={1}>
					{data.title}
				</Text>

				{data.badge?.content && (
					<>
						<Badge colorPalette={"green"} fontSize={10} ml={"auto"}>
							12
						</Badge>
					</>
				)}
			</Button>
		</>
	)
}

export default NavItem
