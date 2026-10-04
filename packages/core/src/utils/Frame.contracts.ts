import { z } from "zod";
import { createMockAdapter } from "src/mock/createMockAdapter";
import type { JsonRecord } from "src/types/JsonRecord";
import type { WidgetData } from "src/types/WidgetData";
import { widget } from "src/utils/widget";
import { Frame } from "src/utils/Frame";

type Equal<TLeft, TRight> =
  (<TValue>() => TValue extends TLeft ? 1 : 2) extends <
    TValue,
  >() => TValue extends TRight ? 1 : 2
    ? true
    : false;
type Expect<TAssertion extends true> = TAssertion;

const StreakSchema = z.discriminatedUnion("state", [
  z.object({ state: z.literal("empty") }),
  z.object({
    state: z.literal("ready"),
    days: z.number().int().nonnegative(),
    label: z.string().optional(),
  }),
]);

const streak = widget({
  name: "StreakWidget",
  schema: StreakSchema,
  fallback: { state: "empty" },
});

const agenda = widget({
  name: "AgendaWidget",
  schema: z.object({ items: z.array(z.string()) }),
  fallback: { items: [] },
});

type StreakData =
  | { state: "empty" }
  | { state: "ready"; days: number; label?: string | undefined };

export type DefinitionKeepsItsName = Expect<
  Equal<typeof streak.name, "StreakWidget">
>;
export type DefinitionData = Expect<
  Equal<WidgetData<typeof streak>, StreakData>
>;

const streakAdapter = createMockAdapter(streak).adapter;
const agendaAdapter = createMockAdapter(agenda).adapter;

const frame = new Frame({
  widgets: { streak, agenda },
  adapters: [streakAdapter, agendaAdapter],
});

const streakWidget = frame.widget("streak");

export const agendaWidget = frame.widget("agenda");

export type HandleData = Expect<
  Equal<ReturnType<typeof streakWidget.get>, StreakData | null>
>;
export type OtherHandleData = Expect<
  Equal<ReturnType<typeof agendaWidget.get>, { items: string[] } | null>
>;

// @ts-expect-error an unregistered key is a compile error
frame.widget("missing");
// @ts-expect-error the wrong widget's data is refused
streakWidget.publish({ items: ["a"] });
// @ts-expect-error a widget the Frame does not list is not in its diagnostics
export const missingDiagnostics = frame.diagnostics.get().widgets.missing;
// @ts-expect-error a field of the wrong type is refused
streakWidget.publish({ state: "ready", days: "twelve" });
// @ts-expect-error a required field cannot be left out
streakWidget.publish({ state: "ready" });
streakWidget.publish({ state: "ready", days: 1 });
streakWidget.publish({ state: "ready", days: 1, label: undefined });

streakWidget.publishTimeline([{ at: 0, data: { state: "empty" } }]);
streakWidget.reload();
streakWidget.readback();
// @ts-expect-error a timeline entry carries the widget's own data
streakWidget.publishTimeline([{ at: 0, data: { items: [] } }]);

export const unhosted = new Frame({ widgets: { streak, agenda } });

export type SameFrameEverywhere = Expect<Equal<typeof unhosted, typeof frame>>;

widget({
  name: "CoercedWidget",
  // @ts-expect-error a transform makes the output differ from the input
  schema: z.object({ days: z.string().transform((text) => text.length) }),
  fallback: { days: 0 },
});
widget({
  name: "DefaultedWidget",
  // @ts-expect-error a default makes the input differ from the output
  schema: z.object({ days: z.number().default(0) }),
  fallback: { days: 0 },
});
widget({
  name: "CoerceNumberWidget",
  // @ts-expect-error coercion accepts input the output type does not
  schema: z.object({ days: z.coerce.number() }),
  fallback: { days: 0 },
});

widget({
  name: "WrongFallbackWidget",
  schema: z.object({ days: z.number() }),
  // @ts-expect-error the fallback must be what the schema outputs
  fallback: { days: "none" },
});

widget({
  name: "DateWidget",
  // @ts-expect-error a Date is not JSON data
  schema: z.object({ at: z.date() }),
  // @ts-expect-error a Date is not JSON data
  fallback: { at: new Date(0) },
});

export type RecordTakesAnOptionalField = Expect<
  { days?: number | undefined } extends JsonRecord ? true : false
>;

// @ts-expect-error a function is not a JSON value
export const withFunction: JsonRecord = { run: () => 1 };
// @ts-expect-error a Date is not a JSON value
export const withDate: JsonRecord = { at: new Date(0) };
// @ts-expect-error an array holds no undefined item
export const withHole: JsonRecord = { list: [undefined] };
