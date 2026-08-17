import { NativeFairplayConfig } from './eme-fairplay';
/**
 * Legacy implementation of FairPlay setup.
 * The purpose of this flow is to address an OS specific issue when playing DRM
 * protected content over AirPlay on newer OS versions. Tries to replicate the setup
 * we do for EME DRM but using legacy WebKit functions.
 *
 * This flow can be removed once that issue is no longer present.
 */
export declare const setupWebkitNativeFairplayDRM: ({ mediaEl, getAppCertificate, getLicenseKey, saveAndDispatchError, drmTypeCb, }: NativeFairplayConfig) => () => void;
