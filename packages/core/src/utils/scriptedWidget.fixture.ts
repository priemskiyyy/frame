import type { JsonRecord } from "src/types/JsonRecord";
import type { StandardSchema } from "src/types/StandardSchema";
import type { StandardSchemaResult } from "src/types/StandardSchemaResult";
import { widget } from "src/utils/widget";

/** A widget whose schema accepts its own fallback and leaves every other value to `answer`. */
export const createScriptedWidget = (
  answer: (value: JsonRecord) => StandardSchemaResult<JsonRecord>,
) => {
  const schema: StandardSchema<JsonRecord, JsonRecord> = {
    "~standard": {
      version: 1,
      vendor: "scripted",
      validate: (value) => {
        if (value.fallback === true) {
          return { value };
        }

        return answer(value);
      },
    },
  };

  return widget({
    name: "ScriptedWidget",
    schema,
    fallback: { fallback: true },
  });
};
