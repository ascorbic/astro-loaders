import type { Loader } from "astro/loaders";
import { AstroError } from "astro/errors";
import Airtable, { type Query, type FieldSet } from "airtable";
import { zodSchemaFromAirbaseTable } from "./schema.js";

export interface AirtableLoaderOptions<TFields extends FieldSet = FieldSet> {
  /** The access token. It must have data.records:read access to the base. Defaults to AIRTABLE_TOKEN env var */
  token?: string;
  /** The base ID */
  base: string;
  /** The table name or ID */
  table: string;
  /**
   * Optional query params
   * @see https://airtable.com/developers/web/api/list-records#query
   */
  queryParams?: Query<TFields>["_params"];
}

/**
 * Loads data from an Airtable table.
 */
export function airtableLoader({
  token = import.meta.env.AIRTABLE_TOKEN,
  base,
  table,
  queryParams,
}: AirtableLoaderOptions): Loader {
  if (!token) {
    throw new AstroError(
      "Missing Airtable token. Set it in the AIRTABLE_TOKEN environment variable or pass it as an option.",
    );
  }
  const baseInstance = new Airtable({ apiKey: token }).base(base);

  return {
    name: "airtable-loader",
    load: async ({ logger, parseData, store }) => {
      logger.info(`Loading data from table "${table}"`);
      const records = await baseInstance(table).select(queryParams).all();
      for (const { id, fields } of records) {
        const data = await parseData({ id, data: fields });
        store.set({ id, data });
      }
      logger.info(`Loaded ${records.length} records from "${table}"`);
    },
    schema: () =>
      zodSchemaFromAirbaseTable({
        baseID: base,
        tableIdOrName: table,
        apiKey: token,
      }),
  };
}
