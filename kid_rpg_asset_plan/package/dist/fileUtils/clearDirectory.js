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
exports.clearDirectory = clearDirectory;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
/**
 * Recursively clears all files and subdirectories in the specified directory.
 *
 * @param {string} directory - The path of the directory to clear.
 * @returns {Promise<{ clean: boolean, message: string }>} - Object indicating if the directory was successfully cleared and includes a status message.
 */
function clearDirectory(_a) {
    return __awaiter(this, arguments, void 0, function* ({ directoryPath, }) {
        try {
            // Check if the directory exists
            try {
                yield promises_1.default.access(directoryPath);
            }
            catch (_b) {
                // If the directory does not exist, create it and return success
                yield promises_1.default.mkdir(directoryPath, { recursive: true });
                return {
                    clean: true,
                    message: 'Directory was created as it did not exist.',
                };
            }
            // Read the contents of the directory
            const files = yield promises_1.default.readdir(directoryPath);
            // Iterate over each file/subdirectory and delete appropriately
            for (const file of files) {
                const curPath = path_1.default.join(directoryPath, file);
                const stat = yield promises_1.default.lstat(curPath);
                if (stat.isDirectory()) {
                    // Recursively clear subdirectories
                    const result = yield clearDirectory({ directoryPath: curPath });
                    if (!result.clean) {
                        // Propagate the first encountered error
                        throw new Error(result.message);
                    }
                    // Remove the directory after clearing it
                    yield promises_1.default.rm(curPath, { recursive: true, force: true });
                }
                else {
                    // Remove files directly
                    yield promises_1.default.unlink(curPath);
                }
            }
            return {
                clean: true,
                message: 'Directory and all contents successfully cleared.',
            };
        }
        catch (error) {
            return {
                clean: false,
                message: `Failed to clear directory: ${error.message}`,
            };
        }
    });
}
