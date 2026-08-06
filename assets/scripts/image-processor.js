export class ImageValidationError extends Error {
    constructor(code, message) {
        super(message);
        this.name = "ImageValidationError";
        this.code = code;
    }
}

export async function validateAndReadImage(file) {
    if (!file?.type.startsWith("image/")) {
        throw new ImageValidationError("invalid-type", "The selected file is not an image.");
    }

    let dataUrl;

    try {
        dataUrl = await readFileAsDataUrl(file);
    } catch {
        throw new ImageValidationError("unreadable", "The image file could not be read.");
    }
    const dimensions = await readImageDimensions(dataUrl);

    if (dimensions.width !== dimensions.height) {
        throw new ImageValidationError("invalid-shape", "The selected image is not square.");
    }

    return dataUrl;
}

export async function createIcon(dataUrl, colour, onStageChange) {
    const sourceBlob = await fetch(dataUrl).then((response) => response.blob());
    const response = await fetch("/api/remove-background", {
        method: "POST",
        headers: { "Content-Type": sourceBlob.type },
        body: sourceBlob
    });

    if (!response.ok) {
        throw new Error(`Background removal failed with status ${response.status}.`);
    }

    const transparentBlob = await response.blob();

    onStageChange("colourise");
    return colouriseVisiblePixels(transparentBlob, colour);
}

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

function readImageDimensions(source) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
        image.onerror = () => reject(new ImageValidationError("unreadable", "The image could not be decoded."));
        image.src = source;
    });
}

async function colouriseVisiblePixels(imageBlob, hexColour) {
    const imageUrl = URL.createObjectURL(imageBlob);

    try {
        const image = await loadImage(imageUrl);
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (!context) {
            throw new Error("Canvas rendering is not supported by this browser.");
        }

        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        context.drawImage(image, 0, 0);

        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;
        const colour = hexToRgb(hexColour);

        for (let index = 0; index < pixels.length; index += 4) {
            if (pixels[index + 3] > 0) {
                pixels[index] = colour.red;
                pixels[index + 1] = colour.green;
                pixels[index + 2] = colour.blue;
            }
        }

        context.putImageData(imageData, 0, 0);
        return canvas.toDataURL("image/png");
    } finally {
        URL.revokeObjectURL(imageUrl);
    }
}

function loadImage(source) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("The processed image could not be decoded."));
        image.src = source;
    });
}

function hexToRgb(hexColour) {
    const value = hexColour.replace("#", "");

    if (!/^[\da-f]{6}$/i.test(value)) {
        throw new TypeError(`Invalid six-digit hex colour: ${hexColour}`);
    }

    return {
        red: Number.parseInt(value.slice(0, 2), 16),
        green: Number.parseInt(value.slice(2, 4), 16),
        blue: Number.parseInt(value.slice(4, 6), 16)
    };
}
