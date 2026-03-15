import { addLeadingSlash, isProduction, normalizeSlash, removeTrailingSlash } from '@rspress/shared';
export declare function withBase(url?: string): string;
export declare function removeBase(url: string): string;
export declare function isEqualPath(a: string, b: string): boolean;
export declare function normalizeHrefInRuntime(a: string): string;
export declare function normalizeImagePath(imagePath: string): string;
export declare function isAbsoluteUrl(path: string): boolean;
export { addLeadingSlash, removeTrailingSlash, normalizeSlash, isProduction };
