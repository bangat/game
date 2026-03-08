/**
 * Reads and parses the contents of one or more JSON files specified by their paths.
 * This function handles both a single file path and an array of file paths.
 * It uses Promise.allSettled to perform concurrent reading and parsing operations efficiently and safely.
 * If a single file path is provided, it returns a single object instead of an array.
 *
 * @param {string | string[]} filePaths - A single file path or an array of file paths of JSON files to read and parse.
 * @returns {Promise<{ filePath: string; content: any | null; status: boolean; message: string } | { filePath: string; content: any | null; status: boolean; message: string }[]>} - Either a single object or an array of objects, each containing the file path, status of the read and parse operation, parsed content (or null if an error occurred), and a status message.
 */
export declare const readAndParseJsonFiles: ({ filePaths, }: {
    filePaths: string | string[];
}) => Promise<{
    filePath: string;
    content: any | null;
    status: boolean;
    message: string;
} | {
    filePath: string;
    content: any | null;
    status: boolean;
    message: string;
}[]>;
