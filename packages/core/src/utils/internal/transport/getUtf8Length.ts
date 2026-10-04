// Canonical JSON escapes lone surrogates, so every surrogate here starts a well-formed pair.
export const getUtf8Length = (text: string) => {
  let length = 0;

  for (let index = 0; index < text.length; index += 1) {
    const unit = text.charCodeAt(index);

    if (unit < 0x80) {
      length += 1;
      continue;
    }

    if (unit < 0x800) {
      length += 2;
      continue;
    }

    if (unit >= 0xd800 && unit <= 0xdbff) {
      length += 4;
      index += 1;
      continue;
    }

    length += 3;
  }

  return length;
};
