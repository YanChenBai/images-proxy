import sharp from "sharp";
import { LRUCache } from "lru-cache";

export class ImageCache {
    private cache: LRUCache<string, Buffer>;

    /**
     * @param apiUrl API地址
     * @param imageFormat 图片格式
     * @param maxCacheSize 缓存最大大小 —— 默认50MB
     */
    constructor(
        apiUrl: string,
        imageFormat: keyof sharp.FormatEnum = "webp",
        maxCacheSize: number = 50 * 1024 * 1024,
    ) {
        this.cache = new LRUCache<string, Buffer>({
            maxSize: maxCacheSize,
            updateAgeOnGet: true,
            // 是否允许访问过期缓存
            allowStale: false,
            sizeCalculation: (value) => value.byteLength,
            fetchMethod: async (key, oldValue, { signal }) => {
                const [id] = this.parseKey(key);
                return await fetch(
                    `${apiUrl}/file/export?id=${id}`,
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
                        // 转换图片格式
                        sharp(buffer).toFormat(imageFormat).toBuffer()
                    );
            },
        });
    }

    stringifyKey(keys: string[]) {
        return JSON.stringify(keys);
    }

    parseKey(key: string) {
        return JSON.parse(key) as [string, string];
    }

    async get(keys: string[]) {
        const key = this.stringifyKey(keys);
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
