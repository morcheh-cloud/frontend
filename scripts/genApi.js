import * as path from "node:path"
import * as process from "node:process"
import { generateApi } from "swagger-typescript-api"

const output = path.resolve(process.cwd(), "./src/lib")

async function main() {
	await generateApi({
		fileName: "services.ts",
		httpClientType: "axios",
		moduleNameFirstTag: true,
		output,
		sortRoutes: true,
		sortTypes: true,
		url: "http://localhost:3000/swagger-json",
	})
}

main()
