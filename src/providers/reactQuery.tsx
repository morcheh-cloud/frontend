import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { FunctionComponent, ReactNode } from "react"
import { toaster } from "@/lib/toaster"

interface ReactQueryProviderProps {
	children: ReactNode
}

const ReactQueryProvider: FunctionComponent<ReactQueryProviderProps> = ({
	children,
}) => {
	const queryClient = new QueryClient({
		defaultOptions: {
			mutations: {
				onError: (err) => {
					const message = (err as any)?.response?.data?.message
					console.log("🚀 ~ ReactQueryProvider ~ err:", err)
					toaster.error({
						title: message || err.message,
						type: "error",
					})
				},
			},
			queries: {
				refetchOnWindowFocus: false,
			},
		},
	})

	return (
		<>
			<QueryClientProvider client={queryClient}>
				{children}
				{/* <ReactQueryDevtools initialIsOpen={false} /> */}
			</QueryClientProvider>
		</>
	)
}

export default ReactQueryProvider
