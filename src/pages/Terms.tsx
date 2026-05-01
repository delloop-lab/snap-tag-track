import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "@/components/AuthProvider";
import { TERMS_PUBLISHED_VERSION_ID } from "@/lib/termsVersion";
import MarketingTopNav, { marketingPageGutterClass } from "@/components/MarketingTopNav";
import SiteFooter from "@/components/SiteFooter";

const HELP_EMAIL = "help@snaptagtrack.com";

/** Section block for long-form legal-ish copy (slate landing style). */
function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-lg font-bold tracking-tight text-white sm:text-xl">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-300 sm:text-[15px]">{children}</div>
    </section>
  );
}

function Mailto() {
  return (
    <a
      href={`mailto:${HELP_EMAIL}`}
      className="font-medium text-[#7CB87E] underline decoration-[#7CB87E]/40 underline-offset-2 hover:text-[#8fcf91]"
    >
      {HELP_EMAIL}
    </a>
  );
}

export default function Terms() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen w-full bg-slate-800 text-slate-100">
      <section className={`${marketingPageGutterClass} pb-28`}>
        {!user && <MarketingTopNav />}

        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className="mb-4 inline-flex items-center rounded-full border border-[#7CB87E]/40 bg-[#7CB87E]/10 px-3 py-1 text-xs font-medium text-[#7CB87E]">
            Legal
          </p>
          <h1 className="text-balance text-3xl font-extrabold tracking-tight text-white md:text-4xl">Terms and Conditions</h1>
          <p className="mx-auto mt-4 max-w-lg text-pretty text-base leading-relaxed text-slate-300 md:text-lg">
            These terms govern your use of SnapTagTrack (&quot;the Service&quot;). By creating an account or using the Service, you agree to
            these terms.
          </p>
          <p className="mx-auto mt-3 max-w-lg text-xs text-slate-500">
            Last updated: 1 May 2026 (version <span className="font-mono text-slate-400">{TERMS_PUBLISHED_VERSION_ID}</span>)
          </p>
        </div>

        <article className="mx-auto max-w-6xl">
          <div className="space-y-10 rounded-2xl border border-slate-600 bg-slate-900/70 p-6 shadow-xl shadow-black/20 sm:p-8">
          <Section id="agreement" title="1. Agreement to these terms">
            <p>
              By using SnapTagTrack, you confirm that you can enter into a binding agreement and that you accept these Terms
              &amp; Conditions.
            </p>
            <p>If you do not agree, you must stop using the Service.</p>
          </Section>

          <Section id="service" title="2. The Service">
            <p>
              SnapTagTrack helps you capture, organise, tag, and review receipts and expense-related information using image
              capture and optional automated processing.
            </p>
            <p>Features may change over time, improve, or be removed as the product evolves.</p>
            <p>We aim to keep the Service available and reliable but do not guarantee uninterrupted access.</p>
          </Section>

          <Section id="monetisation" title="3. Free use and future monetisation">
            <p>
              SnapTagTrack is currently available free of charge with a fair use limit of{" "}
              <strong className="font-semibold text-slate-100">30 receipt captures per calendar year</strong>.
            </p>
            <p>We may introduce or change monetisation models in the future, including but not limited to:</p>
            <ul className="list-disc space-y-2 pl-5 marker:text-slate-500">
              <li>subscription plans</li>
              <li>advertising</li>
              <li>usage-based limits</li>
              <li>or other commercial models</li>
            </ul>
            <p>If changes affect how you use the Service, we will provide reasonable notice where practical.</p>
            <p>If you exceed applicable limits, access may be restricted or adjusted to maintain fair use for all users.</p>
          </Section>

          <Section id="accounts" title="4. Accounts">
            <p>You are responsible for:</p>
            <ul className="list-disc space-y-2 pl-5 marker:text-slate-500">
              <li>providing accurate account information</li>
              <li>keeping your login credentials secure</li>
              <li>all activity under your account</li>
            </ul>
            <p>
              If you suspect unauthorised access, contact us at <Mailto />.
            </p>
          </Section>

          <Section id="acceptable-use" title="5. Acceptable use">
            <p>You agree not to:</p>
            <ul className="list-disc space-y-2 pl-5 marker:text-slate-500">
              <li>use the Service for unlawful, fraudulent, or harmful activity</li>
              <li>attempt to disrupt, overload, or interfere with the Service</li>
              <li>scrape or extract data at scale outside normal use</li>
              <li>reverse engineer the Service except where legally permitted</li>
              <li>upload content you do not have rights to use</li>
              <li>impersonate others or misuse personal data</li>
            </ul>
          </Section>

          <Section id="your-data" title="6. Your data and content">
            <p>You retain ownership of all receipts, images, and notes you upload.</p>
            <p>You grant SnapTagTrack a non-exclusive licence to:</p>
            <ul className="list-disc space-y-2 pl-5 marker:text-slate-500">
              <li>store and host your content</li>
              <li>process and analyse it (including automated and AI-assisted processing)</li>
              <li>display it back to you within the Service</li>
              <li>create backups for reliability and recovery</li>
              <li>use it to operate and improve the Service</li>
            </ul>
            <p>We only access your data when necessary to provide support, maintain system integrity, or investigate abuse.</p>
            <p>You are responsible for ensuring you have the necessary rights and consent to upload any data you submit.</p>
          </Section>

          <Section id="ai" title="7. AI and automated processing">
            <p>SnapTagTrack may use automated systems to extract, interpret, or summarise information from receipts.</p>
            <p>These outputs may be incomplete or inaccurate.</p>
            <p>
              You should always verify important information before relying on it for financial, tax, legal, or accounting
              purposes.
            </p>
          </Section>

          <Section id="third-parties" title="8. Third-party services">
            <p>
              The Service may depend on third-party providers for hosting, storage, authentication, or other infrastructure.
            </p>
            <p>We are not responsible for outages or issues caused by third-party services outside our control.</p>
          </Section>

          <Section id="privacy" title="9. Privacy">
            <p>We process personal data to provide the Service.</p>
            <p>You agree to use the Service in compliance with applicable privacy laws.</p>
            <p>
              For more detail, please refer to our{" "}
              <Link to="/privacy" className="font-medium text-[#7CB87E] underline decoration-[#7CB87E]/40 underline-offset-2 hover:text-[#8fcf91]">
                Privacy Policy
              </Link>
              , or contact us at <Mailto />.
            </p>
          </Section>

          <Section id="availability" title="10. Service availability">
            <p>We aim to provide a reliable service but do not guarantee uninterrupted or error-free operation.</p>
            <p>Maintenance, updates, or external factors may temporarily affect availability.</p>
          </Section>

          <Section id="disclaimers" title="11. Disclaimers">
            <p>
              The Service is provided on an &quot;as is&quot; and &quot;as available&quot; basis to the maximum extent permitted by law.
            </p>
            <p>
              We do not make warranties of any kind, including fitness for a particular purpose, merchantability, or
              non-infringement.
            </p>
          </Section>

          <Section id="liability" title="12. Limitation of liability">
            <p>
              To the maximum extent permitted by law, SnapTagTrack and its operators are not liable for indirect, incidental,
              consequential, or special damages, including loss of data, profits, or business.
            </p>
            <p>Where liability cannot be excluded by law, our total liability is limited to the greater of:</p>
            <ul className="list-disc space-y-2 pl-5 marker:text-slate-500">
              <li>the amount you paid to use the Service in the past 12 months (if any), or</li>
              <li>AUD $50</li>
            </ul>
          </Section>

          <Section id="indemnity" title="13. Indemnity">
            <p>
              You agree to indemnify and hold harmless SnapTagTrack from any claims, damages, losses, or expenses arising from:
            </p>
            <ul className="list-disc space-y-2 pl-5 marker:text-slate-500">
              <li>your misuse of the Service</li>
              <li>your violation of these terms</li>
              <li>content you upload or submit</li>
            </ul>
            <p>where permitted by law.</p>
          </Section>

          <Section id="termination" title="14. Suspension and termination">
            <p>We may suspend or terminate access if:</p>
            <ul className="list-disc space-y-2 pl-5 marker:text-slate-500">
              <li>you breach these terms</li>
              <li>your use creates risk or harm</li>
              <li>we are required to do so for legal or operational reasons</li>
            </ul>
            <p>You may stop using the Service at any time.</p>
            <p>Some provisions will continue to apply after termination where relevant.</p>
          </Section>

          <Section id="changes" title="15. Changes to these terms">
            <p>We may update these terms from time to time.</p>
            <p>We will post the updated version in the Service and revise the &quot;Last updated&quot; date.</p>
            <p>Continued use of the Service means you accept the updated terms.</p>
          </Section>

          <Section id="governing-law" title="16. Governing law">
            <p>These terms are governed by the laws of Western Australia, Australia.</p>
            <p>
              Disputes will be handled in that jurisdiction, subject to any non-waivable rights you may have under the laws of
              your country of residence.
            </p>
          </Section>

          <Section id="contact" title="17. Contact">
            <p>If you have questions about these terms:</p>
            <p>
              Email: <Mailto />
            </p>
            <p>
              Postal: SnapTagTrack, 202/1101 Hay Street, West Perth, WA 6005, Australia
            </p>
          </Section>
        </div>
        </article>
      </section>
      <SiteFooter variant="slate" />
    </div>
  );
}
