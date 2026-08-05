const SELECTORS = Object.freeze({
    header: ".site-header",
    divider: ".divider",
    uploadButton: "#uploadButton",
    imageInput: "#imageInput",
    errorMessage: "#errorMessage",
    uploadPrompt: "#uploadPrompt",
    processingImage: "#processingImage",
    processingStatus: "#processingStatus",
    pageTitle: "#pageTitle",
    pageDescription: "#pageDescription",
    sectionTitle: "#sectionTitle",
    sectionDescription: "#sectionDescription",
    resultDownload: "#resultDownload"
});

function getRequiredElement(selector) {
    const element = document.querySelector(selector);

    if (!element) {
        throw new Error(`Required UI element was not found: ${selector}`);
    }

    return element;
}

export function getAppElements() {
    return Object.fromEntries(
        Object.entries(SELECTORS).map(([name, selector]) => [name, getRequiredElement(selector)])
    );
}
