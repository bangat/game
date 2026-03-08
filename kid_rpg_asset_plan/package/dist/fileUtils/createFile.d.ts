/**
 * Creates a file. Accepts a single file creation request or an array of requests.
 * Returns a single object or an array of objects based on the input type.
 *
 * @param {(Array<{ filePath: string; content: string; writeOptions?: object }> | { filePath: string; content: string; writeOptions?: object })} requests - A single request or an array of requests for file creation.
 * @returns {Promise<{ filePath: string; created: boolean; writable: boolean; isFile: boolean; isDirectory: boolean; exists: boolean; existed: boolean; overwritten: boolean; hasParentDirectory: boolean; message: string } | Array<{ filePath: string; created: boolean; writable: boolean; isFile: boolean; isDirectory: boolean; exists: boolean; existed: boolean; overwritten: boolean; hasParentDirectory: boolean; message: string }>>} - Either a single object or an array of objects, each indicating the status and outcome of the file creation.
 */
export declare const createFile: (requests: Array<{
    filePath: string;
    content: string;
    writeOptions?: object;
}> | {
    filePath: string;
    content: string;
    writeOptions?: object;
}) => Promise<{
    filePath: string;
    created: boolean;
    writable: boolean;
    isFile: boolean;
    isDirectory: boolean;
    exists: boolean;
    existed: boolean;
    overwritten: boolean;
    hasParentDirectory: boolean;
    message: string;
} | Array<{
    filePath: string;
    created: boolean;
    writable: boolean;
    isFile: boolean;
    isDirectory: boolean;
    exists: boolean;
    existed: boolean;
    overwritten: boolean;
    hasParentDirectory: boolean;
    message: string;
}>>;
