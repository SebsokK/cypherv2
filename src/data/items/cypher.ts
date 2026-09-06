import {CYPHER_MANIFESTATIONS, CYPHER_POWERS} from "../../constants/system";
import {fields, integerField} from "../common/schema";
import {ItemDataModelBase} from "./item-base";

export class CypherDataModel extends ItemDataModelBase {
  static override defineSchema(): Record<string, unknown> {
    return {
      ...super.defineSchema(),
      level: integerField(1, 1),
      levelOverride: new fields.BooleanField({required: true, nullable: false, initial: false}),
      category: new fields.StringField({required: true, nullable: false, initial: "general"}),
      manifest: new fields.BooleanField({required: true, nullable: false, initial: false}),
      manifestation: new fields.StringField({
        required: true,
        nullable: false,
        initial: "subtle",
        choices: [...CYPHER_MANIFESTATIONS]
      }),
      form: new fields.StringField({required: true, nullable: false, initial: ""}),
      power: new fields.StringField({
        required: true,
        nullable: false,
        initial: "low",
        choices: [...CYPHER_POWERS]
      }),
      identified: new fields.BooleanField({required: true, nullable: false, initial: true}),
      uses: integerField(1)
    };
  }

  static override migrateData(
    source: Record<string, unknown>,
    options: {readonly partial?: boolean} = {}
  ): Record<string, unknown> {
    const migrated = super.migrateData(source, options);
    const hasManifestation = Object.hasOwn(migrated, "manifestation");
    const hasLegacyManifest = Object.hasOwn(migrated, "manifest");
    if (hasManifestation) migrated.manifest = migrated.manifestation === "manifest";
    else if (!options.partial || hasLegacyManifest) {
      migrated.manifestation = migrated.manifest === true ? "manifest" : "subtle";
    }
    if (!options.partial && !Object.hasOwn(migrated, "levelOverride")) {
      const legacyLevel = Number(migrated.level);
      migrated.levelOverride = Object.hasOwn(migrated, "level")
        && Number.isInteger(legacyLevel)
        && legacyLevel > 1;
    }
    return migrated;
  }
}
