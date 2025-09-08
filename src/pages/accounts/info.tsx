import { Avatar, Heading, HStack, Stack, Tabs } from "@chakra-ui/react";
import type { FunctionComponent } from "react";
import Caption from "@/components/base/Caption";

interface SecretInfoProps {}

const SecretInfo: FunctionComponent<SecretInfoProps> = () => {
  return (
    <>
      <Stack
        h={"100%"}
        borderLeft={1}
        borderStyle={"solid"}
        borderColor={"gray.200"}
      >
        <HStack p={4} px={6}>
          <Avatar.Root colorPalette={"teal"} rounded={"lg"} size={"2xl"}>
            <Avatar.Fallback name="Ali Marefati" />
            <Avatar.Image
              rounded={"lg"}
              src="https://avatars.githubusercontent.com/u/24681192?v=4"
              objectFit={"cover"}
            />
          </Avatar.Root>

          <Stack gap={0}>
            <Heading size={"lg"} lineClamp={1}>
              Pass bolt
            </Heading>
            <Caption fontSize={12} lineClamp={1}>
              A secure and open-source password manager for individuals and
              teams.
            </Caption>
          </Stack>
        </HStack>

        <Tabs.Root defaultValue={"details"} w={"full"}>
          <Tabs.List w="full">
            <Tabs.Trigger w={"full"} value="details" justifyContent={"center"}>
              Details
            </Tabs.Trigger>
            <Tabs.Trigger
              disabled
              w="full"
              value="Activity"
              textAlign={"center"}
              justifyContent={"center"}
            >
              Activity
            </Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="1">ali</Tabs.Content>
        </Tabs.Root>
      </Stack>
    </>
  );
};

export default SecretInfo;
