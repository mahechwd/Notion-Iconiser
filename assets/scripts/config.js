export const APP_CONFIG = Object.freeze({
    outputColour: "#d3d3d3",
    animation: Object.freeze({
        contentLeadMs: 90,
        movementMs: 550,
        resultSwapMs: 300,
        colourStageHoldMs: 450,
        easing: "cubic-bezier(.2, .8, .2, 1)"
    })
});

export const COPY = Object.freeze({
    result: Object.freeze({
        pageTitle: "Your icon is ready!",
        pageDescription: "The background has been removed and the visible pixels have been converted to a neutral grey.",
        sectionTitle: "Preview",
        sectionDescription: "The checkerboard shows the transparent areas of your image."
    }),
    status: Object.freeze({
        removingBackground: "Removing background",
        colourising: "Colourising image",
        processingFailed: "Processing failed. Please try another image."
    }),
    errors: Object.freeze({
        invalidType: "Please upload an image file.",
        invalidShape: "Image must be a square",
        unreadable: "This image could not be opened."
    })
});
