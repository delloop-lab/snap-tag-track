import { useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Link, Navigate, useParams } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import MarketingTopNav, { marketingPageGutterClass } from "@/components/MarketingTopNav";
import SiteFooter from "@/components/SiteFooter";
import { BLOG_POSTS_BY_SLUG } from "@/marketing/blogPosts";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function BlogPostPage() {
  const { user } = useAuth();
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? BLOG_POSTS_BY_SLUG[slug] : undefined;

  const faqJsonLd = useMemo(() => {
    if (!post?.faq?.length) return "";
    return JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: post.faq.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    });
  }, [post]);

  if (!post) {
    return <Navigate to="/blog" replace />;
  }

  return (
    <div className="min-h-screen w-full bg-slate-800 text-slate-100">
      {faqJsonLd ? (
        <Helmet>
          <script type="application/ld+json">{faqJsonLd}</script>
        </Helmet>
      ) : null}

      <div className={`${marketingPageGutterClass} pb-10`}>
        {!user && <MarketingTopNav />}

        <article className="mx-auto max-w-3xl pb-16">
          <header className="border-b border-slate-600/80 pb-8">
            <Link to="/blog" className="text-sm font-semibold text-[#7CB87E] hover:underline">
              Back to blog
            </Link>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">{post.h1}</h1>
            <p className="mt-4 text-sm leading-relaxed text-slate-300 sm:text-base">{post.description}</p>
          </header>

          <section className="mt-8 space-y-4 text-sm leading-relaxed text-slate-300 sm:text-base">
            {post.paragraphs.map((paragraph, index) => (
              <p key={`p-${index}`}>{paragraph}</p>
            ))}
            {post.bullets?.length ? (
              <ul className="list-disc space-y-2 pl-6">
                {post.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            ) : null}
          </section>

          <section className="mt-10 rounded-2xl border border-slate-600 bg-slate-900/40 p-5">
            <h2 className="text-lg font-semibold text-white">Try this in Snap Tag Track</h2>
            <p className="mt-2 text-sm text-slate-300">
              Put this workflow into practice inside your account. Capture a few real receipts, tag them, and
              review what changes.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                to="/auth"
                className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-600"
              >
                Try Snap Tag Track
              </Link>
              <Link
                to="/help"
                className="inline-flex items-center justify-center rounded-xl border border-slate-500 bg-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-100 hover:bg-slate-600"
              >
                Help
              </Link>
            </div>
          </section>

          {post.faq?.length ? (
            <section className="mt-10 rounded-2xl border border-slate-600 bg-slate-700/70 p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-white sm:text-xl">FAQ</h2>
              <Accordion type="single" collapsible className="mt-4 w-full">
                {post.faq.map((item, i) => (
                  <AccordionItem key={item.question} value={`faq-${i}`} className="border-slate-600">
                    <AccordionTrigger className="text-left text-sm font-semibold text-slate-100 hover:text-white hover:no-underline">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm leading-relaxed text-slate-300">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          ) : null}

          <section className="mt-10 rounded-2xl border border-slate-600 bg-slate-900/40 p-5">
            <h2 className="text-lg font-semibold text-white">Related guides</h2>
            <ul className="mt-3 space-y-2">
              {post.relatedSlugs.slice(0, 2).map((relatedSlug) => {
                const related = BLOG_POSTS_BY_SLUG[relatedSlug];
                if (!related) return null;
                return (
                  <li key={related.slug}>
                    <Link to={related.path} className="text-sm font-semibold text-[#7CB87E] hover:underline">
                      {related.h1}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        </article>
      </div>

      <SiteFooter variant="slate" />
    </div>
  );
}
