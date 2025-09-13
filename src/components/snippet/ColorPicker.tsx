import {
	Button,
	ColorPicker,
	HStack,
	IconButton,
	Portal,
	parseColor,
	Show,
} from "@chakra-ui/react"
import { type FC, useState } from "react"
import { LuCheck, LuPlus } from "react-icons/lu"

interface ColorPickerProps {}

export const SwatchColorPicker: FC<ColorPickerProps> = () => {
	const [color, setColor] = useState(parseColor("#000"))
	const [view, setView] = useState<"picker" | "swatch">("swatch")

	const [swatches, setSwatches] = useState<string[]>([
		"#FF0000",
		"#00FF00",
		"#0000FF",
		"#FFFF00",
	])

	return (
		<ColorPicker.Root
			defaultValue={color}
			onValueChange={(e) => setColor(e.value)}
			maxW="200px"
		>
			<ColorPicker.HiddenInput />

			<ColorPicker.Control>
				<ColorPicker.Trigger data-fit-content>
					<ColorPicker.ValueSwatch h={6} w={6} />
				</ColorPicker.Trigger>
			</ColorPicker.Control>

			<Portal>
				<ColorPicker.Positioner>
					<ColorPicker.Content>
						<Show when={view === "picker"}>
							<ColorPicker.Area />
							<HStack>
								<ColorPicker.EyeDropper size="sm" variant="outline" />
								<ColorPicker.Sliders />
							</HStack>
							<Button
								onClick={() => {
									setSwatches((prev) => [...prev, color.toString("css")])
									setView("swatch")
								}}
							>
								Save Swatch
							</Button>
						</Show>

						<Show when={view === "swatch"}>
							<ColorPicker.SwatchGroup>
								{swatches.map((swatch) => (
									<ColorPicker.SwatchTrigger key={swatch} value={swatch}>
										<ColorPicker.Swatch value={swatch}>
											<ColorPicker.SwatchIndicator>
												<LuCheck />
											</ColorPicker.SwatchIndicator>
										</ColorPicker.Swatch>
									</ColorPicker.SwatchTrigger>
								))}
								<IconButton
									variant="outline"
									size="xs"
									onClick={() => setView("picker")}
								>
									<LuPlus />
								</IconButton>
							</ColorPicker.SwatchGroup>
						</Show>
					</ColorPicker.Content>
				</ColorPicker.Positioner>
			</Portal>
		</ColorPicker.Root>
	)
}
