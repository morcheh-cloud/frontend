import {
  CloseButton,
  HStack,
  IconButton,
  SimpleGrid,
  Stack,
  Text,
} from "@chakra-ui/react";
import {
  Download,
  EllipsisVertical,
  FolderInput,
  Grid2X2,
  ListTree,
  Plus,
  Trash,
  UserPlus,
} from "lucide-react";
import { type FunctionComponent, useState } from "react";
import PageContainer from "@/components/base/PageContainer";
import PageHeader from "@/components/base/PageHeader";
import Folder from "@/components/Folder";
import { Tooltip } from "@/components/snippet/tooltip";
import AddServerModal from "@/pages/servers/list/AddServerModal";
import ServerCard from "@/pages/servers/list/ServerCard";

interface ServerListPageProps {}

const ServerListPage: FunctionComponent<ServerListPageProps> = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <AddServerModal open={open} onClose={() => setOpen(false)} />

      <PageContainer>
        <PageHeader title="Servers" description="Manage your servers">
          <IconButton variant={"ghost"}>
            <Grid2X2 />
          </IconButton>

          <IconButton variant={"ghost"}>
            <ListTree />
          </IconButton>

          <IconButton onClick={() => setOpen(true)} variant={"ghost"}>
            <Plus />
          </IconButton>
        </PageHeader>

        <Stack h={"100%"} mt={8} gap={4}>
          {/*  */}
          <HStack rounded={"xl"} bgColor={"gray.100"} py={1} px={2} gap={2}>
            <CloseButton
              colorPalette={"red"}
              mr={2}
              rounded={"full"}
              size={"xs"}
            />

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
          <SimpleGrid autoColumns={4} columns={4} gap={4}>
            {new Array(6).fill(0).map((_, i) => {
              return <Folder key={i} />;
            })}
          </SimpleGrid>

          <SimpleGrid minChildWidth={"xs"} columns={4} gap={4}>
            {new Array(6).fill(0).map((_, i) => {
              return <ServerCard key={i} />;
            })}
          </SimpleGrid>
        </Stack>
      </PageContainer>
    </>
  );
};

export default ServerListPage;
