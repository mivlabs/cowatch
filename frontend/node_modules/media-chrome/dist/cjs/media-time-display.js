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
var __privateSet = (obj, member, value, setter) => {
  __accessCheck(obj, member, "write to private field");
  setter ? setter.call(obj, value) : member.set(obj, value);
  return value;
};
var __privateMethod = (obj, member, method) => {
  __accessCheck(obj, member, "access private method");
  return method;
};
var media_time_display_exports = {};
__export(media_time_display_exports, {
  Attributes: () => Attributes,
  default: () => media_time_display_default
});
module.exports = __toCommonJS(media_time_display_exports);
var import_media_text_display = require("./media-text-display.js");
var import_element_utils = require("./utils/element-utils.js");
var import_server_safe_globals = require("./utils/server-safe-globals.js");
var import_time = require("./utils/time.js");
var import_constants = require("./constants.js");
var import_i18n = require("./utils/i18n.js");
var _slot, _keyUpHandler, _keyDownHandler, _setupEventListeners, setupEventListeners_fn, _removeEventListeners, removeEventListeners_fn, _makeInteractive, makeInteractive_fn, _makeNonInteractive, makeNonInteractive_fn;
const Attributes = {
  REMAINING: "remaining",
  SHOW_DURATION: "showduration",
  NO_TOGGLE: "notoggle"
};
const CombinedAttributes = [
  ...Object.values(Attributes),
  import_constants.MediaUIAttributes.MEDIA_CURRENT_TIME,
  import_constants.MediaUIAttributes.MEDIA_DURATION,
  import_constants.MediaUIAttributes.MEDIA_SEEKABLE
];
const ButtonPressedKeys = ["Enter", " "];
const DEFAULT_TIMES_SEP = "&nbsp;/&nbsp;";
const formatTimesLabel = (el, { timesSep = DEFAULT_TIMES_SEP } = {}) => {
  var _a, _b;
  const currentTime = (_a = el.mediaCurrentTime) != null ? _a : 0;
  const [, seekableEnd] = (_b = el.mediaSeekable) != null ? _b : [];
  let endTime = 0;
  if (Number.isFinite(el.mediaDuration)) {
    endTime = el.mediaDuration;
  } else if (Number.isFinite(seekableEnd)) {
    endTime = seekableEnd;
  }
  const timeLabel = el.remaining ? (0, import_time.formatTime)(0 - (endTime - currentTime)) : (0, import_time.formatTime)(currentTime);
  if (!el.showDuration)
    return timeLabel;
  return `${timeLabel}${timesSep}${(0, import_time.formatTime)(endTime)}`;
};
const updateAriaDescription = (el) => {
  var _a;
  const currentTime = el.mediaCurrentTime;
  const [, seekableEnd] = (_a = el.mediaSeekable) != null ? _a : [];
  let endTime = null;
  if (Number.isFinite(el.mediaDuration)) {
    endTime = el.mediaDuration;
  } else if (Number.isFinite(seekableEnd)) {
    endTime = seekableEnd;
  }
  if (currentTime == null || endTime === null) {
    el.setAttribute("aria-description", (0, import_i18n.t)("video not loaded, unknown time."));
    return;
  }
  const currentTimePhrase = el.remaining ? (0, import_time.formatAsTimePhrase)(0 - (endTime - currentTime)) : (0, import_time.formatAsTimePhrase)(currentTime);
  if (!el.showDuration) {
    el.setAttribute("aria-description", currentTimePhrase);
    return;
  }
  const totalTimePhrase = (0, import_time.formatAsTimePhrase)(endTime);
  const fullPhrase = (0, import_i18n.t)("{currentTime} of {totalTime}", {
    currentTime: currentTimePhrase,
    totalTime: totalTimePhrase
  });
  el.setAttribute("aria-description", fullPhrase);
};
function getSlotTemplateHTML(_attrs, props) {
  return (
    /*html*/
    `
    <slot>${formatTimesLabel(props)}</slot>
  `
  );
}
const updateAriaLabel = (el) => {
  el.setAttribute("aria-label", (0, import_i18n.t)("playback time"));
};
class MediaTimeDisplay extends import_media_text_display.MediaTextDisplay {
  constructor() {
    super();
    __privateAdd(this, _setupEventListeners);
    __privateAdd(this, _removeEventListeners);
    // Makes element clickable and focusable only when not disabled and noToggle is not present
    __privateAdd(this, _makeInteractive);
    // Removes interactivity from the element, making it neither clickable nor focusable
    __privateAdd(this, _makeNonInteractive);
    __privateAdd(this, _slot, void 0);
    __privateAdd(this, _keyUpHandler, null);
    __privateAdd(this, _keyDownHandler, (evt) => {
      const { metaKey, altKey, key } = evt;
      if (metaKey || altKey || !ButtonPressedKeys.includes(key)) {
        this.removeEventListener("keyup", __privateGet(this, _keyUpHandler));
        return;
      }
      this.addEventListener("keyup", __privateGet(this, _keyUpHandler));
    });
    __privateSet(this, _slot, this.shadowRoot.querySelector("slot"));
    __privateGet(this, _slot).innerHTML = `${formatTimesLabel(this)}`;
  }
  static get observedAttributes() {
    return [...super.observedAttributes, ...CombinedAttributes, "disabled"];
  }
  connectedCallback() {
    const { style } = (0, import_element_utils.getOrInsertCSSRule)(
      this.shadowRoot,
      ":host(:hover:not([notoggle]))"
    );
    style.setProperty("cursor", "var(--media-cursor, pointer)");
    style.setProperty(
      "background",
      "var(--media-control-hover-background, rgba(50 50 70 / .7))"
    );
    this.setAttribute("aria-label", (0, import_i18n.t)("playback time"));
    __privateMethod(this, _makeInteractive, makeInteractive_fn).call(this);
    super.connectedCallback();
  }
  toggleTimeDisplay() {
    if (this.noToggle) {
      return;
    }
    if (this.hasAttribute("remaining")) {
      this.removeAttribute("remaining");
    } else {
      this.setAttribute("remaining", "");
    }
  }
  disconnectedCallback() {
    this.disable();
    __privateMethod(this, _removeEventListeners, removeEventListeners_fn).call(this);
    super.disconnectedCallback();
  }
  attributeChangedCallback(attrName, oldValue, newValue) {
    updateAriaLabel(this);
    if (CombinedAttributes.includes(attrName)) {
      this.update();
    } else if (attrName === "disabled" && newValue !== oldValue) {
      if (newValue == null) {
        __privateMethod(this, _makeInteractive, makeInteractive_fn).call(this);
      } else {
        __privateMethod(this, _makeNonInteractive, makeNonInteractive_fn).call(this);
      }
    } else if (attrName === Attributes.NO_TOGGLE && newValue !== oldValue) {
      if (this.noToggle) {
        __privateMethod(this, _makeNonInteractive, makeNonInteractive_fn).call(this);
      } else {
        __privateMethod(this, _makeInteractive, makeInteractive_fn).call(this);
      }
    }
    super.attributeChangedCallback(attrName, oldValue, newValue);
  }
  enable() {
    if (!this.noToggle) {
      this.tabIndex = 0;
    }
  }
  disable() {
    this.tabIndex = -1;
  }
  // Own props
  /**
   * Whether to show the remaining time
   */
  get remaining() {
    return (0, import_element_utils.getBooleanAttr)(this, Attributes.REMAINING);
  }
  set remaining(show) {
    (0, import_element_utils.setBooleanAttr)(this, Attributes.REMAINING, show);
  }
  /**
   * Whether to show the duration
   */
  get showDuration() {
    return (0, import_element_utils.getBooleanAttr)(this, Attributes.SHOW_DURATION);
  }
  set showDuration(show) {
    (0, import_element_utils.setBooleanAttr)(this, Attributes.SHOW_DURATION, show);
  }
  /**
   * Disable the default behavior that toggles between current and remaining time
   */
  get noToggle() {
    return (0, import_element_utils.getBooleanAttr)(this, Attributes.NO_TOGGLE);
  }
  set noToggle(noToggle) {
    (0, import_element_utils.setBooleanAttr)(this, Attributes.NO_TOGGLE, noToggle);
  }
  // Props derived from media UI attributes
  /**
   * Get the duration
   */
  get mediaDuration() {
    return (0, import_element_utils.getNumericAttr)(this, import_constants.MediaUIAttributes.MEDIA_DURATION);
  }
  set mediaDuration(time) {
    (0, import_element_utils.setNumericAttr)(this, import_constants.MediaUIAttributes.MEDIA_DURATION, time);
  }
  /**
   * The current time in seconds
   */
  get mediaCurrentTime() {
    return (0, import_element_utils.getNumericAttr)(this, import_constants.MediaUIAttributes.MEDIA_CURRENT_TIME);
  }
  set mediaCurrentTime(time) {
    (0, import_element_utils.setNumericAttr)(this, import_constants.MediaUIAttributes.MEDIA_CURRENT_TIME, time);
  }
  /**
   * Range of values that can be seeked to.
   * An array of two numbers [start, end]
   */
  get mediaSeekable() {
    const seekable = this.getAttribute(import_constants.MediaUIAttributes.MEDIA_SEEKABLE);
    if (!seekable)
      return void 0;
    return seekable.split(":").map((time) => +time);
  }
  set mediaSeekable(range) {
    if (range == null) {
      this.removeAttribute(import_constants.MediaUIAttributes.MEDIA_SEEKABLE);
      return;
    }
    this.setAttribute(import_constants.MediaUIAttributes.MEDIA_SEEKABLE, range.join(":"));
  }
  update() {
    const timesLabel = formatTimesLabel(this);
    updateAriaDescription(this);
    if (timesLabel !== __privateGet(this, _slot).innerHTML) {
      __privateGet(this, _slot).innerHTML = timesLabel;
    }
  }
}
_slot = new WeakMap();
_keyUpHandler = new WeakMap();
_keyDownHandler = new WeakMap();
_setupEventListeners = new WeakSet();
setupEventListeners_fn = function() {
  if (__privateGet(this, _keyUpHandler)) {
    return;
  }
  __privateSet(this, _keyUpHandler, (evt) => {
    const { key } = evt;
    if (!ButtonPressedKeys.includes(key)) {
      this.removeEventListener("keyup", __privateGet(this, _keyUpHandler));
      return;
    }
    this.toggleTimeDisplay();
  });
  this.addEventListener("keydown", __privateGet(this, _keyDownHandler));
  this.addEventListener("click", this.toggleTimeDisplay);
};
_removeEventListeners = new WeakSet();
removeEventListeners_fn = function() {
  if (__privateGet(this, _keyUpHandler)) {
    this.removeEventListener("keyup", __privateGet(this, _keyUpHandler));
    this.removeEventListener("keydown", __privateGet(this, _keyDownHandler));
    this.removeEventListener("click", this.toggleTimeDisplay);
    __privateSet(this, _keyUpHandler, null);
  }
};
_makeInteractive = new WeakSet();
makeInteractive_fn = function() {
  if (!this.noToggle && !this.hasAttribute("disabled")) {
    this.setAttribute("role", "button");
    this.enable();
    __privateMethod(this, _setupEventListeners, setupEventListeners_fn).call(this);
  }
};
_makeNonInteractive = new WeakSet();
makeNonInteractive_fn = function() {
  this.removeAttribute("role");
  this.disable();
  __privateMethod(this, _removeEventListeners, removeEventListeners_fn).call(this);
};
MediaTimeDisplay.getSlotTemplateHTML = getSlotTemplateHTML;
if (!import_server_safe_globals.globalThis.customElements.get("media-time-display")) {
  import_server_safe_globals.globalThis.customElements.define("media-time-display", MediaTimeDisplay);
}
var media_time_display_default = MediaTimeDisplay;
