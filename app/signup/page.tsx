import Link from "next/link";
import Image from "next/image";
import { ChevronLeft } from "lucide-react";
import { SignupForm } from "./SignupForm";

export const metadata = {
  title: "Sign up — ClassCadence",
  description:
    "Tell us a bit about your learning center and we'll get you set up.",
};

export default function SignupPage() {
  return (
    <main className="relative min-h-screen bg-bg overflow-hidden">
      {/* Atmosphere — three color washes matching the landing page */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-[-160px] left-1/2 -translate-x-1/2 w-[1100px] h-[640px] opacity-50 blur-3xl -z-10"
        style={{ background: "radial-gradient(closest-side, #D6F4E5, transparent)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-[160px] -right-[160px] w-[640px] h-[640px] opacity-50 blur-3xl -z-10"
        style={{ background: "radial-gradient(closest-side, #FFEDD5, transparent)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[-160px] -left-[120px] w-[640px] h-[640px] opacity-40 blur-3xl -z-10"
        style={{ background: "radial-gradient(closest-side, #E0E7FF, transparent)" }}
      />

      <header className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <Image
            src="/logo.svg"
            alt=""
            width={32}
            height={32}
            priority
            className="rounded-md"
            style={{ filter: "drop-shadow(0 6px 14px rgba(11,104,69,0.28))" }}
          />
          <span className="font-wordmark text-xl text-primary font-semibold tracking-tight">
            ClassCadence
          </span>
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-primary transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back home
        </Link>
      </header>

      <section className="max-w-3xl mx-auto px-6 py-10 md:py-16">
        <div className="text-center mb-10">
          <p className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-soft text-accent text-[11px] font-bold uppercase tracking-[0.18em]">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Get Started
          </p>
          <h1 className="mt-5 font-display text-3xl md:text-5xl font-bold uppercase text-primary leading-[1.05] tracking-[-0.015em]">
            Let&apos;s Get Your Center<br />
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(180deg, #FDBA74 0%, var(--color-accent) 55%, #C2410C 100%)",
              }}
            >
              Up And Running.
            </span>
          </h1>
          <p className="mt-5 text-base md:text-lg text-ink/70 leading-relaxed max-w-xl mx-auto">
            Tell us a bit about your learning center. We&apos;ll reach out within one business day to walk you through setup and provision your tenant.
          </p>
        </div>

        <div
          className="rounded-2xl bg-surface p-6 md:p-8 border border-line"
          style={{
            boxShadow:
              "0 4px 8px rgba(15,23,42,0.06), 0 24px 48px -16px rgba(15,23,42,0.18), 0 12px 24px -12px rgba(11,104,69,0.20)",
          }}
        >
          <SignupForm />
        </div>

        <p className="mt-8 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
