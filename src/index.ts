import { Hono } from "hono";
import { cors } from "hono/cors";
import { handle } from "hono/netlify";
import { csrf } from "hono/csrf";
import ConfigJson from "../config.json" assert { type: "json" };
import { etag, RETAINED_304_HEADERS } from "hono/etag";
import { serveStatic } from "hono/bun";
import { ImageCache } from "./image-cache";

const imageCache = new ImageCache(ConfigJson.API_URL, "webp");
const app = new Hono();

app.use(csrf());

app.use(
	"/image/*",
	cors({
		origin: ConfigJson.ORIGIN,
		allowMethods: [
			"GET",
			"POST",
			"OPTIONS",
		],
		exposeHeaders: [
			"Content-Type",
			"Content-Length",
			"X-Kuma-Revision",
			"Token",
		],
	}),
);

app.use(
	"*",
	etag({
		retainedHeaders: ["x-message", ...RETAINED_304_HEADERS],
	}),
);

// 图片代理
app.get("/images/:id/:name", async (c) => {
	const id = c.req.param("id");
	const name = c.req.param("name");

	const regexp = /^[0-9]+$/;
	if (!regexp.test(id) || !name) {
		return c.text("param error :(", 400);
	}

	try {
		const buffer = await imageCache.get([id, name]);

		if (!buffer) {
			throw new Error("not found :(");
		}

		return c.newResponse(buffer, 200, {
			"Content-Type": "image/webp",
		});
	} catch (error) {
		return c.text("error :(", 500);
	}
});

// 静态资源
app.use(
	"*",
	serveStatic({
		root: "./static",
		rewriteRequestPath(path) {
			// 这下路径下不需要重写路由
			if (
				path.includes("assets") ||
				path.includes("favicon.ico") ||
				path.includes("images")
			) {
				return path;
			}

			return "/";
		},
	}),
);

export default {
	fetch: handle(app),
	port: ConfigJson.PORT,
};
