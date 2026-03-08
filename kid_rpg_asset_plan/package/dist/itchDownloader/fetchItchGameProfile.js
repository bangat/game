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
exports.fetchItchGameProfile = void 0;
const parseItchGameUrl_1 = require("./parseItchGameUrl");
const parseItchGameMetadata_1 = require("./parseItchGameMetadata");
const fetchItchGameProfile = (_a) => __awaiter(void 0, [_a], void 0, function* ({ itchGameUrl, author, name, domain = 'itch.io', }) {
    if (!itchGameUrl && author && name) {
        itchGameUrl = `https://${author}.${domain}/${name}`;
    }
    if (!itchGameUrl) {
        throw new Error('Insufficient parameters: either a full URL or both author and name must be provided.');
    }
    let urlData = null;
    let metaData = null;
    let urlError = null;
    let metadataError = null;
    let statusCode = undefined;
    try {
        urlData = (0, parseItchGameUrl_1.parseItchGameUrl)({ itchGameUrl });
        if (!urlData.parsed) {
            urlError = new Error('URL parsing failed: ' + urlData.message);
        }
    }
    catch (error) {
        urlError = new Error('URL parsing exception: ' + error.message);
    }
    try {
        metaData = yield (0, parseItchGameMetadata_1.parseItchGameMetadata)({
            itchGameUrl: `${itchGameUrl}/data.json`,
        });
        if (!metaData.jsonParsed) {
            metadataError = new Error('Metadata fetching failed: ' + metaData.message);
            if (metaData.statusCode)
                statusCode = metaData.statusCode;
        }
    }
    catch (error) {
        metadataError = new Error('Metadata fetching exception: ' + error.message);
    }
    const successfulOperations = urlData && metaData
        ? 2 - (Number(!!urlError) + Number(!!metadataError))
        : 0;
    const found = successfulOperations > 0;
    if (!found) {
        // If both operations failed
        console.error('Both URL parsing and metadata fetching failed:', urlError, metadataError);
        const err = new Error('Both URL parsing and metadata fetching failed. ' +
            (urlError === null || urlError === void 0 ? void 0 : urlError.message) +
            ' ' +
            (metadataError === null || metadataError === void 0 ? void 0 : metadataError.message));
        if (statusCode)
            err.statusCode = statusCode;
        throw err;
    }
    if (!urlData || !metaData) {
        console.error('One of the parsing operations failed:', (urlError === null || urlError === void 0 ? void 0 : urlError.message) || (metadataError === null || metadataError === void 0 ? void 0 : metadataError.message));
        const err = new Error('One of the parsing operations failed: ' +
            ((urlError === null || urlError === void 0 ? void 0 : urlError.message) || (metadataError === null || metadataError === void 0 ? void 0 : metadataError.message)));
        if (statusCode)
            err.statusCode = statusCode;
        throw err;
    }
    const itchRecord = {
        title: metaData.title,
        coverImage: metaData.coverImage,
        authors: metaData.authors,
        tags: metaData.tags || [],
        id: metaData.id,
        commentsLink: metaData.commentsLink,
        selfLink: metaData.selfLink,
        author: urlData.author,
        name: urlData.name,
        domain: urlData.domain,
        itchGameUrl: itchGameUrl,
        itchMetaDataUrl: metaData.itchMetaDataUrl,
    };
    return {
        found: true,
        itchRecord,
        message: 'Game profile fetched successfully.',
    };
});
exports.fetchItchGameProfile = fetchItchGameProfile;
