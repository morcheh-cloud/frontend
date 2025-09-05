import {
	AbsoluteCenter,
	Badge,
	CodeBlock,
	createShikiAdapter,
	Icon,
	IconButton,
	ScrollArea,
	Spinner,
	Stack,
} from "@chakra-ui/react"
import { Ban, Check, Maximize, Minimize, Minus, Plus } from "lucide-react"
import { type FunctionComponent, useState } from "react"
import { useHotkeys } from "react-hotkeys-hook"
import { Checkbox } from "@/components/snippet/checkbox"
import { Tooltip } from "@/components/snippet/tooltip"

const text = `
PLAY [Run ls on remote server] *************************************************

TASK [Gathering Facts] *********************************************************
ok: [doctop]

TASK [Run ls command] **********************************************************
changed: [doctop]

TASK [Show ls output] **********************************************************
ok: [doctop] => {
    "ls_output.stdout_lines": [
        "total 100K",
        "-rw-r--r--  1 root root  161 Jul  9  2019 .profile",
        "-rw-r--r--  1 root root 3.1K Oct 15  2021 .bashrc",
        "drwxr-xr-x 19 root root 4.0K Jul 23  2024 ..",
        "drwx------  2 root root 4.0K Jul 23  2024 .ssh",
        "drwxr-xr-x  3 root root 4.0K Jul 23  2024 .local",
        "drwx------  2 root root 4.0K Aug 18  2024 .cache",
        "-rw-------  1 root root  14K Aug 18  2024 .viminfo",
        "drwxr-xr-x  3 root root 4.0K Aug 18  2024 deployment",
        "-rw-------  1 root root   20 Aug 19  2024 .lesshst",
        "drwx------  2 root root 4.0K Aug 24  2024 .docker",
        "-rw-r--r--  1 root root  165 Aug 24  2024 .wget-hsts",
        "drwx------  3 root root 4.0K Nov 25  2024 snap",
        "drwx------  3 root root 4.0K Sep  2 07:12 .ansible",
        "-rw-------  1 root root  32K Sep  3 13:56 .bash_history",
        "drwx------  9 root root 4.0K Sep  3 13:56 ."
    ]
}

PLAY RECAP *********************************************************************
doctop                     : ok=3    changed=1    unreachable=0    failed=0    skipped=0    rescued=0    ignored=0   

`
const file = {
	code: text,
	language: "html",
	title: "index.html",
}

const shikiAdapter = createShikiAdapter({
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
	const [isFullscreen, setIsFullscreen] = useState(false)
	const [autoScroll, setAutoScroll] = useState(true)

	useHotkeys("esc", () => setIsFullscreen(false))

	return (
		<>
			<Stack
				gap={0}
				pos={isFullscreen ? "fixed" : "relative"}
				top={isFullscreen ? 0 : "auto"}
				left={isFullscreen ? 0 : "auto"}
				w={isFullscreen ? "100vw" : "100%"}
				h={isFullscreen ? "100vh" : "100%"}
				bg={"black"}
				zIndex={isFullscreen ? 9999 : "auto"}
			>
				<CodeBlock.AdapterProvider value={shikiAdapter}>
					<CodeBlock.Root
						rounded={"none"}
						code={file.code}
						language={"bash"}
						border={"none"}
						meta={{
							showLineNumbers: true,
							wordWrap: true,
						}}
					>
						<CodeBlock.Header>
							<CodeBlock.Title>install docker {">"} 12</CodeBlock.Title>

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

							<CodeBlock.Control>
								{/*  */}
								<Checkbox
									checked={autoScroll}
									onCheckedChange={(e) => setAutoScroll(!!e.checked)}
									size={"xs"}
								>
									auto scroll
								</Checkbox>

								<CodeBlock.CopyTrigger asChild>
									<IconButton variant="ghost" size="xs">
										<CodeBlock.CopyIndicator />
									</IconButton>
								</CodeBlock.CopyTrigger>

								<Tooltip content="fullscreen">
									<IconButton
										onClick={() => setIsFullscreen((prev) => !prev)}
										color={"white"}
										size={"xs"}
										variant={"plain"}
									>
										{isFullscreen ? <Minimize /> : <Maximize />}
									</IconButton>
								</Tooltip>

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
							</CodeBlock.Control>
						</CodeBlock.Header>

						<ScrollArea.Root height={"80dvh"} maxW={"100%"}>
							<ScrollArea.Viewport>
								<ScrollArea.Content>
									{/*  */}
									<CodeBlock.Content className="job">
										<CodeBlock.Code>
											<CodeBlock.CodeText fontSize={fontSize} />
										</CodeBlock.Code>
									</CodeBlock.Content>
									{/*  */}
								</ScrollArea.Content>
							</ScrollArea.Viewport>
							<ScrollArea.Scrollbar>
								<ScrollArea.Thumb />
							</ScrollArea.Scrollbar>
						</ScrollArea.Root>
					</CodeBlock.Root>
				</CodeBlock.AdapterProvider>
			</Stack>
		</>
	)
}

export default ShellPreview
