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
exports.createFileReadOnly = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const verifyFile_1 = require("./verifyFile");
/**
 * Creates a file with read-only permissions. Accepts a single file creation request or an array of requests.
 * Returns a single object or an array of objects based on the input type.
 *
 * @param {(Array<{ filePath: string; content: string; writeOptions?: object }> | { filePath: string; content: string; writeOptions?: object })} requests - A single request or an array of requests for file creation.
 * @returns {Promise<{ filePath: string; created: boolean; writable: boolean; isFile: boolean; isDirectory: boolean; exists: boolean; existed: boolean; overwritten: boolean; hasParentDirectory: boolean; message: string } | Array<{ filePath: string; created: boolean; writable: boolean; isFile: boolean; isDirectory: boolean; exists: boolean; existed: boolean; overwritten: boolean; hasParentDirectory: boolean; message: string }>>} - Either a single object or an array of objects, each indicating the status and outcome of the file creation.
 */
const createFileReadOnly = (requests) => __awaiter(void 0, void 0, void 0, function* () {
    // Normalize input to an array
    const normalizedRequests = Array.isArray(requests) ? requests : [requests];
    const isSingleRequest = !Array.isArray(requests);
    const results = yield Promise.all(normalizedRequests.map((request) => __awaiter(void 0, void 0, void 0, function* () {
        const { filePath, content, writeOptions } = request;
        const verification = yield (0, verifyFile_1.verifyFile)({ filePath });
        const mode = 0o444; // Read-only permissions
        if (verification.isDirectory) {
            throw new Error(`Operation aborted: The target '${filePath}' is a directory, and content cannot be written as if it were a file.`);
        }
        const parentDir = path_1.default.dirname(filePath);
        const hasParentDirectory = !!(parentDir &&
            parentDir !== '.' &&
            parentDir !== '/');
        try {
            yield promises_1.default.writeFile(filePath, content, Object.assign({ encoding: 'utf8', mode }, writeOptions));
            const exists = true;
            const created = true;
            const existed = verification.exists;
            const overwritten = existed && verification.isFile;
            const writable = false; // File is read-only
            let message = `File '${filePath}' has been ${created ? 'created' : 'not created'} and set to read-only.`;
            if (overwritten) {
                message += ` The file was overwritten as it already existed.`;
            }
            // Change permissions if the file already existed
            if (existed) {
                yield promises_1.default.chmod(filePath, mode);
                message += ` Permissions were enforced to read-only.`;
            }
            return {
                filePath,
                created,
                writable,
                isFile: verification.isFile,
                isDirectory: verification.isDirectory,
                exists,
                existed,
                overwritten,
                hasParentDirectory,
                message,
            };
        }
        catch (error) {
            throw new Error(`Failed to write to the file '${filePath}' due to: ${error.message}`);
        }
    })));
    // Return either a single object or an array based on the input
    return isSingleRequest ? results[0] : results;
});
exports.createFileReadOnly = createFileReadOnly;
