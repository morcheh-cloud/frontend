import {
  Box,
  Button,
  Field,
  Heading,
  Input,
  InputGroup,
  Link,
  Stack,
  Text,
} from "@chakra-ui/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { LogIn, LucideLock, LucideMail, User } from "lucide-react";
import type { FunctionComponent } from "react";
import { Controller, useForm } from "react-hook-form";
import { NavLink, useNavigate } from "react-router";
import type { ZodType } from "zod";
import { z } from "zod";
import { PasswordInput } from "@/components/snippet/password-input";
import { ClientApi } from "@/lib/client";
import type { RegisterPayload } from "@/lib/services";

interface RegisterPageProps {}

const registerSchema: ZodType<RegisterPayload> = z
  .object({
    confirmPassword: z.string().min(8).max(32),
    email: z.email("Enter a valid email address"),
    fullName: z.string().min(3),
    password: z.string().min(8).max(32),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "confirm password is not matched",
    path: ["confirmPassword"],
  });

const RegisterPage: FunctionComponent<RegisterPageProps> = () => {
  const navigate = useNavigate();

  const registerHandler = useMutation({
    mutationFn: ({ email, password, fullName }: RegisterPayload) => {
      return ClientApi.auth.register({
        email,
        fullName,
        password,
      });
    },
    onSuccess: () => {
      navigate({
        pathname: "/home",
      });
    },
  });

  const { control, handleSubmit } = useForm<
    RegisterPayload & { confirmPassword: string }
  >({
    defaultValues: {
      confirmPassword: "",
      email: "",
      fullName: "",
      password: "",
    },
    resolver: zodResolver(registerSchema as any),
  });

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
              registerHandler.mutate(data);
            })}
          >
            <Stack gap={0}>
              <Heading size={"5xl"} fontWeight={500}>
                Morcheh
              </Heading>
              <Text fontSize={15} ml={1} opacity={0.5}>
                Sign up new account
              </Text>
            </Stack>

            <Stack gap={4} mt={6}>
              <Controller
                control={control}
                name="fullName"
                render={({ field, fieldState: { invalid, error } }) => (
                  <>
                    <Field.Root invalid={invalid}>
                      <InputGroup startElement={<User />}>
                        <Input
                          {...field}
                          placeholder="Enter your full name"
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
                        size={"xl"}
                        placeholder="Enter your password"
                      />
                    </InputGroup>
                    <Field.ErrorText>{error?.message}</Field.ErrorText>
                  </Field.Root>
                )}
              />

              <Controller
                control={control}
                name="confirmPassword"
                render={({ field, fieldState: { invalid, error } }) => (
                  <Field.Root invalid={invalid}>
                    <InputGroup startElement={<LucideLock />}>
                      <PasswordInput
                        {...field}
                        placeholder="Confirm password"
                        size={"xl"}
                      />
                    </InputGroup>
                    <Field.ErrorText>{error?.message}</Field.ErrorText>
                  </Field.Root>
                )}
              />
            </Stack>

            <Button
              type="submit"
              loading={registerHandler.isPending}
              rounded={"lg"}
              mt={6}
              size={"lg"}
              w="100%"
            >
              <LogIn />
              Sign In
            </Button>

            <Text mt={2} fontSize={15} opacity={0.7}>
              Already have an account?{" "}
              <NavLink to={"/login"}>
                <Link color={"teal.700"} variant={"underline"}>
                  Sign In
                </Link>
              </NavLink>
            </Text>
          </Stack>
        </Box>
      </Stack>
    </>
  );
};

export default RegisterPage;
