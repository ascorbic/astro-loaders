import { defineConfig } from "astro/config";

import netlify from "@astrojs/netlify";

// https://astro.build/config
export default defineConfig({
  output: "static",
  adapter: netlify(),
  experimental: {
    liveContentCollections: true,
  },
  image: {
    domains: ["image.simplecastcdn.com"],
  },
});
