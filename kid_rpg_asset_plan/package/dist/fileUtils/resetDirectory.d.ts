/**
 * Resets a directory by destroying it and then recreating it.
 * This function uses the destroy and createDirectory functions to handle the operations.
 *
 * @param {string} directoryPath - The path to the directory to reset.
 * @returns {Promise<{ overallStatus: boolean; destroyStatus: boolean; createStatus: boolean; message: string }>} - Object indicating whether the reset was successful, includes a status message.
 */
export declare const resetDirectory: ({ directoryPath, }: {
    directoryPath: string;
}) => Promise<{
    reset: boolean;
    existed: boolean;
    destroyed: boolean;
    created: boolean;
    message: string;
}>;
