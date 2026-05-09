import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { SEO_LANDING_BODIES } from "@/marketing/seoLandingRegistry";
import { BLOG_POSTS } from "@/marketing/blogPosts";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

type SearchItem = {
  id: string;
  type: "guide" | "blog" | "faq";
  title: string;
  snippet: string;
  /** Full text shown when the accordion item is expanded (search also matches this). */
  detail: string;
  path: string;
};

function buildSearchItems(includeBlog: boolean): SearchItem[] {
  const items: SearchItem[] = [];

  Object.entries(SEO_LANDING_BODIES).forEach(([path, body]) => {
    const introFull = body.intro.join(" ");
    items.push({
      id: `guide:${path}`,
      type: "guide",
      title: body.h1,
      snippet: introFull.slice(0, 240),
      detail: introFull,
      path,
    });

    (body.faq || []).forEach((faq, idx) => {
      items.push({
        id: `guide-faq:${path}:${idx}`,
        type: "faq",
        title: faq.question,
        snippet: faq.answer.length > 240 ? `${faq.answer.slice(0, 240)}…` : faq.answer,
        detail: faq.answer,
        path,
      });
    });
  });

  if (includeBlog) {
    BLOG_POSTS.forEach((post) => {
      const blogDetail = [post.description, ...post.paragraphs].join(" ").trim();
      items.push({
        id: `blog:${post.slug}`,
        type: "blog",
        title: post.h1,
        snippet: post.description.length > 240 ? `${post.description.slice(0, 240)}…` : post.description,
        detail: blogDetail.slice(0, 4000),
        path: post.path,
      });

      (post.faq || []).forEach((faq, idx) => {
        items.push({
          id: `blog-faq:${post.slug}:${idx}`,
          type: "faq",
          title: faq.question,
          snippet: faq.answer.length > 240 ? `${faq.answer.slice(0, 240)}…` : faq.answer,
          detail: faq.answer,
          path: post.path,
        });
      });
    });
  }

  return items;
}

const SEARCH_ITEMS_ALL = buildSearchItems(true);
const SEARCH_ITEMS_GUIDES_ONLY = buildSearchItems(false);

function typeLabel(type: SearchItem["type"]): string {
  if (type === "guide") return "PAGE";
  if (type === "blog") return "BLOG";
  return "FAQ";
}

function openPageLabel(type: SearchItem["type"]): string {
  if (type === "guide") return "Open topic page";
  if (type === "blog") return "Open blog post";
  return "Open page for full answer";
}

export type GuideSearchSources = "all" | "guides";

type Props = {
  className?: string;
  maxResults?: number;
  /** Guides only excludes blog posts (SEO layer vs editorial). Default: all sources. */
  sources?: GuideSearchSources;
};

export default function GuideSearch({ className, maxResults = 12, sources = "all" }: Props) {
  const [query, setQuery] = useState("");

  const pool = sources === "guides" ? SEARCH_ITEMS_GUIDES_ONLY : SEARCH_ITEMS_ALL;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pool.slice(0, maxResults);

    const scored = pool.map((item) => {
      const hay = `${item.title} ${item.snippet} ${item.detail}`.toLowerCase();
      let score = 0;
      if (item.title.toLowerCase().includes(q)) score += 5;
      if (hay.includes(q)) score += 2;
      if (item.type === "guide") score += 0.2;
      return { item, score };
    })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
      .map((x) => x.item);

    return scored;
  }, [pool, query, maxResults]);

  return (
    <section className={className}>
      <label htmlFor="guide-search-input" className="mb-2 block text-sm font-semibold text-white">
        {sources === "guides" ? "Search topic pages (no blog)" : "Search topic pages & blog"}
      </label>
      <input
        id="guide-search-input"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Try: warranty, fuel, taxes, business..."
        className="h-11 w-full rounded-xl border border-slate-500 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400/40"
      />
      {results.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">No matches found.</p>
      ) : (
        <Accordion type="single" collapsible className="mt-3 w-full">
          {results.map((item) => (
            <AccordionItem
              key={item.id}
              value={item.id}
              className={cn(
                "mb-2 rounded-lg border border-slate-600 bg-slate-900/50 px-3 last:mb-0 data-[state=open]:border-[#7CB87E]/35 data-[state=open]:bg-slate-800/70",
                "border-b-0",
              )}
            >
              <AccordionTrigger
                className="items-start gap-3 py-3 text-left hover:no-underline [&[data-state=open]>svg]:text-[#7CB87E]"
                aria-label={`${typeLabel(item.type)}: ${item.title}`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    {typeLabel(item.type)}
                  </span>
                  <span className="mt-1 block text-sm font-semibold leading-snug text-[#7CB87E] sm:text-[15px]">
                    {item.title}
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pb-3 pt-0 text-sm leading-relaxed text-slate-300">
                <p className="text-xs sm:text-sm">{item.detail}</p>
                <Link
                  to={item.path}
                  className="inline-flex text-xs font-semibold text-[#7CB87E] underline-offset-2 hover:underline sm:text-sm"
                >
                  {openPageLabel(item.type)} →
                </Link>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </section>
  );
}
