import { getDocs, getDocsNav, searchIndex } from "@/components/docs-data";
import { DocsNav } from "@/components/docs-nav";

export default async function DocsLayout({ children }: LayoutProps<"/docs">) {
  const [nav, docs] = await Promise.all([getDocsNav(), getDocs()]);
  const groups = nav.map(({ group, pages }) => ({
    group,
    items: pages.flatMap((slug) => {
      const doc = docs.find((d) => d.slug === slug);
      return doc ? [{ path: doc.path, title: doc.title }] : [];
    }),
  }));

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-6 pt-28 pb-24 lg:px-10 lg:pt-32">
      <div className="lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-12">
        <DocsNav groups={groups} index={searchIndex(docs)} />
        <div className="mt-8 min-w-0 lg:mt-0">{children}</div>
      </div>
    </main>
  );
}
