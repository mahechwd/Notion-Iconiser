import { removeBackground } from "https://cdn.jsdelivr.net/npm/@imgly/background-removal/+esm";

const uploadedImage = sessionStorage.getItem("uploadedImage");

if (!uploadedImage) {
    window.location.href = "index.html";
}

async function processImage() {
    try {
        // Turn uploaded base64 image into Blob
        const originalImageBlob = await fetch(uploadedImage).then(function (response) {
            return response.blob();
        });

        // Remove background
        const removedBgBlob = await removeBackground(originalImageBlob);

        // Colourise all visible pixels to #d3d3d3
        const colourisedImage = await colouriseImage(removedBgBlob, "#d3d3d3");

        // Save final edited image
        sessionStorage.setItem("editedImage", colourisedImage);

        // Go to editor page
        window.location.href = "editor.html";

    } catch (error) {
        console.error("Image processing failed:", error);

        document.body.innerHTML = `
            <h1>Image processing failed</h1>
            <p>Please try another image.</p>
            <a href="index.html">Go back</a>
        `;
    }
}

async function colouriseImage(imageBlob, hexColour) {
    const imageUrl = URL.createObjectURL(imageBlob);

    const image = new Image();
    image.src = imageUrl;

    await new Promise(function (resolve, reject) {
        image.onload = resolve;
        image.onerror = reject;
    });

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    canvas.width = image.width;
    canvas.height = image.height;

    context.drawImage(image, 0, 0);

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    const rgb = hexToRgb(hexColour);

    for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3];

        // Only change visible pixels
        if (alpha > 0) {
            data[i] = rgb.r;       // Red
            data[i + 1] = rgb.g;   // Green
            data[i + 2] = rgb.b;   // Blue
            // Keep original alpha
        }
    }

    context.putImageData(imageData, 0, 0);

    return canvas.toDataURL("image/png");
}

function hexToRgb(hex) {
    const cleanHex = hex.replace("#", "");

    return {
        r: parseInt(cleanHex.substring(0, 2), 16),
        g: parseInt(cleanHex.substring(2, 4), 16),
        b: parseInt(cleanHex.substring(4, 6), 16)
    };
}

processImage();