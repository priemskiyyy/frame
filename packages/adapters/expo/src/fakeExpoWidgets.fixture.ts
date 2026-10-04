import type { JsonRecord } from "@priemskiyyy/frame";

import type { ExpoLayout } from "src/types/ExpoLayout";

type FakeEntry<TProps extends JsonRecord> = { date: Date; props: TProps };

// A fake of expo-widgets 57.0.22: storage is a property list keyed by the widget's name, so it outlives the widget object and cannot hold null.
export type FakeWidget<TProps extends JsonRecord> = {
  name: string;
  layout: ExpoLayout<TProps>;
  reload: () => void;
  updateTimeline: (entries: FakeEntry<TProps>[]) => void;
  updateSnapshot: (props: TProps) => void;
  getTimeline: () => Promise<FakeEntry<TProps>[]>;
};

export const createFakeExpoWidgets = ({
  widgetsDirectory = "file:///group/ExpoWidgets/",
  now = () => 1_000,
}: { widgetsDirectory?: string | null; now?: () => number } = {}) => {
  const calls: string[] = [];
  const reloads: string[] = [];
  const layouts = new Map<string, ExpoLayout<never>>();
  const stored = new Map<string, string>();
  let failure: Error | null = null;

  const take = (call: string) => {
    calls.push(call);

    if (failure === null) {
      return;
    }

    const error = failure;

    failure = null;

    throw error;
  };

  const persist = (name: string, entries: FakeEntry<JsonRecord>[]) => {
    stored.set(
      name,
      JSON.stringify(
        entries.map(({ date, props }) => ({ at: date.getTime(), props })),
        (_key, value) => {
          if (value === null) {
            throw new Error(
              "Attempt to insert non-property list object NSNull.",
            );
          }

          return value;
        },
      ),
    );
  };

  const load = <TProps extends JsonRecord>(
    name: string,
  ): FakeEntry<TProps>[] => {
    const text = stored.get(name);

    if (text === undefined) {
      return [];
    }

    const parsed: { at: number; props: TProps }[] = JSON.parse(text);

    return parsed.map(({ at, props }) => ({ date: new Date(at), props }));
  };

  const sdk = {
    widgetsDirectory,
    createWidget: <TProps extends JsonRecord>(
      name: string,
      layout: ExpoLayout<TProps>,
    ): FakeWidget<TProps> => {
      calls.push(`createWidget:${name}`);
      layouts.set(name, layout);

      const widget: FakeWidget<TProps> = {
        name,
        layout,
        reload: () => {
          take(`reload:${name}`);
          reloads.push(name);
        },
        updateTimeline: (next) => {
          take(`updateTimeline:${name}`);
          persist(name, next);
          reloads.push(name);
        },
        updateSnapshot: (props) => {
          take(`updateSnapshot:${name}`);
          persist(name, [{ date: new Date(now()), props }]);
          reloads.push(name);
        },
        getTimeline: async () => {
          take(`getTimeline:${name}`);

          return load<TProps>(name);
        },
      };

      return widget;
    },
  };

  return {
    sdk,
    calls,
    reloads,
    layouts,
    stored: (name: string) => load<JsonRecord>(name),
    failNext: (error: Error) => {
      failure = error;
    },
  };
};
