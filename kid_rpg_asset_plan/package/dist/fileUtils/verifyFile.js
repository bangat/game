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
exports.verifyFile = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
/**
 * Checks if a file exists, and if a size is specified, also checks if the file matches the expected size.
 * It returns detailed file information along with an operation status indicator.
 *
 * @param {IVerifyFileParams} params - The parameters for the function.
 * @returns {Promise<IFileDetails>} - The result object with detailed file information and a status message.
 */
const verifyFile = (params) => __awaiter(void 0, void 0, void 0, function* () {
    const { filePath, expectedSize } = params;
    let exists = false;
    let sizeMatches = false;
    let isFile = false;
    let isDirectory = false;
    let isSymbolicLink = false;
    let size = 0;
    let createdAt = 0;
    let updatedAt = 0;
    let accessedAt = 0;
    let name = path_1.default.basename(filePath);
    let extension = path_1.default.extname(filePath);
    let pathFull = path_1.default.resolve(filePath);
    let pathRelative = path_1.default.relative(process.cwd(), pathFull);
    let permissions = '';
    try {
        const stats = yield promises_1.default.lstat(pathFull);
        // Set true as file stats are successfully fetched
        exists = true;
        size = stats.size;
        isFile = stats.isFile();
        isDirectory = stats.isDirectory();
        isSymbolicLink = stats.isSymbolicLink();
        permissions = `0${(stats.mode & parseInt('777', 8)).toString(8)}`;
        sizeMatches = expectedSize !== undefined ? size === expectedSize : false;
        accessedAt = stats.atimeMs;
        updatedAt = stats.ctimeMs;
        createdAt = stats.birthtimeMs;
    }
    catch (error) {
        // Set false as the file does not exist or error occurred
        exists = false;
    }
    return {
        exists,
        size,
        sizeMatches,
        name,
        extension,
        pathRelative,
        pathFull,
        isFile,
        isDirectory,
        isSymbolicLink,
        permissions,
        accessedAt,
        updatedAt,
        createdAt,
    };
});
exports.verifyFile = verifyFile;
