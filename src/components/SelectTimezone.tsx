"use client"

import {
	Badge,
	createListCollection,
	Portal,
	Select,
	type SelectRootProps,
} from "@chakra-ui/react"
import * as React from "react"
import { TZ_ITEMS } from "@/components/tz_items"

// Best-effort UTC offset formatter (uses modern 'shortOffset' when available)
function formatUtcOffset(tz: string) {
	try {
		const parts = new Intl.DateTimeFormat("en-US", {
			hour: "2-digit",
			minute: "2-digit",
			timeZone: tz,
			timeZoneName: "shortOffset",
		})
			.formatToParts(new Date())
			.find((p) => p.type === "timeZoneName")?.value

		// Fallback: attempt to extract something like "GMT+2"
		if (parts) return parts.replace("GMT", "")
	} catch {
		// ignore
	}
	console.log(tz)

	if (!tz) return ""

	// Basic fallback using Date difference (may reflect local offset differences)
	const now = new Date()
	const tzNow = new Date(now.toLocaleString("en-US", { timeZone: tz }))
	const diffMin = Math.round((tzNow.getTime() - now.getTime()) / 60000)
	const sign = diffMin >= 0 ? "+" : "-"
	const abs = Math.abs(diffMin)
	const hh = String(Math.floor(abs / 60)).padStart(2, "0")
	const mm = String(abs % 60).padStart(2, "0")
	return `${sign}${hh}:${mm}`
}

const tzCollection = createListCollection({
	items: TZ_ITEMS.map((it) => ({
		...it,
		display: `${it.flag} ${it.country} — ${it.timeZone}`,
	})),
	itemToString: (item) => item.display,
	itemToValue: (item) => item.timeZone,
})

interface TimezoneSelectProps
	extends Omit<
		SelectRootProps,
		"onChange" | "children" | "collection" | "value"
	> {
	value?: string
	onChange?: (tz: string | undefined) => void
	width?: string
}

const TimezoneSelect: React.FunctionComponent<TimezoneSelectProps> = (
	props,
) => {
	const {
		value: defaultTimeZone,
		onChange: onTimeZoneChange,
		width = "100%",
		...rest
	} = props

	const initial = React.useMemo(
		() => defaultTimeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
		[defaultTimeZone],
	)

	return (
		<Select.Root
			width={width}
			defaultValue={[initial]}
			onValueChange={(e) => onTimeZoneChange?.(e.value?.[0])}
			{...rest}
			collection={tzCollection}
		>
			<Select.HiddenSelect name="timeZone" />

			<Select.Control>
				<Select.Trigger>
					<Select.ValueText placeholder="Select…" />
				</Select.Trigger>
				<Select.IndicatorGroup>
					<Select.Indicator />
				</Select.IndicatorGroup>
			</Select.Control>

			<Portal>
				<Select.Positioner>
					<Select.Content>
						{tzCollection.items.map((item) => {
							const offset = formatUtcOffset(item.timeZone)
							return (
								<Select.Item item={item} key={item.timeZone}>
									<div
										style={{
											alignItems: "center",
											display: "flex",
											gap: 8,
											justifyContent: "space-between",
											width: "100%",
										}}
									>
										<span>
											{item.flag} {item.country}
										</span>

										<Badge fontSize={11} colorScheme="blue" variant="surface">
											{offset}
										</Badge>
									</div>
									<Select.ItemIndicator />
								</Select.Item>
							)
						})}
					</Select.Content>
				</Select.Positioner>
			</Portal>
		</Select.Root>
	)
}

export default TimezoneSelect
