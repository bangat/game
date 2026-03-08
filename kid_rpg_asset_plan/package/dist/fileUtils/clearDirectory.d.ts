/**
 * Recursively clears all files and subdirectories in the specified directory.
 *
 * @param {string} directory - The path of the directory to clear.
 * @returns {Promise<{ clean: boolean, message: string }>} - Object indicating if the directory was successfully cleared and includes a status message.
 */
export declare function clearDirectory({ directoryPath, }: {
    directoryPath: string;
}): Promise<{
    clean: boolean;
    message: string;
}>;
