import {
	Box,
	Button,
	Field,
	Heading,
	HStack,
	Input,
	InputGroup,
	Link,
	Stack,
	Text,
} from "@chakra-ui/react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { LogIn, LucideLock, LucideMail } from "lucide-react"
import type { FunctionComponent } from "react"
import { Controller, useForm } from "react-hook-form"
import { NavLink } from "react-router"
import type { ZodType } from "zod"
import { z } from "zod"
import { Checkbox } from "@/components/snippet/checkbox"
import { PasswordInput } from "@/components/snippet/password-input"
import { Client } from "@/lib/client"
import type { LoginPayload } from "@/lib/services"

interface LoginPageProps {}

const loginSchema: ZodType<LoginPayload> = z
	.object({
		email: z.email("Enter a valid email address"),
		password: z
			.string()
			.min(6, "Password must be at least 8 characters")
			.max(32, "Password must be at most 32 characters"),
	})
	.strict()

const LoginPage: FunctionComponent<LoginPageProps> = () => {
	const loginHandler = useMutation({
		mutationFn: ({ email, password }: LoginPayload) => {
			return Client.auth.login({
				email,
				password,
			})
		},
	})

	const { control, handleSubmit } = useForm<LoginPayload>({
		resolver: zodResolver(loginSchema as any),
	})

	return (
		<>
			<Stack bg={"gray.100"} h={"100%"}>
				<Box
					bg={"white"}
					maxW={"lg"}
					mt={50}
					mx={"auto"}
					overflow={"hidden"}
					rounded={"lg"}
					w={"100%"}
					p={6}
				>
					<Stack
						as={"form"}
						h="100%"
						onSubmit={handleSubmit((data) => {
							loginHandler.mutate(data)
						})}
					>
						<Stack gap={0}>
							<Heading size={"5xl"} fontWeight={500}>
								Morcheh
							</Heading>
							<Text fontSize={15} ml={1} opacity={0.5}>
								Sign in to your panel
							</Text>
						</Stack>

						<Stack gap={4} mt={6}>
							<Controller
								control={control}
								name="email"
								render={({ field, fieldState: { invalid, error } }) => (
									<>
										<Field.Root invalid={invalid}>
											<InputGroup startElement={<LucideMail />}>
												<Input
													{...field}
													placeholder="Enter your email"
													size={"xl"}
												/>
											</InputGroup>
											<Field.ErrorText>{error?.message}</Field.ErrorText>
										</Field.Root>
									</>
								)}
							/>

							<Controller
								control={control}
								name="password"
								render={({ field, fieldState: { invalid, error } }) => (
									<Field.Root invalid={invalid}>
										<InputGroup startElement={<LucideLock />}>
											<PasswordInput
												{...field}
												placeholder="Enter your email"
												size={"xl"}
												type="password"
											/>
										</InputGroup>
										<Field.ErrorText>{error?.message}</Field.ErrorText>
									</Field.Root>
								)}
							/>

							<HStack mt={2} justify={"space-between"}>
								<Checkbox>Remember me</Checkbox>
								<Link fontSize={14} variant={"underline"}>
									Forger your password
								</Link>
							</HStack>
						</Stack>

						<Button
							type="submit"
							loading={loginHandler.isPending}
							rounded={"lg"}
							mt={6}
							size={"lg"}
							w="100%"
						>
							<LogIn />
							Sign In
						</Button>

						<Text mt={2} fontSize={15} opacity={0.7}>
							Don't have an Account?{" "}
							<NavLink to={"/register"}>
								<Link color={"teal.700"} variant={"underline"}>
									Sign up
								</Link>
							</NavLink>
						</Text>
					</Stack>
				</Box>
			</Stack>
		</>
	)
}

export default LoginPage
