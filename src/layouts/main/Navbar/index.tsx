import { Badge, HStack, IconButton, Stack } from "@chakra-ui/react"
import { ArrowLeft } from "lucide-react"
import { type FunctionComponent, useState } from "react"
import { type NavItemType, navItems } from "@/config/nav.config"
import NavbarHeader from "@/layouts/main/Navbar/NavbarHeader"
import NavGroup from "@/layouts/main/Navbar/NavGroup"
import NavItem from "@/layouts/main/Navbar/NavItem"
import NavSection from "@/layouts/main/Navbar/NavSection"

interface RenderMenuProps {
	items: NavItemType[]
	onChangeList?: (list: NavItemType[]) => void
	onChangeListTitle?: (title: string) => void
}

const RenderMenu: FunctionComponent<RenderMenuProps> = ({
	items,
	onChangeList: setList,
	onChangeListTitle: setListTitle,
}) => {
	return items.map((item) => {
		if (item.type === "group") {
			return (
				<NavGroup
					data={item}
					key={item.id}
					onChangeList={(list, title) => {
						setList?.(list)
						setListTitle?.(title)
					}}
				/>
			)
		} else if (item.type === "item") {
			return (
				<NavItem
					data={item}
					key={item.id}
					onClick={() => {
						if (
							item.type === "group" &&
							item.mode === "list" &&
							item.children?.length
						) {
							setList?.(item.children)
							setListTitle?.(item.title)
						}
					}}
				/>
			)
		} else if (item.type === "divider") {
			return <NavSection data={item} />
		} else {
			return null
		}
	})
}

interface NavbarProps {
	sidebarWidth: number
}

const Navbar: FunctionComponent<NavbarProps> = ({ sidebarWidth }) => {
	const [menu, _] = useState(navItems)
	const [list, setList] = useState<NavItemType[]>([])
	const [listTitle, setListTitle] = useState("")

	return (
		<>
			<Stack
				bg="white"
				borderRight="1px solid lightgray"
				bottom={0}
				gap={0}
				h={"100%"}
				left={0}
				minH={{ base: "auto", md: "100vh" }}
				overflowY="auto"
				pos={{ base: "relative", md: "fixed" }}
				top={0}
				w={{ base: "100%", md: `${sidebarWidth}px` }}
				zIndex={1}
			>
				<NavbarHeader />

				{listTitle && (
					<>
						<HStack gap={0} px={2}>
							<IconButton
								onClick={() => {
									setList([])
									setListTitle("")
								}}
								rounded={"full"}
								size={"md"}
								variant={"plain"}
							>
								<ArrowLeft />
							</IconButton>

							<Badge size={"md"}>{listTitle}</Badge>
						</HStack>
					</>
				)}

				<Stack gap={0} h={"100%"} pos={"relative"}>
					{!!list.length && (
						<>
							<Stack
								bg={"white"}
								gap={0}
								h={"100%"}
								pos={"absolute"}
								w={"100%"}
								zIndex={2}
							>
								<RenderMenu items={list} />
							</Stack>
						</>
					)}

					<Stack gap={0} h={"100%"} zIndex={1}>
						<RenderMenu
							items={menu}
							onChangeList={setList}
							onChangeListTitle={setListTitle}
						/>
					</Stack>
				</Stack>
			</Stack>
		</>
	)
}

export default Navbar
