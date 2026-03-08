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
exports.downloadGame = downloadGame;
exports.downloadGameSingle = downloadGameSingle;
const createFile_1 = require("../fileUtils/createFile");
const createDirectory_1 = require("../fileUtils/createDirectory");
const renameFile_1 = require("../fileUtils/renameFile");
const waitForFile_1 = require("../fileUtils/waitForFile");
const initiateDownload_1 = require("./initiateDownload");
const initializeBrowser_1 = require("./initializeBrowser");
const fetchItchGameProfile_1 = require("./fetchItchGameProfile");
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const fs_1 = __importDefault(require("fs"));
function log(...args) {
    if (process.env.DEBUG_DOWNLOAD_GAME === 'true') {
        console.log(...args);
    }
}
let globalBrowser = null;
function downloadGame(params_1) {
    return __awaiter(this, arguments, void 0, function* (params, concurrency = 1) {
        if (Array.isArray(params)) {
            const list = params;
            const runParallel = list.some((p) => p.parallel);
            if (runParallel) {
                return Promise.all(list.map((p) => downloadGameSingle(p)));
            }
            const limit = Math.max(concurrency, 1);
            const results = new Array(list.length);
            let index = 0;
            function worker() {
                return __awaiter(this, void 0, void 0, function* () {
                    while (true) {
                        const current = index++;
                        if (current >= list.length)
                            break;
                        results[current] = yield downloadGameSingle(list[current]);
                    }
                });
            }
            const workers = [];
            for (let i = 0; i < Math.min(limit, list.length); i++) {
                workers.push(worker());
            }
            yield Promise.all(workers);
            return results;
        }
        else {
            return downloadGameSingle(params);
        }
    });
}
function downloadGameSingle(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const { name, author, desiredFileName, downloadDirectory: inputDirectory, itchGameUrl: inputUrl, writeMetaData = true, retries = 0, retryDelayMs = 500, onProgress, } = params;
        let downloadDirectory = inputDirectory
            ? path_1.default.resolve(inputDirectory)
            : path_1.default.resolve(os_1.default.homedir(), 'downloads');
        let itchGameUrl = inputUrl;
        if (!itchGameUrl && name && author) {
            itchGameUrl = `https://${author}.itch.io/${name.toLowerCase().replace(/\s+/g, '-')}`;
        }
        log('Starting downloadGameSingle function...');
        let message = '';
        let status = false;
        let metaData = null;
        let metadataPath = '';
        let finalFilePath = '';
        let browserInit = null;
        if (!itchGameUrl || (!name && !author && !itchGameUrl)) {
            log('Invalid input parameters');
            return {
                status: false,
                message: 'Invalid input: Provide either a URL or both name and author.',
            };
        }
        function attemptOnce() {
            return __awaiter(this, void 0, void 0, function* () {
                var _a;
                try {
                    yield (0, createDirectory_1.createDirectory)({ directory: downloadDirectory });
                    const gameProfile = yield (0, fetchItchGameProfile_1.fetchItchGameProfile)({ itchGameUrl });
                    if (!gameProfile.found)
                        throw new Error('Failed to fetch game profile');
                    log('Game profile fetched successfully:', itchGameUrl, gameProfile);
                    browserInit = yield (0, initializeBrowser_1.initializeBrowser)({ downloadDirectory, onProgress });
                    if (!browserInit.status)
                        throw new Error('Browser initialization failed: ' + browserInit.message);
                    globalBrowser = browserInit.browser;
                    const browser = globalBrowser;
                    log('Starting Download...');
                    const puppeteerResult = yield (0, initiateDownload_1.initiateDownload)({
                        browser,
                        itchGameUrl: itchGameUrl,
                    });
                    if (!puppeteerResult.status)
                        throw new Error('Download failed: ' + puppeteerResult.message);
                    log('Downloading...');
                    const downloadedFileInfo = yield (0, waitForFile_1.waitForFile)({ downloadDirectory });
                    if (!downloadedFileInfo.status)
                        throw new Error('Downloaded file not found');
                    finalFilePath = downloadedFileInfo.filePath;
                    const originalBase = desiredFileName
                        ? desiredFileName
                        : path_1.default.basename(finalFilePath, path_1.default.extname(finalFilePath));
                    const ext = path_1.default.extname(finalFilePath);
                    let uniqueBase = originalBase;
                    let targetPath = path_1.default.join(downloadDirectory, uniqueBase + ext);
                    let counter = 1;
                    while (fs_1.default.existsSync(targetPath)) {
                        uniqueBase = `${originalBase}-${counter}`;
                        targetPath = path_1.default.join(downloadDirectory, uniqueBase + ext);
                        counter++;
                    }
                    if (uniqueBase !== path_1.default.basename(finalFilePath, ext) || desiredFileName) {
                        const renameResult = yield (0, renameFile_1.renameFile)({
                            filePath: finalFilePath,
                            desiredFileName: uniqueBase,
                        });
                        if (!renameResult.status)
                            throw new Error('File rename failed: ' + renameResult.message);
                        finalFilePath = renameResult.newFilePath;
                        log('File renamed successfully to:', finalFilePath);
                    }
                    metaData = gameProfile === null || gameProfile === void 0 ? void 0 : gameProfile.itchRecord;
                    metadataPath = path_1.default.join(downloadDirectory, `${(_a = gameProfile === null || gameProfile === void 0 ? void 0 : gameProfile.itchRecord) === null || _a === void 0 ? void 0 : _a.name}-metadata.json`);
                    if (writeMetaData) {
                        yield (0, createFile_1.createFile)({
                            filePath: metadataPath,
                            content: JSON.stringify(metaData, null, 2),
                        });
                    }
                    status = puppeteerResult.status;
                    message = 'Download and file operations successful.';
                    log(message);
                    return {
                        status,
                        message,
                        metadataPath,
                        filePath: finalFilePath,
                        metaData,
                    };
                }
                catch (error) {
                    message = `Setup failed: ${error.message}`;
                    log(message);
                    const httpStatus = error.statusCode;
                    if (finalFilePath) {
                        return { status: false, message, httpStatus, filePath: finalFilePath };
                    }
                    return { status: false, message, httpStatus };
                }
                finally {
                    if (browserInit && browserInit.browser) {
                        yield new Promise((resolve) => setTimeout(resolve, 2000));
                        yield browserInit.browser.close();
                        log('Downloader closed successfully');
                        globalBrowser = null;
                    }
                }
            });
        }
        let attempt = 0;
        let result = yield attemptOnce();
        while (!result.status && attempt < retries) {
            yield new Promise((r) => setTimeout(r, retryDelayMs * Math.pow(2, attempt)));
            attempt++;
            result = yield attemptOnce();
        }
        return result;
    });
}
process.on('exit', cleanUp);
process.on('SIGINT', () => {
    log('Process interrupted, closing browser...');
    cleanUp();
    process.exit();
});
function cleanUp() {
    log('Cleaning up resources...');
    if (globalBrowser) {
        globalBrowser.close();
        globalBrowser = null;
        log('Browser closed successfully.');
    }
}
