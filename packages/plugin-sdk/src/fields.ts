import type {
  StringField,
  TextField,
  NumberField,
  BooleanField,
  SelectField,
  SecretField,
  ModelField,
  BackendField,
} from "./types.js";

type FieldOptions<T> = Omit<T, "type">;

/** Config field builders — use these in definePlugin({ config: { ... } }) */
export const t = {
  /** Single-line text input */
  string(opts: FieldOptions<StringField>): StringField {
    return { type: "string", ...opts };
  },

  /** Multi-line textarea */
  text(opts: FieldOptions<TextField>): TextField {
    return { type: "text", ...opts };
  },

  /** Numeric input */
  number(opts: FieldOptions<NumberField>): NumberField {
    return { type: "number", ...opts };
  },

  /** Boolean toggle */
  boolean(opts: FieldOptions<BooleanField>): BooleanField {
    return { type: "boolean", ...opts };
  },

  /** Dropdown with a fixed set of options */
  select<const T extends string>(
    options: readonly T[],
    opts: Omit<FieldOptions<SelectField<T>>, "options">,
  ): SelectField<T> {
    return { type: "select", options, ...opts };
  },

  /** Password / secret input (masked in UI, encrypted at rest) */
  secret(opts: FieldOptions<SecretField>): SecretField {
    return { type: "secret", ...opts };
  },

  /** Renders a model picker (all available backend models + v-models) */
  model(opts: FieldOptions<ModelField>): ModelField {
    return { type: "model", ...opts };
  },

  /** Renders a backend picker */
  backend(opts: FieldOptions<BackendField>): BackendField {
    return { type: "backend", ...opts };
  },
};
