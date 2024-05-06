"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Config = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = __importDefault(require("./logger"));
//@ts-ignore
let config = undefined;
function Config() {
    if (config)
        return config;
    const data = JSON.parse(fs_1.default.readFileSync(path_1.default.resolve(__dirname, "..", "config.json")).toString());
    if (!data)
        logger_1.default.error("Failed to load config");
    config = data;
    return data;
}
exports.Config = Config;
