import { DownloadGameParams, DownloadGameResponse } from './types';
export declare function downloadGame(params: DownloadGameParams | DownloadGameParams[], concurrency?: number): Promise<DownloadGameResponse | DownloadGameResponse[]>;
export declare function downloadGameSingle(params: DownloadGameParams): Promise<DownloadGameResponse>;
