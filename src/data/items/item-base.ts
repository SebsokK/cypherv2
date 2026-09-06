import {SYSTEM_SCHEMA_VERSION} from "../../constants/system";
import {durationField, fields, integerField} from "../common/schema";
import {provenanceField} from "./package-fields";

export class ItemDataModelBase extends foundry.abstract.TypeDataModel {
  static override defineSchema(): Record<string, unknown> {
    return {
      schemaVersion: integerField(SYSTEM_SCHEMA_VERSION, 1),
      slug: new fields.StringField({required: true, nullable: false, initial: ""}),
      description: new fields.StringField({required: false, nullable: false, initial: ""}),
      source: new fields.SchemaField({
        uuid: new fields.StringField({required: true, nullable: false, initial: ""}),
        book: new fields.StringField({required: true, nullable: false, initial: ""}),
        page: new fields.StringField({required: true, nullable: false, initial: ""}),
        license: new fields.StringField({required: true, nullable: false, initial: "original"})
      }),
      automation: new fields.SchemaField({
        mode: new fields.StringField({
          required: true,
          nullable: false,
          initial: "descriptive",
          choices: ["descriptive", "assisted", "automatic"]
        }),
        duration: durationField(),
        rollDefaults: new fields.ObjectField({required: true, nullable: false, initial: {}})
      }),
      ruleElements: new fields.ArrayField(
        new fields.ObjectField({required: true, nullable: false}),
        {required: true, nullable: false, initial: []}
      ),
      tags: new fields.ArrayField(
        new fields.StringField({required: true, nullable: false, blank: false}),
        {required: true, nullable: false, initial: []}
      ),
      grantedBy: provenanceField()
    };
  }
}
