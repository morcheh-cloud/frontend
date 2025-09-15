import { Breadcrumb as ChakraBreadcrumb, type SystemStyleObject } from "@chakra-ui/react"
import * as React from "react"

export interface BreadcrumbProps extends ChakraBreadcrumb.RootProps {
	separator?: React.ReactNode
	separatorGap?: SystemStyleObject["gap"]
	items: Array<{ title?: React.ReactNode; url?: string; id?: string; icon?: React.ReactNode }>
	onItemClick?: (item: { title?: React.ReactNode; url?: string; id?: string }, index: number) => void
}

export const Breadcrumb = React.forwardRef<HTMLDivElement, BreadcrumbProps>(function BreadcrumbRoot(props, ref) {
	const { separator, separatorGap, items, onItemClick, ...rest } = props

	return (
		<ChakraBreadcrumb.Root ref={ref} {...rest}>
			<ChakraBreadcrumb.List gap={separatorGap}>
				{items.map((item, index) => {
					const last = index === items.length - 1
					const Icon = item.icon
					return (
						<React.Fragment key={index}>
							<ChakraBreadcrumb.Item cursor={"pointer"}>
								<ChakraBreadcrumb.Link
									onClick={() => {
										onItemClick?.(item, index)
									}}
								>
									{Icon}
									{item?.title}
								</ChakraBreadcrumb.Link>
							</ChakraBreadcrumb.Item>

							{!last && separator ? separator : !last && <ChakraBreadcrumb.Separator />}
						</React.Fragment>
					)
				})}
			</ChakraBreadcrumb.List>
		</ChakraBreadcrumb.Root>
	)
})
