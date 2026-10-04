const pad = (value: number, length: number) =>
  value.toString().padStart(length, "0");

/** Hours, minutes, seconds and milliseconds of a local time, so two events a moment apart read apart. */
export const formatClockTime = (at: number) => {
  const date = new Date(at);

  return `${pad(date.getHours(), 2)}:${pad(date.getMinutes(), 2)}:${pad(date.getSeconds(), 2)}.${pad(date.getMilliseconds(), 3)}`;
};
