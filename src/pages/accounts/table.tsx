import { Box, HStack, IconButton, Table, Text } from "@chakra-ui/react";
import {
  Copy,
  Edit,
  FolderDownIcon,
  GripVertical,
  Share2,
  Trash,
} from "lucide-react";
import type { FunctionComponent } from "react";

interface SecretTableProps {}

const pass = "••••••••";

const SecretTable: FunctionComponent<SecretTableProps> = () => {
  return (
    <>
      <Box>
        <HStack mt={2} mx={2} bg={"gray.100"} p={2} px={4} rounded={"lg"}>
          {/*  */}

          <HStack mr={"auto"}>
            <Text>Inventory</Text>
            <IconButton variant={"ghost"} size={"xs"}>
              <FolderDownIcon />
            </IconButton>
          </HStack>

          <Text mr={2} fontSize={14}>
            3 selected
          </Text>

          <IconButton variant={"ghost"} size={"xs"}>
            <Share2 />
          </IconButton>

          <IconButton variant={"ghost"} size={"xs"}>
            <Copy />
          </IconButton>

          <IconButton variant={"ghost"} size={"xs"}>
            <Trash />
          </IconButton>
        </HStack>

        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Title</Table.ColumnHeader>
              <Table.ColumnHeader>Username</Table.ColumnHeader>
              <Table.ColumnHeader>Password</Table.ColumnHeader>
              <Table.ColumnHeader>URI</Table.ColumnHeader>
              <Table.ColumnHeader>Expire</Table.ColumnHeader>

              {/*  */}
              <Table.ColumnHeader />
            </Table.Row>
          </Table.Header>

          <Table.Body>
            <Table.Row>
              <Table.Cell p={1} px={2}>
                server1
              </Table.Cell>
              <Table.Cell p={1} px={2}>
                admin
              </Table.Cell>
              <Table.Cell p={1} px={2} fontSize={24}>
                <HStack>{pass}</HStack>
              </Table.Cell>
              <Table.Cell p={1} px={2}>
                127.0.0.1
              </Table.Cell>
              <Table.Cell p={1} px={2}>
                -
              </Table.Cell>

              {/* actions */}
              <Table.Cell p={1} px={2} textAlign={"right"}>
                <IconButton variant={"ghost"} size={"xs"}>
                  <Edit />
                </IconButton>

                <IconButton cursor={"grab"} variant={"ghost"} size={"xs"}>
                  <GripVertical />
                </IconButton>
              </Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table.Root>
      </Box>
    </>
  );
};

export default SecretTable;
