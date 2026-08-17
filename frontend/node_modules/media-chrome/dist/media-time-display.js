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
var _slot, _keyUpHandler, _keyDownHandler, _setupEventListeners, setupEventListeners_fn, _removeEventListeners, removeEventListeners_fn, _makeInteractive, makeInteractive_fn, _makeNonInteractive, makeNonInteractive_fn;
import { MediaTextDisplay } from "./media-text-display.js";
import {
  getBooleanAttr,
  getNumericAttr,
  getOrInsertCSSRule,
  setBooleanAttr,
  setNumericAttr
} from "./utils/element-utils.js";
import { globalThis } from "./utils/server-safe-globals.js";
import { formatAsTimePhrase, formatTime } from "./utils/time.js";
import { MediaUIAttributes } from "./constants.js";
import { t } from "./utils/i18n.js";
const Attributes = {
  REMAINING: "remaining",
  SHOW_DURATION: "showduration",
  NO_TOGGLE: "notoggle"
};
const CombinedAttributes = [
  ...Object.values(Attributes),
  MediaUIAttributes.MEDIA_CURRENT_TIME,
  MediaUIAttributes.MEDIA_DURATION,
  MediaUIAttributes.MEDIA_SEEKABLE
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
  const timeLabel = el.remaining ? formatTime(0 - (endTime - currentTime)) : formatTime(currentTime);
  if (!el.showDuration)
    return timeLabel;
  return `${timeLabel}${timesSep}${formatTime(endTime)}`;
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
    el.setAttribute("aria-description", t("video not loaded, unknown time."));
    return;
  }
  const currentTimePhrase = el.remaining ? formatAsTimePhrase(0 - (endTime - currentTime)) : formatAsTimePhrase(currentTime);
  if (!el.showDuration) {
    el.setAttribute("aria-description", currentTimePhrase);
    return;
  }
  const totalTimePhrase = formatAsTimePhrase(endTime);
  const fullPhrase = t("{currentTime} of {totalTime}", {
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
  el.setAttribute("aria-label", t("playback time"));
};
class MediaTimeDisplay extends MediaTextDisplay {
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
    const { style } = getOrInsertCSSRule(
      this.shadowRoot,
      ":host(:hover:not([notoggle]))"
    );
    style.setProperty("cursor", "var(--media-cursor, pointer)");
    style.setProperty(
      "background",
      "var(--media-control-hover-background, rgba(50 50 70 / .7))"
    );
    this.setAttribute("aria-label", t("playback time"));
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
    return getBooleanAttr(this, Attributes.REMAINING);
  }
  set remaining(show) {
    setBooleanAttr(this, Attributes.REMAINING, show);
  }
  /**
   * Whether to show the duration
   */
  get showDuration() {
    return getBooleanAttr(this, Attributes.SHOW_DURATION);
  }
  set showDuration(show) {
    setBooleanAttr(this, Attributes.SHOW_DURATION, show);
  }
  /**
   * Disable the default behavior that toggles between current and remaining time
   */
  get noToggle() {
    return getBooleanAttr(this, Attributes.NO_TOGGLE);
  }
  set noToggle(noToggle) {
    setBooleanAttr(this, Attributes.NO_TOGGLE, noToggle);
  }
  // Props derived from media UI attributes
  /**
   * Get the duration
   */
  get mediaDuration() {
    return getNumericAttr(this, MediaUIAttributes.MEDIA_DURATION);
  }
  set mediaDuration(time) {
    setNumericAttr(this, MediaUIAttributes.MEDIA_DURATION, time);
  }
  /**
   * The current time in seconds
   */
  get mediaCurrentTime() {
    return getNumericAttr(this, MediaUIAttributes.MEDIA_CURRENT_TIME);
  }
  set mediaCurrentTime(time) {
    setNumericAttr(this, MediaUIAttributes.MEDIA_CURRENT_TIME, time);
  }
  /**
   * Range of values that can be seeked to.
   * An array of two numbers [start, end]
   */
  get mediaSeekable() {
    const seekable = this.getAttribute(MediaUIAttributes.MEDIA_SEEKABLE);
    if (!seekable)
      return void 0;
    return seekable.split(":").map((time) => +time);
  }
  set mediaSeekable(range) {
    if (range == null) {
      this.removeAttribute(MediaUIAttributes.MEDIA_SEEKABLE);
      return;
    }
    this.setAttribute(MediaUIAttributes.MEDIA_SEEKABLE, range.join(":"));
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
if (!globalThis.customElements.get("media-time-display")) {
  globalThis.customElements.define("media-time-display", MediaTimeDisplay);
}
var media_time_display_default = MediaTimeDisplay;
export {
  Attributes,
  media_time_display_default as default
};
