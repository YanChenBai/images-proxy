import { Hono } from "hono";
import { cors } from "hono/cors";
import { cache } from "hono/cache";
import { handle } from "hono/netlify";
import sharp from "sharp";
import ConfigJson from "../config.json" assert { type: "json" };

const app = new Hono();

app.get("/", (c) => c.text("Hello Bun!"));

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

app.get(
	"/image/*",
	cache({
		cacheName: "images",
		cacheControl: "public, max-age=604800, must-revalidate",
	}),
);

app.post(
	"/v1/*",
	cache({
		cacheName: "api-proxy",
		cacheControl: "public",
	}),
);

const { API_URL } = ConfigJson;
const imageCache = new Map();

app.get("/images/:id", async (c) => {
	const id = c.req.param("id");

	const regexp = /^[0-9]+$/;
	if (!regexp.test(id)) {
		return c.text("param error :(", 400);
	}

	const cache = imageCache.get(id);

	// 缓存
	if (cache) {
		return c.newResponse(cache, 200, {
			"Content-Type": "image/webp",
		});
	}

	try {
		// 获取图片
		const resp = await fetch(`${API_URL}/file/export?id=${id}`, {
			method: "POST",
		});

		const data = await resp.arrayBuffer();

		// 图片不存在
		if (data.byteLength === 0) {
			return c.text("not found :(", 404);
		}

		// 转换图片
		const images = await sharp(data).toFormat("webp").toBuffer();

		// 缓存图片
		imageCache.set(id, images);

		return c.newResponse(images, 200, {
			"Content-Type": "image/webp",
		});
	} catch (error) {
		return c.text("error :(", 500);
	}
});

export default {
	fetch: handle(app),
};
