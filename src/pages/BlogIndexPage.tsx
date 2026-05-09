import { Link } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import MarketingTopNav, { marketingPageGutterClass } from "@/components/MarketingTopNav";
import SiteFooter from "@/components/SiteFooter";
import { BLOG_POSTS } from "@/marketing/blogPosts";
import GuideSearch from "@/components/GuideSearch";
import {
  seoGuideLinksForBlogSlug,
} from "@/marketing/blogPostSeoGuides";

const BLOG_HUB_SAMPLE_SLUG = "how-receipt-tracking-works";

export default function BlogIndexPage() {
  const { user } = useAuth();
  const blogHubGuides = seoGuideLinksForBlogSlug(BLOG_HUB_SAMPLE_SLUG);

  return (
    <div className="min-h-screen w-full bg-slate-800 text-slate-100">
      <div className={`${marketingPageGutterClass} pb-10`}>
        {!user && <MarketingTopNav />}

        <main className="mx-auto max-w-4xl pb-16">
          <header className="border-b border-slate-600/80 pb-8">
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Snap Tag Track blog</h1>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-300 sm:text-lg">
              Longer reads on receipts, warranties, spending, and what tends to stick in everyday use.
            </p>
          </header>

          <section className="mt-8 rounded-2xl border border-slate-600 bg-slate-900/40 p-5 sm:p-6" aria-label="Related crawlable URLs">
            <h2 className="text-lg font-semibold text-white">Related crawlable URLs</h2>
            <p className="mt-2 text-sm text-slate-300">
              Indexed pages mirror common search intents—they never replace Help Centre FAQs or duplicate this blog&apos;s prose.
            </p>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {blogHubGuides.map(({ path, label }) => (
                <li key={path}>
                  <Link to={path} className="text-sm font-semibold text-[#7CB87E] underline-offset-2 hover:underline">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-slate-500">
              More workflows:{" "}
              <Link to="/use-cases" className="font-semibold text-[#7CB87E] underline-offset-2 hover:underline">
                Use cases overview
              </Link>
              .
            </p>
          </section>

          <section className="mt-8 space-y-3">
            {BLOG_POSTS.map((post) => {
              const matchedGuides = seoGuideLinksForBlogSlug(post.slug);
              const primaryGuide = matchedGuides[0];
              return (
              <article key={post.slug} className="rounded-2xl border border-slate-600 bg-slate-700/50 p-4 sm:p-5">
                <h2 className="text-lg font-bold text-white sm:text-xl">
                  <Link to={post.path} className="hover:text-[#7CB87E] hover:underline">
                    {post.h1}
                  </Link>
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{post.description}</p>
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
                  <Link to={post.path} className="font-semibold text-[#7CB87E] hover:underline">
                    Read article
                  </Link>
                  {primaryGuide ? (
                    <>
                      <span className="text-slate-600">·</span>
                      <Link
                        to={primaryGuide.path}
                        className="font-medium text-slate-400 underline-offset-2 hover:text-[#7CB87E] hover:underline"
                      >
                        Matching page: {primaryGuide.label}
                      </Link>
                    </>
                  ) : null}
                </div>
              </article>
              );
            })}
          </section>

          <section className="mt-10 rounded-2xl border border-slate-600 bg-slate-900/40 p-5 sm:p-6">
            <GuideSearch sources="all" />
          </section>
        </main>
      </div>

      <SiteFooter variant="slate" />
    </div>
  );
}
