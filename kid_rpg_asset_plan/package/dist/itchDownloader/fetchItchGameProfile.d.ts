import { IItchGameProfileResponse } from './types';
export declare const fetchItchGameProfile: ({ itchGameUrl, author, name, domain, }: {
    itchGameUrl?: string;
    author?: string;
    name?: string;
    domain?: string;
}) => Promise<IItchGameProfileResponse>;
