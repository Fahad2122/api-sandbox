"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.delay = void 0;
const delay = (delayInms) => {
    return new Promise(resolve => setTimeout(resolve, delayInms));
};
exports.delay = delay;
