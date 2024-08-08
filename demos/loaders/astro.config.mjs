import { defineConfig } from "astro/config";

import netlify from "@astrojs/netlify";

// https://astro.build/config
export default defineConfig({
  output: "hybrid",
  adapter: netlify(),
  image: {
    domains: ["image.simplecastcdn.com"],
  },
  experimental: {
    contentLayer: true,
  },
});
