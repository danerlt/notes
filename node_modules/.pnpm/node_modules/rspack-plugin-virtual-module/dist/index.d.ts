import type { RspackPluginInstance, Compiler } from '@rspack/core';
export declare class RspackVirtualModulePlugin implements RspackPluginInstance {
    #private;
    constructor(staticModules: Record<string, string>, tempDir?: string);
    apply(compiler: Compiler): void;
    writeModule(path: string, content: string): void;
    clear(): void;
}
export default RspackVirtualModulePlugin;
