import { APP_CONFIG, COPY } from "./config.js";
import { getAppElements } from "./dom.js";
import { createIcon, ImageValidationError, validateAndReadImage } from "./image-processor.js";
import { moveFromCentredLayout, moveToViewportCentre, wait } from "./motion.js";
import { AppView } from "./view.js";

class IconiserApp {
    constructor() {
        this.elements = getAppElements();
        this.view = new AppView(this.elements);
    }

    initialise() {
        this.view.bindFileSelection((file) => this.handleFile(file));
    }

    async handleFile(file) {
        if (!file) return;

        try {
            const source = await validateAndReadImage(file);
            await this.processImage(source);
        } catch (error) {
            this.handleError(error);
        }
    }

    async processImage(source) {
        const { animation, outputColour } = APP_CONFIG;

        this.view.showProcessing(source);
        this.view.setProcessingStage("remove-background");
        this.view.setIntroVisible(false);
        await wait(animation.contentLeadMs);

        await moveToViewportCentre(
            this.elements.uploadButton,
            this.elements.header,
            () => this.view.enterCentredProcessingLayout()
        );

        const result = await createIcon(
            source,
            outputColour,
            (stage) => this.view.setProcessingStage(stage)
        );

        await wait(animation.colourStageHoldMs);
        await this.showResult(result);
    }

    async showResult(result) {
        const { animation } = APP_CONFIG;

        this.view.beginResultSwap();
        await wait(animation.resultSwapMs);
        this.view.prepareResult(result);

        const movement = moveFromCentredLayout(
            this.elements.uploadButton,
            () => this.view.enterResultLayout()
        );

        requestAnimationFrame(() => {
            this.elements.processingImage.classList.remove("is-changing");
            window.setTimeout(() => this.view.revealResult(), animation.contentLeadMs);
        });

        await movement.finished;
    }

    handleError(error) {
        if (error instanceof ImageValidationError) {
            const messages = {
                "invalid-type": COPY.errors.invalidType,
                "invalid-shape": COPY.errors.invalidShape,
                unreadable: COPY.errors.unreadable
            };
            this.view.showValidationError(messages[error.code] ?? COPY.errors.unreadable);
            return;
        }

        console.error("Image processing failed:", error);
        this.view.showProcessingError();
    }
}

new IconiserApp().initialise();
