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
exports.renameFile = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const util_1 = __importDefault(require("util"));
const rename = util_1.default.promisify(fs_1.default.rename);
const unlink = util_1.default.promisify(fs_1.default.unlink);
/**
 * Renames a downloaded file with a new base name and/or extension. At least one of newBaseFileName or newBaseFileExt must be provided.
 * @param {string} filePath - The current path of the file.
 * @param {string} [newBaseFileName] - The new base name for the file without the extension.
 * @param {string} [newBaseFileExt] - The new extension for the file, without a dot (e.g., 'txt' instead of '.txt').
 * @returns {Promise<{status: boolean, message: string, newFilePath?: string}>} - Result of the rename operation.
 */
const renameFile = (_a) => __awaiter(void 0, [_a], void 0, function* ({ filePath, desiredFileName, desiredFileExt, }) {
    let message = '';
    if (!desiredFileName && !desiredFileExt) {
        message = 'Error: newBaseFileName or newBaseFileExt must be provided';
        return { status: false, message };
    }
    try {
        const directory = path_1.default.dirname(filePath);
        const originalBaseName = path_1.default.basename(filePath, path_1.default.extname(filePath));
        const originalExtension = path_1.default.extname(filePath);
        const finalBaseName = desiredFileName ? desiredFileName : originalBaseName;
        const finalExtension = desiredFileExt
            ? `.${desiredFileExt}`
            : originalExtension;
        const finalFileName = `${finalBaseName}${finalExtension}`;
        const newFilePath = path_1.default.join(directory, finalFileName);
        yield rename(filePath, newFilePath);
        // Add a short delay before deleting the original file
        yield new Promise((resolve) => setTimeout(resolve, 2000));
        // Check if the original file still exists and delete it if necessary
        if (fs_1.default.existsSync(filePath)) {
            yield unlink(filePath);
        }
        message = `File renamed to ${finalFileName}`;
        return { status: true, message, newFilePath };
    }
    catch (error) {
        message = `Failed to rename file: ${error.message}`;
        return { status: false, message };
    }
});
exports.renameFile = renameFile;
