import {CharacterSheet} from "../applications/sheets/character-sheet";
import {CypherV2ItemSheet} from "../applications/sheets/item-sheet";
import {NpcSheet} from "../applications/sheets/npc-sheet";
import {SYSTEM_ID} from "../constants/system";

export function registerSheets(): void {
  const {DocumentSheetConfig} = foundry.applications.apps;

  DocumentSheetConfig.registerSheet(foundry.documents.Actor, SYSTEM_ID, CharacterSheet, {
    types: ["character"],
    makeDefault: true,
    label: "CYPHERV2.Sheets.Character"
  });

  DocumentSheetConfig.registerSheet(foundry.documents.Actor, SYSTEM_ID, NpcSheet, {
    types: ["npc"],
    makeDefault: true,
    label: "CYPHERV2.Sheets.Npc"
  });

  DocumentSheetConfig.registerSheet(foundry.documents.Item, SYSTEM_ID, CypherV2ItemSheet, {
    makeDefault: true,
    label: "CYPHERV2.Sheets.Item"
  });
}

