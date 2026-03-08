/**
 * Asynchronously creates a directory if it does not already exist. Handles special cases like directories ending with '.0'.
 * @param {string} directory - The path to the directory to create.
 * @returns {Promise<{created: boolean, existed: boolean}>} - A promise that resolves with an object indicating whether the directory was created and if it existed beforehand.
 */
export declare function createDirectory({ directory, }: {
    directory: string;
}): Promise<{
    created: boolean;
    existed: boolean;
}>;
