import { Checkbox as ChakraCheckbox } from "@chakra-ui/react"
import * as React from "react"

export interface CheckboxProps extends ChakraCheckbox.RootProps {
	icon?: React.ReactNode
	inputProps?: React.InputHTMLAttributes<HTMLInputElement>
	rootRef?: React.RefObject<HTMLLabelElement | null>
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
	function Checkbox(props, ref) {
		const { icon, children, inputProps, rootRef, ...rest } = props
		return (
			<ChakraCheckbox.Root ref={rootRef} cursor={"pointer"} {...rest}>
				<ChakraCheckbox.HiddenInput ref={ref} {...inputProps} />
				<ChakraCheckbox.Control cursor={"pointer"}>
					{icon || <ChakraCheckbox.Indicator />}
				</ChakraCheckbox.Control>
				{children != null && (
					<ChakraCheckbox.Label fontWeight={400}>
						{children}
					</ChakraCheckbox.Label>
				)}
			</ChakraCheckbox.Root>
		)
	},
)
