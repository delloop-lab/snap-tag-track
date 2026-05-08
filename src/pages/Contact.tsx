import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { MapPin, Mail, Send } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import MarketingTopNav, { marketingPageGutterClass } from "@/components/MarketingTopNav";
import SiteFooter from "@/components/SiteFooter";

const HELP_EMAIL = "snappy@snaptagtrack.com";

/** Match modern landing inputs (LandingPage2 slate cards). */
const fieldBase =
  "border-slate-600 bg-slate-900/80 text-slate-100 placeholder:text-slate-500 focus-visible:border-[#7CB87E]/50 focus-visible:ring-[#7CB87E]/40 focus-visible:ring-offset-0";

export default function Contact() {
  const { user } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    const meta = user?.user_metadata ?? {};
    const fn =
      typeof meta.first_name === "string"
        ? meta.first_name.trim()
        : typeof meta.firstName === "string"
          ? meta.firstName.trim()
          : "";
    const ln =
      typeof meta.last_name === "string"
        ? meta.last_name.trim()
        : typeof meta.lastName === "string"
          ? meta.lastName.trim()
          : "";
    const em = typeof user?.email === "string" ? user.email.trim() : "";
    if (fn) setFirstName((prev) => prev || fn);
    if (ln) setLastName((prev) => prev || ln);
    if (em) setEmail((prev) => prev || em);
  }, [user]);

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;

    let active = true;
    const loadProfileNames = async () => {
      // Fallback to profile table values when auth metadata names are missing.
      const { data, error } = await supabase
        .from("users")
        .select("first_name, last_name")
        .eq("id", userId)
        .maybeSingle();
      if (!active || error || !data) return;

      const dbFirst = typeof data.first_name === "string" ? data.first_name.trim() : "";
      const dbLast = typeof data.last_name === "string" ? data.last_name.trim() : "";
      if (dbFirst) setFirstName((prev) => prev || dbFirst);
      if (dbLast) setLastName((prev) => prev || dbLast);
    };

    void loadProfileNames();
    return () => {
      active = false;
    };
  }, [user?.id]);

  const trimmed = useMemo(
    () => ({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      subject: subject.trim(),
      message: message.trim(),
    }),
    [firstName, lastName, email, subject, message],
  );

  const hasValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed.email);

  const valid =
    trimmed.firstName.length > 0 &&
    hasValidEmail &&
    trimmed.subject.length > 0 &&
    trimmed.message.length > 0;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAttemptedSubmit(true);
    setSubmitError("");
    setSubmitSuccess(false);
    if (!valid) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/contact/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: trimmed.firstName,
          lastName: trimmed.lastName,
          email: trimmed.email,
          subject: trimmed.subject,
          message: trimmed.message,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok !== true) {
        const maybeCode =
          typeof payload?.errorCode === "string" && payload.errorCode
            ? ` (${payload.errorCode})`
            : "";
        throw new Error(
          typeof payload?.error === "string" && payload.error
            ? `${payload.error}${maybeCode}`
            : "Could not send message right now.",
        );
      }
      setSubmitSuccess(true);
      setSubject("");
      setMessage("");
      setAttemptedSubmit(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Could not send message right now.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-800 text-slate-100">
      <section className={`${marketingPageGutterClass} pb-28`}>
        {!user && <MarketingTopNav active="contact" />}

        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className="mb-4 inline-flex items-center rounded-full border border-[#7CB87E]/40 bg-[#7CB87E]/10 px-3 py-1 text-xs font-medium text-[#7CB87E]">
            Get in touch
          </p>
          <h1 className="text-balance text-3xl font-extrabold tracking-tight text-white md:text-4xl">
            Contact SnapTagTrack
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-pretty text-base leading-relaxed text-slate-300 md:text-lg">
            Send us a message. We&apos;ll receive it at{" "}
            <a
              href={`mailto:${HELP_EMAIL}`}
              className="font-semibold text-[#7CB87E] underline decoration-[#7CB87E]/50 underline-offset-2 hover:text-[#8fcf91]"
            >
              {HELP_EMAIL}
            </a>
            .
          </p>
        </div>

        <div className="mx-auto max-w-xl">
          <section className="mb-8 rounded-2xl border border-slate-600 bg-slate-700/70 p-5 shadow-xl shadow-black/20 sm:p-6">
            <div className="flex gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-slate-600 bg-slate-900/80 text-[#7CB87E]">
                <MapPin className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Postal address</h2>
                <address className="mt-2 not-italic text-sm leading-relaxed text-slate-200">
                  SnapTagTrack
                  <br />
                  202/1101 Hay Street
                  <br />
                  West Perth, WA 6005
                  <br />
                  Australia
                </address>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-600 bg-slate-700/70 p-5 shadow-xl shadow-black/20 sm:p-6">
            <div className="mb-6 flex items-center gap-2">
              <Mail className="h-5 w-5 text-orange-400" aria-hidden />
              <h2 className="text-lg font-semibold tracking-tight text-white">Send a message</h2>
            </div>
            <p className="mb-4 text-xs text-slate-400">* Required field</p>

            <form className="space-y-5" onSubmit={onSubmit} noValidate>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contact-first-name" className="text-slate-300">
                    First name *
                  </Label>
                  <Input
                    id="contact-first-name"
                    name="firstName"
                    autoComplete="given-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className={cn(
                      fieldBase,
                      attemptedSubmit && !trimmed.firstName && "border-red-400 focus-visible:ring-red-400/40",
                    )}
                    aria-invalid={attemptedSubmit && !trimmed.firstName}
                    required
                  />
                  {attemptedSubmit && !trimmed.firstName && (
                    <p className="text-xs text-red-400">Enter your first name.</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-last-name" className="text-slate-300">
                    Last name
                  </Label>
                  <Input
                    id="contact-last-name"
                    name="lastName"
                    autoComplete="family-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className={fieldBase}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact-email" className="text-slate-300">
                  Email *
                </Label>
                <Input
                  id="contact-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={cn(
                    fieldBase,
                    attemptedSubmit && !hasValidEmail && "border-red-400 focus-visible:ring-red-400/40",
                  )}
                  aria-invalid={attemptedSubmit && !hasValidEmail}
                  required
                />
                {attemptedSubmit && !trimmed.email && (
                  <p className="text-xs text-red-400">Enter your email address.</p>
                )}
                {attemptedSubmit && !!trimmed.email && !hasValidEmail && (
                  <p className="text-xs text-red-400">Enter a valid email address.</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact-subject" className="text-slate-300">
                  Subject *
                </Label>
                <Input
                  id="contact-subject"
                  name="subject"
                  autoComplete="off"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className={cn(
                    fieldBase,
                    attemptedSubmit && !trimmed.subject && "border-red-400 focus-visible:ring-red-400/40",
                  )}
                  aria-invalid={attemptedSubmit && !trimmed.subject}
                  required
                />
                {attemptedSubmit && !trimmed.subject && (
                  <p className="text-xs text-red-400">Add a subject line.</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact-message" className="text-slate-300">
                  Message *
                </Label>
                <Textarea
                  id="contact-message"
                  name="message"
                  rows={6}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="How can we help?"
                  className={cn(
                    fieldBase,
                    "min-h-[140px]",
                    attemptedSubmit && !trimmed.message && "border-red-400 focus-visible:ring-red-400/40",
                  )}
                  aria-invalid={attemptedSubmit && !trimmed.message}
                  required
                />
                {attemptedSubmit && !trimmed.message && (
                  <p className="text-xs text-red-400">Write your message.</p>
                )}
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full gap-2 rounded-xl bg-orange-500 font-bold text-white hover:bg-orange-600 sm:w-auto"
                disabled={submitting}
              >
                <Send className="h-4 w-4" aria-hidden />
                {submitting ? "Sending..." : "Send message"}
              </Button>
            </form>

            {submitSuccess && (
              <p className="mt-4 text-sm text-green-300">Thanks — your message has been sent.</p>
            )}
            {!!submitError && (
              <p className="mt-4 text-sm text-red-300">{submitError}</p>
            )}

          </section>
        </div>
      </section>
      <SiteFooter variant="slate" />
    </div>
  );
}
