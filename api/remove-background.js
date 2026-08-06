const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const REQUEST_TIMEOUT_MS = 240_000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_REQUESTS = 10;
const MAX_RATE_LIMIT_ENTRIES = 10_000;
const RETRYABLE_STATUSES = new Set([502, 503, 504]);
const rateLimits = new Map();

export const maxDuration = 300;

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

    const clientAddress = getClientAddress(request);
    const rateLimit = consumeRateLimit(clientAddress);
    response.setHeader("X-RateLimit-Limit", String(RATE_LIMIT_REQUESTS));
    response.setHeader("X-RateLimit-Remaining", String(rateLimit.remaining));

    if (!rateLimit.allowed) {
        response.setHeader("Retry-After", String(rateLimit.retryAfterSeconds));
        return response.status(429).json({ error: "Too many requests. Please try again shortly." });
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
        const upstreamResponse = await callBiRefNet(apiUrl, apiSecret, imageBytes, contentType);

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

        if (error?.name === "AbortError") {
            return response.status(504).json({ error: "Background removal timed out. Please try again." });
        }

        console.error("Background-removal proxy failed:", error);
        return response.status(502).json({ error: "The image service is unavailable." });
    }
}

async function callBiRefNet(apiUrl, apiSecret, imageBytes, contentType) {
    let upstreamResponse;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        for (let attempt = 0; attempt < 2; attempt += 1) {
            const formData = new FormData();
            formData.append("image", new Blob([imageBytes], { type: contentType }), "upload");

            upstreamResponse = await fetch(
                `${apiUrl.replace(/\/$/, "")}/remove-background`,
                {
                    method: "POST",
                    headers: { "X-API-Key": apiSecret },
                    body: formData,
                    signal: controller.signal
                }
            );

            if (!RETRYABLE_STATUSES.has(upstreamResponse.status) || attempt === 1) {
                return upstreamResponse;
            }

            await wait(1_500);
        }
    } finally {
        clearTimeout(timeout);
    }

    return upstreamResponse;
}

function getClientAddress(request) {
    const forwardedAddress = request.headers["x-forwarded-for"];
    const firstForwardedAddress = Array.isArray(forwardedAddress)
        ? forwardedAddress[0]
        : forwardedAddress?.split(",", 1)[0];

    return firstForwardedAddress?.trim() || request.socket?.remoteAddress || "unknown";
}

function consumeRateLimit(key) {
    const now = Date.now();

    if (rateLimits.size >= MAX_RATE_LIMIT_ENTRIES) {
        for (const [storedKey, entry] of rateLimits) {
            if (entry.resetAt <= now) rateLimits.delete(storedKey);
        }

        if (rateLimits.size >= MAX_RATE_LIMIT_ENTRIES) {
            rateLimits.delete(rateLimits.keys().next().value);
        }
    }

    const existing = rateLimits.get(key);
    const entry = !existing || existing.resetAt <= now
        ? { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS }
        : existing;

    entry.count += 1;
    rateLimits.set(key, entry);

    return {
        allowed: entry.count <= RATE_LIMIT_REQUESTS,
        remaining: Math.max(0, RATE_LIMIT_REQUESTS - entry.count),
        retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000))
    };
}

function wait(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
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
