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
Object.defineProperty(exports, "__esModule", { value: true });
exports.initiateDownload = void 0;
/**
 * Initiates a download for a game from the Itch.io website using Puppeteer.
 * The function navigates to the game's URL, attempts to find and click the download button.
 * If the main download button is not found, it proceeds to the donation wall and tries to download from there.
 *
 * @param {Browser} browser - The Puppeteer Browser instance to use for downloading.
 * @param {string} itchGameUrl - The URL of the game's page on Itch.io.
 * @returns {Promise<{status: boolean; message: string}>} The result of the download attempt, including success status and message.
 */
const initiateDownload = (_a) => __awaiter(void 0, [_a], void 0, function* ({ browser, itchGameUrl, }) {
    let message = '';
    let status = false;
    let downloadInitiated = false;
    try {
        const page = yield browser.newPage();
        // Set user-like viewport for the browser
        yield page.setViewport({
            width: 1920,
            height: 1080,
        });
        // Navigate to the game's page
        yield page.goto(itchGameUrl, { waitUntil: 'networkidle2' });
        // Calculate a random delay to simulate human interaction before clicking the download button
        const randomDelay = Math.floor(Math.random() * 3000) + 1000;
        // Attempt to click the main download button
        try {
            const downloadLinkSelector = '.button.download_btn';
            yield page.waitForSelector(downloadLinkSelector, { timeout: 5000 });
            yield new Promise((resolve) => setTimeout(resolve, randomDelay));
            yield page.click(downloadLinkSelector);
            downloadInitiated = true;
            message = 'Download initiated successfully from main page.';
        }
        catch (error) { }
        // If the main download button is not found, try the donation wall
        if (!downloadInitiated) {
            yield page.goto(`${itchGameUrl}/purchase`, { waitUntil: 'networkidle2' });
            yield new Promise((resolve) => setTimeout(resolve, randomDelay));
            const noThanksSelector = '.direct_download_btn';
            yield page.waitForSelector(noThanksSelector, { timeout: 5000 });
            yield page.click(noThanksSelector);
            const versionListBtn = '.download_btn';
            yield page.waitForSelector(versionListBtn, { timeout: 5000 });
            // Click the first available version's download button
            yield page.click(versionListBtn);
            message = 'Download initiated successfully from donation page.';
            downloadInitiated = true;
        }
        status = downloadInitiated;
    }
    catch (error) {
        message = `Error encountered during download: ${error.message}`;
        status = false;
    }
    return { status, message };
});
exports.initiateDownload = initiateDownload;
