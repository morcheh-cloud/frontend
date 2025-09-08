import { Button, Field, Input, Stack, Textarea } from "@chakra-ui/react";
import { Save, Trash } from "lucide-react";
import type { FunctionComponent } from "react";
import { Modal } from "@/components/base/Modal";
import { PasswordInput } from "@/components/snippet/password-input";

interface SaveSecreteModalProps {}

const SaveSecreteModal: FunctionComponent<SaveSecreteModalProps> = () => {
  return (
    <>
      <Modal.Root size={"md"} open onClose={() => {}}>
        <Modal.Content title="Secret">
          <Stack>
            <Field.Root>
              <Field.Label>Title</Field.Label>
              <Input />
            </Field.Root>

            <Field.Root>
              <Field.Label>Username</Field.Label>
              <Input />
            </Field.Root>

            <Field.Root>
              <Field.Label>Password</Field.Label>
              <PasswordInput />
            </Field.Root>

            <Field.Root>
              <Field.Label>Description</Field.Label>
              <Textarea />
            </Field.Root>
          </Stack>

          {/*  */}
          <Modal.Actions>
            <Button variant={"subtle"}>
              <Trash />
              cancel
            </Button>

            <Button>
              <Save />
              save
            </Button>
          </Modal.Actions>
        </Modal.Content>
      </Modal.Root>
    </>
  );
};

export default SaveSecreteModal;
