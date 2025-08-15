import { Stack } from "@chakra-ui/react";
import type { MetaArgs } from "react-router";

export function meta({}: MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home() {
  return (
    <>
      <Stack bg={"teal.400"}>hi chekra</Stack>
    </>
  );
}
