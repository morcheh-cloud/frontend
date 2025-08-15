import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  // home
  index("pages/home.tsx"),

  // main layout
  // layout("./layouts/main/index.tsx", [
  //   //
  //   route("test", "./pages/test.tsx"),
  // ]),

  //
] satisfies RouteConfig;
