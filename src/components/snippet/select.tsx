"use client";

import {
  Select,
  type SelectItemProps,
  type SelectRootProps,
} from "@chakra-ui/react";
import type { FunctionComponent } from "react";

interface AppSelectProps extends SelectRootProps {
  title?: string;
  placeholder?: string;
}

const AppSelectRoot: FunctionComponent<AppSelectProps> = ({
  children,
  placeholder,
  title,
  ...rest
}) => {
  return (
    <Select.Root {...rest}>
      <Select.HiddenSelect />
      <Select.Label>{title || ""}</Select.Label>
      <Select.Control>
        <Select.Trigger>
          <Select.ValueText placeholder={placeholder} />
        </Select.Trigger>
        <Select.IndicatorGroup>
          <Select.Indicator />
        </Select.IndicatorGroup>
      </Select.Control>
      <Select.Positioner>
        <Select.Content>{children}</Select.Content>
      </Select.Positioner>
    </Select.Root>
  );
};

interface AppSelectItemProps extends SelectItemProps {}

const AppSelectItem: FunctionComponent<AppSelectItemProps> = ({
  children,
  ...rest
}) => {
  return (
    <>
      <Select.Item {...rest}>
        {children}
        <Select.ItemIndicator />
      </Select.Item>
    </>
  );
};

export const AppSelect = {
  Item: AppSelectItem,
  Root: AppSelectRoot,
};
