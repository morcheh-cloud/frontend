import { createToaster } from "@chakra-ui/react";

export const toaster = createToaster({
  max: 5,
  pauseOnPageIdle: true,
  placement: "bottom-end",
});
