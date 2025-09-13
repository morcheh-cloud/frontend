import { Drawer, Portal } from "@chakra-ui/react"
import type { FunctionComponent, PropsWithChildren } from "react"

interface ShellDrawerProps extends PropsWithChildren {}

const ShellDrawer: FunctionComponent<ShellDrawerProps> = (props) => {
	return (
		<>
			<Drawer.Root size={"full"} open={false} placement={"bottom"}>
				<Portal>
					<Drawer.Backdrop />
					<Drawer.Positioner>
						<Drawer.Content height={"60%"}>
							{/* <Drawer.Header>
								<Drawer.Title>Drawer Title</Drawer.Title>
							</Drawer.Header> */}
							<Drawer.Body p={0}>{props.children}</Drawer.Body>
						</Drawer.Content>
					</Drawer.Positioner>
				</Portal>
			</Drawer.Root>
		</>
	)
}

export default ShellDrawer
