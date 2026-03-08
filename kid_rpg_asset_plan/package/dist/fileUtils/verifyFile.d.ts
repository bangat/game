import { IFileDetails, IVerifyFileParams } from './fileUtilsTypes';
/**
 * Checks if a file exists, and if a size is specified, also checks if the file matches the expected size.
 * It returns detailed file information along with an operation status indicator.
 *
 * @param {IVerifyFileParams} params - The parameters for the function.
 * @returns {Promise<IFileDetails>} - The result object with detailed file information and a status message.
 */
export declare const verifyFile: (params: IVerifyFileParams) => Promise<IFileDetails>;
