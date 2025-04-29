import sharp from "sharp";
import { LRUCache } from "lru-cache";

export class ImageCache {
    private cache: LRUCache<string, Buffer>;

    constructor(
        apiUrl: string,
        imageFormat: keyof sharp.FormatEnum = "webp",
        maxCacheSize: number = 50 * 1024 * 1024,
    ) {
        this.cache = new LRUCache<string, Buffer>({
            maxSize: maxCacheSize,
            updateAgeOnGet: true,
            allowStale: false,
            sizeCalculation: (value) => value.byteLength,
            fetchMethod: async (key, oldValue, { signal }) => {
                return await fetch(
                    `${apiUrl}/file/export?id=${key}`,
                    { method: "POST", signal },
                )
                    .then((res) => res.arrayBuffer())
                    .then((buffer) => {
                        if (buffer.byteLength === 0) {
                            throw new Error("not found :(");
                        }

                        return buffer;
                    })
                    .then((buffer) =>
                        sharp(buffer).toFormat(imageFormat).toBuffer()
                    );
            },
        });
    }

    async get(key: string) {
        const cached = this.cache.get(key);

        if (cached) {
            return cached;
        }

        const buffer = await this.cache.fetch(key);

        // 缓存图片
        this.cache.set(key, buffer);

        return buffer;
    }
}
