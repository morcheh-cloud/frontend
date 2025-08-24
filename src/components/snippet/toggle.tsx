"use client";

import type { ButtonProps } from "@chakra-ui/react";
import {
	Button,
	Toggle as ChakraToggle,
	useToggleContext,
} from "@chakra-ui/react";
import * as React from "react";

interface ToggleProps extends ChakraToggle.RootProps {
	variant?: keyof typeof variantMap;
	size?: ButtonProps["size"];
}

const variantMap = {
	ghost: { off: "ghost", on: "subtle" },
	solid: { off: "outline", on: "solid" },
	subtle: { off: "ghost", on: "subtle" },
	surface: { off: "outline", on: "surface" },
} as const;

export const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
	function Toggle(props, ref) {
		const { variant = "subtle", size, children, ...rest } = props;
		const variantConfig = variantMap[variant];

		return (
			<ChakraToggle.Root asChild {...rest}>
				<ToggleBaseButton ref={ref} size={size} variant={variantConfig}>
					{children}
				</ToggleBaseButton>
			</ChakraToggle.Root>
		);
	},
);

interface ToggleBaseButtonProps extends Omit<ButtonProps, "variant"> {
	variant: Record<"on" | "off", ButtonProps["variant"]>;
}

const ToggleBaseButton = React.forwardRef<
	HTMLButtonElement,
	ToggleBaseButtonProps
>(function ToggleBaseButton(props, ref) {
	const toggle = useToggleContext();
	const { variant, ...rest } = props;
	return (
		<Button
			ref={ref}
			variant={toggle.pressed ? variant.on : variant.off}
			{...rest}
		/>
	);
});

export const ToggleIndicator = ChakraToggle.Indicator;
