import { Button, Field, Highlight, Input, Stack } from "@chakra-ui/react"
import { useMutation } from "@tanstack/react-query"
import type { FunctionComponent } from "react"
import { Controller, useForm } from "react-hook-form"
import { Modal } from "@/components/base/Modal"
import { ClientApi } from "@/lib/client"
import type { DirectoryModel, SaveDirectoryPayload } from "@/lib/services"

interface AddDirectoryModalProps {
	open: boolean
	onClose: () => void
	onSuccess?: () => Promise<void> | void
	parentDirectoryId: string
	parentDirectoryName: string
	type: DirectoryModel["type"]
}

const AddDirectoryModal: FunctionComponent<AddDirectoryModalProps> = (props) => {
	const { control, reset, handleSubmit } = useForm<SaveDirectoryPayload>({
		defaultValues: {
			name: "",
			type: props.type,
		},
	})

	const submitHandler = useMutation({
		mutationFn: (data: SaveDirectoryPayload) => {
			return ClientApi.directory.create({
				...data,
				parentId: props.parentDirectoryId,
				type: props.type!,
			})
		},
		onSuccess: async () => {
			await props?.onSuccess?.()
			clear()
		},
	})

	const clear = () => {
		reset({ name: "", type: props.type })
		props.onClose()
	}

	return (
		<>
			<Modal.Root onClose={clear} open={props.open} placement={"center"} size={"sm"}>
				<Modal.Content id="form" as={"form"} onSubmit={handleSubmit((data) => submitHandler.mutate(data))}>
					<Stack>
						<Controller
							control={control}
							rules={{
								minLength: { message: "Name must be at least 2 characters", value: 2 },
								required: "This field is required",
							}}
							name="name"
							render={({ field, fieldState: { error, invalid } }) => (
								<Field.Root {...field} invalid={invalid} required>
									<Field.Label>Name</Field.Label>
									<Input w="100%" placeholder="new folder" />
									<Field.HelperText>
										<Highlight
											styles={{
												bgColor: "orange.subtle",
												color: "orange.fg",
												px: "1",
												rounded: "sm",
											}}
											query={["root"]}
										>
											{`you are going to create a new directory under ${props.parentDirectoryName || "root"} directory`}
										</Highlight>
									</Field.HelperText>
									<Field.ErrorText>{error?.message}</Field.ErrorText>
								</Field.Root>
							)}
						/>
					</Stack>

					<Modal.Actions>
						<Button onClick={clear} variant={"subtle"}>
							Cancel
						</Button>

						<Button type="submit" form="form">
							Add Directory
						</Button>
					</Modal.Actions>
				</Modal.Content>
			</Modal.Root>
		</>
	)
}

export default AddDirectoryModal
