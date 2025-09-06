import { Button, Stack } from "@chakra-ui/react";
import type { FunctionComponent } from "react";
import { Modal } from "@/components/base/Modal";

interface AddServerModalProps {
  open: boolean;
  onClose: () => void;
}

const AddServerModal: FunctionComponent<AddServerModalProps> = ({
  onClose,
  open,
}) => {
  return (
    <>
      <Modal.Root open={open} onClose={onClose}>
        <Modal.Content title="Dialog Title">
          <Stack>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua.
          </Stack>

          <Modal.Actions>
            <Button>exist</Button>
          </Modal.Actions>
        </Modal.Content>
      </Modal.Root>
    </>
  );
};

export default AddServerModal;
