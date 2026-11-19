import { createFileRoute } from "@tanstack/react-router";
import App from "@/App";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Spark to Live Studio - Build apps by describing them" },
      {
        name: "description",
        content:
          "Type what you want. Spark to Live Studio writes the code with AI and runs it in a live preview.",
      },
      { property: "og:title", content: "Spark to Live Studio - Build apps by describing them" },
      {
        property: "og:description",
        content:
          "Type what you want. Spark to Live Studio writes the code with AI and runs it in a live preview.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: App,
});
