import {
  Badge,
  FormatByte,
  Group,
  Heading,
  HStack,
  Icon,
  IconButton,
  Stack,
  Status,
  Text,
} from "@chakra-ui/react";
import {
  Cpu,
  EllipsisVertical,
  HardDrive,
  MemoryStick,
  PcCase,
  Terminal,
} from "lucide-react";
import type { FunctionComponent } from "react";
import Caption from "@/components/base/Caption";

interface ServerCardProps {}

const ServerCard: FunctionComponent<ServerCardProps> = () => {
  return (
    <>
      <Stack
        _hover={{
          borderColor: "black",
        }}
        border={"1px solid"}
        borderColor={"gray.200"}
        borderRadius={8}
        cursor={"pointer"}
        gap={0}
        py={4}
      >
        <HStack alignItems={"start"} pl={4} pr={2}>
          <Stack gap={1}>
            <Heading size={"md"} fontWeight={500} lineClamp={1}>
              Production
            </Heading>
            <Caption fontSize={13}>192.168.1.1</Caption>
          </Stack>

          <IconButton
            ml={"auto"}
            rounded={"full"}
            variant={"ghost"}
            size={"sm"}
          >
            <EllipsisVertical />
          </IconButton>
        </HStack>

        <HStack mt={6} px={4}>
          <Icon size={"sm"}>
            <PcCase />
          </Icon>
          <Text fontSize={14}>Ubuntu 22.04</Text>

          <Badge ml={"auto"} variant={"plain"} colorPalette={"teal"}>
            <Status.Root fontSize={13} fontWeight={500}>
              <Status.Indicator />
              online
            </Status.Root>
          </Badge>
        </HStack>

        <HStack px={4} mt={2.5} justify={"space-between"}>
          <Group gap={1}>
            <Text>16</Text>
            <Icon size={"md"}>
              <Cpu />
            </Icon>
          </Group>

          <Group gap={2}>
            <FormatByte value={400000000} />
            <Icon size={"md"}>
              <HardDrive />
            </Icon>
          </Group>

          <Group gap={1}>
            <FormatByte value={16000000000} />
            <Icon size={"md"}>
              <MemoryStick />
            </Icon>
          </Group>

          <Group gap={1}>
            <Icon size={"md"}>
              <Terminal />
            </Icon>
            <Text>ssh</Text>
          </Group>
        </HStack>
      </Stack>
    </>
  );
};

export default ServerCard;
