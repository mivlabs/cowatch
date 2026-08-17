//#region src/arrayBufferToHex.d.ts
/**
* Encodes an ArrayBuffer as a hexadecimal string.
*
* @param buffer - The ArrayBuffer to encode.
* @returns The hexadecimal string representation.
*
* @public
*
* @example
* {@includeCode ../test/arrayBufferToHex.test.ts#example}
*/
declare function arrayBufferToHex(buffer: ArrayBuffer): string;
//#endregion
//#region src/arrayBufferToUuid.d.ts
/**
* Converts an ArrayBuffer to a UUID string.
*
* @param buffer - The ArrayBuffer to convert.
* @returns The UUID string representation.
*
* @public
*
* @example
* {@includeCode ../test/arrayBufferToUuid.test.ts#example}
*/
declare function arrayBufferToUuid(buffer: ArrayBuffer): string;
//#endregion
//#region src/decodeBase64.d.ts
/**
* Decodes a base64 encoded string into binary data
*
* @param str - The base64 encoded string to decode
* @returns The decoded binary data
*
* @public
*/
declare function decodeBase64(str: string): Uint8Array;
//#endregion
//#region src/base64decode.d.ts
/**
* Decodes a base64 encoded string into binary data
*
* @param str - The base64 encoded string to decode
* @returns The decoded binary data
*
* @public
*
* @deprecated Use {@link decodeBase64} instead.
*
* @see {@link decodeBase64}
*/
declare const base64decode: typeof decodeBase64;
//#endregion
//#region src/encodeBase64.d.ts
/**
* Encodes binary data to base64
*
* @param binary - The binary data to encode
* @returns The base64 encoded string
*
* @public
*/
declare function encodeBase64(binary: Uint8Array): string;
//#endregion
//#region src/base64encode.d.ts
/**
* Encodes binary data to base64
*
* @param binary - The binary data to encode
* @returns The base64 encoded string
*
* @public
*
* @deprecated Use {@link encodeBase64} instead.
*
* @see {@link encodeBase64}
*/
declare const base64encode: typeof encodeBase64;
//#endregion
//#region src/convertUint8ToUint16.d.ts
/**
* Converts a Uint8Array to a Uint16Array by aligning its buffer.
*
* @param input - The Uint8Array to convert
* @returns A properly aligned Uint16Array
*
* @public
*/
declare function convertUint8ToUint16(input: Uint8Array): Uint16Array;
//#endregion
//#region src/UTF_16.d.ts
/**
* UTF-16 Encoding.
*
* @public
*/
declare const UTF_16 = "utf-16";
//#endregion
//#region src/UTF_16_BE.d.ts
/**
* UTF-16 Big Endian Encoding.
*
* @public
*/
declare const UTF_16_BE = "utf-16be";
//#endregion
//#region src/UTF_16_LE.d.ts
/**
* UTF-16 Little Endian Encoding.
*
* @public
*/
declare const UTF_16_LE = "utf-16le";
//#endregion
//#region src/UTF_8.d.ts
/**
* UTF-8 Encoding.
*
* @public
*/
declare const UTF_8 = "utf-8";
//#endregion
//#region src/ValueOf.d.ts
/**
* Utility type to get the value of a given object type.
*
* @public
*/
type ValueOf<T> = T[keyof T];
//#endregion
//#region src/Encoding.d.ts
/**
* Text encoding types.
*
* @public
*/
declare const Encoding: {
  readonly UTF8: typeof UTF_8;
  readonly UTF16: typeof UTF_16;
  readonly UTF16BE: typeof UTF_16_BE;
  readonly UTF16LE: typeof UTF_16_LE;
};
/**
* Text encoding types.
*
* @public
*/
type Encoding = ValueOf<typeof Encoding>;
//#endregion
//#region src/DecodeTextOptions.d.ts
/**
* Options for the `decodeText` function.
*
* @public
*/
type DecodeTextOptions = {
  /**
  *  The encoding to use. If not provided, the function will try to detect the encoding from the BOM.
  */
  encoding?: Encoding;
};
//#endregion
//#region src/decodeText.d.ts
/**
* Converts an ArrayBuffer or ArrayBufferView to a string. Similar to `TextDecoder.decode`
* but with a fallback for environments that don't support `TextDecoder`.
*
* @param data - The data to decode.
* @param options - The options for the decoding.
* @returns The string representation of the ArrayBuffer.
*
* @public
*
* @example
* {@includeCode ../test/decodeText.test.ts#example}
*/
declare function decodeText(data: ArrayBufferLike | ArrayBufferView, options?: DecodeTextOptions): string;
//#endregion
//#region src/encodeText.d.ts
/**
* Converts a string to a Uint8Array. Similar to `TextEncoder.encode`
* but with a fallback for environments that don't support `TextEncoder`.
*
* @param data - The string to encode.
* @returns The Uint8Array representation of the string.
*
* @public
*
* @example
* {@includeCode ../test/encodeText.test.ts#example}
*/
declare function encodeText(data: string): Uint8Array;
//#endregion
//#region src/ExclusiveRecord.d.ts
/**
* A record that is exclusive to a given key.
*
* @public
*/
type ExclusiveRecord<K extends PropertyKey, V> = { [P in K]: Record<P, V> & Partial<Record<Exclude<K, P>, never>> extends infer O ? { [Q in keyof O]: O[Q] } : never }[K];
//#endregion
//#region src/ResourceTiming.d.ts
/**
* Resource Timing. This is a subset of the `PerformanceResourceTiming` interface.
* https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming
*
* @public
*/
type ResourceTiming = {
  /**
  * A `DOMHighResTimeStamp` for the time a resource fetch started.
  */
  startTime: number;
  /**
  * The size (in octets) of the payload body before removing any applied content encodings.
  */
  encodedBodySize: number;
  /**
  * A `DOMHighResTimeStamp` immediately after the browser receives the first byte of the response from the server.
  */
  responseStart?: number;
  /**
  * The difference (in milliseconds) between the `responseEnd` and the `startTime`.
  */
  duration: number;
};
//#endregion
//#region src/getBandwidthBps.d.ts
/**
* Converts a ResourceTiming sample to bandwidth in bits per second (bps).
*
* @param sample - A ResourceTiming sample
* @returns
*
* @public
*/
declare function getBandwidthBps(sample: ResourceTiming): number;
//#endregion
//#region src/getBaseUrl.d.ts
/**
* Get the base URL from a full URL or a URL object.
*
* @param fullUrl - The full URL or URL object.
* @returns The base URL.
*
* @public
*
* @example
* {@includeCode ../test/getBaseUrl.test.ts#example}
*/
declare function getBaseUrl(fullUrl: string | URL): string;
//#endregion
//#region src/hexToArrayBuffer.d.ts
/**
* Decodes a hexadecimal string into an ArrayBuffer.
*
* @param hex - The hexadecimal string to decode.
* @returns The decoded ArrayBuffer.
*
* @public
*
* @example
* {@includeCode ../test/hexToArrayBuffer.test.ts#example}
*/
declare function hexToArrayBuffer(hex: string): ArrayBuffer;
//#endregion
//#region src/isArrayBufferLike.d.ts
/**
* Checks if the given value is `ArrayBufferLike` (i.e. an `ArrayBuffer`
* or a `SharedArrayBuffer`).
*
* This function safely handles environments where
* `SharedArrayBuffer` is not defined, such as non-cross-origin
* isolated browser contexts.
*
* @param value - The value to check.
* @returns `true` if the value is an `ArrayBuffer` or `SharedArrayBuffer`.
*
* @public
*
* @example
* {@includeCode ../test/isArrayBufferLike.test.ts#example}
*/
declare function isArrayBufferLike(value: unknown): value is ArrayBufferLike;
//#endregion
//#region src/RequestResponseType.d.ts
/**
* The response type of the request.
*
* @enum
*
* @public
*/
declare const RequestResponseType: {
  readonly TEXT: "text";
  readonly JSON: "json";
  readonly BLOB: "blob";
  readonly ARRAY_BUFFER: "arrayBuffer";
  readonly DOCUMENT: "document";
  readonly STREAM: "stream";
};
/**
* @public
*/
type RequestResponseType = ValueOf<typeof RequestResponseType>;
//#endregion
//#region src/HttpRequest.d.ts
/**
* Generic request API.
*
* @public
*/
type HttpRequest<D = any> = {
  /**
  * The URL of the request.
  */
  url: string;
  /**
  * The request's method (GET, POST, etc).
  */
  method?: string;
  /**
  * The body of the request.
  */
  body?: BodyInit;
  /**
  * The response type with which the response from the server shall be compatible.
  */
  responseType?: RequestResponseType;
  /**
  * The headers object associated with the request.
  */
  headers?: Record<string, string>;
  /**
  * Indicates whether the user agent should send or receive cookies from the other domain in the case of cross-origin requests.
  */
  credentials?: RequestCredentials;
  /**
  * The mode of the request (e.g., cors, no-cors, same-origin, etc).
  */
  mode?: RequestMode;
  /**
  * The number of milliseconds the request can take before automatically being terminated.
  * If undefined or value is 0 then there is no timeout.
  */
  timeout?: number;
  /**
  * Any custom data.
  */
  customData?: D;
};
//#endregion
//#region src/XmlNode.d.ts
/**
* XML node
*
* @public
*/
type XmlNode = {
  nodeName: string;
  nodeValue: string | null;
  attributes: Record<string, string>;
  childNodes: XmlNode[];
  prefix?: string | null;
  localName?: string;
  parentElement?: XmlNode | null;
};
//#endregion
//#region src/ResponseTypeMap.d.ts
/**
* Maps a request's `responseType` to the corresponding data type.
*
* @public
*/
type ResponseTypeMap<T extends string | undefined> = T extends "json" ? any : T extends "text" ? string : T extends "blob" ? Blob : T extends "arrayBuffer" ? ArrayBuffer : T extends "document" ? XmlNode : T extends "stream" ? ReadableStream : unknown;
//#endregion
//#region src/HttpResponse.d.ts
/**
* Generic response API.
*
* @public
*/
type HttpResponse<R extends HttpRequest = HttpRequest> = {
  /**
  * The origin request.
  */
  request: R;
  /**
  * The final URL obtained after any redirects.
  */
  url?: string;
  /**
  * Indicates whether or not the request was redirected.
  */
  redirected?: boolean;
  /**
  * The HTTP status code of the response.
  */
  status?: number;
  /**
  * The status message corresponding to the HTTP status code.
  */
  statusText?: string;
  /**
  * The type of the response.
  */
  type?: string;
  /**
  * The response headers.
  */
  headers?: Record<string, string>;
  /**
  * The response data.
  */
  data?: ResponseTypeMap<R["responseType"]>;
  /**
  * The network timing of the request/response.
  */
  resourceTiming?: ResourceTiming;
};
//#endregion
//#region src/Request.d.ts
/**
* Request API.
*
* @public
* @deprecated Use {@link HttpRequest} instead.
*/
type Request = HttpRequest;
//#endregion
//#region src/roundToEven.d.ts
/**
* This implements the rounding procedure described in step 2 of the "Serializing a Decimal" specification.
* This rounding style is known as "even rounding", "banker's rounding", or "commercial rounding".
*
* @param value - The value to round
* @param precision - The number of decimal places to round to
* @returns The rounded value
*
* @public
*/
declare function roundToEven(value: number, precision: number): number;
//#endregion
//#region src/stringToUint16.d.ts
/**
* Converts a string to a Uint16Array.
*
* @param str - The string to convert
* @returns A Uint16Array representation of the string
*
* @public
*
* @example
* {@includeCode ../test/stringToUint16.test.ts#example}
*/
declare function stringToUint16(str: string): Uint16Array;
//#endregion
//#region src/TypedResult.d.ts
/**
* Utility type to create a typed result.
*
* @public
*/
type TypedResult<T, D> = {
  type: T;
  data: D;
};
//#endregion
//#region src/unescapeHtml.d.ts
/**
* Unescapes HTML entities
*
* @param text - The text to unescape
* @returns The unescaped text
*
* @public
*
* @example
* {@includeCode ../test/unescapeHtml.test.ts#example}
*/
declare function unescapeHtml(text: string): string;
//#endregion
//#region src/urlToRelativePath.d.ts
/**
* Constructs a relative path from a URL.
*
* If `url` is already a relative path, or its origin differs from `base`, it is returned unchanged.
*
* @param url - The destination URL
* @param base - The base URL
* @returns The relative path
*
* @public
*
* @example
* {@includeCode ../test/urlToRelativePath.test.ts#example}
*/
declare function urlToRelativePath(url: string, base: string): string;
//#endregion
//#region src/uuid.d.ts
/**
* Generate a random v4 UUID
*
* @returns A random v4 UUID
*
* @public
*/
declare function uuid(): string;
//#endregion
//#region src/uuidToArrayBuffer.d.ts
/**
* Converts a UUID string to an ArrayBuffer.
*
* @param uuid - The UUID string to convert.
* @returns The ArrayBuffer representation.
*
* @public
*
* @example
* {@includeCode ../test/uuidToArrayBuffer.test.ts#example}
*/
declare function uuidToArrayBuffer(uuid: string): ArrayBuffer;
//#endregion
//#region src/ValueOrArray.d.ts
/**
* A type that represents either a single value or an array of values.
*
* @public
*/
type ValueOrArray<T> = T | T[];
//#endregion
export { DecodeTextOptions, Encoding, ExclusiveRecord, HttpRequest, HttpResponse, Request, RequestResponseType, ResourceTiming, ResponseTypeMap, TypedResult, UTF_16, UTF_16_BE, UTF_16_LE, UTF_8, ValueOf, ValueOrArray, XmlNode, arrayBufferToHex, arrayBufferToUuid, base64decode, base64encode, convertUint8ToUint16, decodeBase64, decodeText, encodeBase64, encodeText, getBandwidthBps, getBaseUrl, hexToArrayBuffer, isArrayBufferLike, roundToEven, stringToUint16, unescapeHtml, urlToRelativePath, uuid, uuidToArrayBuffer };
//# sourceMappingURL=index.d.ts.map