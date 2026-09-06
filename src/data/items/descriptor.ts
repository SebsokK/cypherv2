import {fields, integerField} from "../common/schema";
import {ItemDataModelBase} from "./item-base";
import {packageInstanceField, poolBonusChoiceGroupField, skillChoiceGroupField, skillGrantField} from "./package-fields";

export class DescriptorDataModel extends ItemDataModelBase {
  static override defineSchema(): Record<string, unknown> {
    return {
      ...super.defineSchema(),
      poolBonuses: new fields.SchemaField({might: integerField(), speed: integerField(), intellect: integerField()}),
      poolBonusChoiceGroups: new fields.ArrayField(poolBonusChoiceGroupField(), {required: true, nullable: false, initial: []}),
      skillGrants: new fields.ArrayField(skillGrantField(), {required: true, nullable: false, initial: []}),
      choiceGroups: new fields.ArrayField(skillChoiceGroupField(), {required: true, nullable: false, initial: []}),
      instance: packageInstanceField()
    };
  }
}
