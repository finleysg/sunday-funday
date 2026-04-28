import type { MetadataRoute } from "next";

// PWA manifest. Real PNG icon set is deferred (decisions.md notes
// `pwa-asset-generator` from a source PNG); SVG icons work in every modern
// browser including iOS Safari for "Add to Home Screen". theme_color matches
// the primary token in globals.css.

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sunday Fun Day",
    short_name: "SunFunDay",
    description: "Live scoring for one friend group's Sunday rounds.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#1f7d8a",
    icons: [
      {
        src: "/icons/icon.svg",
        sizes: "192x192 512x512",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable.svg",
        sizes: "192x192 512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
