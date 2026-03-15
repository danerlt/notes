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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _RspackVirtualModulePlugin_instances, _RspackVirtualModulePlugin_staticModules, _RspackVirtualModulePlugin_tempDir, _RspackVirtualModulePlugin_normalizePath;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RspackVirtualModulePlugin = void 0;
const path_1 = __importStar(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const fs_extra_1 = __importDefault(require("fs-extra"));
class RspackVirtualModulePlugin {
    constructor(staticModules, tempDir) {
        _RspackVirtualModulePlugin_instances.add(this);
        _RspackVirtualModulePlugin_staticModules.set(this, void 0);
        _RspackVirtualModulePlugin_tempDir.set(this, void 0);
        __classPrivateFieldSet(this, _RspackVirtualModulePlugin_staticModules, staticModules, "f");
        const nodeModulesDir = (0, path_1.join)(process.cwd(), 'node_modules');
        if (!fs_extra_1.default.existsSync(nodeModulesDir)) {
            fs_extra_1.default.mkdirSync(nodeModulesDir);
        }
        if (!tempDir) {
            const hash = crypto_1.default
                .createHash('md5')
                .update(JSON.stringify(__classPrivateFieldGet(this, _RspackVirtualModulePlugin_staticModules, "f")))
                .digest('hex')
                .slice(0, 8);
            __classPrivateFieldSet(this, _RspackVirtualModulePlugin_tempDir, path_1.default.join(nodeModulesDir, `rspack-virtual-module-${hash}`), "f");
        }
        else {
            __classPrivateFieldSet(this, _RspackVirtualModulePlugin_tempDir, path_1.default.join(nodeModulesDir, tempDir), "f");
        }
        if (!fs_extra_1.default.existsSync(__classPrivateFieldGet(this, _RspackVirtualModulePlugin_tempDir, "f"))) {
            fs_extra_1.default.mkdirSync(__classPrivateFieldGet(this, _RspackVirtualModulePlugin_tempDir, "f"));
        }
    }
    apply(compiler) {
        // Write the modules to the disk
        Object.entries(__classPrivateFieldGet(this, _RspackVirtualModulePlugin_staticModules, "f")).forEach(([path, content]) => {
            this.writeModule(path, content);
        });
        const originalResolveModulesDir = compiler.options.resolve.modules || [
            'node_modules',
        ];
        compiler.options.resolve.modules = [
            ...originalResolveModulesDir,
            __classPrivateFieldGet(this, _RspackVirtualModulePlugin_tempDir, "f"),
        ];
        compiler.options.resolve.alias = Object.assign(Object.assign({}, compiler.options.resolve.alias), Object.keys(__classPrivateFieldGet(this, _RspackVirtualModulePlugin_staticModules, "f")).reduce((acc, p) => {
            acc[p] = __classPrivateFieldGet(this, _RspackVirtualModulePlugin_instances, "m", _RspackVirtualModulePlugin_normalizePath).call(this, p);
            return acc;
        }, {}));
        process.on('exit', this.clear.bind(this));
    }
    writeModule(path, content) {
        const normalizedPath = __classPrivateFieldGet(this, _RspackVirtualModulePlugin_instances, "m", _RspackVirtualModulePlugin_normalizePath).call(this, path);
        fs_extra_1.default.ensureDirSync((0, path_1.dirname)(normalizedPath));
        fs_extra_1.default.writeFileSync(normalizedPath, content);
    }
    clear() {
        fs_extra_1.default.removeSync(__classPrivateFieldGet(this, _RspackVirtualModulePlugin_tempDir, "f"));
    }
}
exports.RspackVirtualModulePlugin = RspackVirtualModulePlugin;
_RspackVirtualModulePlugin_staticModules = new WeakMap(), _RspackVirtualModulePlugin_tempDir = new WeakMap(), _RspackVirtualModulePlugin_instances = new WeakSet(), _RspackVirtualModulePlugin_normalizePath = function _RspackVirtualModulePlugin_normalizePath(p) {
    const ext = (0, path_1.extname)(p);
    return (0, path_1.join)(__classPrivateFieldGet(this, _RspackVirtualModulePlugin_tempDir, "f"), ext ? p : `${p}.js`);
};
exports.default = RspackVirtualModulePlugin;
