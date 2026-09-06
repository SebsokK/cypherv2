import {SKILL_DEFAULT_POOLS, SKILL_RANKS} from "../../constants/system";
import {fields, integerField} from "../common/schema";
import {ItemDataModelBase} from "./item-base";

export class SkillDataModel extends ItemDataModelBase {
  static override defineSchema(): Record<string, unknown> {
    return {
      ...super.defineSchema(),
      rank: new fields.StringField({
        required: true,
        nullable: false,
        initial: "untrained",
        choices: [...SKILL_RANKS]
      }),
      defaultPool: new fields.StringField({
        required: true,
        nullable: false,
        initial: "choose",
        choices: [...SKILL_DEFAULT_POOLS]
      }),
      category: new fields.StringField({required: true, nullable: false, initial: "general"}),
      contexts: new fields.ArrayField(
        new fields.StringField({required: true, nullable: false, blank: false}),
        {required: true, nullable: false, initial: []}
      ),
      initiative: new fields.BooleanField({required: true, nullable: false, initial: false}),
      acquisition: new fields.SchemaField({
        minimumTier: integerField(1, 1),
        grantedByUuid: new fields.StringField({required: true, nullable: false, initial: ""}),
        notes: new fields.HTMLField({required: true, nullable: false, initial: ""})
      })
    };
  }

  static override migrateData(
    source: Record<string, unknown>,
    options: {readonly partial?: boolean} = {}
  ): Record<string, unknown> {
    const migrated = super.migrateData(source, options);
    const includesDefaultPool = Object.hasOwn(migrated, "defaultPool");
    if ((!options.partial || includesDefaultPool)
      && (migrated.defaultPool === "" || migrated.defaultPool === null || migrated.defaultPool === undefined)) {
      migrated.defaultPool = "choose";
    }
    return migrated;
  }
}
