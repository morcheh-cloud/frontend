import { Box, type BoxProps, Input, InputGroup } from "@chakra-ui/react"
import type { FunctionComponent } from "react"
import { LuSearch } from "react-icons/lu"

interface SearchInputProps extends BoxProps {
	showLabel?: boolean
}

const SearchInput: FunctionComponent<SearchInputProps> = ({ showLabel, ...rest }) => {
	return (
		<>
			<Box w="100%" {...rest}>
				<InputGroup flex={1} startElement={<LuSearch />} bg={"gray.100"} rounded={"sm"}>
					<Input placeholder="Search..." outline={"none"} border={"none"} />
				</InputGroup>
			</Box>
		</>
	)
}

export default SearchInput
