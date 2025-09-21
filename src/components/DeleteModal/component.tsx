import { Button, Icon, Stack, Text } from "@chakra-ui/react";
import { TriangleAlert } from "lucide-react";
import type { FunctionComponent } from "react";
import Caption from "@/components/base/Caption";
import { Modal } from "@/components/base/Modal";

interface DeleteDialogProps {
  message?: string;
  onSubmit?: () => void;
  onClose: () => void;
  open: boolean;
  title?: string;
  loading?: boolean;
}

const DeleteDialog: FunctionComponent<DeleteDialogProps> = (props) => {
  const close = () => {
    if (props.loading) {
      return;
    }
    props.onClose?.();
  };

  return (
    <>
      <Modal.Root
        open={props.open}
        onClose={close}
        size={"sm"}
        placement={"center"}
      >
        <Modal.Content>
          <Stack justify={"center"} alignItems={"center"}>
            <Icon
              boxSize={16}
              p={2}
              borderRadius={"lg"}
              bgColor={"red.subtle"}
              color={"fg.error"}
            >
              <TriangleAlert />
            </Icon>

            <Text fontWeight={600} textAlign={"center"} mt={2} fontSize={20}>
              {props.title || "Are you sure?"}
            </Text>

            {props.message && (
              <>
                <Caption mt={2} textAlign={"center"}>
                  {props.message}
                </Caption>
              </>
            )}

            <Button
              loading={props.loading}
              onClick={props.onSubmit}
              w="100%"
              variant={"subtle"}
              colorPalette={"red"}
              mt={4}
            >
              Delete
            </Button>
            <Button
              onClick={close}
              disabled={props.loading}
              w={"100%"}
              variant={"outline"}
            >
              Cancel
            </Button>
          </Stack>
        </Modal.Content>
      </Modal.Root>
    </>
  );
};

export default DeleteDialog;
