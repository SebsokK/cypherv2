export interface ThemeDefinition {
  readonly id: string;
  readonly label: string;
  readonly sourceId: string;
  readonly properties: Readonly<Record<string, string>>;
}

export interface ThemeTarget {
  readonly style: {
    setProperty(name: string, value: string): void;
    removeProperty(name: string): string | void;
  };
  readonly dataset: Record<string, string | undefined>;
}

export class ThemeRegistry {
  readonly #themes = new Map<string, Readonly<ThemeDefinition>>();
  readonly #appliedProperties = new Set<string>();

  register(definition: ThemeDefinition): Readonly<ThemeDefinition> {
    const id = definition.id.trim();
    if (!id) throw new Error("Theme IDs cannot be blank.");
    if (this.#themes.has(id)) throw new Error(`Theme '${id}' is already registered.`);
    const properties = Object.freeze({...definition.properties});
    for (const name of Object.keys(properties)) {
      if (!name.startsWith("--cypherv2-")) {
        throw new Error(`Theme property '${name}' must use the --cypherv2- prefix.`);
      }
    }
    const normalized = Object.freeze({...definition, id, properties});
    this.#themes.set(id, normalized);
    return normalized;
  }

  get(id: string): Readonly<ThemeDefinition> | undefined {
    return this.#themes.get(id);
  }

  has(id: string): boolean {
    return this.#themes.has(id);
  }

  list(): readonly Readonly<ThemeDefinition>[] {
    return [...this.#themes.values()].sort((left, right) => left.id.localeCompare(right.id));
  }

  choices(): Record<string, string> {
    return Object.fromEntries(this.list().map((theme) => [theme.id, theme.label]));
  }

  apply(id: string, target: ThemeTarget = document.documentElement): Readonly<ThemeDefinition> {
    const theme = this.#themes.get(id);
    if (!theme) throw new Error(`Theme '${id}' is not registered.`);
    for (const property of this.#appliedProperties) target.style.removeProperty(property);
    this.#appliedProperties.clear();
    for (const [property, value] of Object.entries(theme.properties)) {
      target.style.setProperty(property, value);
      this.#appliedProperties.add(property);
    }
    target.dataset.cypherv2Theme = theme.id;
    return theme;
  }
}
