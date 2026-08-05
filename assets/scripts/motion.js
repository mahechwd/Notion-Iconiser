import { APP_CONFIG } from "./config.js";

const { animation } = APP_CONFIG;

export function wait(milliseconds) {
    return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

export async function moveToViewportCentre(element, header, commitCentredLayout) {
    const start = element.getBoundingClientRect();
    const targetLeft = (document.documentElement.clientWidth - start.width) / 2;
    const targetTop = header.offsetHeight + (window.innerHeight - header.offsetHeight - start.height) / 2;

    const movement = animateTranslation(element, {
        fromX: 0,
        fromY: 0,
        toX: targetLeft - start.left,
        toY: targetTop - start.top
    });

    await movement.finished;
    commitCentredLayout();
    movement.cancel();
}

export function moveFromCentredLayout(element, commitResultLayout) {
    const start = element.getBoundingClientRect();
    commitResultLayout();
    const end = element.getBoundingClientRect();

    return animateTranslation(element, {
        fromX: start.left - end.left,
        fromY: start.top - end.top,
        toX: 0,
        toY: 0
    });
}

function animateTranslation(element, coordinates) {
    return element.animate([
        { transform: `translate(${coordinates.fromX}px, ${coordinates.fromY}px)` },
        { transform: `translate(${coordinates.toX}px, ${coordinates.toY}px)` }
    ], {
        duration: animation.movementMs,
        easing: animation.easing,
        fill: "both"
    });
}
