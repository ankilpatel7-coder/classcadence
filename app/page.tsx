import Link from "next/link";
import Image from "next/image";
import {
  Clock,
  Users,
  AlertCircle,
  MessageSquare,
  Building2,
  Palette,
  ChevronRight,
  Check,
  Mail,
  Calendar,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

export default function HomePage() {
  return (
    <main
      className="min-h-screen text-white relative overflow-hidden"
      style={{
        backgroundColor: "#0A0E1A",
        backgroundImage:
          "radial-gradient(ellipse at 50% -100px, rgba(26,168,118,0.15), transparent 50%), radial-gradient(ellipse at 0% 30%, rgba(99,102,241,0.12), transparent 50%), radial-gradient(ellipse at 100% 60%, rgba(249,115,22,0.10), transparent 50%)",
      }}
    >
      {/* Grain layer adds the subtle texture that separates "dark site" from
          "classy dark site." 1% opacity SVG noise. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.025] mix-blend-overlay -z-10"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' /></filter><rect width='100%' height='100%' filter='url(%23n)' /></svg>\")",
        }}
      />
      {/* Glowing color washes — bigger and brighter than light-theme version so
          they push through the dark base. */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-[-200px] left-1/2 -translate-x-1/2 w-[1400px] h-[800px] opacity-60 blur-3xl -z-10"
        style={{ background: "radial-gradient(closest-side, rgba(26,168,118,0.35), transparent)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-[400px] -left-[200px] w-[700px] h-[700px] opacity-50 blur-3xl -z-10"
        style={{ background: "radial-gradient(closest-side, rgba(99,102,241,0.30), transparent)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-[1300px] -right-[200px] w-[700px] h-[700px] opacity-50 blur-3xl -z-10"
        style={{ background: "radial-gradient(closest-side, rgba(249,115,22,0.22), transparent)" }}
      />

      <Nav />
      <Hero />
      <TrustStrip />
      <Features />
      <ProductTour />
      <ParentComms />
      <ReminderShowcase />
      <HowItWorks />
      <Stats />
      <CTAStrip />
      <Footer />
    </main>
  );
}

/* =========================================================================
   Logo glyph — uses the actual brand logo asset from /public/logo.svg
   instead of a hand-drawn SVG so the site, the app, and the email
   sender all show the exact same mark.
========================================================================= */
function Glyph({ size = 32, dropShadow = true }: { size?: number; dropShadow?: boolean }) {
  return (
    <Image
      src="/logo.svg"
      alt=""
      width={size}
      height={size}
      priority
      className="rounded-md"
      style={
        dropShadow
          ? { filter: "drop-shadow(0 6px 14px rgba(11,104,69,0.28))" }
          : undefined
      }
    />
  );
}

type EyebrowTone = "accent" | "primary" | "indigo" | "danger";

function Eyebrow({
  children,
  tone = "accent",
}: {
  children: React.ReactNode;
  tone?: EyebrowTone;
}) {
  const map: Record<EyebrowTone, { text: string; dot: string }> = {
    accent: { text: "text-accent", dot: "bg-accent" },
    primary: { text: "text-primary-strong", dot: "bg-primary" },
    indigo: { text: "text-[#4338CA]", dot: "bg-[#6366F1]" },
    danger: { text: "text-danger", dot: "bg-danger" },
  };
  const t = map[tone];
  return (
    <p
      className={`inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] ${t.text}`}
    >
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />
      {children}
    </p>
  );
}

/* =========================================================================
   Nav
========================================================================= */
function Nav() {
  return (
    <header className="relative sticky top-0 z-30 backdrop-blur-xl bg-[#0A0E1A]/70 border-b border-white/[0.08]">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Glyph size={32} />
          <span className="font-wordmark text-xl text-white font-semibold tracking-tight">
            ClassCadence
          </span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-white/70">
          <Link href="#features" className="hover:text-white transition-colors">Features</Link>
          <Link href="#how" className="hover:text-white transition-colors">How it works</Link>
          <Link href="/login" className="hover:text-white transition-colors">Sign in</Link>
          <Link
            href="/signup"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-white font-semibold uppercase tracking-[0.08em] text-[11px] transition hover:-translate-y-px"
            style={{
              backgroundImage:
                "linear-gradient(180deg, #2BC98A 0%, #1AA876 55%, #0B6845 100%)",
              boxShadow:
                "0 2px 4px rgba(0,0,0,0.3), 0 0 24px -4px rgba(26,168,118,0.55), inset 0 1px 0 rgba(255,255,255,0.25)",
            }}
          >
            Start Free
            <ChevronRight size={14} />
          </Link>
        </nav>
        <Link
          href="/signup"
          className="md:hidden px-4 py-2 rounded-md text-white text-sm font-semibold"
          style={{
            backgroundImage:
              "linear-gradient(180deg, #2BC98A 0%, #1AA876 55%, #0B6845 100%)",
            boxShadow: "0 0 24px -4px rgba(26,168,118,0.55)",
          }}
        >
          Start Free
        </Link>
      </div>
    </header>
  );
}

/* =========================================================================
   Hero
========================================================================= */
function Hero() {
  return (
    <section className="relative max-w-6xl mx-auto px-6 pt-16 md:pt-24 pb-12 text-center">
      <div
        className="inline-flex items-center gap-2 px-3.5 py-1.5 mb-7 rounded-full text-[11px] font-bold tracking-[0.12em] uppercase text-white/90 ring-1 ring-inset ring-white/15"
        style={{
          background:
            "linear-gradient(180deg, rgba(26,168,118,0.18) 0%, rgba(26,168,118,0.05) 100%)",
          boxShadow:
            "0 0 32px -8px rgba(26,168,118,0.40), inset 0 1px 0 rgba(255,255,255,0.08)",
        }}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-[#2BC98A] animate-pulse shadow-[0_0_8px_rgba(43,201,138,0.8)]" />
        Built for US Supplemental Learning Centers
      </div>
      <h1 className="font-display text-[44px] md:text-7xl font-bold uppercase text-white leading-[1.02] tracking-[-0.02em]">
        The Rhythm Of Every
        <br />
        <span
          className="bg-clip-text text-transparent"
          style={{
            backgroundImage:
              "linear-gradient(95deg, #2BC98A 0%, #818CF8 50%, #FDBA74 100%)",
          }}
        >
          Great Learning Center.
        </span>
      </h1>
      <p className="mt-7 text-lg md:text-xl text-white/65 max-w-2xl mx-auto leading-relaxed">
        Daily check-ins, automatic absence detection, and parent email reminders — all in one calm dashboard, ready the evening you sign up.
      </p>

      <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          href="/signup"
          className="group inline-flex items-center gap-2 px-8 py-4 rounded-md text-white font-semibold uppercase tracking-[0.08em] text-sm transition hover:-translate-y-px"
          style={{
            backgroundImage:
              "linear-gradient(180deg, #FDBA74 0%, #F97316 55%, #C2410C 100%)",
            boxShadow:
              "0 4px 8px rgba(0,0,0,0.4), 0 0 48px -8px rgba(249,115,22,0.65), inset 0 1px 0 rgba(255,255,255,0.35)",
          }}
        >
          Start Free
          <ChevronRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
        </Link>
        <Link
          href="/login"
          className="group inline-flex items-center gap-2 px-8 py-4 rounded-md text-white font-semibold uppercase tracking-[0.08em] text-sm transition hover:-translate-y-px"
          style={{
            background: "rgba(255,255,255,0.06)",
            backdropFilter: "blur(8px)",
            boxShadow:
              "inset 0 0 0 1px rgba(255,255,255,0.15), 0 8px 24px -8px rgba(0,0,0,0.5)",
          }}
        >
          Sign In
        </Link>
      </div>

      <p className="mt-6 text-sm text-white/50">
        No credit card required · Cancel anytime
      </p>

      <TodayMockup />
    </section>
  );
}

/* =========================================================================
   Trust strip
========================================================================= */
function TrustStrip() {
  return (
    <section className="border-y border-white/[0.08] bg-white/[0.02] backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-14 text-center md:text-left">
          <TrustBlock label="Designed for" body="Worksheet-based learning · two-day weekly schedules" />
          <Divider />
          <TrustBlock
            label="Built with"
            body={
              <span className="flex items-center gap-4 text-sm text-white/75">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-[#2BC98A]" />
                  COPPA-aware
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-[#2BC98A]" />
                  FERPA-friendly
                </span>
              </span>
            }
          />
          <Divider />
          <TrustBlock label="Reminders" body="Parent email · in-app dashboard" />
        </div>
      </div>
    </section>
  );
}

function TrustBlock({ label, body }: { label: string; body: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.22em] text-white/50 font-bold">
        {label}
      </p>
      <div className="mt-2 text-[15px] text-white/85 font-medium">{body}</div>
    </div>
  );
}

function Divider() {
  return <div className="h-10 w-px bg-white/10 hidden md:block" />;
}

/* =========================================================================
   Features grid
========================================================================= */
function Features() {
  return (
    <section id="features" className="max-w-6xl mx-auto px-6 py-24 md:py-28">
      <div className="text-center mb-16 max-w-2xl mx-auto">
        <Eyebrow tone="indigo">Capabilities</Eyebrow>
        <h2 className="mt-3 font-display text-3xl md:text-5xl font-bold uppercase text-white leading-[1.05] tracking-[-0.015em]">
          Everything Your Center Runs On.<br />
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage:
                "linear-gradient(95deg, #2BC98A 0%, #818CF8 100%)",
            }}
          >
            In One Place.
          </span>
        </h2>
        <p className="mt-5 text-lg text-white/65 leading-relaxed">
          Built to replace the clipboard, the group text, and the spreadsheet — without replacing the human touch that keeps families coming back.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        <FeatureCard
          Icon={Clock}
          tone="primary"
          title="One-tap check-in"
          body="Open Today, see who's expected, check students in with a single tap. A live timer counts the minutes they've been on-site. Check out the same way."
        />
        <FeatureCard
          Icon={Users}
          tone="indigo"
          title="Student-first records"
          body="Parent contact info lives directly on the student. No separate household table to maintain. Add a sibling in seconds — each carries their own enrollment, attendance, and notes."
        />
        <FeatureCard
          Icon={AlertCircle}
          tone="danger"
          title="Automatic absence detection"
          body="When a session ends and a student never showed, the system marks them absent and notifies the parent — without anyone having to remember."
        />
        <FeatureCard
          Icon={Mail}
          tone="accent"
          title="Automatic parent email"
          body="Enrollment confirmations, day-of class reminders, absence alerts, and make-up offers. Each sent from your branded sender. Per-parent opt-out respected."
        />
        <FeatureCard
          Icon={Building2}
          tone="teal"
          title="Multi-location ready"
          body="Add a second center with its own hours, classrooms, and team. Each location keeps its own timezone and schedule. Tenant admins see everything; staff see just their own."
        />
        <FeatureCard
          Icon={Palette}
          tone="pink"
          title="Your brand, end to end"
          body="Your logo, your primary color, your sender name and address. Parents see your center in every email and every page — never our name."
        />
      </div>
    </section>
  );
}

/* =========================================================================
   Parent communications showcase
========================================================================= */
function ParentComms() {
  return (
    <section className="border-y border-white/[0.08] bg-white/[0.02] backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-6 py-24 md:py-28">
        <div className="grid md:grid-cols-2 gap-12 md:gap-20 items-center">
          <div>
            <Eyebrow tone="primary">Stay In Sync</Eyebrow>
            <h2 className="mt-3 font-display text-3xl md:text-5xl font-bold uppercase text-white leading-[1.05] tracking-[-0.015em]">
              Parents Stay Informed.<br />
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(95deg, #2BC98A 0%, #FDBA74 100%)",
                }}
              >
                You Stay Focused.
              </span>
            </h2>
            <p className="mt-6 text-lg text-white/65 leading-relaxed">
              Every reminder, absence alert, and make-up offer is sent automatically — branded as you. The same events surface in your in-app bell, so you can see at a glance what just happened.
            </p>
            <ul className="mt-8 space-y-3 text-white/80">
              <FeatureBullet>Day-of reminders go out each morning automatically</FeatureBullet>
              <FeatureBullet>Marked absent? Parent gets an email instantly, and you see it on your dashboard</FeatureBullet>
              <FeatureBullet>Make-up offers include a one-tap accept/decline link for parents</FeatureBullet>
              <FeatureBullet>Per-student email opt-out honored, no extra config</FeatureBullet>
            </ul>
          </div>

          <div className="space-y-5">
            <EmailMockup />
            <BellMockup />
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureBullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span
        className="mt-1 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
        style={{
          background: "rgba(43,201,138,0.15)",
          boxShadow: "inset 0 0 0 1px rgba(43,201,138,0.30), 0 0 12px -2px rgba(43,201,138,0.45)",
        }}
      >
        <Check size={12} className="text-[#5EEAD4]" />
      </span>
      <span className="leading-relaxed">{children}</span>
    </li>
  );
}

/* =========================================================================
   How it works
========================================================================= */
function HowItWorks() {
  return (
    <section id="how" className="max-w-6xl mx-auto px-6 py-24 md:py-28">
      <div className="text-center mb-16 max-w-2xl mx-auto">
        <Eyebrow tone="accent">How It Works</Eyebrow>
        <h2 className="mt-3 font-display text-3xl md:text-5xl font-bold uppercase text-white leading-[1.05] tracking-[-0.015em]">
          Paper To Digital,<br />
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage:
                "linear-gradient(95deg, #FDBA74 0%, #2BC98A 100%)",
            }}
          >
            In One Evening.
          </span>
        </h2>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <StepCard n={1} title="Set up your center" body="Add operating hours, classrooms, and weekly time slots. Upload your logo and pick your brand color. Invite your team.">
          <StepMockSchedule />
        </StepCard>
        <StepCard n={2} title="Add your students" body="Enter each student once — parent contact info lives right on the record. Assign them to a classroom and time slot. Their parent gets a confirmation email automatically.">
          <StepMockImport />
        </StepCard>
        <StepCard n={3} title="Run calmer" body="The Today page opens to the next session. Check-ins are one tap. Reminders fire each morning. Make-ups never slip through the cracks.">
          <StepMockReminder />
        </StepCard>
      </div>
    </section>
  );
}

const STEP_STYLES = [
  {
    bg: "linear-gradient(180deg, #2BC98A 0%, #1AA876 55%, #0B6845 100%)",
    shadow: "0 6px 14px -4px rgba(11,104,69,0.45)",
    accent: "bg-primary",
  },
  {
    bg: "linear-gradient(180deg, #818CF8 0%, #6366F1 55%, #4338CA 100%)",
    shadow: "0 6px 14px -4px rgba(67,56,202,0.45)",
    accent: "bg-[#6366F1]",
  },
  {
    bg: "linear-gradient(180deg, #FDBA74 0%, #F97316 55%, #C2410C 100%)",
    shadow: "0 6px 14px -4px rgba(194,65,12,0.45)",
    accent: "bg-accent",
  },
];

function StepCard({
  n,
  title,
  body,
  children,
}: {
  n: number;
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  const style = STEP_STYLES[(n - 1) % STEP_STYLES.length];
  return (
    <div
      className="group relative rounded-2xl overflow-hidden transition hover:-translate-y-1"
      style={{
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
        backdropFilter: "blur(8px)",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08), 0 8px 24px -12px rgba(0,0,0,0.5)",
      }}
    >
      <span aria-hidden className={`absolute inset-x-0 top-0 h-[2px] ${style.accent}`} />
      <div className="p-7">
        <div
          className="w-11 h-11 rounded-2xl text-white font-display text-lg font-bold flex items-center justify-center mb-4 transition group-hover:scale-110"
          style={{
            backgroundImage: style.bg,
            boxShadow: `${style.shadow}, inset 0 1px 0 rgba(255,255,255,0.4)`,
          }}
        >
          {n}
        </div>
        <h3 className="font-display text-xl text-white font-bold mb-2">
          {title}
        </h3>
        <p className="text-white/65 leading-relaxed text-[15px]">{body}</p>
      </div>
      <div className="border-t border-white/[0.06] bg-black/20 p-5">{children}</div>
    </div>
  );
}

/* =========================================================================
   Stats
========================================================================= */
function Stats() {
  return (
    <section className="border-y border-white/[0.08] bg-white/[0.02] backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-3 gap-10 text-center">
          <Stat
            figure="One Tap"
            label="To check a student in. No paper, no clipboard."
            gradient="linear-gradient(180deg, #2BC98A 0%, #1AA876 55%, #0B6845 100%)"
          />
          <Stat
            figure="Automatic"
            label="Absence detection — no admin has to remember."
            gradient="linear-gradient(180deg, #818CF8 0%, #6366F1 55%, #4338CA 100%)"
          />
          <Stat
            figure="One Evening"
            label="From signing up to the first real check-in."
            gradient="linear-gradient(180deg, #FDBA74 0%, #F97316 55%, #C2410C 100%)"
          />
        </div>
      </div>
    </section>
  );
}

function Stat({
  figure,
  label,
  gradient,
}: {
  figure: string;
  label: string;
  gradient: string;
}) {
  return (
    <div>
      <p
        className="font-display text-4xl md:text-5xl font-bold uppercase tracking-[-0.015em] bg-clip-text text-transparent inline-block"
        style={{ backgroundImage: gradient }}
      >
        {figure}
      </p>
      <p className="mt-3 text-white/65 text-[15px] leading-relaxed max-w-xs mx-auto">
        {label}
      </p>
    </div>
  );
}

/* =========================================================================
   CTA strip
========================================================================= */
function CTAStrip() {
  return (
    <section
      className="relative text-white overflow-hidden"
      style={{
        backgroundImage:
          "linear-gradient(135deg, #064E3B 0%, #0B6845 25%, #1E1B4B 60%, #312E81 100%)",
      }}
    >
      {/* Warm orange wash bottom-right */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-40 w-[600px] h-[600px] opacity-50 blur-3xl"
        style={{ background: "radial-gradient(closest-side, #F97316, transparent)" }}
      />
      {/* Emerald glow top-left */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-40 w-[600px] h-[600px] opacity-50 blur-3xl"
        style={{ background: "radial-gradient(closest-side, #2BC98A, transparent)" }}
      />
      {/* Indigo accent center */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] opacity-30 blur-3xl"
        style={{ background: "radial-gradient(closest-side, #818CF8, transparent)" }}
      />
      <div className="relative max-w-4xl mx-auto px-6 py-20 md:py-24 text-center">
        <h2 className="font-display text-3xl md:text-5xl font-bold uppercase leading-[1.05] tracking-[-0.015em]">
          Run Your Center Calmer,<br />Starting Tonight.
        </h2>
        <p className="mt-5 text-lg text-primary-soft/90 max-w-xl mx-auto leading-relaxed">
          Set up your location, add your students, and welcome the first check-in — all in a single evening. Cancel any time.
        </p>
        <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-4 bg-accent rounded-md font-medium hover:bg-accent/90 transition-colors shadow-pop"
          >
            Start free
            <ChevronRight size={18} />
          </Link>
          <Link
            href="/login"
            className="px-8 py-4 border border-white/20 rounded-md font-medium hover:bg-white/10 transition-colors"
          >
            Sign in
          </Link>
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-primary-soft/80">
          <span className="inline-flex items-center gap-1.5"><Check size={14} /> No credit card</span>
          <span className="inline-flex items-center gap-1.5"><Check size={14} /> Cancel anytime</span>
          <span className="inline-flex items-center gap-1.5"><Check size={14} /> COPPA-aware</span>
        </div>
      </div>
    </section>
  );
}

/* =========================================================================
   Footer
========================================================================= */
function Footer() {
  return (
    <footer className="border-t border-white/[0.08] bg-black/30 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-6 py-14">
        <div className="grid md:grid-cols-3 gap-10">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <Glyph size={22} />
              <span className="font-wordmark text-lg text-white font-semibold">
                ClassCadence
              </span>
            </div>
            <p className="text-sm text-white/55 leading-relaxed max-w-xs">
              The student-management platform for US supplemental learning centers. Daily check-ins, automatic absence detection, parent email reminders.
            </p>
          </div>
          <FooterCol title="Product" links={[
            ["Features", "#features"],
            ["How it works", "#how"],
            ["Sign in", "/login"],
            ["Start free", "/signup"],
          ]} />
          <FooterCol title="Get in touch" links={[
            ["Contact", "mailto:hello@tryclasscadence.com"],
          ]} />
        </div>
        <div className="mt-14 pt-6 border-t border-white/[0.06] text-sm text-white/45 flex flex-col md:flex-row justify-between items-center gap-3">
          <p>© {new Date().getFullYear()} ClassCadence. All rights reserved.</p>
          <p>Made for centers, by people who&apos;ve worked the front desk.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: [string, string][];
}) {
  return (
    <div>
      <h4 className="font-bold text-white mb-3 text-[11px] uppercase tracking-[0.18em]">
        {title}
      </h4>
      <ul className="space-y-2.5">
        {links.map(([label, href]) => (
          <li key={label}>
            <Link
              href={href}
              className="text-sm text-white/55 hover:text-white transition-colors"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* =========================================================================
   Feature card
========================================================================= */
type FeatureTone = "primary" | "indigo" | "danger" | "accent" | "teal" | "pink";

const FEATURE_TONES: Record<
  FeatureTone,
  {
    iconBg: string;
    iconText: string;
    accentBar: string;
    glow: string; // rgba for the colored shadow halo
  }
> = {
  primary: {
    iconBg: "rgba(43,201,138,0.15)",
    iconText: "text-[#5EEAD4]",
    accentBar: "linear-gradient(90deg, #2BC98A, transparent)",
    glow: "rgba(43,201,138,0.35)",
  },
  indigo: {
    iconBg: "rgba(129,140,248,0.15)",
    iconText: "text-[#A5B4FC]",
    accentBar: "linear-gradient(90deg, #818CF8, transparent)",
    glow: "rgba(129,140,248,0.35)",
  },
  danger: {
    iconBg: "rgba(248,113,113,0.15)",
    iconText: "text-[#FCA5A5]",
    accentBar: "linear-gradient(90deg, #F87171, transparent)",
    glow: "rgba(248,113,113,0.35)",
  },
  accent: {
    iconBg: "rgba(253,186,116,0.15)",
    iconText: "text-[#FDBA74]",
    accentBar: "linear-gradient(90deg, #FDBA74, transparent)",
    glow: "rgba(253,186,116,0.35)",
  },
  teal: {
    iconBg: "rgba(45,212,191,0.15)",
    iconText: "text-[#5EEAD4]",
    accentBar: "linear-gradient(90deg, #2DD4BF, transparent)",
    glow: "rgba(45,212,191,0.35)",
  },
  pink: {
    iconBg: "rgba(244,114,182,0.15)",
    iconText: "text-[#F9A8D4]",
    accentBar: "linear-gradient(90deg, #F472B6, transparent)",
    glow: "rgba(244,114,182,0.35)",
  },
};

function FeatureCard({
  Icon,
  title,
  body,
  tone = "primary",
}: {
  Icon: LucideIcon;
  title: string;
  body: string;
  tone?: FeatureTone;
}) {
  const t = FEATURE_TONES[tone];
  return (
    <div
      className="group relative overflow-hidden rounded-2xl p-7 transition hover:-translate-y-1"
      style={{
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
        backdropFilter: "blur(8px)",
        boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.08), 0 8px 24px -12px rgba(0,0,0,0.5)`,
      }}
    >
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-[2px]"
        style={{ backgroundImage: t.accentBar }}
      />
      {/* Hover glow */}
      <span
        aria-hidden
        className="absolute -top-12 -right-12 w-40 h-40 rounded-full opacity-0 group-hover:opacity-100 blur-3xl transition-opacity"
        style={{ background: `radial-gradient(closest-side, ${t.glow}, transparent)` }}
      />
      <div
        className={`relative w-12 h-12 rounded-xl ${t.iconText} flex items-center justify-center mb-5 transition group-hover:scale-110 group-hover:-rotate-3`}
        style={{
          background: t.iconBg,
          boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.08), 0 0 24px -8px ${t.glow}`,
        }}
      >
        <Icon size={22} />
      </div>
      <h3 className="relative font-display text-xl text-white font-bold mb-2 transition">
        {title}
      </h3>
      <p className="relative text-white/65 leading-relaxed text-[15px]">{body}</p>
    </div>
  );
}

/* =========================================================================
   Today screen mockup
========================================================================= */
function TodayMockup() {
  return (
    <div className="mt-16 md:mt-20 mx-auto max-w-4xl text-left">
      <div
        className="bg-surface rounded-2xl border border-line overflow-hidden"
        style={{
          boxShadow:
            "0 10px 20px -8px rgba(15,23,42,0.18), 0 40px 80px -20px rgba(11,104,69,0.25), 0 4px 8px rgba(15,23,42,0.05)",
        }}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-line bg-bg/60">
          <span className="w-3 h-3 rounded-full bg-danger" />
          <span className="w-3 h-3 rounded-full bg-warning" />
          <span className="w-3 h-3 rounded-full bg-success" />
          <div className="ml-4 px-3 py-1 rounded-md bg-surface border border-line text-xs text-muted font-mono">
            tryclasscadence.com · Today
          </div>
        </div>
        <div className="p-7">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div>
              <h3 className="font-display text-2xl text-primary font-semibold">
                Today · Tuesday, May 21
              </h3>
              <p className="text-sm text-muted mt-1">
                4:00 PM session · EL Room · 6 of 8 expected
              </p>
            </div>
            <span className="px-3 py-1.5 bg-success-soft text-success rounded-md text-sm font-medium">
              4 checked in
            </span>
          </div>
          <div className="space-y-2">
            <StudentRow name="Aditya P." time="3:58 PM" status="in" />
            <StudentRow name="Maya R." time="4:01 PM" status="in" />
            <StudentRow name="Ethan K." time="4:02 PM" status="in" />
            <StudentRow name="Sophia L." time="4:08 PM" status="late" />
            <StudentRow name="Liam C." time="—" status="expected" />
            <StudentRow name="Olivia W." time="—" status="expected" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StudentRow({
  name,
  time,
  status,
}: {
  name: string;
  time: string;
  status: "in" | "late" | "expected";
}) {
  const config = {
    in: { label: "Checked in", bg: "bg-success-soft", text: "text-success", dot: "bg-success", cta: "Check out" },
    late: { label: "Late · checked in", bg: "bg-amber-100", text: "text-warning", dot: "bg-warning", cta: "Check out" },
    expected: { label: "Expected", bg: "bg-bg", text: "text-muted", dot: "bg-line", cta: "Check in" },
  }[status];
  return (
    <div className="flex items-center justify-between px-4 py-3 rounded-md border border-line/70 hover:bg-bg/60 transition-colors">
      <div className="flex items-center gap-3">
        <span className={`w-2 h-2 rounded-full ${config.dot}`} />
        <span className="font-medium text-ink">{name}</span>
        <span className="text-xs text-muted tnum">{time}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className={`hidden sm:inline text-xs font-medium px-2.5 py-1 rounded-md ${config.bg} ${config.text}`}>
          {config.label}
        </span>
        <button
          className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
            status === "expected"
              ? "bg-accent text-white hover:bg-accent/90"
              : "border border-line text-primary hover:bg-primary-soft"
          }`}
        >
          {config.cta}
        </button>
      </div>
    </div>
  );
}

/* =========================================================================
   Bell / in-app notification mockup
========================================================================= */
function BellMockup() {
  return (
    <div className="bg-surface rounded-xl shadow-card border border-line overflow-hidden max-w-md ml-auto">
      <div className="px-5 py-3.5 border-b border-line flex items-center gap-2.5">
        <div className="relative inline-flex h-8 w-8 items-center justify-center rounded-full bg-bg/70 ring-1 ring-inset ring-line/70 text-ink/70">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
          <span className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold text-white ring-2 ring-surface">
            3
          </span>
        </div>
        <p className="flex-1 text-sm font-semibold text-ink">Notifications</p>
        <p className="text-[10px] text-muted">Just now</p>
      </div>
      <ul className="divide-y divide-line/60">
        <NotifRow
          unread
          title="Ella Johnson enrolled in Early Learning"
          sub="Mon 4:00 PM"
          time="2m ago"
          tone="primary"
        />
        <NotifRow
          unread
          title="Hao Chen marked absent"
          sub="Regular Class · 4:00 PM"
          time="14m ago"
          tone="danger"
        />
        <NotifRow
          unread
          title="Make-up offer sent to Olivia"
          sub="Fri 5:00 PM — awaiting response"
          time="1h ago"
          tone="accent"
        />
        <NotifRow
          title="3 sessions today"
          sub="11 students expected"
          time="9:00 AM"
          tone="muted"
        />
      </ul>
    </div>
  );
}

function NotifRow({
  unread,
  title,
  sub,
  time,
  tone,
}: {
  unread?: boolean;
  title: string;
  sub: string;
  time: string;
  tone: "primary" | "danger" | "accent" | "muted";
}) {
  const dotColor = {
    primary: "bg-primary",
    danger: "bg-danger",
    accent: "bg-accent",
    muted: "bg-line",
  }[tone];
  return (
    <li className={`flex items-start gap-2.5 px-4 py-2.5 ${unread ? "bg-primary-soft/20" : ""}`}>
      <span aria-hidden className={`mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full ${unread ? dotColor : "bg-line"}`} />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] leading-snug text-ink">{title}</p>
        <p className="mt-0.5 text-[11px] text-muted">{sub}</p>
      </div>
      <p className="text-[10px] uppercase tracking-wide text-muted shrink-0">{time}</p>
    </li>
  );
}

/* =========================================================================
   Email mockup
========================================================================= */
function EmailMockup() {
  return (
    <div className="bg-surface rounded-xl shadow-card border border-line overflow-hidden max-w-md">
      <div className="px-5 py-3.5 border-b border-line flex items-center gap-3">
        <Mail size={16} className="text-muted" />
        <p className="text-xs text-muted flex-1">Inbox · Class reminder</p>
        <p className="text-[11px] text-muted">8:00 AM</p>
      </div>
      <div className="px-5 py-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-md bg-primary-soft flex items-center justify-center">
            <Glyph size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-ink">Spring Valley Learning Center</p>
            <p className="text-[11px] text-muted truncate">noreply@svlearning.com → o.johnson@gmail.com</p>
          </div>
        </div>
        <p className="font-display text-base text-primary font-semibold mb-1.5">
          Reminder: Ella has class today
        </p>
        <p className="text-sm text-ink/80 leading-relaxed mb-3">
          Hi Olivia, just a reminder that <strong>Ella</strong> has class today.
        </p>
        <div className="rounded-md border border-line bg-bg/40 border-l-[3px] border-l-primary px-3 py-2.5">
          <p className="text-[13px] text-ink">
            <strong>Monday, May 24</strong>{" "}
            <span className="font-mono text-ink/80">4:00 PM – 4:30 PM</span>
          </p>
          <p className="text-[11px] text-muted mt-0.5">Early Learning</p>
        </div>
        <p className="mt-3 text-sm text-ink/80">See you there!</p>
        <p className="mt-3 text-xs text-muted">— Spring Valley Learning Center</p>
      </div>
    </div>
  );
}

/* =========================================================================
   Step mini-mockups
========================================================================= */
function StepMockSchedule() {
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted font-semibold mb-2">
        Weekly schedule · EL Room
      </div>
      {[
        ["Mon", "4:00 PM", true],
        ["Tue", "4:00 PM", true],
        ["Wed", "—", false],
        ["Thu", "4:00 PM", true],
        ["Fri", "4:00 PM", true],
      ].map(([day, time, active]) => (
        <div
          key={day as string}
          className={`flex items-center justify-between text-xs px-3 py-2 rounded-md ${
            active ? "bg-primary-soft text-primary" : "bg-bg text-muted"
          }`}
        >
          <span className="font-medium">{day}</span>
          <span className="tnum">{time}</span>
        </div>
      ))}
    </div>
  );
}

function StepMockImport() {
  return (
    <div className="space-y-2 text-xs">
      <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-md border border-line bg-surface">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary-soft text-[9px] font-bold text-primary-strong">EJ</span>
          <span className="font-medium text-ink">Ella Johnson</span>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-muted">4th grade</span>
      </div>
      <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-primary-soft/40 text-primary-strong">
        <Mail size={12} />
        <span className="font-medium">Parent email</span>
        <span className="ml-auto font-mono text-[10px]">o.johnson@…</span>
      </div>
      <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-bg text-ink/70">
        <Calendar size={12} className="text-primary" />
        <span className="font-medium">Mon · 4:00 PM</span>
        <span className="ml-auto text-[10px] text-success font-semibold inline-flex items-center gap-1">
          <Check size={10} /> Enrolled
        </span>
      </div>
    </div>
  );
}

function StepMockReminder() {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-surface border border-line text-xs">
        <Calendar size={14} className="text-primary" />
        <span className="text-ink/80">Class reminder · 9:00 AM</span>
        <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-success font-semibold">
          <Check size={10} /> Sent
        </span>
      </div>
      <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-surface border border-line text-xs">
        <AlertCircle size={14} className="text-warning" />
        <span className="text-ink/80">Missed class · 5:32 PM</span>
        <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-success font-semibold">
          <Check size={10} /> Sent
        </span>
      </div>
      <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-surface border border-line text-xs">
        <MessageSquare size={14} className="text-accent" />
        <span className="text-ink/80">Make-up offer · 5:33 PM</span>
        <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-success font-semibold">
          <Check size={10} /> Sent
        </span>
      </div>
    </div>
  );
}

/* =========================================================================
   Product tour — high-fidelity mockups of the actual app views
   (Dashboard, Schedule, Make-ups, Students). Each tile is a "browser
   chrome + page contents" card with brand-tinted drop shadow.

   These are real components mirroring the live app, not screenshots.
   To swap in literal PNG screenshots later, drop them into /public/
   and replace each PageMock component with next/image's Image.
========================================================================= */
function ProductTour() {
  return (
    <section className="relative max-w-6xl mx-auto px-6 py-24 md:py-28">
      {/* Decorative orange wash behind the grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-20 h-[420px] opacity-50 -z-10 blur-3xl"
        style={{
          background:
            "radial-gradient(ellipse 700px 280px at 20% 30%, #FFEDD5, transparent 70%), radial-gradient(ellipse 600px 240px at 80% 60%, #D6F4E5, transparent 70%)",
        }}
      />
      <div className="text-center mb-14 max-w-2xl mx-auto">
        <Eyebrow>A Glimpse Inside</Eyebrow>
        <h2 className="mt-3 font-display text-3xl md:text-5xl font-bold uppercase text-white leading-[1.05] tracking-[-0.015em]">
          Every Screen Built<br />
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage:
                "linear-gradient(95deg, #818CF8 0%, #F472B6 100%)",
            }}
          >
            For The Front Desk.
          </span>
        </h2>
        <p className="mt-5 text-lg text-white/65 leading-relaxed">
          Dashboard for the tenant admin. Today screen for the front desk. Schedule, make-ups, and student records in between.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-5 md:gap-6">
        <BrowserTile
          chromePath="tryclasscadence.com / tenant"
          title="Tenant Admin Dashboard"
          tone="primary"
        >
          <PageMockDashboard />
        </BrowserTile>
        <BrowserTile
          chromePath="tryclasscadence.com / tenant / schedule"
          title="Weekly Schedule"
          tone="indigo"
        >
          <PageMockSchedule />
        </BrowserTile>
        <BrowserTile
          chromePath="tryclasscadence.com / tenant / makeups"
          title="Make-Up Tracking"
          tone="accent"
        >
          <PageMockMakeups />
        </BrowserTile>
        <BrowserTile
          chromePath="tryclasscadence.com / tenant / students"
          title="Students Directory"
          tone="primary"
        >
          <PageMockStudents />
        </BrowserTile>
      </div>
    </section>
  );
}

function BrowserTile({
  chromePath,
  title,
  tone,
  children,
}: {
  chromePath: string;
  title: string;
  tone: "primary" | "accent" | "indigo";
  children: React.ReactNode;
}) {
  const tintShadow =
    tone === "primary"
      ? "0 12px 24px -12px rgba(11,104,69,0.30)"
      : tone === "accent"
      ? "0 12px 24px -12px rgba(249,115,22,0.30)"
      : "0 12px 24px -12px rgba(67,56,202,0.30)";
  const dotColor =
    tone === "primary"
      ? "bg-primary"
      : tone === "accent"
      ? "bg-accent"
      : "bg-[#6366F1]";
  return (
    <div className="group">
      <div
        className="rounded-xl border border-line overflow-hidden bg-surface transition group-hover:-translate-y-1"
        style={{
          boxShadow: `0 4px 8px rgba(15,23,42,0.06), 0 24px 48px -16px rgba(15,23,42,0.18), ${tintShadow}`,
        }}
      >
        <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-line bg-bg/50">
          <span className="w-2.5 h-2.5 rounded-full bg-danger/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-warning/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-success/70" />
          <div className="ml-3 px-2.5 py-0.5 rounded-md bg-surface border border-line text-[10px] text-muted font-mono">
            {chromePath}
          </div>
        </div>
        <div className="bg-bg/30 p-4 min-h-[260px]">{children}</div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span aria-hidden className={`h-2 w-2 rounded-full ${dotColor}`} />
        <p className="text-sm font-bold uppercase tracking-[0.08em] text-white/85">
          {title}
        </p>
      </div>
    </div>
  );
}

/* ---- Dashboard mock ---- */
function PageMockDashboard() {
  return (
    <div className="space-y-3">
      {/* KPI tiles */}
      <div className="grid grid-cols-4 gap-2">
        <MockKpi label="Students" value="47" accent="bg-primary" />
        <MockKpi label="Today" value="3" accent="bg-[#6366F1]" />
        <MockKpi label="Make-ups" value="2" accent="bg-accent" />
        <MockKpi label="Absent" value="1" accent="bg-danger" />
      </div>
      {/* Donut + bars */}
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-1 rounded-md border border-line bg-surface p-3">
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted">
            Attendance
          </p>
          <div className="mt-1 flex items-center justify-center">
            <MiniRing pct={92} />
          </div>
        </div>
        <div className="col-span-2 rounded-md border border-line bg-surface p-3">
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted">
            Last 4 Weeks
          </p>
          <div className="mt-2 flex items-end justify-around gap-2 h-[68px]">
            {[78, 84, 91, 92].map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[9px] font-bold tabular-nums text-primary-strong">
                  {v}%
                </span>
                <div
                  className="w-full rounded-t-md"
                  style={{
                    height: `${v * 0.5}px`,
                    backgroundImage:
                      "linear-gradient(180deg, #2BC98A 0%, var(--color-primary) 55%, var(--color-primary-strong) 100%)",
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MockKpi({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-md border border-line bg-surface px-2 py-2">
      <span
        aria-hidden
        className={`absolute inset-x-0 top-0 h-[3px] ${accent}`}
      />
      <p className="text-[9px] font-bold uppercase tracking-wider text-muted">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold tabular-nums text-ink leading-none">
        {value}
      </p>
    </div>
  );
}

function MiniRing({ pct }: { pct: number }) {
  const size = 60;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct / 100);
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="miniRingGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2BC98A" />
            <stop offset="100%" stopColor="var(--color-primary-strong)" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-border)" strokeOpacity="0.5" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#miniRingGrad)" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <p className="text-sm font-bold tabular-nums text-ink">{pct}%</p>
      </div>
    </div>
  );
}

/* ---- Schedule mock ---- */
function PageMockSchedule() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  // Each session: [day index, top%, height%, color]
  const sessions: [number, number, number, string][] = [
    [0, 10, 22, "#1AA876"],
    [0, 50, 22, "#6366F1"],
    [1, 30, 22, "#F97316"],
    [2, 20, 18, "#1AA876"],
    [3, 40, 22, "#6366F1"],
    [4, 10, 24, "#F97316"],
    [4, 55, 20, "#1AA876"],
  ];
  return (
    <div className="rounded-md border border-line bg-surface overflow-hidden">
      <div className="grid grid-cols-5 border-b border-line bg-bg/50">
        {days.map((d, i) => (
          <div
            key={d}
            className={`px-2 py-1.5 text-center text-[10px] font-bold uppercase tracking-wider ${
              i === 2 ? "text-primary-strong" : "text-muted"
            }`}
          >
            {d}
            {i === 2 ? (
              <span className="block text-[9px] font-normal text-primary">
                Today
              </span>
            ) : null}
          </div>
        ))}
      </div>
      <div className="relative grid grid-cols-5 h-[180px] divide-x divide-line/60">
        {days.map((_, i) => (
          <div key={i} className={i === 2 ? "bg-primary-soft/25" : "bg-surface"}>
            {Array.from({ length: 4 }).map((_, r) => (
              <div
                key={r}
                className="border-t border-line/30"
                style={{ height: "25%" }}
              />
            ))}
          </div>
        ))}
        {sessions.map(([d, top, h, color], idx) => (
          <div
            key={idx}
            className="absolute rounded-md bg-surface px-1 py-0.5 overflow-hidden shadow-sm"
            style={{
              left: `calc(${d * 20}% + 4px)`,
              width: `calc(20% - 8px)`,
              top: `${top}%`,
              height: `${h}%`,
              borderLeft: `2px solid ${color}`,
              backgroundImage: `linear-gradient(180deg, ${color}1A 0%, transparent 80%)`,
            }}
          >
            <p className="text-[8px] font-bold tabular-nums text-ink">
              4:00
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---- Make-ups mock ---- */
function PageMockMakeups() {
  return (
    <div className="space-y-3">
      <MakeupSection
        label="Needs Make-Up"
        color="border-l-danger"
        accentBg="bg-danger/8"
        items={[
          { name: "Hao Chen", sub: "Absent · May 21", tag: "1 owed" },
          { name: "Sofia García", sub: "Absent · May 19", tag: "1 owed" },
        ]}
      />
      <MakeupSection
        label="Pending"
        color="border-l-warning"
        accentBg="bg-warning/10"
        items={[{ name: "Olivia W.", sub: "Offered Fri 5:00 PM", tag: "Awaiting" }]}
      />
      <MakeupSection
        label="Completed"
        color="border-l-success"
        accentBg="bg-success-soft"
        items={[
          { name: "Liam C.", sub: "Made up May 22", tag: "Done" },
        ]}
      />
    </div>
  );
}

function MakeupSection({
  label,
  color,
  accentBg,
  items,
}: {
  label: string;
  color: string;
  accentBg: string;
  items: { name: string; sub: string; tag: string }[];
}) {
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-wider text-muted mb-1.5">
        {label}
      </p>
      <div className="space-y-1.5">
        {items.map((it, i) => (
          <div
            key={i}
            className={`flex items-center gap-2 rounded-md border border-line bg-surface border-l-[3px] ${color} px-2.5 py-1.5`}
          >
            <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold ${accentBg} text-ink/80`}>
              {it.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-ink truncate">{it.name}</p>
              <p className="text-[9px] text-muted">{it.sub}</p>
            </div>
            <span className="text-[9px] font-semibold uppercase tracking-wider text-muted">
              {it.tag}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---- Students mock ---- */
function PageMockStudents() {
  const rows = [
    { name: "Ella Johnson", grade: "4th", classes: 2, color: "#1AA876" },
    { name: "Hao Chen", grade: "5th", classes: 2, color: "#6366F1" },
    { name: "Veer Patel", grade: "3rd", classes: 1, color: "#F97316" },
    { name: "Sofia García", grade: "6th", classes: 2, color: "#1AA876" },
    { name: "Mateo Ramirez", grade: "4th", classes: 2, color: "#6366F1" },
  ];
  return (
    <div className="rounded-md border border-line bg-surface overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-line bg-bg/50">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary-soft text-primary-strong">
          <Users size={11} />
        </span>
        <p className="text-[11px] font-semibold text-ink">47 active students</p>
        <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-[9px] font-bold uppercase tracking-wider text-white">
          + Add
        </span>
      </div>
      <ul className="divide-y divide-line/60">
        {rows.map((r) => (
          <li key={r.name} className="flex items-center gap-2.5 px-3 py-2">
            <span
              className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white"
              style={{ backgroundColor: r.color }}
            >
              {r.name.split(" ").map((w) => w[0]).join("")}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-ink">{r.name}</p>
              <p className="text-[9px] text-muted">Grade {r.grade}</p>
            </div>
            <span className="text-[9px] font-mono tabular-nums text-muted">
              {r.classes}/2
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* =========================================================================
   Reminder showcase — three email snapshots side-by-side so the visitor
   can see exactly what parents receive.
========================================================================= */
function ReminderShowcase() {
  return (
    <section className="border-y border-white/[0.08] bg-white/[0.02] backdrop-blur-sm relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-30 -z-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 500px 240px at 50% 0%, rgba(26,168,118,0.35), transparent 70%)",
        }}
      />
      <div className="relative max-w-6xl mx-auto px-6 py-24 md:py-28">
        <div className="text-center mb-14 max-w-2xl mx-auto">
          <Eyebrow tone="danger">Parent Reminders</Eyebrow>
          <h2 className="mt-3 font-display text-3xl md:text-5xl font-bold uppercase text-white leading-[1.05] tracking-[-0.015em]">
            What Parents<br />
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(95deg, #F87171 0%, #FDBA74 100%)",
              }}
            >
              Actually Receive.
            </span>
          </h2>
          <p className="mt-5 text-lg text-white/65 leading-relaxed">
            Three email types fire automatically — branded as you, sent from your domain, opted out per student if they ask.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          <ReminderTile title="Class Reminder" color="primary">
            <ReminderEmailReminder />
          </ReminderTile>
          <ReminderTile title="Absence Alert" color="danger">
            <ReminderEmailAbsent />
          </ReminderTile>
          <ReminderTile title="Make-Up Offer" color="accent">
            <ReminderEmailMakeup />
          </ReminderTile>
        </div>
      </div>
    </section>
  );
}

function ReminderTile({
  title,
  color,
  children,
}: {
  title: string;
  color: "primary" | "danger" | "accent";
  children: React.ReactNode;
}) {
  const shadow =
    color === "primary"
      ? "0 12px 24px -12px rgba(11,104,69,0.30)"
      : color === "danger"
      ? "0 12px 24px -12px rgba(239,68,68,0.30)"
      : "0 12px 24px -12px rgba(249,115,22,0.30)";
  const dotBg =
    color === "primary"
      ? "bg-primary"
      : color === "danger"
      ? "bg-danger"
      : "bg-accent";
  return (
    <div>
      <div
        className="rounded-xl border border-line bg-surface overflow-hidden transition hover:-translate-y-1"
        style={{
          boxShadow: `0 4px 8px rgba(15,23,42,0.06), 0 20px 40px -16px rgba(15,23,42,0.18), ${shadow}`,
        }}
      >
        {children}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span aria-hidden className={`h-2 w-2 rounded-full ${dotBg}`} />
        <p className="text-sm font-bold uppercase tracking-[0.08em] text-white/85">
          {title}
        </p>
      </div>
    </div>
  );
}

function MiniEmailHeader({ subject }: { subject: string }) {
  return (
    <>
      <div className="px-4 py-2.5 border-b border-line flex items-center gap-2 bg-bg/40">
        <Mail size={13} className="text-muted" />
        <p className="text-[10px] text-muted">Inbox</p>
        <p className="text-[9px] text-muted ml-auto">9:00 AM</p>
      </div>
      <div className="px-4 pt-3 pb-2 flex items-center gap-2">
        <Glyph size={26} dropShadow={false} />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-ink">Spring Valley LC</p>
          <p className="text-[9px] text-muted truncate">noreply@svlearning.com</p>
        </div>
      </div>
      <p className="px-4 font-display text-[13px] text-primary font-bold leading-tight">
        {subject}
      </p>
    </>
  );
}

function ReminderEmailReminder() {
  return (
    <>
      <MiniEmailHeader subject="Reminder: Ella has class today" />
      <div className="px-4 pt-2 pb-4">
        <p className="text-[11px] text-ink/80 leading-relaxed mb-2">
          Hi Olivia, just a reminder that <strong>Ella</strong> has class today.
        </p>
        <div
          className="rounded-md bg-bg/40 px-2.5 py-2 text-[11px]"
          style={{ borderLeft: "2px solid var(--color-primary)" }}
        >
          <p className="font-semibold text-ink">Mon, May 24</p>
          <p className="font-mono text-ink/80 text-[10px]">4:00 PM – 4:30 PM</p>
          <p className="text-[9px] text-muted mt-0.5">Early Learning</p>
        </div>
        <p className="mt-2 text-[10px] text-muted">— Spring Valley LC</p>
      </div>
    </>
  );
}

function ReminderEmailAbsent() {
  return (
    <>
      <MiniEmailHeader subject="Ella missed Early Learning today" />
      <div className="px-4 pt-2 pb-4">
        <p className="text-[11px] text-ink/80 leading-relaxed mb-2">
          Hi Olivia, <strong>Ella</strong> was marked absent from today's class:
        </p>
        <div
          className="rounded-md bg-danger/8 px-2.5 py-2 text-[11px]"
          style={{ borderLeft: "2px solid var(--color-danger)" }}
        >
          <p className="font-semibold text-ink">Mon, May 24</p>
          <p className="font-mono text-ink/80 text-[10px]">4:00 PM</p>
          <p className="text-[9px] text-muted mt-0.5">Early Learning</p>
        </div>
        <p className="mt-2 text-[10px] text-ink/70">
          Reply or call us to schedule a make-up.
        </p>
      </div>
    </>
  );
}

function ReminderEmailMakeup() {
  return (
    <>
      <MiniEmailHeader subject="Make-up class offered for Ella" />
      <div className="px-4 pt-2 pb-4">
        <p className="text-[11px] text-ink/80 leading-relaxed mb-2">
          We'd like to offer <strong>Ella</strong> a make-up class:
        </p>
        <div
          className="rounded-md bg-accent-soft/60 px-2.5 py-2 text-[11px]"
          style={{ borderLeft: "2px solid var(--color-accent)" }}
        >
          <p className="font-semibold text-ink">Fri, May 28</p>
          <p className="font-mono text-ink/80 text-[10px]">5:00 PM – 5:30 PM</p>
        </div>
        <button
          className="mt-2.5 w-full px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider text-white"
          style={{
            backgroundImage:
              "linear-gradient(180deg, #2BC98A 0%, var(--color-primary) 55%, var(--color-primary-strong) 100%)",
          }}
        >
          Accept Or Decline →
        </button>
      </div>
    </>
  );
}
