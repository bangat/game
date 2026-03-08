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
exports.makeWritable = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
/**
 * Recursively makes all files and directories within the specified directory writable.
 * This includes checking if the directory exists before attempting modifications.
 *
 * @param {string} dirPath - The path of the directory to modify.
 * @returns {Promise<{ exists: boolean; writable: boolean; message: string }>} - Result indicating existence, success or failure of operation.
 */
const makeWritable = (_a) => __awaiter(void 0, [_a], void 0, function* ({ dirPath, }) {
    let exists = true; // Default to true; will update if access fails
    let writable = true; // Assume writable until proven otherwise
    try {
        yield promises_1.default.access(dirPath); // Check if the file or directory exists
        const stat = yield promises_1.default.stat(dirPath);
        if (stat.isDirectory()) {
            yield promises_1.default.chmod(dirPath, 0o777); // Make directory writable
            const files = yield promises_1.default.readdir(dirPath);
            for (const file of files) {
                const filePath = path_1.default.join(dirPath, file);
                const fileStat = yield promises_1.default.stat(filePath);
                if (fileStat.isDirectory()) {
                    const result = yield (0, exports.makeWritable)({ dirPath: filePath });
                    if (!result.writable) {
                        writable = false; // Update writable based on recursive call
                        throw new Error(`Failed to make subdirectory writable: ${filePath}, Reason: ${result.message}`);
                    }
                }
                else {
                    yield promises_1.default.chmod(filePath, 0o666); // Make file writable
                }
            }
        }
        else {
            yield promises_1.default.chmod(dirPath, 0o666); // Make file writable if it's not a directory
        }
    }
    catch (error) {
        exists = error.code !== 'ENOENT'; // Update exists based on specific error code
        writable = false; // Set writable to false if any error occurs
        return {
            exists,
            writable,
            message: `Failed to make writable: ${dirPath}, Reason: ${error.message}`,
        };
    }
    return {
        exists,
        writable,
        message: `All files and directories at ${dirPath} made writable.`,
    };
});
exports.makeWritable = makeWritable;
