import { Box, CloseButton, HStack, IconButton, SimpleGrid, Spinner, Stack, Text } from "@chakra-ui/react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { BugPlay, Download, EllipsisVertical, FolderInput, FolderPlus, Home, Plus, Trash, UserPlus } from "lucide-react"
import { useQueryState } from "nuqs"
import { type FunctionComponent, lazy, useCallback, useEffect, useState } from "react"
import PageContainer from "@/components/base/PageContainer"
import PageHeader from "@/components/base/PageHeader"
import DeleteModal from "@/components/DeleteModal"
import Directory from "@/components/Directory"
import SearchInput from "@/components/SearchInput"
import { Breadcrumb } from "@/components/snippet/breadcrumb"
import { Tooltip } from "@/components/snippet/tooltip"
import { ClientApi } from "@/lib/client"
import type { ServerDirectoryModel, ServerModel } from "@/lib/services"
import { FindDirectoryById, FindDirectoryPathById } from "@/lib/tree"
import ServerCard from "@/pages/servers/list/ServerCard"

const AddDirectoryModal = lazy(() => import("@/components/AddDirectoryModal"))
const AddServerModal = lazy(() => import("@/pages/servers/list/AddServerModal"))

interface ServerListPageProps {}

const ServerListPage: FunctionComponent<ServerListPageProps> = () => {
	const [open, setOpen] = useState(false)
	const [dirId, setDirId] = useQueryState("dir", { history: "push" })
	const [currentDirectory, setCurrentDirectory] = useState<ServerDirectoryModel>()
	const [selectedServers, setSelectedServers] = useState<string[]>([])
	const [addDirectoryModalIsOpen, setAddDirectoryModalIsOpen] = useState(false)
	const [deleteModalIsOpen, setDeleteModalIsOpen] = useState(false)
	const [selectedServer, setSelectedServer] = useState<ServerModel>()

	const { data, refetch } = useQuery({
		queryFn: async () => {
			const res = await ClientApi.server.tree()
			const rootDir = res.data
			setDirId(dirId || rootDir.id || null)
			return res
		},
		queryKey: ["servers", "tree"],
	})

	const reset = useCallback(() => {
		setSelectedServers([])
		setSelectedServer(undefined)
		setDeleteModalIsOpen(false)
		setAddDirectoryModalIsOpen(false)
		setOpen(false)
	}, [])

	useEffect(() => {
		const dir = FindDirectoryById(data?.data, dirId)
		setCurrentDirectory(dir || undefined)
		reset()
	}, [data?.data, dirId, reset])

	const paths = FindDirectoryPathById(data?.data, dirId)
	const breadcrumbItems = paths?.map((dir) => ({
		icon: dir.name === "root" ? <Home /> : undefined,
		id: dir.id,
		title: dir.name === "root" ? "Home" : dir.name,
	}))

	const deleteServerHandler = useMutation({
		mutationFn: () => {
			return ClientApi.server.delete(selectedServer?.id as string)
		},
		onSuccess: async () => {
			await refetch()
			setDeleteModalIsOpen(false)
		},
	})

	return (
		<>
			<DeleteModal
				open={deleteModalIsOpen}
				onClose={() => setDeleteModalIsOpen(false)}
				onSubmit={() => deleteServerHandler.mutate()}
				loading={deleteServerHandler.isPending}
			/>

			<AddServerModal
				open={open}
				directoryId={dirId || undefined}
				directoryName={currentDirectory?.name}
				onSuccess={async () => {
					await refetch()
				}}
				onClose={() => {
					setOpen(false)
				}}
			/>

			<AddDirectoryModal
				open={addDirectoryModalIsOpen}
				onClose={() => {
					setAddDirectoryModalIsOpen(false)
				}}
				type="server"
				onSuccess={() => {
					refetch()
				}}
				parentDirectoryId={dirId!}
				parentDirectoryName={currentDirectory?.name || "root"}
			/>

			<PageContainer>
				<Box
					zIndex={10}
					justifyContent={"center"}
					alignItems={"center"}
					display={"none"}
					bgColor={"white"}
					pos={"absolute"}
					w="100%"
					h={"100%"}
				>
					<Spinner size={"xl"} css={{ "--spinner-track-color": "colors.gray.200" }} />
				</Box>

				<PageHeader title="Servers" description="Manage your servers">
					<IconButton variant={"ghost"}>
						<BugPlay />
					</IconButton>

					<IconButton onClick={() => setAddDirectoryModalIsOpen(true)} variant={"ghost"}>
						<FolderPlus />
					</IconButton>

					<IconButton onClick={() => setOpen(true)} variant={"ghost"}>
						<Plus />
					</IconButton>
				</PageHeader>

				<HStack alignItems={"end"} mt={4} justifyContent={"space-between"}>
					<Breadcrumb
						items={breadcrumbItems}
						onItemClick={(item) => {
							setDirId(item.id || null, { history: "push" })
						}}
					/>

					<SearchInput maxW={300} />
				</HStack>

				<Stack h={"100%"} mt={4} gap={4}>
					{/*  */}

					<HStack rounded={"xl"} bgColor={"gray.100"} py={1} px={2} gap={2}>
						<CloseButton colorPalette={"red"} mr={2} rounded={"full"} size={"xs"} />

						<Text mr={4} fontSize={16}>
							3 selected
						</Text>

						<Tooltip content="share">
							<IconButton variant={"ghost"}>
								<UserPlus />
							</IconButton>
						</Tooltip>

						<IconButton variant={"ghost"}>
							<Trash />
						</IconButton>

						<IconButton variant={"ghost"}>
							<FolderInput />
						</IconButton>

						<IconButton variant={"ghost"}>
							<Download />
						</IconButton>

						<IconButton variant={"ghost"}>
							<EllipsisVertical />
						</IconButton>
					</HStack>

					{/* folders */}
					<SimpleGrid columns={4} gap={4}>
						{currentDirectory?.children?.map((dir) => {
							const isSelected = selectedServers.includes(dir.id as string)

							return (
								<Directory
									key={dir.id}
									name={dir.name}
									onDoubleClick={() => {
										setDirId(dir.id || null)
									}}
									isSelected={isSelected}
									onClick={(e) => {
										const isCtrlPressed = e.ctrlKey || e.metaKey

										if (isCtrlPressed) {
											if (isSelected) {
												setSelectedServers((prev) => prev.filter((id) => id !== dir.id))
											} else {
												setSelectedServers((prev) => [...prev, dir.id as string])
											}
										}
									}}
								/>
							)
						})}
					</SimpleGrid>

					<SimpleGrid columns={4} gap={4}>
						{currentDirectory?.servers?.map((server) => {
							return (
								<ServerCard
									key={server.id}
									data={server}
									onDelete={(data) => {
										setDeleteModalIsOpen(true)
										setSelectedServer(data)
									}}
								/>
							)
						})}
					</SimpleGrid>
				</Stack>
			</PageContainer>
		</>
	)
}

export default ServerListPage
