import { IParsedItchGameUrl } from './types';
/**
 * Parses a specific Itch.io URL format to extract the author and name information,
 * as well as any part of the URL that follows the author's segment.
 * @param {string} url - The Itch.io URL to be parsed.
 * @returns {IParsedItchGameUrl} - An object containing the parsing status, author, name, the original URL, and the domain segment.
 */
export declare const parseItchGameUrl: ({ itchGameUrl, }: {
    itchGameUrl: string;
}) => IParsedItchGameUrl;
