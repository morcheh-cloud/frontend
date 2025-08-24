import {
  index,
  layout,
  type RouteConfig,
  route,
} from "@react-router/dev/routes";

export default [
  layout("./layouts/main.tsx", [
    // home
    index("pages/home.tsx"),

    // infrastructure
    route("/ansible", "./pages/ansible/index.tsx"),
  ]),

  //
] satisfies RouteConfig;
