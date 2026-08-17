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
var de_exports = {};
__export(de_exports, {
  De: () => De
});
module.exports = __toCommonJS(de_exports);
var import_i18n = require("../utils/i18n.js");
const De = {
  "Start airplay": "AirPlay starten",
  "Stop airplay": "AirPlay stoppen",
  Audio: "Audio",
  Captions: "Untertitel",
  "Enable captions": "Untertitel aktivieren",
  "Disable captions": "Untertitel deaktivieren",
  "Start casting": "Casting starten",
  "Stop casting": "Casting stoppen",
  "Enter fullscreen mode": "Vollbildmodus aktivieren",
  "Exit fullscreen mode": "Vollbildmodus beenden",
  Mute: "Stumm schalten",
  Unmute: "Stummschaltung aufheben",
  Loop: "Endlosschleife",
  "Enter picture in picture mode": "Bild-im-Bild-Modus aktivieren",
  "Exit picture in picture mode": "Bild-im-Bild-Modus beenden",
  Play: "Abspielen",
  Pause: "Pause",
  "Playback rate": "Wiedergabegeschwindigkeit",
  "Playback rate {playbackRate}": "Wiedergabegeschwindigkeit {playbackRate}",
  Quality: "Qualit\xE4t",
  "Seek backward": "Zur\xFCckspulen",
  "Seek forward": "Vorspulen",
  Settings: "Einstellungen",
  Auto: "Auto",
  "audio player": "Audioplayer",
  "video player": "Videoplayer",
  volume: "Lautst\xE4rke",
  seek: "Springen",
  "closed captions": "Untertitel",
  "current playback rate": "aktuelle Wiedergabegeschwindigkeit",
  "playback time": "Wiedergabezeit",
  "media loading": "Medien werden geladen",
  settings: "Einstellungen",
  "audio tracks": "Audiospuren",
  quality: "Qualit\xE4t",
  play: "abspielen",
  pause: "pause",
  mute: "stumm schalten",
  unmute: "Stummschaltung aufheben",
  "chapter: {chapterName}": "Kapitel: {chapterName}",
  live: "live",
  Off: "Aus",
  "start airplay": "AirPlay starten",
  "stop airplay": "AirPlay stoppen",
  "start casting": "Casting starten",
  "stop casting": "Casting stoppen",
  "enter fullscreen mode": "Vollbildmodus aktivieren",
  "exit fullscreen mode": "Vollbildmodus beenden",
  "enter picture in picture mode": "Bild-im-Bild-Modus aktivieren",
  "exit picture in picture mode": "Bild-im-Bild-Modus beenden",
  "seek to live": "Zum Live-Stream springen",
  "playing live": "Live-Wiedergabe",
  "seek back {seekOffset} seconds": "{seekOffset} Sekunden zur\xFCckspulen",
  "seek forward {seekOffset} seconds": "{seekOffset} Sekunden vorspulen",
  "Network Error": "Netzwerkfehler",
  "Decode Error": "Dekodierungsfehler",
  "Source Not Supported": "Quelle nicht unterst\xFCtzt",
  "Encryption Error": "Verschl\xFCsselungsfehler",
  "A network error caused the media download to fail.": "Ein Netzwerkfehler hat dazu gef\xFChrt, dass der Medien-Download fehlgeschlagen ist.",
  "A media error caused playback to be aborted. The media could be corrupt or your browser does not support this format.": "Ein Medienfehler hat die Wiedergabe abgebrochen. Das Medium k\xF6nnte besch\xE4digt sein oder Ihr Browser unterst\xFCtzt dieses Format nicht.",
  "An unsupported error occurred. The server or network failed, or your browser does not support this format.": "Ein nicht unterst\xFCtzter Fehler ist aufgetreten. Der Server oder das Netzwerk ist fehlgeschlagen, oder Ihr Browser unterst\xFCtzt dieses Format nicht.",
  "The media is encrypted and there are no keys to decrypt it.": "Das Medium ist verschl\xFCsselt und es sind keine Schl\xFCssel zum Entschl\xFCsseln vorhanden.",
  hour: "Stunde",
  hours: "Stunden",
  minute: "Minute",
  minutes: "Minuten",
  second: "Sekunde",
  seconds: "Sekunden",
  "{time} remaining": "{time} verbleibend",
  "{currentTime} of {totalTime}": "{currentTime} von {totalTime}",
  "video not loaded, unknown time.": "Video nicht geladen, unbekannte Zeit."
};
(0, import_i18n.addTranslation)("de", De);
