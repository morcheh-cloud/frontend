"use client";

import { Box, GridItem, SimpleGrid } from "@chakra-ui/react";
import { type FunctionComponent, lazy } from "react";
import SecretHeader from "@/pages/accounts/header";
import SecretInfo from "@/pages/accounts/info";
import SecretsSidebar from "@/pages/accounts/Sidebar";
import SecretTable from "@/pages/accounts/table";

const SaveSecreteModal = lazy(
  () => import("@/pages/accounts/SaveSecreteModal")
);

const sidebarColspan = 4;
const informationColspan = 5;
const columns = 24;
const tableColSpan = columns - sidebarColspan - informationColspan;

interface AccountPageProps {}

const AccountPage: FunctionComponent<AccountPageProps> = () => {
  return (
    <>
      {/* <SaveSecreteModal /> */}

      <Box h={"100%"}>
        <SecretHeader />

        <SimpleGrid h={"100%"} columns={24}>
          <GridItem
            colSpan={sidebarColspan}
            borderRight={"1px solid"}
            borderColor={"gray.200"}
          >
            <SecretsSidebar />
          </GridItem>

          <GridItem colSpan={tableColSpan}>
            <SecretTable />
          </GridItem>

          <GridItem colSpan={informationColspan}>
            <SecretInfo />
          </GridItem>
        </SimpleGrid>
      </Box>
    </>
  );
};

export default AccountPage;
