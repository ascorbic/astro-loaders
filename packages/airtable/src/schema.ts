import { z, type ZodTypeAny } from "astro/zod";
import { match, P } from "ts-pattern";

export interface AirtableField {
  name: string;
  type: string;
  options?: {
    choices?: Array<{ name: string }>;
    result?: {
      type: string;
    };
  };
}

interface AirtableTable {
  id: string;
  name: string;
  fields: Array<AirtableField>;
}

interface AirtableResponse {
  tables: Array<AirtableTable>;
}

// Define sets for different Airtable field types
const STRING_TYPES = new Set([
  "string",
  "singleLineText",
  "multilineText",
  "richText",
  "phoneNumber",
  "barcode",
]);

const NUMBER_TYPES = new Set([
  "number",
  "percent",
  "currency",
  "rating",
  "count",
  "autoNumber",
]);

const DATE_TYPES = new Set([
  "date",
  "dateTime",
  "createdTime",
  "lastModifiedTime",
]);

const USER_TYPES = new Set([
  "singleCollaborator",
  "createdBy",
  "lastModifiedBy",
]);

const BOOLEAN_TYPES = new Set(["checkbox", "boolean"]);

// Define schemas for complex field types
const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
});

const attachmentSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  filename: z.string(),
  size: z.number().optional(),
  type: z.string().optional(),
});

export const airtableTypeToZodType = (field: AirtableField): ZodTypeAny => {
  return match(field)
    .with({ type: P.when((t) => STRING_TYPES.has(t)) }, () => z.string())
    .with({ type: P.when((t) => NUMBER_TYPES.has(t)) }, () => z.number())
    .with({ type: P.when((t) => DATE_TYPES.has(t)) }, () => z.coerce.date())
    .with({ type: P.when((t) => USER_TYPES.has(t)) }, () => userSchema)
    .with({ type: P.when((t) => BOOLEAN_TYPES.has(t)) }, () => z.boolean())
    .with({ type: "email" }, () => z.string().email())
    .with({ type: "url" }, () => z.string().url())
    .with(
      { type: "singleSelect", options: { choices: P.array(P.any) } },
      ({ options }) => {
        const choices = options.choices.map(({ name }) => name) as [
          string,
          ...string[],
        ];
        return z.enum(choices);
      },
    )
    .with(
      { type: "multipleSelects", options: { choices: P.array(P.any) } },
      ({ options }) => {
        const choices = options.choices.map(({ name }) => name) as [
          string,
          ...string[],
        ];
        return z.array(z.enum(choices));
      },
    )
    .with({ type: "multipleAttachments" }, () => z.array(attachmentSchema))
    .with({ type: "multipleCollaborators" }, () => z.array(userSchema))
    .with({ type: "button" }, () =>
      z.object({
        label: z.string(),
        url: z.string().url().optional(),
      }),
    )
    .with(
      { type: "formula", options: { result: { type: P.string } } },
      ({ options }) => {
        const resultType = options.result.type;
        if (resultType === "number") {
          return z.number();
        } else if (resultType === "string") {
          return z.string();
        }
        return z.unknown();
      },
    )
    .with(
      {
        type: "multipleLookupValues",
        options: { result: { type: P.when((t) => STRING_TYPES.has(t)) } },
      },
      () => z.array(z.string()),
    )
    .with(
      {
        type: "multipleLookupValues",
        options: { result: { type: P.when((t) => NUMBER_TYPES.has(t)) } },
      },
      () => z.array(z.number()),
    )
    .with(
      {
        type: "multipleLookupValues",
        options: { result: { type: P.when((t) => BOOLEAN_TYPES.has(t)) } },
      },
      () => z.array(z.boolean()),
    )
    .with(
      { type: "multipleLookupValues", options: { result: { type: "array" } } },
      () => z.array(z.array(z.unknown())),
    )
    .with(
      { type: "multipleLookupValues", options: { result: { type: "object" } } },
      () => z.array(z.object({}).passthrough()),
    )
    .with({ type: "duration" }, () => z.number())
    .otherwise(() => z.unknown());
};

// Generate Zod schema from Airtable table
export const zodSchemaFromAirtableTable = async ({
  baseID,
  tableIdOrName,
  apiKey,
}: {
  baseID: string;
  tableIdOrName: string;
  apiKey: string;
}) => {
  const schemaUrl = `https://api.airtable.com/v0/meta/bases/${baseID}/tables`;
  const res = await fetch(schemaUrl, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch Airtable schema: ${res.statusText}`);
  }

  const response = (await res.json()) as AirtableResponse;

  const tableSchema = response.tables.find(
    (table) => table.name === tableIdOrName || table.id === tableIdOrName,
  );

  if (!tableSchema) {
    throw new Error(`Table ${tableIdOrName} not found in base schema.`);
  }

  const schemaObject: Record<string, ZodTypeAny> = {};

  for (const field of tableSchema.fields) {
    const zodType = airtableTypeToZodType(field).optional();
    schemaObject[field.name] = zodType;
  }

  return z.object(schemaObject);
};
