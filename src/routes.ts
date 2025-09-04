import {
  index,
  layout,
  type RouteConfig,
  route,
} from "@react-router/dev/routes";

export default [
  layout("./layouts/main.tsx", [
    index("pages/home.tsx"),
    route("/ansible", "./pages/ansible/index.tsx"),
    route("/ansible/123", "./pages/ansible/add/indx.tsx"),
  ]),
  route("/login", "./pages/login/index.tsx"),
  route("/register", "./pages/register/index.tsx"),

  //
] satisfies RouteConfig;
