/**
 * Completely destroys a file or directory along with its contents.
 * The process involves making the directory or file writable, clearing its contents if it is a directory,
 * and then removing the file or directory itself.
 * Returns an object indicating the overall success of these operations, along with a status message.
 *
 * @param {string} pathToDestroy - The path to the file or directory to be destroyed.
 * @returns {Promise<{ overallStatus: boolean; writableStatus: boolean; clearStatus: boolean; removeStatus: boolean; message: string }>} - Object indicating whether the operation was successful, includes a status message.
 */
export declare function destroy({ pathToDestroy, }: {
    pathToDestroy: string;
}): Promise<{
    destroyed: boolean;
    writableStatus: boolean;
    clearStatus: boolean;
    deleteStatus: boolean;
    path: string;
    message: string;
}>;
