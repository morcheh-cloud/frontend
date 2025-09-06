import {
  CloseButton,
  Dialog,
  type DialogRootProps,
  Portal,
} from "@chakra-ui/react";
import type { ReactNode } from "react";

interface ModalRootProps extends DialogRootProps {
  children: ReactNode;
  open?: boolean;
  onClose?: () => void;
}

interface ModalContentProps {
  title?: string;
  children: ReactNode;
}

interface ModalActionsProps {
  children: ReactNode;
}

const ModalRoot = ({ children, open, onClose, ...rest }: ModalRootProps) => {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={onClose}
      scrollBehavior={"inside"}
      {...rest}
    >
      {children}
    </Dialog.Root>
  );
};

const ModalContent = ({ title, children }: ModalContentProps) => {
  return (
    <Portal>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content>
          {/*  */}
          <Dialog.Header>
            {title && <Dialog.Title>{title}</Dialog.Title>}
          </Dialog.Header>
          <Dialog.Body>{children}</Dialog.Body>

          {/*  */}
          <Dialog.CloseTrigger asChild>
            <CloseButton size="sm" />
          </Dialog.CloseTrigger>
        </Dialog.Content>
      </Dialog.Positioner>
    </Portal>
  );
};

const ModalActions = ({ children }: ModalActionsProps) => {
  return (
    <Dialog.Footer p={0} mt={8}>
      {children}
    </Dialog.Footer>
  );
};

export const Modal = {
  Actions: ModalActions,
  Content: ModalContent,
  Root: ModalRoot,
};
