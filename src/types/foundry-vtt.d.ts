declare class Actor {
  static implementation: typeof Actor;
  static getDefaultArtwork(data: Record<string, unknown>): {img: string; texture: {src: string}};
  id: string;
  uuid: string;
  name: string;
  img: string;
  type: string;
  system: Record<string, unknown>;
  _source: {system: Record<string, unknown>};
  prototypeToken: {
    actorLink: boolean;
    texture: {src: string};
    updateSource(changes: Record<string, unknown>): Record<string, unknown>;
  };
  token?: {id: string; uuid: string; texture?: {src?: string}};
  items: Iterable<Item> & {get(id: string): Item | undefined};
  sheet?: {render(force?: boolean): Promise<unknown> | unknown};
  testUserPermission(user: {id: string}, level: number): boolean;
  toggleStatusEffect(
    statusId: string,
    options?: {active?: boolean; overlay?: boolean}
  ): Promise<unknown>;
  update(changes: Record<string, unknown>, options?: Record<string, unknown>): Promise<unknown>;
  updateSource(changes: Record<string, unknown>, options?: Record<string, unknown>): Record<string, unknown>;
  _preCreate(
    data: Record<string, unknown>,
    options: Record<string, unknown>,
    user: unknown
  ): Promise<unknown>;
  createEmbeddedDocuments(
    type: string,
    data: Record<string, unknown>[],
    operation?: Record<string, unknown>
  ): Promise<unknown[]>;
  deleteEmbeddedDocuments(
    type: string,
    ids: string[],
    operation?: Record<string, unknown>
  ): Promise<unknown[]>;
}

declare class Item {
  static implementation: typeof Item;
  static getDefaultArtwork(data: Record<string, unknown>): {img: string};
  id: string;
  uuid: string;
  name: string;
  img: string;
  type: string;
  system: Record<string, unknown>;
  _source: {system: Record<string, unknown>};
  actor: Actor | null;
  sheet?: {render(force?: boolean): Promise<unknown> | unknown};
  toObject(): Record<string, unknown>;
  update(changes: Record<string, unknown>, options?: Record<string, unknown>): Promise<unknown>;
  delete(): Promise<unknown>;
}

declare class Combatant {
  id: string;
  isOwner: boolean;
  testUserPermission(user: {id: string}, level: "OWNER" | number): boolean;
  getFlag(scope: string, key: string): unknown;
  setFlag(scope: string, key: string, value: unknown): Promise<unknown>;
}

declare class Combat {
  static implementation: typeof Combat;
  started: boolean;
  round: number;
  turn: number | null;
  turns: Combatant[];
  combatant: Combatant | null;
  combatants: Iterable<Combatant> & {get(id: string): Combatant | undefined};
  nextTurn(): Promise<Combat>;
  updateEmbeddedDocuments(
    type: "Combatant",
    updates: Record<string, unknown>[],
    operation?: {combatTurn?: number; turnEvents?: boolean}
  ): Promise<unknown[]>;
}

declare class FoundryCombatTracker {
  static DEFAULT_OPTIONS: Record<string, unknown>;
  static PARTS: Record<string, unknown>;
  viewed: Combat | null;
  element: HTMLElement;
  _prepareTrackerContext(context: Record<string, unknown>, options: Record<string, unknown>): Promise<void>;
  _onRender(context: Record<string, unknown>, options: Record<string, unknown>): Promise<void>;
  _getEntryContextOptions(): Array<{label?: string}>;
  _getCombatContextOptions(): Array<{label?: string}>;
}

declare class FoundryGamePause {
  static DEFAULT_OPTIONS: Record<string, unknown>;
  _prepareContext(options: Record<string, unknown>): Promise<Record<string, unknown>>;
}

interface TokenLike {
  id?: string;
  uuid?: string;
  actor: Actor | null;
  document?: {id: string; uuid: string; actor?: Actor | null};
}

declare class TypeDataModelBase {
  parent: Actor | Item;
  static defineSchema(): Record<string, unknown>;
  static migrateData(
    source: Record<string, unknown>,
    options?: {readonly partial?: boolean}
  ): Record<string, unknown>;
  prepareBaseData(): void;
  prepareDerivedData(): void;
}

interface FoundryFieldConstructor {
  new (...args: unknown[]): unknown;
}

declare const foundry: {
  utils: {
    getRoute(path: string, options?: {prefix?: string | null}): string;
  };
  abstract: {
    TypeDataModel: typeof TypeDataModelBase;
  };
  data: {
    fields: {
      ArrayField: FoundryFieldConstructor;
      BooleanField: FoundryFieldConstructor;
      FilePathField: FoundryFieldConstructor;
      HTMLField: FoundryFieldConstructor;
      NumberField: FoundryFieldConstructor;
      ObjectField: FoundryFieldConstructor;
      SchemaField: FoundryFieldConstructor;
      StringField: FoundryFieldConstructor;
    };
  };
  documents: {
    Actor: typeof Actor;
    Combat: typeof Combat;
    Item: typeof Item;
  };
  applications: {
    handlebars: {
      renderTemplate(path: string, data: Record<string, unknown>): Promise<string>;
      loadTemplates(paths: string[]): Promise<unknown>;
    };
    api: {
      HandlebarsApplicationMixin: <T>(base: T) => T;
      DialogV2: {
        input(options: Record<string, unknown>): Promise<Record<string, unknown> | null>;
        confirm(options: Record<string, unknown>): Promise<boolean | null>;
        wait(options: Record<string, unknown>): Promise<unknown>;
      };
    };
    sheets: {
      ActorSheetV2: new (...args: unknown[]) => {
        actor: Actor;
        document: Actor;
        element: HTMLElement;
        isEditable: boolean;
        render(options?: boolean | Record<string, unknown>): Promise<unknown>;
        _prepareContext(options: Record<string, unknown>): Promise<Record<string, unknown>>;
        _onRender(context: Record<string, unknown>, options: Record<string, unknown>): Promise<void>;
        _onClose(options: Record<string, unknown>): void;
        _canDragDrop(selector: string): boolean;
        _onDropDocument(event: DragEvent, document: unknown): Promise<unknown>;
      };
      ItemSheetV2: new (...args: unknown[]) => {
        item: Item;
        document: Item;
        element: HTMLElement;
        isEditable: boolean;
        render(options?: boolean | Record<string, unknown>): Promise<unknown>;
        _prepareContext(options: Record<string, unknown>): Promise<Record<string, unknown>>;
        _onRender(context: Record<string, unknown>, options: Record<string, unknown>): Promise<void>;
        _onClose(options: Record<string, unknown>): void;
        _canDragDrop(selector: string): boolean;
        _onDropDocument(event: DragEvent, document: unknown): Promise<unknown>;
      };
    };
    ux: {
      TextEditor: {
        implementation: {
          enrichHTML(
            content: string,
            options?: {async?: boolean; relativeTo?: Actor | Item}
          ): Promise<string>;
          create(
            options: {
              target: HTMLElement;
              fieldName: string;
              document: Actor | Item;
              engine: "prosemirror";
              collaborate: false;
              editable: true;
            },
            content: string
          ): Promise<{destroy?(): void}>;
        };
      };
    };
    apps: {
      DocumentSheetConfig: {
        registerSheet(
          documentClass: typeof Actor | typeof Item,
          scope: string,
          sheetClass: unknown,
          options: Record<string, unknown>
        ): void;
      };
    };
    sidebar: {
      tabs: {
        CombatTracker: typeof FoundryCombatTracker;
      };
    };
  };
};

declare const CONFIG: {
  specialStatusEffects: {DEFEATED: string};
  ui: {
    combat: typeof FoundryCombatTracker;
    pause: typeof FoundryGamePause;
  };
  Combat: {
    documentClass: typeof Combat;
    fallbackTurnMarker: string;
  };
  Actor: {
    documentClass: typeof Actor;
    dataModels: Record<string, typeof TypeDataModelBase>;
    trackableAttributes: Record<string, unknown>;
  };
  Item: {
    documentClass: typeof Item;
    dataModels: Record<string, typeof TypeDataModelBase>;
  };
};

interface CypherV2GameApi {
  readonly version: string;
  readonly rules: import("../rules/rule-registry").RuleRegistry;
  readonly services: import("../services").CoreServices;
  readonly themes: import("../themes/theme-registry").ThemeRegistry;
}

declare const game: {
  system: {version: string};
  i18n: {
    localize(key: string): string;
    format(key: string, data: Record<string, unknown>): string;
  };
  user: {id: string; isGM: boolean; isActiveGM: boolean; active: boolean; targets: Iterable<TokenLike>};
  users: Iterable<{id: string; isGM: boolean; active: boolean}>;
  actors: Iterable<Actor> & {get(id: string): Actor | undefined};
  items: Iterable<Item> & {get(id: string): Item | undefined};
  messages: Iterable<ChatMessage> & {get(id: string): ChatMessage | undefined};
  socket: {
    on(event: string, callback: (message: never) => void): void;
    emit(event: string, message: unknown): void;
  };
  settings: {
    register(scope: string, key: string, data: Record<string, unknown>): void;
    get(scope: string, key: string): unknown;
    set(scope: string, key: string, value: unknown): Promise<unknown>;
  };
  cypherv2: CypherV2GameApi;
};

declare const Hooks: {
  once(hook: string, callback: (...args: unknown[]) => void | Promise<void>): void;
  on(hook: string, callback: (...args: any[]) => void | Promise<void>): void;
  callAll(hook: string, ...args: unknown[]): void;
};

declare const CONST: {
  DOCUMENT_OWNERSHIP_LEVELS: {OWNER: number};
  TEXT_ANCHOR_POINTS: {CENTER: number; TOP: number};
};

declare const canvas: {
  tokens?: {
    get(id: string): {actor: Actor | null; center?: {x: number; y: number}} | undefined;
    placeables: Array<{actor: Actor | null; center?: {x: number; y: number}}>;
  };
  interface: {
    createScrollingText(
      origin: {x: number; y: number},
      content: string,
      options?: Record<string, unknown>
    ): Promise<unknown>;
  };
};

declare function fromUuid(uuid: string): Promise<unknown>;
declare function fromUuidSync(uuid: string): unknown;

declare const ui: {
  notifications: {
    info(message: string): void;
    warn(message: string): void;
    error(message: string): void;
  };
};

declare class Roll {
  total: number | null;
  constructor(formula: string, data?: Record<string, unknown>);
  evaluate(options?: Record<string, unknown>): Promise<Roll>;
}

declare class ChatMessage {
  id: string;
  static create(data: Record<string, unknown>): Promise<unknown>;
  static getSpeaker(options?: {actor?: Actor}): Record<string, unknown>;
  static getWhisperRecipients(name: string): Array<{id: string}>;
  getFlag(scope: string, key: string): unknown;
  setFlag(scope: string, key: string, value: unknown): Promise<unknown>;
  update(changes: Record<string, unknown>): Promise<unknown>;
}
