const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export const config = {
    api: {
        bodyParser: false
    }
};

export default async function handler(request, response) {
    if (request.method !== "POST") {
        response.setHeader("Allow", "POST");
        return response.status(405).json({ error: "Method not allowed." });
    }

    const contentType = request.headers["content-type"]?.split(";", 1)[0].toLowerCase();
    if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
        return response.status(415).json({ error: "Upload a JPEG, PNG, or WebP image." });
    }

    const contentLength = Number(request.headers["content-length"]);
    if (Number.isFinite(contentLength) && contentLength > MAX_UPLOAD_BYTES) {
        return response.status(413).json({ error: "The image must be 10 MB or smaller." });
    }

    const apiUrl = process.env.BIREFNET_API_URL;
    const apiSecret = process.env.BIREFNET_API_SECRET;
    if (!apiUrl || !apiSecret) {
        console.error("Missing BIREFNET_API_URL or BIREFNET_API_SECRET.");
        return response.status(500).json({ error: "The image service is not configured." });
    }

    try {
        const imageBytes = await readRequestBody(request);
        const formData = new FormData();
        formData.append("image", new Blob([imageBytes], { type: contentType }), "upload");

        const upstreamResponse = await fetch(
            `${apiUrl.replace(/\/$/, "")}/remove-background`,
            {
                method: "POST",
                headers: { "X-API-Key": apiSecret },
                body: formData
            }
        );

        if (!upstreamResponse.ok) {
            const detail = await upstreamResponse.text();
            console.error(`BiRefNet returned ${upstreamResponse.status}: ${detail}`);
            return response.status(upstreamResponse.status).json({ error: "Background removal failed." });
        }

        const result = Buffer.from(await upstreamResponse.arrayBuffer());
        response.setHeader("Content-Type", "image/png");
        response.setHeader("Cache-Control", "no-store");
        return response.status(200).send(result);
    } catch (error) {
        if (error instanceof UploadTooLargeError) {
            return response.status(413).json({ error: "The image must be 10 MB or smaller." });
        }

        console.error("Background-removal proxy failed:", error);
        return response.status(502).json({ error: "The image service is unavailable." });
    }
}

async function readRequestBody(request) {
    const chunks = [];
    let totalBytes = 0;

    for await (const chunk of request) {
        totalBytes += chunk.length;
        if (totalBytes > MAX_UPLOAD_BYTES) {
            throw new UploadTooLargeError();
        }
        chunks.push(chunk);
    }

    return Buffer.concat(chunks);
}

class UploadTooLargeError extends Error {}
