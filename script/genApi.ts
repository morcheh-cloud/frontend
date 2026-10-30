import path from "node:path"

import { generateApi } from "swagger-typescript-api"

// Generates a typed fetch client from the backend's OpenAPI spec into
// src/lib/services.ts. Run with `pnpm gen:api` while the backend is up.
// Don't edit the output by hand; use the configured instance `api` from
// src/lib/api.ts.
const url = process.env.OPENAPI_URL ?? "http://localhost:8080/openapi.json"

await generateApi({
  output: path.resolve(process.cwd(), "./src/lib"),
  fileName: "services.ts",
  url,
  httpClientType: "fetch",
  // Methods resolve to the response body instead of a Response wrapper.
  unwrapResponseData: true,
  sortTypes: true,
  sortRoutes: true,
  // Group endpoints by their first tag: api.system.getHealth().
  moduleNameFirstTag: true,
})
