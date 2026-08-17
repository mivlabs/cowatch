import { MediaError } from './errors';
export interface NativeFairplayConfig {
    mediaEl: HTMLMediaElement;
    getAppCertificate: () => Promise<ArrayBuffer>;
    getLicenseKey: (spc: ArrayBuffer) => Promise<BufferSource>;
    saveAndDispatchError: (mediaEl: HTMLMediaElement, error: MediaError) => void;
    drmTypeCb: () => void;
    fallbackToWebkitFairplay?: () => Promise<void>;
}
export declare const setupEmeNativeFairplayDRM: ({ mediaEl, getAppCertificate, getLicenseKey, saveAndDispatchError, drmTypeCb, fallbackToWebkitFairplay, }: NativeFairplayConfig) => () => Promise<void>;
