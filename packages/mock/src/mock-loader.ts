import type { Loader } from "astro/loaders";
import { AstroError } from "astro/errors";
import type { ZodSchema } from "astro/zod";
import { generateMock } from "@anatine/zod-mock";

interface SharedOptions {
  /** The number of entries to generate */
  entryCount: number;
  /** If true, the loader will generate mock HTML so that render(entry) can be used */
  mockHTML?: boolean;
  /** The field to use to generate a unique ID. Default is to add a numeric index. */
  idField?: string;
  /** Seed value that can be used to ensure that the generated data is the same each time */
  seed?: number;
}

export type MockLoaderOptions = SharedOptions &
  (
    | {
        schema: ZodSchema;
        loader?: never;
      }
    | {
        loader: Loader;
        schema?: ZodSchema;
      }
  );
/**
 * Generates mock data for a collection.
 */
export function mockLoader({
  entryCount = 100,
  loader,
  ...options
}: MockLoaderOptions): Loader {
  async function getSchema() {
    if (options.schema) {
      return options.schema;
    }

    if (!loader) {
      throw new AstroError(
        "Missing schema for mock data",
        "Either pass a schema to the `mockLoader`, or pass a loader that defines a schema",
      );
    }

    if (!loader.schema) {
      throw new AstroError(
        `The loader "${loader.name}" does not define a schema`,
        "Define a schema manually and pass it to the `mockLoader`",
      );
    }
    if (typeof loader.schema === "function") {
      return loader.schema();
    } else {
      return loader.schema;
    }
  }

  const schema = getSchema();

  return {
    name: "mock-loader",
    load: async ({ logger, store }) => {
      logger.info(
        `Generating mock data${loader?.name ? ` for ${loader.name}` : ""}`,
      );
      const mockSchema = await schema;
      for (let i = 0; i < entryCount; i++) {
        const data = generateMock(mockSchema, {
          seed: options.seed ? options.seed + i : undefined,
        });
        const id = options.idField ? data[options.idField] : i;
        const rendered = options.mockHTML
          ? {
              html,
            }
          : undefined;
        store.set({ id: String(id), data, rendered });
      }
      logger.info(`Generated ${entryCount} mock entries`);
    },
    schema: () => schema,
  };
}

const html = /* html */ `
<h1>Lorem ipsum dolor sit amet</h1>
<p><strong>Pellentesque habitant morbi tristique</strong> senectus et netus et malesuada fames ac turpis egestas. Vestibulum tortor quam, feugiat vitae, ultricies eget, tempor sit amet, ante. Donec eu libero sit amet quam egestas semper. <em>Aenean ultricies mi vitae est.</em> Mauris placerat eleifend leo. Quisque sit amet est et sapien ullamcorper pharetra. Vestibulum erat wisi, condimentum sed, <code>commodo vitae</code>, ornare sit amet, wisi. Aenean fermentum, elit eget tincidunt condimentum, eros ipsum rutrum orci, sagittis tempus lacus enim ac dui. <a href="#">Donec non enim</a> in turpis pulvinar facilisis. Ut felis.</p>
<h2>Header Level 2</h2>
<ol>
		<li>Lorem ipsum dolor sit amet, consectetuer adipiscing elit.</li>
		<li>Aliquam tincidunt mauris eu risus.</li>
</ol>
<blockquote><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus magna. Cras in mi at felis aliquet congue. Ut a est eget ligula molestie gravida. Curabitur massa. Donec eleifend, libero at sagittis mollis, tellus est malesuada tellus, at luctus turpis elit sit amet quam. Vivamus pretium ornare est.</p></blockquote>
<h3>Header Level 3</h3>
<ul>
		<li>Lorem ipsum dolor sit amet, consectetuer adipiscing elit.</li>
		<li>Aliquam tincidunt mauris eu risus.</li>
</ul>`;
