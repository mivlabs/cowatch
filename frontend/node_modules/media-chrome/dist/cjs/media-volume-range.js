var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
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
var media_volume_range_exports = {};
__export(media_volume_range_exports, {
  default: () => media_volume_range_default
});
module.exports = __toCommonJS(media_volume_range_exports);
var import_server_safe_globals = require("./utils/server-safe-globals.js");
var import_media_chrome_range = require("./media-chrome-range.js");
var import_constants = require("./constants.js");
var import_i18n = require("./utils/i18n.js");
var import_element_utils = require("./utils/element-utils.js");
var _handleRangeInput;
const DEFAULT_VOLUME = 1;
const toVolume = (el) => {
  if (el.mediaMuted)
    return 0;
  return el.mediaVolume;
};
const formatAsPercentString = (value) => `${Math.round(value * 100)}%`;
class MediaVolumeRange extends import_media_chrome_range.MediaChromeRange {
  constructor() {
    super(...arguments);
    __privateAdd(this, _handleRangeInput, () => {
      const detail = this.range.value;
      const evt = new import_server_safe_globals.globalThis.CustomEvent(
        import_constants.MediaUIEvents.MEDIA_VOLUME_REQUEST,
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
      import_constants.MediaUIAttributes.MEDIA_VOLUME,
      import_constants.MediaUIAttributes.MEDIA_MUTED,
      import_constants.MediaUIAttributes.MEDIA_VOLUME_UNAVAILABLE
    ];
  }
  connectedCallback() {
    super.connectedCallback();
    this.range.setAttribute("aria-label", (0, import_i18n.t)("volume"));
    this.range.addEventListener("input", __privateGet(this, _handleRangeInput));
  }
  disconnectedCallback() {
    this.range.removeEventListener("input", __privateGet(this, _handleRangeInput));
    super.disconnectedCallback();
  }
  attributeChangedCallback(attrName, oldValue, newValue) {
    super.attributeChangedCallback(attrName, oldValue, newValue);
    if (attrName === import_constants.MediaUIAttributes.MEDIA_VOLUME || attrName === import_constants.MediaUIAttributes.MEDIA_MUTED) {
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
    return (0, import_element_utils.getNumericAttr)(this, import_constants.MediaUIAttributes.MEDIA_VOLUME, DEFAULT_VOLUME);
  }
  set mediaVolume(value) {
    (0, import_element_utils.setNumericAttr)(this, import_constants.MediaUIAttributes.MEDIA_VOLUME, value);
  }
  /**
   * Is the media currently muted
   */
  get mediaMuted() {
    return (0, import_element_utils.getBooleanAttr)(this, import_constants.MediaUIAttributes.MEDIA_MUTED);
  }
  set mediaMuted(value) {
    (0, import_element_utils.setBooleanAttr)(this, import_constants.MediaUIAttributes.MEDIA_MUTED, value);
  }
  /**
   * The volume unavailability state
   */
  get mediaVolumeUnavailable() {
    return (0, import_element_utils.getStringAttr)(this, import_constants.MediaUIAttributes.MEDIA_VOLUME_UNAVAILABLE);
  }
  set mediaVolumeUnavailable(value) {
    (0, import_element_utils.setStringAttr)(this, import_constants.MediaUIAttributes.MEDIA_VOLUME_UNAVAILABLE, value);
  }
}
_handleRangeInput = new WeakMap();
if (!import_server_safe_globals.globalThis.customElements.get("media-volume-range")) {
  import_server_safe_globals.globalThis.customElements.define("media-volume-range", MediaVolumeRange);
}
var media_volume_range_default = MediaVolumeRange;
