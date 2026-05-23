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
    <main
      className="relative min-h-screen text-white overflow-hidden"
      style={{
        backgroundColor: "#0A0E1A",
        backgroundImage:
          "radial-gradient(ellipse at 50% -100px, rgba(26,168,118,0.18), transparent 50%), radial-gradient(ellipse at 0% 60%, rgba(99,102,241,0.14), transparent 50%), radial-gradient(ellipse at 100% 80%, rgba(249,115,22,0.12), transparent 50%)",
      }}
    >
      {/* Glowing color washes */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-[-200px] left-1/2 -translate-x-1/2 w-[1200px] h-[700px] opacity-50 blur-3xl -z-10"
        style={{ background: "radial-gradient(closest-side, rgba(26,168,118,0.35), transparent)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-[200px] -right-[200px] w-[700px] h-[700px] opacity-40 blur-3xl -z-10"
        style={{ background: "radial-gradient(closest-side, rgba(249,115,22,0.30), transparent)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[-200px] -left-[160px] w-[700px] h-[700px] opacity-40 blur-3xl -z-10"
        style={{ background: "radial-gradient(closest-side, rgba(99,102,241,0.30), transparent)" }}
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
            style={{ filter: "drop-shadow(0 0 16px rgba(43,201,138,0.50))" }}
          />
          <span className="font-wordmark text-xl text-white font-semibold tracking-tight">
            ClassCadence
          </span>
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-white/55 hover:text-white transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back home
        </Link>
      </header>

      <section className="max-w-3xl mx-auto px-6 py-10 md:py-16">
        <div className="text-center mb-10">
          <p
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.18em] text-white/90 ring-1 ring-inset ring-white/15"
            style={{
              background:
                "linear-gradient(180deg, rgba(249,115,22,0.20) 0%, rgba(249,115,22,0.05) 100%)",
              boxShadow: "0 0 32px -8px rgba(249,115,22,0.50)",
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
            Get Started
          </p>
          <h1 className="mt-5 font-display text-3xl md:text-5xl font-bold uppercase text-white leading-[1.05] tracking-[-0.015em]">
            Let&apos;s Get Your Center<br />
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(95deg, #FDBA74 0%, #F97316 50%, #FB923C 100%)",
              }}
            >
              Up And Running.
            </span>
          </h1>
          <p className="mt-5 text-base md:text-lg text-white/65 leading-relaxed max-w-xl mx-auto">
            Tell us a bit about your learning center. We&apos;ll reach out within one business day to walk you through setup and provision your tenant.
          </p>
        </div>

        <div
          className="rounded-2xl p-6 md:p-8"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
            backdropFilter: "blur(12px)",
            boxShadow:
              "inset 0 0 0 1px rgba(255,255,255,0.10), 0 12px 32px -12px rgba(0,0,0,0.5), 0 24px 48px -16px rgba(26,168,118,0.20)",
          }}
        >
          <SignupForm />
        </div>

        <p className="mt-8 text-center text-sm text-white/55">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-[#5EEAD4] hover:text-white transition-colors"
          >
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
