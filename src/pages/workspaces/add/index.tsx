import {
	Button,
	Container,
	Field,
	Heading,
	HStack,
	Input,
	Stack,
	Text,
	Textarea,
} from "@chakra-ui/react"
import { useMutation } from "@tanstack/react-query"
import type { FunctionComponent } from "react"
import { Controller, useForm } from "react-hook-form"
import { useNavigate } from "react-router"
import TimezoneSelect from "@/components/SelectTimezone"
import { ClientApi } from "@/lib/client"
import type { CreateWorkSpacePayload } from "@/lib/services"

interface AddWorkSpacePageProps {}

const AddWorkSpacePage: FunctionComponent<AddWorkSpacePageProps> = () => {
	const navigate = useNavigate()

	const { control, handleSubmit } = useForm<CreateWorkSpacePayload>({
		defaultValues: {
			name: "",
			timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
		},
	})

	const submitHandler = useMutation({
		mutationFn: (data: CreateWorkSpacePayload) => {
			return ClientApi.workspace.create(data)
		},
		onSuccess: () => {
			navigate("/")
		},
	})

	return (
		<>
			<Stack h={"100%"} w={"100%"} alignItems={"center"} bgColor={"gray.100"}>
				<Container
					bg={"white"}
					id="form"
					as={"form"}
					onSubmit={handleSubmit((data) => submitHandler.mutate(data))}
					w={"100%"}
					maxW={"2xl"}
					border={1}
					borderStyle={"solid"}
					borderColor={"gray.200"}
					mt={16}
					rounded={"lg"}
					overflow={"hidden"}
					px={0}
				>
					<HStack
						borderBottom={"1px solid"}
						borderColor={"gray.200"}
						justify={"space-between"}
						p={2}
						px={4}
					>
						<Text fontWeight={500} fontSize={20}>
							Morcheh
						</Text>

						<Button variant={"surface"} size={"xs"}>
							Log out
						</Button>
					</HStack>

					<Stack p={4} pt={6}>
						<Heading size={"2xl"}>Create a New Workspace</Heading>
						<Text textAlign={"justify"} opacity={0.6} mt={2} fontSize={14}>
							A workspace is the top level in your hierarchy. It lets you group
							teams, manage resources across workspaces, and control user access
							to features and permissions.
						</Text>

						<Controller
							control={control}
							name="name"
							render={({ field, fieldState: { invalid, error } }) => (
								<Field.Root {...field} mt={6} invalid={invalid}>
									<Field.Label fontWeight={400} fontSize={14}>
										Name
									</Field.Label>
									<Input placeholder="Enter your workspace name" />
									<Field.ErrorText>{error?.message}</Field.ErrorText>
								</Field.Root>
							)}
						/>

						<Controller
							control={control}
							name="descriptions"
							render={({ field, fieldState: { invalid, error } }) => (
								<Field.Root mt={4} invalid={invalid}>
									<Field.Label fontWeight={400} fontSize={14}>
										Description
									</Field.Label>
									<Textarea
										value={field.value}
										onChange={(e) => {
											console.log(e.target.value)
											field.onChange(e.target.value)
										}}
										minH={120}
										placeholder="Enter your workspace description"
									/>
									<Field.ErrorText>{error?.message}</Field.ErrorText>
								</Field.Root>
							)}
						/>

						<Controller
							control={control}
							name="timezone"
							render={({ field, fieldState: { invalid, error } }) => (
								<Field.Root mt={4} gap={0} invalid={invalid}>
									<Field.Label fontWeight={400} fontSize={14}>
										Select time zone
									</Field.Label>
									<TimezoneSelect
										value={field.value}
										onChange={field.onChange}
										mt={2}
									/>
									<Field.ErrorText>{error?.message}</Field.ErrorText>
								</Field.Root>
							)}
						/>

						<Button
							loading={submitHandler.isPending}
							form="form"
							type="submit"
							ml={"auto"}
							w="fit-content"
							mt={6}
						>
							Create Workspace
						</Button>
					</Stack>
				</Container>
			</Stack>
		</>
	)
}

export default AddWorkSpacePage
