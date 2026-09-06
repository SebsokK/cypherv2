/**
 * Native Application V2 form behavior shared by all Cypher V2 document sheets.
 *
 * ActorSheetV2 and ItemSheetV2 provide the form handler which validates the
 * submitted data and updates the underlying Document. The system only needs to
 * opt into a top-level form and change-driven submission.
 */
export const DOCUMENT_SHEET_FORM_OPTIONS = {
  tag: "form",
  form: {
    closeOnSubmit: false,
    submitOnChange: true
  }
} as const;

/** Expose TypeDataModel SchemaFields to Foundry's native form helpers. */
export function documentSystemFields(
  document: {readonly system: Record<string, unknown>}
): Record<string, unknown> {
  return (document.system as unknown as {
    readonly schema: {readonly fields: Record<string, unknown>};
  }).schema.fields;
}
