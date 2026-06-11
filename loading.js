import { removeBackground } from "https://cdn.jsdelivr.net/npm/@imgly/background-removal/+esm";

const uploadedImage = sessionStorage.getItem("uploadedImage");

if (!uploadedImage) {
    window.location.href = "index.html";
}

async function processImage() {
    try {
        // Turn the uploaded image back into a Blob
        const originalImageBlob = await fetch(uploadedImage).then(function (response) {
            return response.blob();
        });

        // Remove background
        const editedImageBlob = await removeBackground(originalImageBlob);

        // Convert edited image into base64 so editor.html can use it
        const reader = new FileReader();

        reader.onload = function () {
            sessionStorage.setItem("editedImage", reader.result);

            // Once processing is finished, go to editor page
            window.location.href = "editor.html";
        };

        reader.readAsDataURL(editedImageBlob);

    } catch (error) {
        console.error("Background removal failed:", error);

        document.body.innerHTML = `
            <h1>Image processing failed</h1>
            <p>Please try another image.</p>
            <a href="index.html">Go back</a>
        `;
    }
}

processImage();