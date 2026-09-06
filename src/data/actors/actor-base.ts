import {SYSTEM_SCHEMA_VERSION} from "../../constants/system";
import {fields, integerField} from "../common/schema";

export abstract class ActorDataModelBase extends foundry.abstract.TypeDataModel {
  static override defineSchema(): Record<string, unknown> {
    return {
      schemaVersion: integerField(SYSTEM_SCHEMA_VERSION, 1),
      description: new fields.HTMLField({required: true, nullable: false, initial: ""}),
      notes: new fields.HTMLField({required: true, nullable: false, initial: ""}),
      gmNotes: new fields.HTMLField({required: true, nullable: false, initial: ""})
    };
  }
}

