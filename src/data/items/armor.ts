import {ARMOR_CATEGORIES, type ArmorCategory} from "../../constants/system";
import {depletionRuleField, fields} from "../common/schema";
import {ItemDataModelBase} from "./item-base";

export class ArmorDataModel extends ItemDataModelBase {
  declare category: ArmorCategory;

  static override defineSchema(): Record<string, unknown> {
    return {
      ...super.defineSchema(),
      category: new fields.StringField({
        required: true,
        nullable: false,
        initial: "light",
        choices: [...ARMOR_CATEGORIES]
      }),
      // Legacy compatibility only. Effective Armor familiarity is derived from the Character.
      freelyUsed: new fields.BooleanField({required: true, nullable: false, initial: false}),
      depletion: depletionRuleField(),
      depleted: new fields.BooleanField({required: true, nullable: false, initial: false}),
      equipped: new fields.BooleanField({required: true, nullable: false, initial: false})
    };
  }
}
