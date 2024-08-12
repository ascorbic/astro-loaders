import { AstroError } from "astro/errors";
import { z, type ZodTypeAny } from "astro/zod";

interface AirtableField {
  name: string;
  type: string;
  options: {
    choices: Array<{ name: string }>;
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

const STRING_TYPES = new Set([
  "singleLineText",
  "multilineText",
  "richText",
  "phoneNumber",
  "formula",
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

const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
});

const TYPE_MAP = new Map<string, ZodTypeAny>([
  ["email", z.string().email()],
  ["url", z.string().url()],
  ["duration", z.string().duration()],
  ["singleSelect", z.string()],
  ["multipleSelects", z.array(z.string())],
  ["multipleCollaborators", z.array(userSchema)],
  ["multipleRecordLinks", z.array(z.string())],
  ["multipleLookupValues", z.array(z.string())],
  [
    "multipleAttachments",
    z.array(
      z.object({
        url: z.string().url(),
        filename: z.string(),
      }),
    ),
  ],
  [
    "button",
    z.object({
      label: z.string(),
      url: z.string().url(),
    }),
  ],
  ["checkbox", z.boolean()],
]);

const airtableTypeToZodType = ({
  type,
  options,
}: AirtableField): ZodTypeAny => {
  if (STRING_TYPES.has(type)) {
    return z.string();
  }
  if (NUMBER_TYPES.has(type)) {
    return z.number();
  }
  if (DATE_TYPES.has(type)) {
    return z.coerce.date();
  }

  if (USER_TYPES.has(type)) {
    return userSchema;
  }

  const choices = options.choices.map(({ name }) => name) as [
    string,
    ...string[],
  ];

  if (type === "singleSelect") {
    return z.enum(choices);
  }
  if (type === "multipleSelects") {
    return z.array(z.enum(choices));
  }

  return TYPE_MAP.get(type) ?? z.any();
};

// Generate Zod schema using the Base Schema API
export const zodSchemaFromAirbaseTable = async ({
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
    throw new AstroError(`Failed to fetch Airtable schema: ${res.statusText}`);
  }

  const response = (await res.json()) as AirtableResponse;

  const tableSchema = response.tables.find(
    (table) => table.name === tableIdOrName || table.id === tableIdOrName,
  );

  if (!tableSchema) {
    throw new AstroError(`Table ${tableIdOrName} not found in base schema.`);
  }

  const schemaObject: Record<string, z.ZodTypeAny> = {};

  for (const field of tableSchema.fields) {
    const zodType = airtableTypeToZodType(field).optional();
    schemaObject[field.name] = zodType;
  }

  const zodSchema = z.object(schemaObject);
  return zodSchema;
};
