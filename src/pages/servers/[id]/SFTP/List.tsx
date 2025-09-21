import { Button, FormatByte, HStack, IconButton, Input, InputGroup, Kbd, Stack, Text } from "@chakra-ui/react"
import { ArrowUp, File, FolderPlus, Plus, Upload } from "lucide-react"
import type { FunctionComponent } from "react"
import SearchInput from "@/components/SearchInput"
import { Checkbox } from "@/components/snippet/checkbox"

interface SFTPListProps {}

const SFTPList: FunctionComponent<SFTPListProps> = () => {
	return (
		<>
			<Stack gap={0} h={"full"} borderRight={1} borderStyle={"solid"} borderColor={"gray.200"}>
				<HStack p={2}>
					<IconButton size={"sm"} variant={"subtle"}>
						<ArrowUp />
					</IconButton>

					<InputGroup>
						<Input
							value={"/"}
							style={{
								fontFamily: "monospace",
								fontSize: 12,
							}}
							variant={"subtle"}
							size={"sm"}
						/>
					</InputGroup>
				</HStack>

				<Stack px={2}>
					<SearchInput />
				</Stack>

				<HStack px={4} pl={6} my={2} pb={1} mb={4} borderBottom={"1px solid"} borderColor={"gray.200"}>
					<Checkbox mr={"auto"} size={"sm"}>
						0 selected
					</Checkbox>

					<IconButton size={"2xs"} variant={"ghost"}>
						<Upload />
					</IconButton>

					<IconButton size={"2xs"} variant={"ghost"}>
						<FolderPlus />
					</IconButton>

					<IconButton size={"2xs"} variant={"ghost"}>
						<Plus />
					</IconButton>
				</HStack>

				<Stack px={2}>
					{new Array(5).fill(0).map((item) => {
						return (
							<Button
								key={item}
								variant={"subtle"}
								fontWeight={400}
								alignItems={"center"}
								justifyContent={"start"}
								// borderBottom={"1px solid"}
								// borderColor={"gray.200"}
							>
								<Checkbox mr={2} size={"xs"} />

								<File />
								<Text lineClamp={1}>etc</Text>
								<Kbd variant={"plain"} ml={"auto"} size={"sm"}>
									<FormatByte value={1222} />
								</Kbd>
							</Button>
						)
					})}
				</Stack>
			</Stack>
		</>
	)
}

export default SFTPList
