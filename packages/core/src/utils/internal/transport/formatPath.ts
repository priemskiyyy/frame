export const formatPath = (path: (string | number)[]) => {
  let text = "";

  for (const segment of path) {
    if (typeof segment === "number") {
      text += `[${segment}]`;
      continue;
    }

    text += text === "" ? segment : `.${segment}`;
  }

  return text;
};
