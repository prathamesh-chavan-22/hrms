import { createRequestHandler, RouterContextProvider } from "react-router";

declare module "react-router" {
	export interface AppLoadContext {
		cloudflare: {
			env: Env;
			ctx: ExecutionContext;
		};
	}
}

const requestHandler = createRequestHandler(
	() => import("virtual:react-router/server-build"),
	import.meta.env.MODE,
);

function createLoadContext(env: Env, ctx: ExecutionContext) {
	const loadContext = new RouterContextProvider();
	Object.assign(loadContext, { cloudflare: { env, ctx } } satisfies AppLoadContext);
	return loadContext;
}

export default {
	fetch(request, env, ctx) {
		return requestHandler(request, createLoadContext(env, ctx));
	},
} satisfies ExportedHandler<Env>;
