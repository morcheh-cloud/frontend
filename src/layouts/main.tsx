import Navbar from "@/layouts/Navbar";
import { Box } from "@chakra-ui/react";
import type { FunctionComponent } from "react";

interface MainLayoutProps {}

const MainLayout: FunctionComponent<MainLayoutProps> = () => {
  return (
    <>
      <Box>
        <Navbar />
      </Box>
    </>
  );
};

export default MainLayout;
