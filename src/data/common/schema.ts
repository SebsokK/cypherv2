const {
  ArrayField,
  BooleanField,
  HTMLField,
  NumberField,
  ObjectField,
  SchemaField,
  StringField
} = foundry.data.fields;

export const fields = {
  ArrayField,
  BooleanField,
  HTMLField,
  NumberField,
  ObjectField,
  SchemaField,
  StringField
};

export function integerField(initial = 0, min = 0): unknown {
  return new NumberField({required: true, nullable: false, integer: true, min, initial});
}

export function stringArrayField(initial: readonly string[] = []): unknown {
  return new ArrayField(
    new StringField({required: true, nullable: false, blank: false}),
    {required: true, nullable: false, initial: [...initial]}
  );
}

export function statPoolField(initial = 10): unknown {
  return new SchemaField({
    value: integerField(initial),
    baseMax: integerField(initial, 1),
    baseEdge: integerField(0, -20),
    max: new NumberField({
      required: true,
      nullable: false,
      integer: true,
      min: 1,
      initial,
      persisted: false
    }),
    edge: new NumberField({
      required: true,
      nullable: false,
      integer: true,
      min: -20,
      initial: 0,
      persisted: false
    })
  });
}

export function woundRecordField(): unknown {
  return new SchemaField({
    id: new StringField({required: true, nullable: false, blank: false}),
    label: new StringField({required: true, nullable: false, initial: ""}),
    description: new HTMLField({required: true, nullable: false, initial: ""}),
    sourceUuid: new StringField({required: true, nullable: false, initial: ""}),
    treated: new BooleanField({required: true, nullable: false, initial: false})
  });
}

export function contributionField(): unknown {
  return new SchemaField({
    id: new StringField({required: true, nullable: false, blank: false}),
    sourceId: new StringField({required: true, nullable: false, blank: false}),
    sourceType: new StringField({
      required: true,
      nullable: false,
      choices: ["base", "core", "rule-module", "wound", "item"]
    }),
    label: new StringField({required: true, nullable: false, initial: ""}),
    value: new NumberField({required: true, nullable: false, integer: true, initial: 0})
  });
}

export function contributionArrayField(): unknown {
  return new ArrayField(contributionField(), {
    required: true,
    nullable: false,
    initial: [],
    persisted: false
  });
}

export function durationField(): unknown {
  return new SchemaField({
    enabled: new BooleanField({required: true, nullable: false, initial: false}),
    trigger: new StringField({
      required: true,
      nullable: false,
      initial: "recovery",
      choices: [
        "recovery",
        "10-minute-or-longer",
        "1-hour-or-longer",
        "10-hour",
        "non-rest-recovery"
      ]
    })
  });
}

/** Shared schema for any Item that uses a depletion roll (Weapons, future Artifacts, etc.). */
export function depletionRuleField(formulaInitial = ""): unknown {
  return new SchemaField({
    enabled: new BooleanField({required: true, nullable: false, initial: false}),
    die: new StringField({
      required: true,
      nullable: false,
      initial: "d6",
      validate: (value: string) => /^d(?:[2-9]|[1-9]\d{1,2}|1000)$/i.test(value)
    }),
    formula: new StringField({required: true, nullable: false, initial: formulaInitial}),
    threshold: new NumberField({
      required: true,
      nullable: false,
      integer: true,
      min: 1,
      initial: 1
    })
  });
}
