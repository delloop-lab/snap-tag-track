import type { ReactNode } from "react";
import { useAuth } from "@/components/AuthProvider";
import { PRIVACY_PUBLISHED_VERSION_ID } from "@/lib/privacyVersion";
import MarketingTopNav, { marketingPageGutterClass } from "@/components/MarketingTopNav";
import SiteFooter from "@/components/SiteFooter";

const HELP_EMAIL = "help@snaptagtrack.com";

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

export default function Privacy() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen w-full bg-slate-800 text-slate-100">
      <section className={`${marketingPageGutterClass} pb-28`}>
        {!user && <MarketingTopNav />}

        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className="mb-4 inline-flex items-center rounded-full border border-[#7CB87E]/40 bg-[#7CB87E]/10 px-3 py-1 text-xs font-medium text-[#7CB87E]">
            Legal
          </p>
          <h1 className="text-balance text-3xl font-extrabold tracking-tight text-white md:text-4xl">Privacy</h1>
          <p className="mx-auto mt-4 max-w-lg text-pretty text-base leading-relaxed text-slate-300 md:text-lg">
            This Privacy Policy explains how SnapTagTrack (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) collects, uses, and protects your information
            when you use the Service.
          </p>
          <p className="mx-auto mt-3 max-w-lg text-xs text-slate-500">
            Last updated: 1 May 2026 (version <span className="font-mono text-slate-400">{PRIVACY_PUBLISHED_VERSION_ID}</span>)
          </p>
        </div>

        <article className="mx-auto max-w-6xl">
          <div className="space-y-10 rounded-2xl border border-slate-600 bg-slate-900/70 p-6 shadow-xl shadow-black/20 sm:p-8">
          <Section id="what-we-collect" title="1. What we collect">
            <p>When you use SnapTagTrack, we may collect the following information:</p>
            <p className="font-semibold text-slate-100">Account information</p>
            <ul className="list-disc space-y-2 pl-5 marker:text-slate-500">
              <li>Name (if provided)</li>
              <li>Email address</li>
              <li>Login credentials (securely stored)</li>
            </ul>
            <p className="font-semibold text-slate-100 pt-1">Receipt and content data</p>
            <ul className="list-disc space-y-2 pl-5 marker:text-slate-500">
              <li>Photos of receipts or invoices</li>
              <li>Text extracted from those receipts</li>
              <li>Tags, notes, and categories you add</li>
            </ul>
            <p className="font-semibold text-slate-100 pt-1">Usage data</p>
            <ul className="list-disc space-y-2 pl-5 marker:text-slate-500">
              <li>Basic activity within the app (such as features used and time spent)</li>
              <li>Device and browser information</li>
              <li>Error logs and performance data</li>
            </ul>
          </Section>

          <Section id="how-we-use" title="2. How we use your information">
            <p>We use your information to:</p>
            <ul className="list-disc space-y-2 pl-5 marker:text-slate-500">
              <li>Provide and operate the Service</li>
              <li>Store and organise your receipts and data</li>
              <li>Extract and structure receipt information (including automated processing)</li>
              <li>Improve product performance and reliability</li>
              <li>Provide customer support</li>
              <li>Prevent abuse and ensure security</li>
            </ul>
            <p className="pt-1">We do not sell your personal data.</p>
          </Section>

          <Section id="ai" title="3. AI and automated processing">
            <p>SnapTagTrack may use automated systems, including AI tools, to:</p>
            <ul className="list-disc space-y-2 pl-5 marker:text-slate-500">
              <li>Read and extract data from receipts</li>
              <li>Categorise and structure information</li>
              <li>Generate summaries or insights</li>
            </ul>
            <p>
              These processes are designed to help you organise your data, but they may not always be perfect. You remain responsible
              for verifying important financial or legal information.
            </p>
          </Section>

          <Section id="retention" title="4. Data storage and retention">
            <p>We store your data securely using trusted infrastructure providers.</p>
            <p>We keep your data only for as long as it is needed to:</p>
            <ul className="list-disc space-y-2 pl-5 marker:text-slate-500">
              <li>provide the Service</li>
              <li>comply with legal obligations</li>
              <li>resolve disputes</li>
              <li>maintain system integrity</li>
            </ul>
            <p>
              You can request deletion of your account and data at any time by contacting us at <Mailto />.
            </p>
          </Section>

          <Section id="sharing" title="5. Sharing your information">
            <p>We may share limited data with trusted third-party providers who help us operate the Service, such as:</p>
            <ul className="list-disc space-y-2 pl-5 marker:text-slate-500">
              <li>cloud hosting providers</li>
              <li>authentication services</li>
              <li>analytics tools</li>
              <li>AI processing services</li>
            </ul>
            <p>These providers are only given access to the minimum data required to perform their function.</p>
            <p>We do not share your personal data with advertisers or sell it to third parties.</p>
          </Section>

          <Section id="security" title="6. Data security">
            <p>
              We take reasonable technical and organisational measures to protect your data, including encryption in transit and at
              rest where applicable.
            </p>
            <p>However, no system can be guaranteed 100% secure, and you use the Service at your own risk.</p>
          </Section>

          <Section id="rights" title="7. Your rights">
            <p>Depending on your location, you may have rights to:</p>
            <ul className="list-disc space-y-2 pl-5 marker:text-slate-500">
              <li>access your data</li>
              <li>correct inaccurate data</li>
              <li>request deletion</li>
              <li>object to or restrict processing</li>
              <li>request a copy of your data</li>
            </ul>
            <p>
              To exercise these rights, contact <Mailto />.
            </p>
          </Section>

          <Section id="international" title="8. International users">
            <p>
              Your data may be processed or stored in countries outside your own, including Australia or other jurisdictions where our
              service providers operate.
            </p>
            <p>We take steps to ensure appropriate safeguards are in place.</p>
          </Section>

          <Section id="children" title="9. Children&apos;s privacy">
            <p>SnapTagTrack is not intended for children under 16, and we do not knowingly collect data from them.</p>
          </Section>

          <Section id="changes" title="10. Changes to this policy">
            <p>We may update this Privacy Policy from time to time.</p>
            <p>We will post any updates in the Service and update the &quot;Last updated&quot; date.</p>
            <p>Continued use of the Service means you accept the updated policy.</p>
          </Section>

          <Section id="contact" title="11. Contact">
            <p>If you have questions about this Privacy Policy:</p>
            <p>
              Email: <Mailto />
            </p>
            <p>Postal: SnapTagTrack, 202/1101 Hay Street, West Perth, WA 6005, Australia</p>
          </Section>
        </div>
        </article>
      </section>
      <SiteFooter variant="slate" />
    </div>
  );
}
