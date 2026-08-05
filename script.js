const uploadButton = document.getElementById("uploadButton");
const imageInput = document.getElementById("imageInput");
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
    uploadButton.classList.add("is-dragging");
});

// When drag leaves button
uploadButton.addEventListener("dragleave", function () {
    uploadButton.classList.remove("is-dragging");
});

// When image is dropped onto button
uploadButton.addEventListener("drop", function (event) {
    event.preventDefault();
    uploadButton.classList.remove("is-dragging");

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
            imageInput.value = "";
            return;
        }

        errorMessage.hidden = true;

        const reader = new FileReader();

        reader.onload = function () {
            sessionStorage.setItem("uploadedImage", reader.result);
            window.location.href = "loading.html";
        };

        reader.readAsDataURL(file);
    };

    image.src = imageUrl;
}
