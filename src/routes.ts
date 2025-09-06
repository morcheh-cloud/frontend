import {
	index,
	layout,
	type RouteConfig,
	route,
} from "@react-router/dev/routes"

export default [
	// root
	index("pages/index.tsx"),

	// public
	route("/login", "./pages/login/index.tsx"),
	route("/register", "./pages/register/index.tsx"),

	layout("./layouts/main/index.tsx", [
		// home page
		route("/home", "./pages/home/index.tsx"),

		// ansible
		route("/ansible", "./pages/ansible/index.tsx"),
		route("/ansible/:id", "./pages/ansible/add/index.tsx"),
		route("/ansible/job/:id", "./pages/ansible/job/index.tsx"),

		// servers
		route("/servers", "./pages/servers/overview/index.tsx"),
		route("/servers/list", "./pages/servers/list/index.tsx"),
		route("/servers/graph", "./pages/servers/graph/index.tsx"),
	]),
] satisfies RouteConfig
