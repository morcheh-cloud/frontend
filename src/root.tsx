import type React from "react"
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router"

import "./global.css"
import { Toaster } from "@/components/snippet/toaster"
import HtmlHeader from "@/HtmlHeader"
import AppProviders from "@/providers"

export function Layout({ children }: { children: React.ReactNode }) {
	return (
		<html dir="ltr" lang="en">
			<head>
				<HtmlHeader />
				<Meta />
				<Links />
			</head>

			<body>
				<AppProviders>
					{/* content */}
					{children}
					<Toaster />
				</AppProviders>
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	)
}

export default function App() {
	return <Outlet />
}

// export function ErrorBoundary() {
//   let message = "Oops!";
//   let details = "An unexpected error occurred.";
//   let stack: string | undefined;

//   if (isRouteErrorResponse(error)) {
//     message = error.status === 404 ? "404" : "Error";
//     details =
//       error.status === 404
//         ? "The requested page could not be found."
//         : error.statusText || details;
//   } else if (import.meta.env.DEV && error && error instanceof Error) {
//     details = error.message;
//     stack = error.stack;
//   }

//   return <div>error</div>;

//   // return (
//   //   <Container component="main" pt="xl" p="md" mx="auto">
//   //     <Title>{message}</Title>
//   //     <Text>{details}</Text>
//   //     {stack && (
//   //       <Box component="pre" w="100%" style={{ overflowX: "auto" }} p="md">
//   //         <Code>{stack}</Code>
//   //       </Box>
//   //     )}
//   //   </Container>
//   // );
// }
