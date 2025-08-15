import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  index("pages/home.tsx"),
  layout("./layouts/main.tsx", [
    // home
  ]),

  //
] satisfies RouteConfig;
