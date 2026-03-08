import { IParsedItchGameMetadata } from './types';
/**
 * Fetches and parses game metadata from an Itch.io JSON file.
 * @param {object} params - Parameters that can include a direct URL or author and game name.
 * @returns {Promise<IParsedItchGameMetadata>} - The parsed metadata object.
 */
export declare const parseItchGameMetadata: ({ itchGameUrl, author, name, domain, }: {
    itchGameUrl?: string;
    author?: string;
    name?: string;
    domain?: string;
}) => Promise<IParsedItchGameMetadata>;
