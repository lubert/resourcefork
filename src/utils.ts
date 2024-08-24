const HIGH_CHARS_UNICODE =
  "ÄÅÇÉÑÖÜáàâäãåçéèêëíìîïñóòôöõúùûü†°¢£§•¶ß®©™´¨≠ÆØ∞±≤≥¥µ∂∑∏π∫ªºΩæø¿¡¬√ƒ≈∆«»… ÀÃÕŒœ–—“”‘’÷◊ÿŸ⁄€‹›ﬁﬂ‡·‚„‰ÂÊÁËÈÍÎÏÌÓÔÒÚÛÙıˆ˜¯˘˙˚¸˝˛ˇ";

/**
 * Decode MacRoman encoded byte array to a string
 * See https://gist.github.com/jrus/3113240
 */
export function decodeMacRoman(byteArray: number[]): string {
  let byte: number;
  let idx: number;
  let i: number;
  let ref: number;
  const results: string[] = [];
  for (
    idx = i = 0, ref = byteArray.length;
    0 <= ref ? i < ref : i > ref;
    idx = 0 <= ref ? ++i : --i
  ) {
    byte = byteArray[idx];
    if (byte < 0x80) {
      results.push(String.fromCharCode(byte));
    } else {
      results.push(HIGH_CHARS_UNICODE.charAt(byte - 0x80));
    }
  }
  return results.join("");
}
