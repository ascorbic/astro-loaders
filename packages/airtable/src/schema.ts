import { AstroError } from "astro/errors";
import { z } from "astro/zod";

const airtableTypeToZodType = (type: string, options?: any): z.ZodTypeAny => {
  switch (type) {
    case "singleLineText":
    case "multilineText":
    case "richText":
    case "phoneNumber":
    case "formula":
    case "barcode":
    case "aiText":
      return z.string();
    case "email":
      return z.string().email();
    case "url":
      return z.string().url();
    case "number":
    case "percent":
    case "currency":
    case "rating":
    case "count":
    case "autoNumber":
      return z.number();
    case "duration":
      return z.string().duration();
    case "checkbox":
      return z.boolean();
    case "date":
    case "dateTime":
    case "createdTime":
    case "lastModifiedTime":
      return z.coerce.date();
    case "singleSelect":
      return z.enum(options.choices.map((choice: any) => choice.name));
    case "multipleSelects":
      return z.array(z.enum(options.choices.map((choice: any) => choice.name)));
    case "singleCollaborator":
    case "createdBy":
    case "lastModifiedBy":
      return z.object({
        id: z.string(),
        email: z.string().email(),
        name: z.string(),
      });
    case "multipleCollaborators":
      return z.array(
        z.object({
          id: z.string(),
          email: z.string().email(),
          name: z.string(),
        }),
      );
    case "multipleRecordLinks":
    case "multipleLookupValues":
      return z.array(z.string());
    case "multipleAttachments":
      return z.array(
        z.object({
          url: z.string().url(),
          filename: z.string(),
        }),
      );
    case "rollup":
      return z.any(); // Rollups can be complex, so `z.any()` is used
    case "lookup":
      return z.any(); // Lookups can vary, so `z.any()` is used
    case "button":
      return z.object({
        label: z.string(),
        url: z.string().url(),
      });
    case "externalSyncSource":
      return z.string(); // Placeholder, as external sync sources can vary
    default:
      return z.any(); // Default to any for unhandled or unknown types
  }
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

  const response: any = await res.json();

  const tables = response.tables;
  const tableSchema = tables.find(
    (table: any) => table.name === tableIdOrName || table.id === tableIdOrName,
  );

  if (!tableSchema) {
    throw new AstroError(`Table ${tableIdOrName} not found in base schema.`);
  }

  const zodSchemaObject: Record<string, z.ZodTypeAny> = {};

  tableSchema.fields.forEach((field: any) => {
    const zodType = airtableTypeToZodType(field.type, field.options).optional();
    zodSchemaObject[field.name] = zodType;
  });

  const zodSchema = z.object(zodSchemaObject);
  return zodSchema;
};
