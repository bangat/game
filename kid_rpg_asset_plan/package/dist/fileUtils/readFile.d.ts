/**
 * Reads the contents of one or more files specified by their paths.
 * This function handles both a single file path and an array of file paths.
 * It uses Promise.allSettled to perform concurrent reading operations efficiently and safely.
 *
 * @param {string | string[]} filePaths - A single file path or an array of file paths to read.
 * @returns {Promise<{ filePath: string; content: string | null; read: boolean; message: string }[] | { filePath: string; content: string | null; read: boolean; message: string }>} - Depending on the input, returns either an array of objects or a single object, each containing the file path, read status, content (or null if an error occurred), and a status message.
 */
export declare const readFile: ({ filePaths, }: {
    filePaths: string | string[];
}) => Promise<{
    filePath: string;
    content: string | null;
    read: boolean;
    message: string;
} | {
    filePath: string;
    content: string | null;
    read: boolean;
    message: string;
}[]>;
