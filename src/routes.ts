import {
	index,
	layout,
	type RouteConfig,
	route,
} from "@react-router/dev/routes"

export default [
	// root
	// route("/", "./pages/root.tsx"),

	// public
	route("/login", "./pages/login/index.tsx"),
	route("/register", "./pages/register/index.tsx"),

	layout("./layouts/main/index.tsx", [
		// home page
		index("pages/home.tsx"),

		// ansible
		route("/ansible", "./pages/ansible/index.tsx"),
		route("/ansible/123", "./pages/ansible/add/indx.tsx"),
	]),
] satisfies RouteConfig
