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
exports.initializeBrowser = void 0;
const path_1 = __importDefault(require("path"));
const puppeteer_1 = __importDefault(require("puppeteer"));
const initializeBrowser = (_a) => __awaiter(void 0, [_a], void 0, function* ({ downloadDirectory, headless = true, onProgress, }) {
    let message = '';
    let status = false;
    let browser = null;
    try {
        browser = yield puppeteer_1.default.launch({
            headless: headless, // Set to false for visual debugging or true for production
            defaultViewport: null, // Use the default screen size of the system
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        // Create a new page in the browser
        const page = yield browser.newPage();
        // Set a custom user agent and additional headers
        yield page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        yield page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9', // Setting language preferences
        });
        // More settings to mimic a real user browser
        // Remove the WebDriver flag which can be detected
        yield page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', {
                get: () => false,
            });
        });
        const client = yield page.target().createCDPSession();
        yield client.send('Page.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath: path_1.default.resolve(downloadDirectory),
        });
        yield client.send('Browser.enable');
        let totalBytes = 0;
        let fileName = '';
        client.on('Browser.downloadWillBegin', (event) => {
            totalBytes = event.totalBytes || 0;
            fileName = event.suggestedFilename || '';
            if (onProgress) {
                onProgress({ bytesReceived: 0, totalBytes, fileName });
            }
        });
        client.on('Browser.downloadProgress', (event) => {
            if (event.totalBytes)
                totalBytes = event.totalBytes;
            const bytes = event.receivedBytes || 0;
            if (onProgress) {
                onProgress({ bytesReceived: bytes, totalBytes, fileName });
            }
        });
        status = true;
        message = 'Browser initialized successfully with enhanced settings.';
    }
    catch (error) {
        message = `Failed to initialize browser: ${error.message}`;
        browser = null;
    }
    return { browser, status, message };
});
exports.initializeBrowser = initializeBrowser;
