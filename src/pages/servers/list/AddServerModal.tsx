import {
  Button,
  createListCollection,
  Field,
  GridItem,
  Highlight,
  Input,
  NumberInput,
  SimpleGrid,
  Textarea,
} from "@chakra-ui/react";
import type { FunctionComponent } from "react";
import { Modal } from "@/components/base/Modal";
import { PasswordInput } from "@/components/snippet/password-input";
import { AppSelect } from "@/components/snippet/select";

interface AddServerModalProps {
  open: boolean;
  onClose: () => void;
}

const protocols = createListCollection({
  items: [
    { label: "ssh", value: "ssh" },
    { label: "vnc", value: "vnc" },
    { label: "rdp", value: "rdp" },
  ],
});

const AddServerModal: FunctionComponent<AddServerModalProps> = ({
  onClose,
  open,
}) => {
  const clear = () => {
    onClose();
  };

  return (
    <>
      <Modal.Root open={open} onClose={clear}>
        <Modal.Content title="Add new server">
          <SimpleGrid columns={12} columnGap={2} rowGap={4}>
            {/* name */}
            <GridItem colSpan={8}>
              <Field.Root>
                <Field.Label>Name</Field.Label>
                <Input placeholder="my server" />
              </Field.Root>
            </GridItem>

            {/* protocol */}
            <GridItem colSpan={4}>
              <AppSelect.Root title="Protocol" collection={protocols}>
                {protocols.items.map((item) => (
                  <AppSelect.Item key={item.value} item={item}>
                    {item.label}
                  </AppSelect.Item>
                ))}
              </AppSelect.Root>
            </GridItem>

            {/* address */}
            <GridItem colSpan={8}>
              <Field.Root>
                <Field.Label>Address</Field.Label>
                <Input placeholder="192.168.1.101" />
              </Field.Root>
            </GridItem>

            {/* port */}
            <GridItem colSpan={4}>
              <Field.Root>
                <Field.Label>Port</Field.Label>
                <NumberInput.Root defaultValue={"22"} min={1}>
                  <NumberInput.Control />
                  <NumberInput.Input />
                </NumberInput.Root>
              </Field.Root>
            </GridItem>

            {/* username */}
            <GridItem colSpan={12}>
              <Field.Root>
                <Field.Label>username</Field.Label>
                <Input placeholder="root" />
              </Field.Root>
            </GridItem>

            {/* username */}
            <GridItem colSpan={12}>
              <Field.Root>
                <Field.Label>password</Field.Label>
                <PasswordInput placeholder="123456789" />
              </Field.Root>
            </GridItem>

            {/* description */}
            <GridItem colSpan={12}>
              <Field.Root>
                <Field.Label>Description</Field.Label>
                <Textarea
                  autoresize
                  minH={100}
                  maxH={200}
                  placeholder="any note here"
                />
              </Field.Root>
            </GridItem>
          </SimpleGrid>

          <Highlight query={[]}>you are adding</Highlight>

          <Modal.Actions>
            <Button onClick={clear} variant={"surface"}>
              cancel
            </Button>

            <Button>save</Button>
          </Modal.Actions>
        </Modal.Content>
      </Modal.Root>
    </>
  );
};

export default AddServerModal;
