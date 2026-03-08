"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseItchGameUrl = void 0;
/**
 * Parses a specific Itch.io URL format to extract the author and name information,
 * as well as any part of the URL that follows the author's segment.
 * @param {string} url - The Itch.io URL to be parsed.
 * @returns {IParsedItchGameUrl} - An object containing the parsing status, author, name, the original URL, and the domain segment.
 */
const parseItchGameUrl = ({ itchGameUrl, }) => {
    let author = undefined;
    let name = undefined;
    let domain = '.itch.io'; // Setting the domain statically to .itch.io
    let parsed = false;
    let message = 'Initialization of URL parsing.';
    try {
        // Updated regex pattern to correctly extract author and game name
        const urlPattern = /^(https?:\/\/)?([\w-]+)\.itch\.io\/([\w-]+)\/?$/;
        const match = itchGameUrl.match(urlPattern);
        if (match && match.length >= 4) {
            author = match[2];
            name = match[3];
            parsed = true;
            message = 'URL parsed successfully.';
        }
        else {
            throw new Error('URL does not match expected format.');
        }
    }
    catch (error) {
        author = undefined;
        name = undefined;
        message = error.message;
    }
    return {
        parsed,
        author,
        name,
        domain,
        message,
        itchGameUrl,
    };
};
exports.parseItchGameUrl = parseItchGameUrl;
