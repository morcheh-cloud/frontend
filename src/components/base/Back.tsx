import { Box, Breadcrumb } from "@chakra-ui/react"
import type { FunctionComponent } from "react"

interface BackProps {}

const Back: FunctionComponent<BackProps> = () => {
	return (
		<>
			<Box pt={1}>
				<Breadcrumb.Root size={"sm"} variant={"plain"}>
					<Breadcrumb.List>
						<Breadcrumb.Item>
							<Breadcrumb.Link href="#">Docs</Breadcrumb.Link>
						</Breadcrumb.Item>
						<Breadcrumb.Separator />
						<Breadcrumb.Item>
							<Breadcrumb.Link href="#">Components</Breadcrumb.Link>
						</Breadcrumb.Item>
						<Breadcrumb.Separator />
						<Breadcrumb.Item>
							<Breadcrumb.CurrentLink>Props</Breadcrumb.CurrentLink>
						</Breadcrumb.Item>
					</Breadcrumb.List>
				</Breadcrumb.Root>
			</Box>
		</>
	)
}

export default Back
