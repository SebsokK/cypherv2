import {depletionRuleField, fields, integerField} from "../common/schema";
import {ItemDataModelBase} from "./item-base";

export class ArtifactDataModel extends ItemDataModelBase {
  static override defineSchema(): Record<string, unknown> {
    return {
      ...super.defineSchema(),
      level: new fields.StringField({required: true, nullable: false, initial: "1", blank: false}),
      identified: new fields.BooleanField({required: true, nullable: false, initial: true}),
      depletion: depletionRuleField("1d6"),
      depleted: new fields.BooleanField({required: true, nullable: false, initial: false}),
      uses: integerField()
    };
  }

  static override migrateData(
    source: Record<string, unknown>,
    options: {readonly partial?: boolean} = {}
  ): Record<string, unknown> {
    const migrated = super.migrateData(source, options);
    if (Object.hasOwn(migrated, "level")) migrated.level = String(migrated.level || "1");
    if (typeof migrated.depletion === "string") {
      const match = migrated.depletion.match(/(\d+)\s*(?:in|on)\s*(\d*d\d+(?:\s*[+-]\s*\d+)?)/i);
      const formula = match?.[2] ?? "1d6";
      const legacyDie = formula.match(/^1?d(6|10|20)$/i)?.[1];
      migrated.depletion = match
        ? {enabled: true, die: legacyDie ? `d${legacyDie}` : "d6", formula, threshold: Number(match[1])}
        : {enabled: false, die: "d6", formula: "1d6", threshold: 1};
    } else if (!options.partial && migrated.depletion && typeof migrated.depletion === "object") {
      const depletion = migrated.depletion as Record<string, unknown>;
      migrated.depletion = {
        ...depletion,
        formula: String(depletion.formula ?? `1${String(depletion.die ?? "d6")}`)
      };
    }
    return migrated;
  }
}
