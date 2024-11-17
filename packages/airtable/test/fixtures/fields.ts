import { AirtableField } from "../../src/schema.js";

export const airtableFieldFixtures: Record<string, AirtableField> = {
  singleLineText: {
    name: "Name",
    type: "singleLineText",
  },
  number: {
    name: "Age",
    type: "number",
  },
  percent: {
    name: "Completion",
    type: "percent",
  },
  currency: {
    name: "Price",
    type: "currency",
  },
  date: {
    name: "Birthdate",
    type: "date",
  },
  dateTime: {
    name: "Appointment",
    type: "dateTime",
  },
  checkbox: {
    name: "IsActive",
    type: "checkbox",
  },
  singleSelect: {
    name: "Status",
    type: "singleSelect",
    options: {
      choices: [{ name: "Active" }, { name: "Inactive" }],
    },
  },
  multipleSelects: {
    name: "Tags",
    type: "multipleSelects",
    options: {
      choices: [{ name: "Tag1" }, { name: "Tag2" }],
    },
  },
  singleCollaborator: {
    name: "Owner",
    type: "singleCollaborator",
  },
  multipleCollaborators: {
    name: "Editors",
    type: "multipleCollaborators",
  },
  multipleAttachments: {
    name: "Files",
    type: "multipleAttachments",
  },
  button: {
    name: "Action",
    type: "button",
  },
  formulaString: {
    name: "CalculatedField",
    type: "formula",
    options: {
      result: {
        type: "string",
      },
    },
  },
  formulaNumber: {
    name: "CalculatedNumber",
    type: "formula",
    options: {
      result: {
        type: "number",
      },
    },
  },
  rollup: {
    name: "AggregatedData",
    type: "rollup",
  },
  lookup: {
    name: "RelatedInfo",
    type: "lookup",
  },
  createdTime: {
    name: "CreatedAt",
    type: "createdTime",
  },
  lastModifiedTime: {
    name: "UpdatedAt",
    type: "lastModifiedTime",
  },
  autoNumber: {
    name: "ID",
    type: "autoNumber",
  },
  rating: {
    name: "Rating",
    type: "rating",
  },
  duration: {
    name: "Duration",
    type: "duration",
  },
  email: {
    name: "Email",
    type: "email",
  },
  url: {
    name: "Website",
    type: "url",
  },
  phoneNumber: {
    name: "Phone",
    type: "phoneNumber",
  },
  barcode: {
    name: "Barcode",
    type: "barcode",
  },
  multipleLookupValuesString: {
    name: "Related Names",
    type: "multipleLookupValues",
    options: {
      result: {
        type: "string",
      },
    },
  },
  multipleLookupValuesNumber: {
    name: "Related Scores",
    type: "multipleLookupValues",
    options: {
      result: {
        type: "number",
      },
    },
  },
  multipleLookupValuesBoolean: {
    name: "Related Statuses",
    type: "multipleLookupValues",
    options: {
      result: {
        type: "checkbox",
      },
    },
  },
  multipleLookupValuesArray: {
    name: "Nested Tags",
    type: "multipleLookupValues",
    options: {
      result: {
        type: "array",
      },
    },
  },
  multipleLookupValuesObject: {
    name: "Related Records",
    type: "multipleLookupValues",
    options: {
      result: {
        type: "object",
      },
    },
  },
};
