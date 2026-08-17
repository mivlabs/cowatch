var __accessCheck = (obj, member, msg) => {
  if (!member.has(obj))
    throw TypeError("Cannot " + msg);
};
var __privateGet = (obj, member, getter) => {
  __accessCheck(obj, member, "read from private field");
  return getter ? getter.call(obj) : member.get(obj);
};
var __privateAdd = (obj, member, value) => {
  if (member.has(obj))
    throw TypeError("Cannot add the same private member more than once");
  member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
};
var _handleRangeInput;
import { globalThis } from "./utils/server-safe-globals.js";
import { MediaChromeRange } from "./media-chrome-range.js";
import { MediaUIAttributes, MediaUIEvents } from "./constants.js";
import { t } from "./utils/i18n.js";
import {
  getBooleanAttr,
  getNumericAttr,
  getStringAttr,
  setBooleanAttr,
  setNumericAttr,
  setStringAttr
} from "./utils/element-utils.js";
const DEFAULT_VOLUME = 1;
const toVolume = (el) => {
  if (el.mediaMuted)
    return 0;
  return el.mediaVolume;
};
const formatAsPercentString = (value) => `${Math.round(value * 100)}%`;
class MediaVolumeRange extends MediaChromeRange {
  constructor() {
    super(...arguments);
    __privateAdd(this, _handleRangeInput, () => {
      const detail = this.range.value;
      const evt = new globalThis.CustomEvent(
        MediaUIEvents.MEDIA_VOLUME_REQUEST,
        {
          composed: true,
          bubbles: true,
          detail
        }
      );
      this.dispatchEvent(evt);
    });
  }
  static get observedAttributes() {
    return [
      ...super.observedAttributes,
      MediaUIAttributes.MEDIA_VOLUME,
      MediaUIAttributes.MEDIA_MUTED,
      MediaUIAttributes.MEDIA_VOLUME_UNAVAILABLE
    ];
  }
  connectedCallback() {
    super.connectedCallback();
    this.range.setAttribute("aria-label", t("volume"));
    this.range.addEventListener("input", __privateGet(this, _handleRangeInput));
  }
  disconnectedCallback() {
    this.range.removeEventListener("input", __privateGet(this, _handleRangeInput));
    super.disconnectedCallback();
  }
  attributeChangedCallback(attrName, oldValue, newValue) {
    super.attributeChangedCallback(attrName, oldValue, newValue);
    if (attrName === MediaUIAttributes.MEDIA_VOLUME || attrName === MediaUIAttributes.MEDIA_MUTED) {
      this.range.valueAsNumber = toVolume(this);
      this.range.setAttribute(
        "aria-valuetext",
        formatAsPercentString(this.range.valueAsNumber)
      );
      this.updateBar();
    }
  }
  /**
   *
   */
  get mediaVolume() {
    return getNumericAttr(this, MediaUIAttributes.MEDIA_VOLUME, DEFAULT_VOLUME);
  }
  set mediaVolume(value) {
    setNumericAttr(this, MediaUIAttributes.MEDIA_VOLUME, value);
  }
  /**
   * Is the media currently muted
   */
  get mediaMuted() {
    return getBooleanAttr(this, MediaUIAttributes.MEDIA_MUTED);
  }
  set mediaMuted(value) {
    setBooleanAttr(this, MediaUIAttributes.MEDIA_MUTED, value);
  }
  /**
   * The volume unavailability state
   */
  get mediaVolumeUnavailable() {
    return getStringAttr(this, MediaUIAttributes.MEDIA_VOLUME_UNAVAILABLE);
  }
  set mediaVolumeUnavailable(value) {
    setStringAttr(this, MediaUIAttributes.MEDIA_VOLUME_UNAVAILABLE, value);
  }
}
_handleRangeInput = new WeakMap();
if (!globalThis.customElements.get("media-volume-range")) {
  globalThis.customElements.define("media-volume-range", MediaVolumeRange);
}
var media_volume_range_default = MediaVolumeRange;
export {
  media_volume_range_default as default
};
