import {fields, integerField} from "../common/schema";
import {ItemDataModelBase} from "./item-base";

export class EquipmentDataModel extends ItemDataModelBase {
  static override defineSchema(): Record<string, unknown> {
    return {
      ...super.defineSchema(),
      level: integerField(),
      quantity: integerField(1),
      equipped: new fields.BooleanField({required: true, nullable: false, initial: false}),
      price: new fields.StringField({required: true, nullable: false, initial: ""})
    };
  }
}

