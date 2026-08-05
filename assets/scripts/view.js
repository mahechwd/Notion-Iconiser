import { COPY } from "./config.js";

const INTRO_ELEMENT_KEYS = Object.freeze([
    "pageTitle",
    "pageDescription",
    "divider",
    "sectionTitle",
    "sectionDescription"
]);

export class AppView {
    constructor(elements) {
        this.elements = elements;
    }

    bindFileSelection(handler) {
        const { uploadButton, imageInput } = this.elements;

        uploadButton.addEventListener("click", () => {
            if (!this.isLocked()) imageInput.click();
        });

        imageInput.addEventListener("change", () => handler(imageInput.files[0]));

        uploadButton.addEventListener("dragover", (event) => {
            event.preventDefault();
            if (!this.isLocked()) uploadButton.classList.add("is-dragging");
        });

        uploadButton.addEventListener("dragleave", () => {
            uploadButton.classList.remove("is-dragging");
        });

        uploadButton.addEventListener("drop", (event) => {
            event.preventDefault();
            uploadButton.classList.remove("is-dragging");
            if (!this.isLocked()) handler(event.dataTransfer.files[0]);
        });
    }

    isLocked() {
        const { uploadButton } = this.elements;
        return uploadButton.classList.contains("is-processing") || uploadButton.classList.contains("is-complete");
    }

    showProcessing(imageSource) {
        const { uploadPrompt, processingImage, processingStatus, uploadButton, errorMessage } = this.elements;
        errorMessage.hidden = true;
        uploadPrompt.hidden = true;
        processingImage.src = imageSource;
        processingImage.hidden = false;
        processingStatus.hidden = false;
        uploadButton.classList.add("is-processing");
    }

    setProcessingStage(stage) {
        const messages = {
            "remove-background": COPY.status.removingBackground,
            colourise: COPY.status.colourising
        };
        const message = messages[stage];

        if (!message) throw new Error(`Unknown processing stage: ${stage}`);
        this.renderLoadingStatus(message);
    }

    setIntroVisible(visible) {
        for (const key of INTRO_ELEMENT_KEYS) {
            this.elements[key].classList.toggle("is-hidden", !visible);
        }
    }

    enterCentredProcessingLayout() {
        document.body.classList.add("processing-mode");
    }

    beginResultSwap() {
        this.elements.processingStatus.classList.add("is-leaving");
        this.elements.processingImage.classList.add("is-changing");
    }

    prepareResult(imageSource) {
        const { processingImage, processingStatus, pageTitle, pageDescription, sectionTitle, sectionDescription, resultDownload } = this.elements;
        processingImage.src = imageSource;
        processingStatus.hidden = true;
        processingStatus.classList.remove("is-leaving");
        pageTitle.textContent = COPY.result.pageTitle;
        pageDescription.textContent = COPY.result.pageDescription;
        sectionTitle.textContent = COPY.result.sectionTitle;
        sectionDescription.textContent = COPY.result.sectionDescription;
        resultDownload.href = imageSource;
        resultDownload.hidden = false;
    }

    enterResultLayout() {
        document.body.classList.remove("processing-mode");
        this.elements.uploadButton.classList.remove("is-processing");
        this.elements.uploadButton.classList.add("is-complete");
    }

    revealResult() {
        this.elements.processingImage.classList.remove("is-changing");
        this.setIntroVisible(true);
        this.elements.resultDownload.classList.add("is-visible");
    }

    showValidationError(message) {
        this.elements.errorMessage.textContent = message;
        this.elements.errorMessage.hidden = false;
        this.elements.imageInput.value = "";
    }

    showProcessingError() {
        const { processingStatus, uploadButton } = this.elements;
        processingStatus.textContent = COPY.status.processingFailed;
        uploadButton.classList.add("has-processing-error");
        uploadButton.classList.remove("is-processing");
    }

    renderLoadingStatus(message) {
        const { processingStatus } = this.elements;
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
}
