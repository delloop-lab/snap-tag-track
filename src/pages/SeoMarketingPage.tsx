import { useMemo } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import MarketingTopNav, { marketingPageGutterClass } from "@/components/MarketingTopNav";
import SiteFooter from "@/components/SiteFooter";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SEO_LANDING_PATHS } from "@/marketing/seoPublicPaths";
import { getSeoLandingBody } from "@/marketing/seoLandingRegistry";
import { useAuth } from "@/components/AuthProvider";

const RELATED_LINK_LABELS: Record<string, string> = {
  "/receipt-scanner-app": "Receipt scanner app",
  "/warranty-tracker": "Warranty tracker",
  "/expense-tracking-without-bank": "Expense tracking without a bank",
  "/contractor-expense-tracker": "Contractor expense tracker",
  "/household-spending-tracker": "Household spending tracker",
  "/fuel-food-spending-tracker": "Fuel and food spending tracker",
  "/how-it-works": "How it works",
  "/pricing": "Pricing",
  "/use-cases": "Use cases",
  "/blog": "Blog",
};

export default function SeoMarketingPage() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const body = getSeoLandingBody(pathname);

  const faqJsonLd = useMemo(() => {
    if (!body?.faq?.length) return "";
    return JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: body.faq.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    });
  }, [body]);

  if (!body) {
    return <Navigate to="/" replace />;
  }

  const related = SEO_LANDING_PATHS.filter((p) => p !== pathname);

  return (
    <div className="min-h-screen w-full bg-slate-800 text-slate-100">
      {faqJsonLd ? (
        <Helmet>
          <script type="application/ld+json">{faqJsonLd}</script>
        </Helmet>
      ) : null}

      <div className={`${marketingPageGutterClass} pb-10`}>
        {!user && <MarketingTopNav />}

        <article className="mx-auto max-w-3xl pb-8">
          <header className="border-b border-slate-600/80 pb-8">
            <h1 className="text-balance text-3xl font-extrabold tracking-tight text-white sm:text-4xl">{body.h1}</h1>
            <div className="mt-5 space-y-4 text-base leading-relaxed text-slate-300 sm:text-lg">
              {body.intro.map((p, i) => (
                <p key={`intro-${i}`}>{p}</p>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/auth"
                className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-orange-600"
              >
                Try Snap Tag Track
              </Link>
              <Link
                to="/help"
                className="inline-flex items-center justify-center rounded-xl border border-slate-500 bg-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-100 hover:bg-slate-600"
              >
                Help and FAQs
              </Link>
            </div>
          </header>

          <div className="mt-10 space-y-12">
            {body.sections.map((section) => (
              <section key={section.h2} className="scroll-mt-8">
                <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">{section.h2}</h2>
                <div className="mt-4 space-y-4 text-sm leading-relaxed text-slate-300 sm:text-base">
                  {section.paragraphs.map((p, j) => (
                    <p key={`${section.h2}-${j}`}>{p}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {body.faq && body.faq.length > 0 ? (
            <section className="mt-14 rounded-2xl border border-slate-600 bg-slate-700/70 p-5 sm:p-6" aria-labelledby="seo-faq-heading">
              <h2 id="seo-faq-heading" className="text-lg font-semibold text-white sm:text-xl">
                Frequently asked questions
              </h2>
              <Accordion type="single" collapsible className="mt-4 w-full">
                {body.faq.map((item, i) => (
                  <AccordionItem key={item.question} value={`faq-${i}`} className="border-slate-600">
                    <AccordionTrigger className="text-left text-sm font-semibold text-slate-100 hover:text-white hover:no-underline sm:text-[15px]">
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

          <section className="mt-14 rounded-2xl border border-slate-600 bg-slate-900/40 p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-white">More guides</h2>
            <p className="mt-2 text-sm text-slate-400">
              Internal guides for receipt tracking, warranty reminders, and expense tracking—open in a new context, same
              account.
            </p>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {related.map((path) => (
                <li key={path}>
                  <Link to={path} className="text-sm font-medium text-[#7CB87E] underline-offset-2 hover:underline">
                    {RELATED_LINK_LABELS[path] ?? path}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-10 border-t border-slate-600/80 pt-8">
            <p className="text-sm text-slate-400">
              Ready to capture real receipts?{" "}
              <Link to="/auth" className="font-semibold text-[#7CB87E] hover:underline">
                Create a free account
              </Link>{" "}
              or read{" "}
              <Link to="/help" className="font-semibold text-[#7CB87E] hover:underline">
                Help
              </Link>{" "}
              for scanning tips.
            </p>
          </section>
        </article>
      </div>

      <SiteFooter variant="slate" />
    </div>
  );
}
