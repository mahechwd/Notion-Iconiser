import { removeBackground } from "https://cdn.jsdelivr.net/npm/@imgly/background-removal/+esm";

const uploadButton = document.getElementById("uploadButton");
const imageInput = document.getElementById("imageInput");
const errorMessage = document.getElementById("errorMessage");
const uploadPrompt = document.getElementById("uploadPrompt");
const processingImage = document.getElementById("processingImage");
const processingStatus = document.getElementById("processingStatus");
const pageTitle = document.getElementById("pageTitle");
const pageDescription = document.getElementById("pageDescription");
const divider = document.querySelector(".divider");
const sectionTitle = document.getElementById("sectionTitle");
const sectionDescription = document.getElementById("sectionDescription");
const resultDownload = document.getElementById("resultDownload");
let processingEntryAnimation;

uploadButton.addEventListener("click", function () {
    if (!uploadButton.classList.contains("is-processing") && !uploadButton.classList.contains("is-complete")) {
        imageInput.click();
    }
});

imageInput.addEventListener("change", function () {
    handleFile(imageInput.files[0]);
});

uploadButton.addEventListener("dragover", function (event) {
    event.preventDefault();
    if (!uploadButton.classList.contains("is-processing")) uploadButton.classList.add("is-dragging");
});

uploadButton.addEventListener("dragleave", function () {
    uploadButton.classList.remove("is-dragging");
});

uploadButton.addEventListener("drop", function (event) {
    event.preventDefault();
    uploadButton.classList.remove("is-dragging");
    if (!uploadButton.classList.contains("is-processing")) handleFile(event.dataTransfer.files[0]);
});

function handleFile(file) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
        showError("Please upload an image file.");
        return;
    }

    const imageUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = async function () {
        URL.revokeObjectURL(imageUrl);

        if (image.width !== image.height) {
            showError("Image must be a square");
            imageInput.value = "";
            return;
        }

        errorMessage.hidden = true;
        const originalDataUrl = await readAsDataUrl(file);
        sessionStorage.setItem("uploadedImage", originalDataUrl);
        processImage(originalDataUrl);
    };

    image.onerror = function () {
        URL.revokeObjectURL(imageUrl);
        showError("This image could not be opened.");
    };

    image.src = imageUrl;
}

async function processImage(originalDataUrl) {
    uploadPrompt.hidden = true;
    processingImage.src = originalDataUrl;
    processingImage.hidden = false;
    processingStatus.hidden = false;
    setProcessingStatus("Removing background");
    uploadButton.classList.add("is-processing");

    try {
        setIntroVisible(false);
        await wait(90);

        const uploadPosition = uploadButton.getBoundingClientRect();
        const headerHeight = document.querySelector(".site-header").offsetHeight;
        const targetLeft = (document.documentElement.clientWidth - uploadPosition.width) / 2;
        const targetTop = headerHeight + (window.innerHeight - headerHeight - uploadPosition.height) / 2;
        const horizontalOffset = targetLeft - uploadPosition.left;
        const verticalOffset = targetTop - uploadPosition.top;

        processingEntryAnimation = uploadButton.animate([
            { transform: "translate(0, 0)" },
            { transform: `translate(${horizontalOffset}px, ${verticalOffset}px)` }
        ], {
            duration: 550,
            easing: "cubic-bezier(.2, .8, .2, 1)",
            fill: "both"
        });

        await processingEntryAnimation.finished;
        document.body.classList.add("processing-mode");
        processingEntryAnimation.cancel();

        const originalBlob = await fetch(originalDataUrl).then(function (response) {
            return response.blob();
        });
        const removedBackgroundBlob = await removeBackground(originalBlob);

        setProcessingStatus("Colourising image");
        const finishedImage = await colouriseImage(removedBackgroundBlob, "#d3d3d3");
        sessionStorage.setItem("editedImage", finishedImage);

        await wait(450);
        showResult(finishedImage);
    } catch (error) {
        console.error("Image processing failed:", error);
        processingStatus.textContent = "Processing failed. Please try another image.";
        uploadButton.classList.add("has-processing-error");
        uploadButton.classList.remove("is-processing");
    }
}

async function showResult(finishedImage) {
    processingStatus.classList.add("is-leaving");
    processingImage.classList.add("is-changing");
    await wait(300);

    processingImage.src = finishedImage;
    processingStatus.hidden = true;
    processingStatus.classList.remove("is-leaving");

    pageTitle.textContent = "Your icon is ready!";
    pageDescription.textContent = "The background has been removed and the visible pixels have been converted to a neutral grey.";
    sectionTitle.textContent = "Preview";
    sectionDescription.textContent = "The checkerboard shows the transparent areas of your image.";
    resultDownload.href = finishedImage;
    resultDownload.hidden = false;

    const processingPosition = uploadButton.getBoundingClientRect();
    document.body.classList.remove("processing-mode");
    uploadButton.classList.remove("is-processing");
    uploadButton.classList.add("is-complete");
    const finishedPosition = uploadButton.getBoundingClientRect();
    const horizontalOffset = processingPosition.left - finishedPosition.left;
    const verticalOffset = processingPosition.top - finishedPosition.top;

    const squareAnimation = uploadButton.animate([
        { transform: `translate(${horizontalOffset}px, ${verticalOffset}px)` },
        { transform: "translate(0, 0)" }
    ], {
        duration: 550,
        easing: "cubic-bezier(.2, .8, .2, 1)",
        fill: "both"
    });

    requestAnimationFrame(function () {
        processingImage.classList.remove("is-changing");
        window.setTimeout(function () {
            setIntroVisible(true);
            resultDownload.classList.add("is-visible");
        }, 90);
    });

    await squareAnimation.finished;
}

function setIntroVisible(visible) {
    [pageTitle, pageDescription, divider, sectionTitle, sectionDescription].forEach(function (element) {
        element.classList.toggle("is-hidden", !visible);
    });
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.hidden = false;
}

function setProcessingStatus(message) {
    processingStatus.replaceChildren(document.createTextNode(message));

    const dots = document.createElement("span");
    dots.className = "loading-dots";
    dots.setAttribute("aria-hidden", "true");

    for (let index = 0; index < 3; index += 1) {
        const dot = document.createElement("span");
        dot.textContent = ".";
        dots.appendChild(dot);
    }

    processingStatus.appendChild(dots);
}

function readAsDataUrl(file) {
    return new Promise(function (resolve, reject) {
        const reader = new FileReader();
        reader.onload = function () { resolve(reader.result); };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
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
    URL.revokeObjectURL(imageUrl);

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const rgb = hexToRgb(hexColour);

    for (let index = 0; index < data.length; index += 4) {
        if (data[index + 3] > 0) {
            data[index] = rgb.r;
            data[index + 1] = rgb.g;
            data[index + 2] = rgb.b;
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

function wait(milliseconds) {
    return new Promise(function (resolve) { setTimeout(resolve, milliseconds); });
}
