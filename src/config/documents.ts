import {CypherV2Actor} from "../documents/actor";
import {CypherV2Item} from "../documents/item";

export function registerDocumentClasses(): void {
  CONFIG.Actor.documentClass = CypherV2Actor;
  CONFIG.Item.documentClass = CypherV2Item;
}

