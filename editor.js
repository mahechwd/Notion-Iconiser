import { removeBackground } from "https://cdn.jsdelivr.net/npm/@imgly/background-removal/+esm";

const squareImage = document.getElementById("squareImage");
const downloadLink = document.getElementById("downloadLink");
const statusText = document.getElementById("statusText");

const uploadedImage = sessionStorage.getItem("uploadedImage");

if (!uploadedImage) {
    window.location.href = "index.html";
}

async function removeImageBackground() {
    try {
        statusText.textContent = "Removing background... this may take a moment.";

        // Convert base64 image from sessionStorage back into a Blob
        const originalImageBlob = await fetch(uploadedImage).then(function (response) {
            return response.blob();
        });

        // Remove background
        const editedImageBlob = await removeBackground(originalImageBlob);

        // Create image URL from edited result
        const editedImageUrl = URL.createObjectURL(editedImageBlob);

        squareImage.src = editedImageUrl;
        squareImage.hidden = false;

        downloadLink.href = editedImageUrl;
        downloadLink.hidden = false;

        statusText.textContent = "Background removed.";
    } catch (error) {
        console.error("Background removal error:", error);
        statusText.textContent = "Background removal failed. Please try another image.";
    }
}

removeImageBackground();