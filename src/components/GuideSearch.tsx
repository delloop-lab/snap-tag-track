import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { SEO_LANDING_BODIES } from "@/marketing/seoLandingRegistry";
import { BLOG_POSTS } from "@/marketing/blogPosts";

type SearchItem = {
  id: string;
  type: "guide" | "blog" | "faq";
  title: string;
  snippet: string;
  path: string;
};

function buildSearchItems(): SearchItem[] {
  const items: SearchItem[] = [];

  Object.entries(SEO_LANDING_BODIES).forEach(([path, body]) => {
    items.push({
      id: `guide:${path}`,
      type: "guide",
      title: body.h1,
      snippet: body.intro.join(" ").slice(0, 240),
      path,
    });

    (body.faq || []).forEach((faq, idx) => {
      items.push({
        id: `guide-faq:${path}:${idx}`,
        type: "faq",
        title: faq.question,
        snippet: faq.answer.slice(0, 240),
        path,
      });
    });
  });

  BLOG_POSTS.forEach((post) => {
    items.push({
      id: `blog:${post.slug}`,
      type: "blog",
      title: post.h1,
      snippet: post.description,
      path: post.path,
    });

    (post.faq || []).forEach((faq, idx) => {
      items.push({
        id: `blog-faq:${post.slug}:${idx}`,
        type: "faq",
        title: faq.question,
        snippet: faq.answer,
        path: post.path,
      });
    });
  });

  return items;
}

const SEARCH_ITEMS = buildSearchItems();

function typeLabel(type: SearchItem["type"]): string {
  if (type === "guide") return "Guide";
  if (type === "blog") return "Blog post";
  return "FAQ";
}

type Props = {
  className?: string;
  maxResults?: number;
};

export default function GuideSearch({ className, maxResults = 12 }: Props) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SEARCH_ITEMS.slice(0, maxResults);

    const scored = SEARCH_ITEMS.map((item) => {
      const hay = `${item.title} ${item.snippet}`.toLowerCase();
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
  }, [query, maxResults]);

  return (
    <section className={className}>
      <label htmlFor="guide-search-input" className="mb-2 block text-sm font-semibold text-white">
        Search guides, blog posts, and FAQs
      </label>
      <input
        id="guide-search-input"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Try: warranty, fuel, taxes, contractor..."
        className="h-11 w-full rounded-xl border border-slate-500 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400/40"
      />
      <div className="mt-3 space-y-2">
        {results.length === 0 ? (
          <p className="text-sm text-slate-400">No matches found.</p>
        ) : (
          results.map((item) => (
            <Link
              key={item.id}
              to={item.path}
              className="block rounded-lg border border-slate-600 bg-slate-900/50 px-3 py-2 hover:border-[#7CB87E]/40 hover:bg-slate-800/70"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{typeLabel(item.type)}</p>
              <p className="text-sm font-semibold text-[#7CB87E]">{item.title}</p>
              <p className="mt-0.5 line-clamp-2 text-xs text-slate-300">{item.snippet}</p>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}
