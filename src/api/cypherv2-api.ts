import {SYSTEM_VERSION} from "../constants/system";
import type {RuleRegistry} from "../rules/rule-registry";
import type {CoreServices} from "../services";
import type {ThemeRegistry} from "../themes/theme-registry";

export interface CypherV2Api {
  readonly version: string;
  readonly rules: RuleRegistry;
  readonly services: CoreServices;
  readonly themes: ThemeRegistry;
}

export function createCypherV2Api(
  rules: RuleRegistry,
  services: CoreServices,
  themes: ThemeRegistry
): CypherV2Api {
  return Object.freeze({
    version: SYSTEM_VERSION,
    rules,
    services,
    themes
  });
}
