import { Button, Container, Heading, Stack, Text } from "@chakra-ui/react"
import { Home } from "lucide-react"
import type { FunctionComponent } from "react"
import { NavLink } from "react-router"
import SvgWarningAlert from "@/icons/WarningAlert"

interface AccessDeniedProps {}

const AccessDenied: FunctionComponent<AccessDeniedProps> = () => {
	return (
		<>
			<>
				<Stack justifyContent={"center"} h={"100%"}>
					<Container as={Stack} alignItems={"center"} maxW={"5xl"} h={"70%"}>
						<SvgWarningAlert style={{ height: 200, width: 200 }} />

						<Heading mt={6} size={"7xl"}>
							403
						</Heading>
						<Heading mt={-4} size={"4xl"}>
							Access Forbidden
						</Heading>

						<Text textAlign={"center"} mt={6} opacity={0.6} maxW={700}>
							It seems you've found a door that's locked for you. Please check
							your credentials or navigate back to a familiar place.
						</Text>

						<NavLink to={"/"}>
							<Button size={"lg"} mt={8}>
								<Home />
								Go to Homepage
							</Button>
						</NavLink>
					</Container>
				</Stack>
			</>
		</>
	)
}

export default AccessDenied
