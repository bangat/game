"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseItchGameMetadata = void 0;
/**
 * Fetches and parses game metadata from an Itch.io JSON file.
 * @param {object} params - Parameters that can include a direct URL or author and game name.
 * @returns {Promise<IParsedItchGameMetadata>} - The parsed metadata object.
 */
const parseItchGameMetadata = (_a) => __awaiter(void 0, [_a], void 0, function* ({ itchGameUrl, author, name, domain = 'itch.io', }) {
    if (!itchGameUrl && author && name) {
        itchGameUrl = `https://${author}.${domain}/${name}/data.json`;
    }
    if (!itchGameUrl ||
        !itchGameUrl.includes('.itch.io/') ||
        !itchGameUrl.endsWith('.json')) {
        return {
            jsonParsed: false,
            message: 'Invalid URL format. URL must be an Itch.io JSON file.',
        };
    }
    try {
        const response = yield fetch(itchGameUrl);
        if (!response.ok) {
            return {
                jsonParsed: false,
                statusCode: response.status,
                message: `HTTP error! status: ${response.status}`,
            };
        }
        const json = yield response.json();
        if (!json.title || !json.cover_image || !json.authors || !json.links) {
            throw new Error('JSON structure is incomplete or incorrect.');
        }
        const metadata = {
            jsonParsed: true,
            message: 'Metadata fetched successfully.',
            title: json.title,
            coverImage: json.cover_image,
            authors: json.authors,
            tags: json.tags || [],
            id: json.id,
            commentsLink: json.links.comments,
            selfLink: json.links.self,
            itchMetaDataUrl: itchGameUrl,
        };
        return metadata;
    }
    catch (error) {
        return {
            jsonParsed: false,
            statusCode: error.statusCode,
            message: `Failed to fetch or parse metadata: ${error.message}`,
        };
    }
});
exports.parseItchGameMetadata = parseItchGameMetadata;
