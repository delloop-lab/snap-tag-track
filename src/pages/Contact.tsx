import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { MapPin, Mail, Send } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const HELP_EMAIL = "help@snaptagtrack.com";

/** Match modern landing inputs (LandingPage2 slate cards). */
const fieldBase =
  "border-slate-600 bg-slate-900/80 text-slate-100 placeholder:text-slate-500 focus-visible:border-[#7CB87E]/50 focus-visible:ring-[#7CB87E]/40 focus-visible:ring-offset-0";

export default function Contact() {
  const { user } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  useEffect(() => {
    const fn =
      typeof user?.user_metadata?.first_name === "string"
        ? user.user_metadata.first_name.trim()
        : "";
    const ln =
      typeof user?.user_metadata?.last_name === "string"
        ? user.user_metadata.last_name.trim()
        : "";
    if (fn) setFirstName((prev) => prev || fn);
    if (ln) setLastName((prev) => prev || ln);
  }, [user]);

  const trimmed = useMemo(
    () => ({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      subject: subject.trim(),
      message: message.trim(),
    }),
    [firstName, lastName, subject, message],
  );

  const valid =
    trimmed.firstName.length > 0 &&
    trimmed.lastName.length > 0 &&
    trimmed.subject.length > 0 &&
    trimmed.message.length > 0;

  const mailtoHref = useMemo(() => {
    if (!valid) return "";
    const body = `${trimmed.message}\n\n---\n${trimmed.firstName} ${trimmed.lastName}`;
    // Percent-encode (%20); avoid URLSearchParams — it uses + for spaces and many mail clients leave + visible.
    const q = `subject=${encodeURIComponent(trimmed.subject)}&body=${encodeURIComponent(body)}`;
    return `mailto:${HELP_EMAIL}?${q}`;
  }, [trimmed.firstName, trimmed.lastName, trimmed.message, trimmed.subject, valid]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setAttemptedSubmit(true);
    if (!valid || !mailtoHref) return;
    window.location.href = mailtoHref;
  };

  const navBtn =
    "inline-flex items-center justify-center rounded-xl border border-slate-600 bg-slate-800/80 hover:bg-slate-700 text-slate-100 font-semibold px-4 py-2 text-sm md:text-base transition-colors";

  return (
    <div className="min-h-screen w-full bg-slate-800 text-slate-100">
      <section className="mx-auto max-w-[1600px] px-4 pt-8 md:pt-12 pb-14 md:pb-16">
        {!user && (
          <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
            <Link to="/" className="shrink-0 rounded-lg outline-offset-4 focus-visible:ring-2 focus-visible:ring-[#7CB87E]/50">
              <img src="/SnapTagTrack.png" alt="SnapTagTrack" className="h-9 md:h-[50px] w-auto brightness-110" />
            </Link>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
              <Link to="/help" className={navBtn}>
                Help
              </Link>
              <span
                className="inline-flex items-center justify-center rounded-xl border border-[#7CB87E]/50 bg-[#7CB87E]/15 px-4 py-2 text-sm font-semibold text-[#7CB87E] md:text-base"
                aria-current="page"
              >
                Contact
              </span>
              <Link
                to="/auth"
                className="inline-flex items-center justify-center rounded-xl border border-slate-500 bg-slate-700 hover:bg-slate-600 px-4 py-2 text-sm font-semibold text-white md:text-base transition-colors"
              >
                Login
              </Link>
            </div>
          </div>
        )}

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

            <form className="space-y-5" onSubmit={onSubmit} noValidate>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contact-first-name" className="text-slate-300">
                    First name
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
                    className={cn(
                      fieldBase,
                      attemptedSubmit && !trimmed.lastName && "border-red-400 focus-visible:ring-red-400/40",
                    )}
                    aria-invalid={attemptedSubmit && !trimmed.lastName}
                    required
                  />
                  {attemptedSubmit && !trimmed.lastName && (
                    <p className="text-xs text-red-400">Enter your last name.</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact-subject" className="text-slate-300">
                  Subject
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
                  Message
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
              >
                <Send className="h-4 w-4" aria-hidden />
                Open in email app
              </Button>
            </form>

            <p className="mt-5 text-xs leading-relaxed text-slate-400">
              Sending opens your email app with this message addressed to{" "}
              <span className="font-medium text-slate-200">{HELP_EMAIL}</span>. You can edit there before you
              send.
            </p>
          </section>
        </div>
      </section>
    </div>
  );
}
