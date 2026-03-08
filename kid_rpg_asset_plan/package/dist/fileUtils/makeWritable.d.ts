/**
 * Recursively makes all files and directories within the specified directory writable.
 * This includes checking if the directory exists before attempting modifications.
 *
 * @param {string} dirPath - The path of the directory to modify.
 * @returns {Promise<{ exists: boolean; writable: boolean; message: string }>} - Result indicating existence, success or failure of operation.
 */
export declare const makeWritable: ({ dirPath, }: {
    dirPath: string;
}) => Promise<{
    exists: boolean;
    writable: boolean;
    message: string;
}>;
