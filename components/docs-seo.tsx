import { sectionIndex, type Doc } from "@/components/docs-data";
import { JsonLd } from "@/components/json-ld";
import { absolute, APP_ID, breadcrumbs, ORGANIZATION_ID, pageMetadata, WEBSITE_ID } from "@/components/site";

const DOC_TITLES: Record<string, string> = {
  index: "Horizon docs: Minecraft Java Edition rewritten in Rust",
  install: "Install Horizon: download the launcher and first launch",
  faq: "Horizon FAQ: Minecraft in Rust, mods, servers and more",
  multiplayer: "Horizon multiplayer: friends, LAN and servers",
  hosting: "Host a Horizon server: a Minecraft server without Java",
  performance: "Horizon performance: Minecraft with less work",
  "how-horizon-is-built": "How Horizon is built and checked against vanilla",
  mods: "Horizon mods and data packs: what works today",
  modpacks: "Modpacks in Horizon: what carries over from Java packs",
  "make-a-mod": "Make a Horizon mod: from first file to the registry",
  troubleshooting: "Horizon logs, crashes and bug reports",
  settings: "Horizon settings: graphics, distant terrain, controllers",
};

const DOC_DESCRIPTIONS: Record<string, string> = {
  faq: "Answers about Horizon, Minecraft: Java Edition rewritten in Rust: buying Minecraft, Minecraft Rust Edition, Java mods, servers, worlds, updates and more.",
};

export const docTitle = (doc: Doc) => DOC_TITLES[doc.slug] ?? `${doc.title} · Horizon docs`;

export const docImagePath = (slug: string) => `/og/docs/${slug}`;

export const docMetadata = (doc: Doc) =>
  pageMetadata({
    title: docTitle(doc),
    description: DOC_DESCRIPTIONS[doc.slug] ?? (doc.description || doc.title),
    path: doc.path,
    type: doc.slug === "index" ? "website" : "article",
    image: { url: docImagePath(doc.slug), width: 1200, height: 630, alt: `${doc.title}, in the Horizon docs` },
  });

function faqPage(doc: Doc) {
  const questions = sectionIndex([doc]).filter((s) => s.href.includes("#") && s.heading.endsWith("?"));
  return {
    "@type": "FAQPage",
    mainEntity: questions.map((q) => ({
      "@type": "Question",
      name: q.heading,
      acceptedAnswer: { "@type": "Answer", text: q.text.replace(/\s+([.,;:!?)])/g, "$1") },
    })),
  };
}

export function DocJsonLd({ doc }: { doc: Doc }) {
  const trail = doc.slug === "index" ? [{ name: "Docs", path: doc.path }] : [{ name: "Docs", path: "/docs" }, { name: doc.title, path: doc.path }];
  return (
    <JsonLd
      data={{
        "@graph": [
          {
            "@type": "TechArticle",
            headline: doc.title,
            description: doc.description,
            url: absolute(doc.path),
            inLanguage: "en",
            articleSection: doc.group,
            about: { "@id": APP_ID },
            isPartOf: { "@id": WEBSITE_ID },
            publisher: { "@id": ORGANIZATION_ID },
          },
          breadcrumbs(trail),
          ...(doc.slug === "faq" ? [faqPage(doc)] : []),
        ],
      }}
    />
  );
}
