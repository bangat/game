/**
 * Removes a file or recursively removes a directory or file given its path.
 *
 * @param {string} pathToRemove - The path to the directory or file to be removed.
 * @returns {Promise<{ deleted: boolean; message: string }>} - Object indicating if the operation was successful and includes a status message.
 */
export declare function deleteDirectoryOrFile({ directoryPath, }: {
    directoryPath: string;
}): Promise<{
    deleted: boolean;
    message: string;
}>;
