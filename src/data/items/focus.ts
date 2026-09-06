import {fields, integerField} from "../common/schema";
import {ItemDataModelBase} from "./item-base";

function nodeField(): unknown {
  return new fields.SchemaField({
    id: new fields.StringField({required: true, nullable: false, blank: false}),
    abilityUuid: new fields.StringField({required: true, nullable: false, initial: ""}),
    abilitySnapshot: new fields.SchemaField({
      name: new fields.StringField({required: true, nullable: false, initial: ""}),
      description: new fields.StringField({required: false, nullable: false, initial: ""})
    }),
    tier: new fields.NumberField({
      required: true,
      nullable: false,
      integer: true,
      min: 1,
      max: 6,
      initial: 1
    }),
    position: new fields.SchemaField({
      x: new fields.NumberField({required: true, nullable: true, initial: null}),
      y: new fields.NumberField({required: true, nullable: true, initial: null})
    })
  });
}

function connectionField(): unknown {
  return new fields.SchemaField({
    id: new fields.StringField({required: true, nullable: false, blank: false}),
    from: new fields.StringField({required: true, nullable: false, blank: false}),
    to: new fields.StringField({required: true, nullable: false, blank: false})
  });
}

/** Persisted graph authority for Focus Items. Runtime state is evaluated elsewhere. */
export class FocusDataModel extends ItemDataModelBase {
  static override defineSchema(): Record<string, unknown> {
    return {
      ...super.defineSchema(),
      graph: new fields.SchemaField({
        version: integerField(1, 1),
        nodes: new fields.ArrayField(nodeField(), {required: true, nullable: false, initial: []}),
        connections: new fields.ArrayField(connectionField(), {
          required: true,
          nullable: false,
          initial: []
        })
      })
    };
  }

  static override migrateData(
    source: Record<string, unknown>,
    options: {readonly partial?: boolean} = {}
  ): Record<string, unknown> {
    const migrated = super.migrateData(source, options);
    // Document updates run DataModel migration against the partial system payload.
    // A missing graph in that payload means "unchanged", not "legacy empty graph".
    if (options.partial) return migrated;
    if (migrated.graph && typeof migrated.graph === "object") return migrated;

    const legacyNodes = Array.isArray(migrated.nodes) ? migrated.nodes : [];
    const legacyConnections = Array.isArray(migrated.connections) ? migrated.connections : [];
    migrated.graph = {
      version: Number(migrated.graphVersion ?? 1),
      nodes: legacyNodes.map((raw) => {
        const node = raw as Record<string, unknown>;
        const snapshot = node.abilitySnapshot && typeof node.abilitySnapshot === "object"
          ? node.abilitySnapshot as Record<string, unknown>
          : {};
        const position = node.position && typeof node.position === "object"
          ? node.position as Record<string, unknown>
          : {};
        return {
          id: String(node.id ?? ""),
          abilityUuid: String(node.abilitySourceUuid ?? ""),
          abilitySnapshot: {
            name: String(snapshot.name ?? node.title ?? ""),
            description: String(snapshot.description ?? "")
          },
          tier: Number(node.tierRequired ?? 1),
          position: {
            x: typeof position.x === "number" ? position.x : null,
            y: typeof position.y === "number" ? position.y : null
          }
        };
      }),
      connections: legacyConnections.map((raw) => {
        const connection = raw as Record<string, unknown>;
        return {
          id: String(connection.id ?? ""),
          from: String(connection.from ?? ""),
          to: String(connection.to ?? "")
        };
      })
    };
    delete migrated.graphVersion;
    delete migrated.startNodeIds;
    delete migrated.nodes;
    delete migrated.connections;
    return migrated;
  }
}
