/**
 * Waits for a `.crdownload` file in the specified directory to disappear, indicating the download has finished, and then captures the renamed file.
 * Ignores `.temp` files and any `.crdownload` files already present at invocation.
 * @param {{ downloadDirectory: string }} params - Object containing the directory to monitor for downloads.
 * @returns {Promise<{status: boolean, message: string, filePath?: string}>} - Resolves with status, message, and the path of the completed file.
 */
export declare function waitForFile({ downloadDirectory, timeoutMs, }: {
    downloadDirectory: string;
    timeoutMs?: number;
}): Promise<{
    status: boolean;
    message: string;
    filePath?: string;
}>;
