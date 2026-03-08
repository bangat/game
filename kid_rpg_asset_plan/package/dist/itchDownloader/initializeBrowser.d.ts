import { Browser } from 'puppeteer';
import { DownloadProgress } from './types';
export declare const initializeBrowser: ({ downloadDirectory, headless, onProgress, }: {
    downloadDirectory: string;
    headless?: boolean;
    onProgress?: (info: DownloadProgress) => void;
}) => Promise<{
    browser: Browser | null;
    status: boolean;
    message: string;
}>;
