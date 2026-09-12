import "./lib.KO2KTNGK.js";

// ../../node_modules/.pnpm/crypto-random-string@5.0.0/node_modules/crypto-random-string/core.js
var urlSafeCharacters = [..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~"];
var numericCharacters = [..."0123456789"];
var distinguishableCharacters = [..."CDEHKMPRTUWXY012458"];
var asciiPrintableCharacters = [..."!\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~"];
var alphanumericCharacters = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"];
var readUInt16LE = (uInt8Array, offset) => uInt8Array[offset] + (uInt8Array[offset + 1] << 8);
var generateForCustomCharacters = (length, characters, randomBytes) => {
  const characterCount = characters.length;
  const maxValidSelector = Math.floor(65536 / characterCount) * characterCount - 1;
  const entropyLength = 2 * Math.ceil(1.1 * length);
  let string = "";
  let stringLength = 0;
  while (stringLength < length) {
    const entropy = randomBytes(entropyLength);
    let entropyPosition = 0;
    while (entropyPosition < entropyLength && stringLength < length) {
      const entropyValue = readUInt16LE(entropy, entropyPosition);
      entropyPosition += 2;
      if (entropyValue > maxValidSelector) {
        continue;
      }
      string += characters[entropyValue % characterCount];
      stringLength++;
    }
  }
  return string;
};
var generateForCustomCharactersAsync = async (length, characters, randomBytesAsync) => {
  const characterCount = characters.length;
  const maxValidSelector = Math.floor(65536 / characterCount) * characterCount - 1;
  const entropyLength = 2 * Math.ceil(1.1 * length);
  let string = "";
  let stringLength = 0;
  while (stringLength < length) {
    const entropy = await randomBytesAsync(entropyLength);
    let entropyPosition = 0;
    while (entropyPosition < entropyLength && stringLength < length) {
      const entropyValue = readUInt16LE(entropy, entropyPosition);
      entropyPosition += 2;
      if (entropyValue > maxValidSelector) {
        continue;
      }
      string += characters[entropyValue % characterCount];
      stringLength++;
    }
  }
  return string;
};
var allowedTypes = /* @__PURE__ */ new Set([
  void 0,
  "hex",
  "base64",
  "url-safe",
  "numeric",
  "distinguishable",
  "ascii-printable",
  "alphanumeric"
]);
var createGenerator = (generateForCustomCharacters2, specialRandomBytes2, randomBytes) => ({ length, type, characters }) => {
  if (!(length >= 0 && Number.isFinite(length))) {
    throw new TypeError("Expected a `length` to be a non-negative finite number");
  }
  if (type !== void 0 && characters !== void 0) {
    throw new TypeError("Expected either `type` or `characters`");
  }
  if (characters !== void 0 && typeof characters !== "string") {
    throw new TypeError("Expected `characters` to be string");
  }
  if (!allowedTypes.has(type)) {
    throw new TypeError(`Unknown type: ${type}`);
  }
  if (type === void 0 && characters === void 0) {
    type = "hex";
  }
  if (type === "hex" || type === void 0 && characters === void 0) {
    return specialRandomBytes2(Math.ceil(length * 0.5), "hex", length);
  }
  if (type === "base64") {
    return specialRandomBytes2(Math.ceil(length * 0.75), "base64", length);
  }
  if (type === "url-safe") {
    return generateForCustomCharacters2(length, urlSafeCharacters, randomBytes);
  }
  if (type === "numeric") {
    return generateForCustomCharacters2(length, numericCharacters, randomBytes);
  }
  if (type === "distinguishable") {
    return generateForCustomCharacters2(length, distinguishableCharacters, randomBytes);
  }
  if (type === "ascii-printable") {
    return generateForCustomCharacters2(length, asciiPrintableCharacters, randomBytes);
  }
  if (type === "alphanumeric") {
    return generateForCustomCharacters2(length, alphanumericCharacters, randomBytes);
  }
  if (characters.length === 0) {
    throw new TypeError("Expected `characters` string length to be greater than or equal to 1");
  }
  if (characters.length > 65536) {
    throw new TypeError("Expected `characters` string length to be less or equal to 65536");
  }
  return generateForCustomCharacters2(length, characters, randomBytes);
};
function createStringGenerator(specialRandomBytes2, randomBytes) {
  return createGenerator(generateForCustomCharacters, specialRandomBytes2, randomBytes);
}
function createAsyncStringGenerator(specialRandomBytesAsync, randomBytesAsync) {
  return createGenerator(generateForCustomCharactersAsync, specialRandomBytesAsync, randomBytesAsync);
}

// ../../node_modules/.pnpm/crypto-random-string@5.0.0/node_modules/crypto-random-string/browser.js
var toHex = (uInt8Array) => [...uInt8Array].map((byte) => byte.toString(16).padStart(2, "0")).join("");
var toBase64 = (uInt8Array) => btoa(String.fromCodePoint(...uInt8Array));
var maxEntropy = 65536;
function getRandomValues(byteLength) {
  const generatedBytes = new Uint8Array(byteLength);
  for (let totalGeneratedBytes = 0; totalGeneratedBytes < byteLength; totalGeneratedBytes += maxEntropy) {
    generatedBytes.set(
      crypto.getRandomValues(new Uint8Array(Math.min(maxEntropy, byteLength - totalGeneratedBytes))),
      totalGeneratedBytes
    );
  }
  return generatedBytes;
}
function specialRandomBytes(byteLength, type, length) {
  const generatedBytes = getRandomValues(byteLength);
  const convert = type === "hex" ? toHex : toBase64;
  return convert(generatedBytes).slice(0, length);
}
var browser_default = createStringGenerator(specialRandomBytes, getRandomValues);
var cryptoRandomStringAsync = createAsyncStringGenerator(specialRandomBytes, getRandomValues);

// ../bits/src/bits.passwordGenerator.ts
function initModule(id = "form3-newPasswd1") {
  const password = browser_default({ length: 20, type: "ascii-printable" });
  $("#" + id).val(password).trigger("input");
}
export {
  initModule
};
//# sourceMappingURL=bits.passwordGenerator.K3MPBYMU.js.map
