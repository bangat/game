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
exports.destroy = destroy;
const promises_1 = __importDefault(require("fs/promises"));
const makeWritable_1 = require("./makeWritable");
const clearDirectory_1 = require("./clearDirectory");
const deleteDirectoryOrFile_1 = require("./deleteDirectoryOrFile");
/**
 * Completely destroys a file or directory along with its contents.
 * The process involves making the directory or file writable, clearing its contents if it is a directory,
 * and then removing the file or directory itself.
 * Returns an object indicating the overall success of these operations, along with a status message.
 *
 * @param {string} pathToDestroy - The path to the file or directory to be destroyed.
 * @returns {Promise<{ overallStatus: boolean; writableStatus: boolean; clearStatus: boolean; removeStatus: boolean; message: string }>} - Object indicating whether the operation was successful, includes a status message.
 */
function destroy(_a) {
    return __awaiter(this, arguments, void 0, function* ({ pathToDestroy, }) {
        let writableStatus = false;
        let clearStatus = false;
        let deleteStatus = false;
        let destroyed = true;
        try {
            // Make the directory or file writable
            writableStatus = (yield (0, makeWritable_1.makeWritable)({ dirPath: pathToDestroy })).writable;
            const stat = yield promises_1.default.lstat(pathToDestroy);
            if (stat.isDirectory()) {
                // First, clear the directory contents recursively
                clearStatus = (yield (0, clearDirectory_1.clearDirectory)({ directoryPath: pathToDestroy }))
                    .clean;
                // Now, remove the directory itself
                deleteStatus = (yield (0, deleteDirectoryOrFile_1.deleteDirectoryOrFile)({ directoryPath: pathToDestroy })).deleted;
            }
            else {
                // It's a file, so just remove it
                deleteStatus = (yield (0, deleteDirectoryOrFile_1.deleteDirectoryOrFile)({ directoryPath: pathToDestroy })).deleted;
            }
            destroyed = writableStatus && clearStatus && deleteStatus;
            return {
                destroyed,
                writableStatus,
                clearStatus,
                deleteStatus,
                path: pathToDestroy,
                message: destroyed
                    ? 'Destruction completed successfully.'
                    : 'Destruction failed. Some components could not be removed.',
            };
        }
        catch (error) {
            return {
                destroyed: writableStatus && clearStatus && deleteStatus,
                writableStatus,
                clearStatus,
                deleteStatus,
                path: pathToDestroy,
                message: `Error during destruction of ${pathToDestroy}: ${error.message}`,
            };
        }
    });
}
