const READY = {
  state: "ready",
  habit: "Run",
  days: 12,
  best: 21,
  week: [true, true, false, true, true, true, false],
  updatedAt: 1_760_000_000_000,
};

/** Raw JSON the trust boundary card can send: one valid, and five ways Frame refuses. */
export const RAW_PRESETS = [
  {
    id: "valid",
    label: "Valid",
    text: JSON.stringify(READY),
  },
  {
    id: "negative",
    label: "Negative days",
    text: JSON.stringify({ ...READY, days: -3 }),
  },
  {
    id: "wrong-type",
    label: "Wrong type",
    text: JSON.stringify({ ...READY, days: "twelve" }),
  },
  {
    id: "extra-field",
    label: "Extra field",
    text: JSON.stringify({ ...READY, note: "not in the schema" }),
  },
  {
    id: "missing-field",
    label: "Missing field",
    text: JSON.stringify({ state: "ready", days: 12 }),
  },
  {
    id: "not-a-record",
    label: "Not a record",
    text: JSON.stringify([1, 2, 3]),
  },
];
