"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_color_log_1 = __importDefault(require("node-color-log"));
var Logger;
(function (Logger) {
    Logger.lastMessage = "";
    //@ts-ignore
    function composeMessage(...args) {
        Logger.lastMessage = "";
        args.forEach((args) => {
            Logger.lastMessage += args.toString() + " ";
        });
    }
    //@ts-ignore
    function debug(...args) {
        composeMessage(...args);
        node_color_log_1.default.debug(...args);
    }
    Logger.debug = debug;
    //@ts-ignore
    function success(...args) {
        composeMessage(...args);
        node_color_log_1.default.info(...args);
    }
    Logger.success = success;
    //@ts-ignore
    function warn(...args) {
        composeMessage(...args);
        node_color_log_1.default.warn(...args);
    }
    Logger.warn = warn;
    //@ts-ignore
    function error(...args) {
        composeMessage(...args);
        node_color_log_1.default.error(...args);
    }
    Logger.error = error;
})(Logger || (Logger = {}));
exports.default = Logger;
