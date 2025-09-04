import {
	AbsoluteCenter,
	Badge,
	Clipboard,
	CodeBlock,
	createShikiAdapter,
	HStack,
	Icon,
	IconButton,
	Link,
	Spinner,
	Stack,
	Text,
} from "@chakra-ui/react"
import { Ban, Check, ChevronRight, Minus, Plus } from "lucide-react"
import { type FunctionComponent, useState } from "react"
import type { HighlighterGeneric } from "shiki"
import { Tooltip } from "@/components/snippet/tooltip"

const file = {
	code: `
CONTAINER ID   IMAGE                              COMMAND                  CREATED      STATUS        PORTS                                       NAMES
87c5f2fc7102   docker.arvancloud.ir/postgres:14   "docker-entrypoint.s…"   5 days ago   Up 24 hours   0.0.0.0:5434->5432/tcp, :::5434->5432/tcp   ao-pg
b39db8e36921   postgres:17                        "docker-entrypoint.s…"   5 days ago   Up 23 hours   0.0.0.0:5432->5432/tcp, :::5432->5432/tcp   morcheh_postgres
`,
	language: "html",
	title: "index.html",
}

const shikiAdapter = createShikiAdapter<HighlighterGeneric<any, any>>({
	async load() {
		const { createHighlighter } = await import("shiki")
		return createHighlighter({
			langs: ["html", "bash"],
			themes: ["github-dark"],
		})
	},
	theme: "github-dark",
})

interface ShellPreviewProps {}

const ShellPreview: FunctionComponent<ShellPreviewProps> = () => {
	const [fontSize, setFontSize] = useState(12)

	return (
		<>
			<Stack h={"100%"} gap={0}>
				{/* header */}
				<HStack
					bg={"black"}
					borderBottom={"1px solid"}
					borderColor={"gray.900"}
				>
					<HStack p={1.5} px={4} gap={2} w="full" pos={"relative"}>
						<Link color={"blue.400"}>
							{"Install Docker"}
							<Icon size={"sm"}>
								<ChevronRight />
							</Icon>
						</Link>

						<Text color={"white"} fontSize={14}>
							1
						</Text>

						<AbsoluteCenter display={"flex"} gap={2}>
							<Badge colorPalette={"red"}>
								<Icon boxSize={4} size={"xs"}>
									<Ban />
								</Icon>
								Failed
							</Badge>

							<Badge color={"blue.500"}>
								<Spinner size={"xs"} />
								Running (45s)
							</Badge>

							<Badge colorPalette={"teal"}>
								<Icon boxSize={4} size={"xs"}>
									<Check />
								</Icon>
								Success (45s)
							</Badge>
						</AbsoluteCenter>

						<Clipboard.Root ml={"auto"} value="https://chakra-ui.com">
							<Clipboard.Trigger asChild>
								<IconButton variant="plain" size="xs">
									<Clipboard.Indicator color="white" />
								</IconButton>
							</Clipboard.Trigger>
						</Clipboard.Root>

						<Tooltip content={"Decrease font size"}>
							<IconButton
								size={"xs"}
								variant={"plain"}
								color={"white"}
								onClick={() => {
									if (fontSize === 8) return

									setFontSize((prev) => prev - 1)
								}}
							>
								<Minus />
							</IconButton>
						</Tooltip>

						<Tooltip content={"Increase font size"}>
							<IconButton
								size={"xs"}
								variant={"plain"}
								color={"white"}
								onClick={() => {
									if (fontSize === 24) return
									setFontSize((prev) => prev + 1)
								}}
							>
								<Plus />
							</IconButton>
						</Tooltip>
					</HStack>
				</HStack>

				<CodeBlock.AdapterProvider value={shikiAdapter}>
					<CodeBlock.Root
						h={"100%"}
						rounded={"none"}
						code={file.code}
						language={"bash"}
						border={"none"}
						meta={{ showLineNumbers: true, wordWrap: true }}
					>
						<CodeBlock.Content>
							<CodeBlock.Code>
								<CodeBlock.CodeText fontSize={fontSize} />
							</CodeBlock.Code>
						</CodeBlock.Content>
					</CodeBlock.Root>
				</CodeBlock.AdapterProvider>
			</Stack>
		</>
	)
}

export default ShellPreview
