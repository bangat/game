"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDirectory = createDirectory;
const promises_1 = __importDefault(require("fs/promises"));
/**
 * Asynchronously creates a directory if it does not already exist. Handles special cases like directories ending with '.0'.
 * @param {string} directory - The path to the directory to create.
 * @returns {Promise<{created: boolean, existed: boolean}>} - A promise that resolves with an object indicating whether the directory was created and if it existed beforehand.
 */
function createDirectory(_a) {
    return __awaiter(this, arguments, void 0, function* ({ directory, }) {
        let existed = false;
        try {
            // Handle directories ending with '.0' by appending an underscore temporarily
            const temporaryDirectory = directory.endsWith('.0')
                ? `${directory}_`
                : directory;
            try {
                yield promises_1.default.access(temporaryDirectory);
                existed = true; // Directory already exists
            }
            catch (_b) {
                // If the directory does not exist, create it
                yield promises_1.default.mkdir(temporaryDirectory, { recursive: true });
            }
            // If a temporary directory was created (with an underscore), rename it to the intended name
            if (temporaryDirectory !== directory && !existed) {
                yield promises_1.default.rename(temporaryDirectory, directory);
            }
            return { created: !existed, existed };
        }
        catch (error) {
            console.error(`Failed to create/detect directory '${directory}':`, error);
            return { created: false, existed };
        }
    });
}
