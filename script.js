const uploadButton = document.getElementById("uploadButton");
const imageInput = document.getElementById("imageInput");
const fileName = document.getElementById("fileName");
const previewImage = document.getElementById("previewImage");
const errorMessage = document.getElementById("errorMessage");

// Click button to choose image
uploadButton.addEventListener("click", function () {
    imageInput.click();
});

// When image is selected normally
imageInput.addEventListener("change", function () {
    const file = imageInput.files[0];
    handleFile(file);
});

// Allow image to be dropped onto button
uploadButton.addEventListener("dragover", function (event) {
    event.preventDefault();
    uploadButton.style.backgroundColor = "#f0f0f0";
});

// When drag leaves button
uploadButton.addEventListener("dragleave", function () {
    uploadButton.style.backgroundColor = "white";
});

// When image is dropped onto button
uploadButton.addEventListener("drop", function (event) {
    event.preventDefault();
    uploadButton.style.backgroundColor = "white";

    const file = event.dataTransfer.files[0];
    handleFile(file);
});

function handleFile(file) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
        alert("Please upload an image file.");
        return;
    }

    const imageUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = function () {
        const width = image.width;
        const height = image.height;

        if (width !== height) {
            errorMessage.hidden = false;
            fileName.textContent = "";
            previewImage.hidden = true;
            previewImage.src = "";
            imageInput.value = "";
            return;
        }

        errorMessage.hidden = true;
        fileName.textContent = "Selected file: " + file.name;

        previewImage.src = imageUrl;
        previewImage.hidden = false;
    };

    image.src = imageUrl;
}