import type React from "react";
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";

import "./global.css";
import ThemeProvider from "@/providers/theme";

export function Layout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				{/*  */}
				<link href="https://fonts.googleapis.com" rel="preconnect" />
				<link
					crossOrigin=""
					href="https://fonts.gstatic.com"
					rel="preconnect"
				/>
				<link
					href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap"
					rel="stylesheet"
				/>

				{/*  */}
				<meta charSet="utf-8" />
				<meta
					content="width=device-width, initial-scale=1, maximum-scale=1"
					name="viewport"
				/>
				<Meta />
				<Links />
			</head>
			<body>
				<ThemeProvider>{children}</ThemeProvider>
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	);
}

export default function App() {
	return <Outlet />;
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
