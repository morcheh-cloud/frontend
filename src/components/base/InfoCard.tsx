import { HStack, Icon, Stack, Text } from "@chakra-ui/react"
import type { FunctionComponent } from "react"
import Caption from "@/components/base/Caption"

interface InfoCardProps {
	title: React.ReactNode
	caption: string
	icon: React.ReactNode
}

const InfoCard: FunctionComponent<InfoCardProps> = ({
	caption,
	icon,
	title,
	...reset
}) => {
	return (
		<>
			<HStack {...reset} gap={4}>
				<Icon size={"xl"}>{icon}</Icon>
				<Stack gap={0}>
					<Text as="div">{title}</Text>
					<Caption fontSize={12}>{caption}</Caption>
				</Stack>
			</HStack>
		</>
	)
}

export default InfoCard
