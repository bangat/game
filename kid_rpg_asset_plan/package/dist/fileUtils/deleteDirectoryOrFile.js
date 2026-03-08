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
exports.deleteDirectoryOrFile = deleteDirectoryOrFile;
const promises_1 = __importDefault(require("fs/promises"));
/**
 * Removes a file or recursively removes a directory or file given its path.
 *
 * @param {string} pathToRemove - The path to the directory or file to be removed.
 * @returns {Promise<{ deleted: boolean; message: string }>} - Object indicating if the operation was successful and includes a status message.
 */
function deleteDirectoryOrFile(_a) {
    return __awaiter(this, arguments, void 0, function* ({ directoryPath, }) {
        try {
            const stat = yield promises_1.default.lstat(directoryPath);
            if (stat.isDirectory()) {
                // If it's a directory, recursively remove it
                yield promises_1.default.rm(directoryPath, { recursive: true, force: true });
                return { deleted: true, message: 'Directory removed successfully.' };
            }
            else {
                // If it's a file, remove the file
                yield promises_1.default.unlink(directoryPath);
                return { deleted: true, message: 'File removed successfully.' };
            }
        }
        catch (error) {
            return {
                deleted: false,
                message: `Failed to remove path: ${error.message}`,
            };
        }
    });
}
