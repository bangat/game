#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.run = run;
const downloadGame_1 = require("./itchDownloader/downloadGame");
function run() {
    return __awaiter(this, arguments, void 0, function* (argvInput = process.argv, onProgress) {
        const yargs = (yield Promise.resolve().then(() => __importStar(require('yargs')))).default;
        const hideBin = (args) => args.slice(2);
        const argv = yargs(hideBin(argvInput))
            .option('url', {
            describe: 'The full URL to the game on itch.io',
            type: 'string',
        })
            .option('name', {
            describe: 'The name of the game to download',
            type: 'string',
        })
            .option('author', {
            describe: 'The author of the game',
            type: 'string',
        })
            .option('downloadDirectory', {
            describe: 'The filepath where the game will be downloaded',
            type: 'string',
        })
            .option('retries', {
            describe: 'Number of retry attempts on failure',
            type: 'number',
            default: 0,
        })
            .option('retryDelay', {
            describe: 'Base delay in ms for exponential backoff',
            type: 'number',
            default: 500,
        })
            .option('concurrency', {
            describe: 'Maximum number of simultaneous downloads when providing a list of games',
            type: 'number',
            default: 1,
        })
            .check((args) => {
            // Ensure either URL is provided or both name and author are provided
            if (args.url) {
                return true;
            }
            else if (args.name && args.author) {
                return true;
            }
            else {
                throw new Error('Please provide either a URL or both name and author.');
            }
        })
            .help()
            .alias('help', 'h')
            .parseSync();
        const params = {
            itchGameUrl: argv.url,
            name: argv.name,
            author: argv.author,
            downloadDirectory: argv.downloadDirectory,
            retries: argv.retries !== undefined ? Number(argv.retries) : undefined,
            retryDelayMs: argv.retryDelay !== undefined ? Number(argv.retryDelay) : undefined,
        };
        if (onProgress) {
            params.onProgress = onProgress;
        }
        const concurrency = argv.concurrency !== undefined ? Number(argv.concurrency) : 1;
        try {
            const result = yield (0, downloadGame_1.downloadGame)(params, concurrency);
            console.log('Game Download Result:', result);
        }
        catch (error) {
            console.error('Error downloading game:', error);
        }
    });
}
if (require.main === module) {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    run(process.argv, ({ bytesReceived, totalBytes }) => {
        if (totalBytes) {
            const percent = ((bytesReceived / totalBytes) * 100).toFixed(2);
            process.stdout.write(`Download progress: ${percent}%\r`);
        }
        else {
            process.stdout.write(`Downloaded ${bytesReceived} bytes\r`);
        }
    });
}
