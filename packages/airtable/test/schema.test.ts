import { describe, it, expect } from "vitest";
import { z } from "astro/zod";
import { airtableTypeToZodType } from "../src/schema.js";
import { airtableFieldFixtures } from "./fixtures/fields.js";

describe("Airtable to Zod Schema Mapping", () => {
  it("should map singleLineText to z.string()", () => {
    const field = airtableFieldFixtures.singleLineText;
    const schema = airtableTypeToZodType(field);
    expect(schema).toBeInstanceOf(z.ZodString);
  });

  it("should map number to z.number()", () => {
    const field = airtableFieldFixtures.number;
    const schema = airtableTypeToZodType(field);
    expect(schema).toBeInstanceOf(z.ZodNumber);
  });

  it("should map percent to z.number()", () => {
    const field = airtableFieldFixtures.percent;
    const schema = airtableTypeToZodType(field);
    expect(schema).toBeInstanceOf(z.ZodNumber);
  });

  it("should map currency to z.number()", () => {
    const field = airtableFieldFixtures.currency;
    const schema = airtableTypeToZodType(field);
    expect(schema).toBeInstanceOf(z.ZodNumber);
  });

  it("should map date to z.date()", () => {
    const field = airtableFieldFixtures.date;
    const schema = airtableTypeToZodType(field);
    expect(schema).toBeInstanceOf(z.ZodDate);
  });

  it("should map dateTime to z.date()", () => {
    const field = airtableFieldFixtures.dateTime;
    const schema = airtableTypeToZodType(field);
    expect(schema).toBeInstanceOf(z.ZodDate);
  });

  it("should map checkbox to z.boolean()", () => {
    const field = airtableFieldFixtures.checkbox;
    const schema = airtableTypeToZodType(field);
    expect(schema).toBeInstanceOf(z.ZodBoolean);
  });

  it("should map singleSelect to z.enum()", () => {
    const field = airtableFieldFixtures.singleSelect;
    const schema = airtableTypeToZodType(field);
    expect(schema).toBeInstanceOf(z.ZodEnum);
  });

  it("should map multipleSelects to z.array(z.enum())", () => {
    const field = airtableFieldFixtures.multipleSelects;
    const schema = airtableTypeToZodType(field);
    expect(schema).toBeInstanceOf(z.ZodArray);
    const innerType = (schema as z.ZodArray<any>).element;
    expect(innerType).toBeInstanceOf(z.ZodEnum);
  });

  it("should map singleCollaborator to userSchema", () => {
    const field = airtableFieldFixtures.singleCollaborator;
    const schema = airtableTypeToZodType(field);
    expect(schema).toBeInstanceOf(z.ZodObject);
    expect((schema as any).shape).toHaveProperty("id");
    expect((schema as any).shape).toHaveProperty("email");
    expect((schema as any).shape).toHaveProperty("name");
  });

  it("should map multipleCollaborators to z.array(userSchema)", () => {
    const field = airtableFieldFixtures.multipleCollaborators;
    const schema = airtableTypeToZodType(field);
    expect(schema).toBeInstanceOf(z.ZodArray);
    const innerType = (schema as z.ZodArray<any>).element;
    expect(innerType).toBeInstanceOf(z.ZodObject);
    expect(innerType.shape).toHaveProperty("id");
    expect(innerType.shape).toHaveProperty("email");
    expect(innerType.shape).toHaveProperty("name");
  });

  it("should map multipleAttachments to z.array(attachmentSchema)", () => {
    const field = airtableFieldFixtures.multipleAttachments;
    const schema = airtableTypeToZodType(field);
    expect(schema).toBeInstanceOf(z.ZodArray);
    const innerType = (schema as z.ZodArray<any>).element;
    expect(innerType).toBeInstanceOf(z.ZodObject);
    expect(innerType.shape).toHaveProperty("id");
    expect(innerType.shape).toHaveProperty("url");
    expect(innerType.shape).toHaveProperty("filename");
  });

  it("should map button to z.object({ label: z.string(), url: z.string().optional() })", () => {
    const field = airtableFieldFixtures.button;
    const schema = airtableTypeToZodType(field);
    expect(schema).toBeInstanceOf(z.ZodObject);
    expect((schema as any).shape).toHaveProperty("label");
    expect((schema as any).shape).toHaveProperty("url");
  });

  it("should map formula with result type string to z.string()", () => {
    const field = airtableFieldFixtures.formulaString;
    const schema = airtableTypeToZodType(field);
    expect(schema).toBeInstanceOf(z.ZodString);
  });

  it("should map formula with result type number to z.number()", () => {
    const field = airtableFieldFixtures.formulaNumber;
    const schema = airtableTypeToZodType(field);
    expect(schema).toBeInstanceOf(z.ZodNumber);
  });

  it("should map rollup to z.unknown()", () => {
    const field = airtableFieldFixtures.rollup;
    const schema = airtableTypeToZodType(field);
    expect(schema).toBeInstanceOf(z.ZodUnknown);
  });

  it("should map lookup to z.unknown()", () => {
    const field = airtableFieldFixtures.lookup;
    const schema = airtableTypeToZodType(field);
    expect(schema).toBeInstanceOf(z.ZodUnknown);
  });

  it("should map createdTime to z.date()", () => {
    const field = airtableFieldFixtures.createdTime;
    const schema = airtableTypeToZodType(field);
    expect(schema).toBeInstanceOf(z.ZodDate);
  });

  it("should map lastModifiedTime to z.date()", () => {
    const field = airtableFieldFixtures.lastModifiedTime;
    const schema = airtableTypeToZodType(field);
    expect(schema).toBeInstanceOf(z.ZodDate);
  });

  it("should map autoNumber to z.number()", () => {
    const field = airtableFieldFixtures.autoNumber;
    const schema = airtableTypeToZodType(field);
    expect(schema).toBeInstanceOf(z.ZodNumber);
  });

  it("should map rating to z.number()", () => {
    const field = airtableFieldFixtures.rating;
    const schema = airtableTypeToZodType(field);
    expect(schema).toBeInstanceOf(z.ZodNumber);
  });

  it("should map duration to z.number()", () => {
    const field = airtableFieldFixtures.duration;
    const schema = airtableTypeToZodType(field);
    expect(schema).toBeInstanceOf(z.ZodNumber);
  });

  it("should map email to z.string().email()", () => {
    const field = airtableFieldFixtures.email;
    const schema = airtableTypeToZodType(field);
    expect(schema).toBeInstanceOf(z.ZodString);
    expect(() => schema.parse("not-an-email")).toThrow();
    expect(() => schema.parse("test@example.com")).not.toThrow();
  });

  it("should map url to z.string().url()", () => {
    const field = airtableFieldFixtures.url;
    const schema = airtableTypeToZodType(field);
    expect(schema).toBeInstanceOf(z.ZodString);
    expect(() => schema.parse("not-a-url")).toThrow();
    expect(() => schema.parse("https://example.com")).not.toThrow();
  });

  it("should map phoneNumber to z.string()", () => {
    const field = airtableFieldFixtures.phoneNumber;
    const schema = airtableTypeToZodType(field);
    expect(schema).toBeInstanceOf(z.ZodString);
  });

  it("should map barcode to z.string()", () => {
    const field = airtableFieldFixtures.barcode;
    const schema = airtableTypeToZodType(field);
    expect(schema).toBeInstanceOf(z.ZodString);
  });

  it("should map multipleLookupValues with string result to z.array(z.string())", () => {
    const field = airtableFieldFixtures.multipleLookupValuesString;
    const schema = airtableTypeToZodType(field);
    expect(schema).toBeInstanceOf(z.ZodArray);
    const innerType = (schema as z.ZodArray<any>).element;
    expect(innerType).toBeInstanceOf(z.ZodString);
  });

  it("should map multipleLookupValues with number result to z.array(z.number())", () => {
    const field = airtableFieldFixtures.multipleLookupValuesNumber;
    const schema = airtableTypeToZodType(field);
    expect(schema).toBeInstanceOf(z.ZodArray);
    const innerType = (schema as z.ZodArray<any>).element;
    expect(innerType).toBeInstanceOf(z.ZodNumber);
  });

  it("should map multipleLookupValues with boolean result to z.array(z.boolean())", () => {
    const field = airtableFieldFixtures.multipleLookupValuesBoolean;
    const schema = airtableTypeToZodType(field);
    expect(schema).toBeInstanceOf(z.ZodArray);
    const innerType = (schema as z.ZodArray<any>).element;
    expect(innerType).toBeInstanceOf(z.ZodBoolean);
  });

  it("should map multipleLookupValues with array result to z.array(z.array(z.any()))", () => {
    const field = airtableFieldFixtures.multipleLookupValuesArray;
    const schema = airtableTypeToZodType(field);
    expect(schema).toBeInstanceOf(z.ZodArray);
    const innerType = (schema as z.ZodArray<any>).element;
    expect(innerType).toBeInstanceOf(z.ZodArray);
    const nestedType = (innerType as z.ZodArray<any>).element;
    expect(nestedType).toBeInstanceOf(z.ZodUnknown);
  });

  it("should map multipleLookupValues with object result to z.array(z.object({}).passthrough())", () => {
    const field = airtableFieldFixtures.multipleLookupValuesObject;
    const schema = airtableTypeToZodType(field);
    expect(schema).toBeInstanceOf(z.ZodArray);
    const innerType = (schema as z.ZodArray<any>).element;
    expect(innerType).toBeInstanceOf(z.ZodObject);
    expect((innerType as z.ZodObject<any>).shape).toEqual({});
  });
});
