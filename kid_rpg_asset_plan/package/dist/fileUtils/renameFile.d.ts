/**
 * Renames a downloaded file with a new base name and/or extension. At least one of newBaseFileName or newBaseFileExt must be provided.
 * @param {string} filePath - The current path of the file.
 * @param {string} [newBaseFileName] - The new base name for the file without the extension.
 * @param {string} [newBaseFileExt] - The new extension for the file, without a dot (e.g., 'txt' instead of '.txt').
 * @returns {Promise<{status: boolean, message: string, newFilePath?: string}>} - Result of the rename operation.
 */
export declare const renameFile: ({ filePath, desiredFileName, desiredFileExt, }: {
    filePath: string;
    desiredFileName?: string;
    desiredFileExt?: string;
}) => Promise<{
    status: boolean;
    message: string;
    newFilePath?: string;
}>;
