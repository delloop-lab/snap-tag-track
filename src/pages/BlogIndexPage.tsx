import { Link } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import MarketingTopNav, { marketingPageGutterClass } from "@/components/MarketingTopNav";
import SiteFooter from "@/components/SiteFooter";
import { BLOG_POSTS } from "@/marketing/blogPosts";
import GuideSearch from "@/components/GuideSearch";

export default function BlogIndexPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen w-full bg-slate-800 text-slate-100">
      <div className={`${marketingPageGutterClass} pb-10`}>
        {!user && <MarketingTopNav />}

        <main className="mx-auto max-w-4xl pb-16">
          <header className="border-b border-slate-600/80 pb-8">
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Snap Tag Track blog
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-300 sm:text-lg">
              Practical guides for receipt tracking, expense tracking, and warranty workflows. Every guide is
              written for real usage, not theory.
            </p>
          </header>

          <section className="mt-8 space-y-3">
            {BLOG_POSTS.map((post) => (
              <article key={post.slug} className="rounded-2xl border border-slate-600 bg-slate-700/50 p-4 sm:p-5">
                <h2 className="text-lg font-bold text-white sm:text-xl">
                  <Link to={post.path} className="hover:text-[#7CB87E] hover:underline">
                    {post.h1}
                  </Link>
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{post.description}</p>
                <div className="mt-3">
                  <Link to={post.path} className="text-sm font-semibold text-[#7CB87E] hover:underline">
                    Read guide
                  </Link>
                </div>
              </article>
            ))}
          </section>

          <section className="mt-10 rounded-2xl border border-slate-600 bg-slate-900/40 p-5 sm:p-6">
            <GuideSearch />
          </section>
        </main>
      </div>

      <SiteFooter variant="slate" />
    </div>
  );
}
