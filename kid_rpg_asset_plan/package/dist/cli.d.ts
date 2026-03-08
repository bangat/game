#!/usr/bin/env node
import { DownloadProgress } from './itchDownloader/types';
export declare function run(argvInput?: string[], onProgress?: (info: DownloadProgress) => void): Promise<void>;
