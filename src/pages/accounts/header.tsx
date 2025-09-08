import { Heading, HStack } from "@chakra-ui/react";
import type { FunctionComponent } from "react";

interface SecretHeaderProps {}

const SecretHeader: FunctionComponent<SecretHeaderProps> = () => {
  return (
    <>
      <HStack
        p={2}
        px={4}
        borderBottom={1}
        borderStyle={"solid"}
        borderColor={"gray.200"}
      >
        <Heading size={"xl"}>Secret manager</Heading>
      </HStack>
    </>
  );
};

export default SecretHeader;
