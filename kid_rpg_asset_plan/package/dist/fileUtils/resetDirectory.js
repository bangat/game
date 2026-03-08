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
exports.resetDirectory = void 0;
const destroy_1 = require("./destroy"); // Assuming this is the file path
const createDirectory_1 = require("./createDirectory");
/**
 * Resets a directory by destroying it and then recreating it.
 * This function uses the destroy and createDirectory functions to handle the operations.
 *
 * @param {string} directoryPath - The path to the directory to reset.
 * @returns {Promise<{ overallStatus: boolean; destroyStatus: boolean; createStatus: boolean; message: string }>} - Object indicating whether the reset was successful, includes a status message.
 */
const resetDirectory = (_a) => __awaiter(void 0, [_a], void 0, function* ({ directoryPath, }) {
    let reset = false;
    let existed = false;
    let destroyed = false;
    let created = false;
    let message = '';
    try {
        // Attempt to destroy the directory first
        destroyed = (yield (0, destroy_1.destroy)({ pathToDestroy: directoryPath })).destroyed;
        // If destruction was successful, recreate the directory
        const createResults = yield (0, createDirectory_1.createDirectory)({ directory: directoryPath });
        existed = createResults.existed;
        created = createResults.created;
        // Determine the appropriate message
        if (created && !existed && !destroyed) {
            message =
                'The directory did not exist and was created successfully; no reset was necessary.';
        }
        else if (destroyed && created) {
            message = 'Directory reset successfully.';
        }
        else if (!destroyed && created && existed) {
            message = 'The directory already existed and was successfully recreated.';
        }
        else {
            message =
                'Directory reset failed. Check individual statuses for details.';
        }
        //set reset to true if destroyed and created were true or if created was true and existed was false.
        reset = (destroyed && created) || (created && !existed && !destroyed);
        return {
            reset,
            destroyed,
            created,
            existed,
            message: reset
                ? 'Directory reset successfully.'
                : 'Directory reset failed. Check individual statuses for details.',
        };
    }
    catch (error) {
        return {
            reset,
            destroyed,
            created,
            existed,
            message: `Error during directory reset: ${error.message}`,
        };
    }
});
exports.resetDirectory = resetDirectory;
