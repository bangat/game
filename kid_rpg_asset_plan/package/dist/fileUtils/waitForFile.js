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
exports.waitForFile = waitForFile;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const util_1 = __importDefault(require("util"));
const readdir = util_1.default.promisify(fs_1.default.readdir);
const access = util_1.default.promisify(fs_1.default.access);
/**
 * Waits for a `.crdownload` file in the specified directory to disappear, indicating the download has finished, and then captures the renamed file.
 * Ignores `.temp` files and any `.crdownload` files already present at invocation.
 * @param {{ downloadDirectory: string }} params - Object containing the directory to monitor for downloads.
 * @returns {Promise<{status: boolean, message: string, filePath?: string}>} - Resolves with status, message, and the path of the completed file.
 */
function waitForFile(_a) {
    return __awaiter(this, arguments, void 0, function* ({ downloadDirectory, timeoutMs = 30000, }) {
        let message = 'Monitoring for file changes...';
        // Get initial list of `.crdownload` files to ignore.
        const initialFiles = new Set((yield readdir(downloadDirectory))
            .filter((file) => file.endsWith('.crdownload'))
            .map((file) => path_1.default.join(downloadDirectory, file)));
        const checkFileExistence = (filePath) => __awaiter(this, void 0, void 0, function* () {
            try {
                yield access(filePath, fs_1.default.constants.F_OK);
                return true; // File still exists
            }
            catch (error) {
                if (error.code === 'ENOENT') {
                    return false; // File does not exist
                }
                throw error; // Re-throw unexpected errors
            }
        });
        return new Promise((resolve, reject) => {
            let resolved = false;
            const watcher = fs_1.default.watch(downloadDirectory, (eventType, filename) => __awaiter(this, void 0, void 0, function* () {
                if (!filename ||
                    filename.endsWith('.temp') ||
                    filename.endsWith('.tmp'))
                    return; // Ignore non-files and `.temp` files
                const fullPath = path_1.default.join(downloadDirectory, filename);
                if (filename.endsWith('.crdownload')) {
                    if (initialFiles.has(fullPath)) {
                        return; // Ignore already existing `.crdownload` files
                    }
                    // Continue to monitor for the disappearance of the `.crdownload` file.
                    try {
                        const exists = yield checkFileExistence(fullPath);
                        if (!exists) {
                            // Once `.crdownload` disappears, wait for next file creation.
                            message = 'Waiting for the final file to appear...';
                        }
                    }
                    catch (error) {
                        if (!resolved) {
                            resolved = true;
                            clearTimeout(timer);
                            watcher.close();
                            reject({
                                status: false,
                                message: `Error monitoring file: ${error.message}`,
                            });
                        }
                    }
                }
                else if (!initialFiles.has(fullPath) && eventType === 'rename') {
                    // Assume the file appearing after a `.crdownload` disappears is the completed file.
                    if (!resolved) {
                        resolved = true;
                        clearTimeout(timer);
                        watcher.close();
                        resolve({
                            status: true,
                            message: `Download complete: ${filename}`,
                            filePath: fullPath,
                        });
                    }
                }
            }));
            const timer = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    watcher.close();
                    resolve({ status: false, message: 'Timed out waiting for download' });
                }
            }, timeoutMs);
            watcher.on('error', (error) => {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timer);
                    watcher.close();
                    reject({ status: false, message: `Watcher error: ${error.message}` });
                }
            });
            watcher.on('close', () => {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timer);
                    resolve({
                        status: false,
                        message: 'File watch terminated before completion',
                    });
                }
            });
        });
    });
}
