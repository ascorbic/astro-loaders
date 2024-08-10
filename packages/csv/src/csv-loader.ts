import { createReadStream, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { relative } from "pathe";
import type { Loader, LoaderContext } from "astro/loaders";
import Papa from "papaparse";
import { finished } from "node:stream/promises";
import { AstroError } from "astro/errors";

export interface CSVLoaderOptions {
  /** Path to the CSV file */
  fileName: string;
  /**
   * Define how the header values should be transformed into field names.
   * By default the values are camelized. Pass `false` to leave unchanged.
   * Pass a function to transform the header values yourself.
   */
  transformHeader?: false | ((header: string, index: number) => string);
  /**
   * The field to use as an ID. Values in the column must be unique.
   * If the header is transformed, it is the value _after_ transformation.
   * Default is the first column.
   * */
  idField?: string;
  /** Options passed to the CSV parser */
  parserOptions?: Omit<
    Papa.ParseConfig,
    "header" | "dynamicTyping" | "transformHeader" | "step" | "complete"
  >;
}

const camelize = (str: string) =>
  str
    .split(/[-_\s]+/)
    .map(
      (word, index) =>
        `${index === 0 ? word.charAt(0).toLowerCase() : word.charAt(0).toUpperCase()}${word.slice(1)}`,
    )
    .join("");

/**
 * Loads entries from a CSV file. The file must contain an array of objects that contain unique `id` fields, or an object with string keys.
 */
export function csvLoader({
  fileName,
  idField,
  transformHeader = camelize,
  parserOptions,
}: CSVLoaderOptions): Loader {
  async function syncData(
    filePath: string,
    { logger, parseData, store, settings }: LoaderContext,
  ) {
    const relativePath = relative(
      fileURLToPath(settings.config.root),
      filePath,
    );

    const csvStream = Papa.parse(Papa.NODE_STREAM_INPUT, {
      dynamicTyping: true,
      ...parserOptions,
      header: true,
      transformHeader: transformHeader === false ? undefined : transformHeader,
    });

    createReadStream(filePath).pipe(csvStream);

    await new Promise<void>((resolve, reject) => {
      let count = 0;
      let row = 0;
      store.clear();
      csvStream.on("end", () => {
        logger.info(`Loaded ${count} entries from ${fileName}`);
        resolve();
      });
      csvStream.on("error", (error) => {
        logger.error("Error reading data");
        reject(error);
      });
      csvStream.on("data", async (data) => {
        if (!idField) {
          idField = Object.keys(data)[0];
          logger.info(`No ID field specified, using first column: ${idField}`);
          if (!idField) {
            csvStream.end();
            reject("No ID field found in CSV file");
            return;
          }
        }
        row++;
        if (!(idField in data) || !(data[idField] && data[idField] !== 0)) {
          logger.warn(`No ID (${idField}) found in row ${row}. Skipping.`);
          return;
        }
        count++;
        const id = String(data[idField]);
        const parsedData = await parseData({
          id,
          data,
          filePath: relativePath,
        });
        store.set({ id, data: parsedData, filePath: relativePath });
      });
    }).catch((error) => {
      logger.error("Error reading data: " + error);
      throw new AstroError("Aborted loading CSV data");
    });
  }

  return {
    name: "csv-loader",
    load: async (options) => {
      const { settings, logger, watcher } = options;
      logger.info(`Loading CSV data from ${fileName}`);
      const url = new URL(fileName, settings.config.root);
      if (!existsSync(url)) {
        logger.error(`File not found: ${fileName}`);
        return;
      }
      const filePath = fileURLToPath(url);

      await syncData(filePath, options);

      watcher?.on("change", async (changedPath) => {
        if (changedPath === filePath) {
          logger.info(`Reloading data from ${fileName}`);
          await syncData(filePath, options);
        }
      });
    },
  };
}
