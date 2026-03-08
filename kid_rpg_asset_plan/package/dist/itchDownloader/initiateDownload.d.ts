import { Browser } from 'puppeteer';
/**
 * Initiates a download for a game from the Itch.io website using Puppeteer.
 * The function navigates to the game's URL, attempts to find and click the download button.
 * If the main download button is not found, it proceeds to the donation wall and tries to download from there.
 *
 * @param {Browser} browser - The Puppeteer Browser instance to use for downloading.
 * @param {string} itchGameUrl - The URL of the game's page on Itch.io.
 * @returns {Promise<{status: boolean; message: string}>} The result of the download attempt, including success status and message.
 */
export declare const initiateDownload: ({ browser, itchGameUrl, }: {
    browser: Browser;
    itchGameUrl: string;
}) => Promise<{
    status: boolean;
    message: string;
}>;
