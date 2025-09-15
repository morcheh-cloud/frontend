import {
	Box,
	Button,
	createListCollection,
	Field,
	GridItem,
	Highlight,
	Input,
	NumberInput,
	SimpleGrid,
	Textarea,
} from "@chakra-ui/react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import type { FunctionComponent } from "react"
import { Controller, useForm } from "react-hook-form"
import { number, object, string, type ZodType } from "zod"
import { Modal } from "@/components/base/Modal"
import { PasswordInput } from "@/components/snippet/password-input"
import { AppSelect } from "@/components/snippet/select"
import { ClientApi } from "@/lib/client"
import type { SaveServerPayload } from "@/lib/services"

interface AddServerModalProps {
	open: boolean
	onClose: () => void
	onSuccess?: () => Promise<void> | void
	directoryId?: string
	directoryName?: string
}

const protocols = createListCollection({
	items: [
		{ label: "ssh", value: "ssh" },
		{ label: "vnc", value: "vnc" },
		{ label: "rdp", value: "rdp" },
	],
})

const SaveServerSchema: ZodType<SaveServerPayload> = object({
	address: string().min(4).max(100),
	description: string().max(500).optional(),
	name: string().min(1).max(100),
	password: string().min(1).max(100),
	port: number().min(1),
	username: string().min(1).max(100),
})

const AddServerModal: FunctionComponent<AddServerModalProps> = ({
	onClose,
	open,
	directoryId,
	directoryName,
	onSuccess,
}) => {
	const { handleSubmit, control, reset } = useForm<SaveServerPayload>({
		defaultValues: {
			address: "",
			description: "",
			name: "",
			password: "",
			port: 22,
			protocol: "ssh",
			username: "",
		},
		resolver: zodResolver(SaveServerSchema as any),
	})

	const clear = () => {
		onClose()
		reset()
	}

	const submitHandler = useMutation({
		mutationFn: (data: SaveServerPayload) => {
			return ClientApi.server.create({
				...data,
				directoryId,
			})
		},
		onSuccess: async () => {
			clear()
			await onSuccess?.()
		},
	})

	return (
		<>
			<Modal.Root open={open} onClose={clear}>
				<Modal.Content
					id="form"
					as={"form"}
					onSubmit={handleSubmit((data) => {
						submitHandler.mutate(data)
					})}
					title="Add new server"
				>
					<SimpleGrid columns={12} columnGap={2} rowGap={4}>
						{/* name */}
						<GridItem colSpan={8}>
							<Controller
								control={control}
								name="name"
								rules={{ required: true }}
								render={({ field, fieldState: { invalid, error } }) => (
									<Field.Root invalid={invalid}>
										<Field.Label>Name</Field.Label>
										<Input {...field} placeholder="my server" />
										<Field.ErrorText>{error?.message}</Field.ErrorText>
									</Field.Root>
								)}
							/>
						</GridItem>

						{/* protocol */}
						<GridItem colSpan={4}>
							<Controller
								control={control}
								name="protocol"
								defaultValue="ssh"
								render={() => (
									<AppSelect.Root title="Protocol" collection={protocols}>
										{protocols.items.map((item) => (
											<AppSelect.Item key={item.value} item={item}>
												{item.label}
											</AppSelect.Item>
										))}
									</AppSelect.Root>
								)}
							/>
						</GridItem>

						{/* address */}
						<GridItem colSpan={8}>
							<Controller
								control={control}
								name="address"
								render={({ field, fieldState: { error, invalid } }) => (
									<Field.Root {...field} invalid={invalid}>
										<Field.Label>Address</Field.Label>
										<Input placeholder="192.168.1.101" />
										<Field.ErrorText>{error?.message}</Field.ErrorText>
									</Field.Root>
								)}
							/>
						</GridItem>

						{/* port */}
						<GridItem colSpan={4}>
							<Controller
								control={control}
								name="port"
								defaultValue={22}
								render={({ field, fieldState: { error, invalid } }) => (
									<Field.Root {...field} invalid={invalid}>
										<Field.Label>Port</Field.Label>
										<NumberInput.Root defaultValue={"22"} min={1}>
											<NumberInput.Control />
											<NumberInput.Input />
										</NumberInput.Root>
										<Field.ErrorText>{error?.message}</Field.ErrorText>
									</Field.Root>
								)}
							/>
						</GridItem>

						{/* username */}
						<GridItem colSpan={12}>
							<Controller
								control={control}
								name="username"
								render={({ field, fieldState: { error, invalid } }) => (
									<Field.Root {...field} invalid={invalid}>
										<Field.Label>username</Field.Label>
										<Input placeholder="root" />
										<Field.ErrorText>{error?.message}</Field.ErrorText>
									</Field.Root>
								)}
							/>
						</GridItem>

						{/* username */}
						<GridItem colSpan={12}>
							<Controller
								control={control}
								name="password"
								render={({ field, fieldState: { error, invalid } }) => (
									<Field.Root {...field} invalid={invalid}>
										<Field.Label>password</Field.Label>
										<PasswordInput placeholder="123456789" />
										<Field.ErrorText>{error?.message}</Field.ErrorText>
									</Field.Root>
								)}
							/>
						</GridItem>

						{/* description */}
						<GridItem colSpan={12}>
							<Controller
								control={control}
								name="description"
								render={({ field, fieldState: { invalid, error } }) => (
									<Field.Root {...field} invalid={invalid}>
										<Field.Label>Description</Field.Label>
										<Textarea autoresize minH={100} maxH={200} placeholder="any note here" />
										<Field.ErrorText>{error?.message}</Field.ErrorText>
									</Field.Root>
								)}
							/>
						</GridItem>
					</SimpleGrid>

					<Box mt={4}>
						<Highlight
							query={[directoryName || "root"]}
							styles={{
								bgColor: "orange.subtle",
								borderRadius: 4,
								color: "orange.fg",
								p: 0.5,
								px: 2,
							}}
						>
							{`you are adding as new server to ${directoryName} directory`}
						</Highlight>
					</Box>

					<Modal.Actions>
						<Button disabled={submitHandler.isPending} onClick={clear} variant={"surface"}>
							cancel
						</Button>

						<Button loading={submitHandler.isPending} form="form" type="submit">
							save
						</Button>
					</Modal.Actions>
				</Modal.Content>
			</Modal.Root>
		</>
	)
}

export default AddServerModal
