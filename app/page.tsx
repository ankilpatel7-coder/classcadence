import Link from "next/link";
import {
  Clock,
  Users,
  AlertCircle,
  MessageSquare,
  Building2,
  Palette,
  ChevronRight,
  Check,
  Play,
  Send,
  Mail,
  Calendar,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-bg relative">
      {/* Single subtle background blob — indigo */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[600px] opacity-30 blur-3xl -z-10"
        style={{ background: "radial-gradient(closest-side, #DBEAFE, transparent)" }}
      />

      <Nav />
      <Hero />
      <TrustStrip />
      <Features />
      <ParentComms />
      <HowItWorks />
      <VideoTour />
      <Stats />
      <CTAStrip />
      <Footer />
    </main>
  );
}

/* =========================================================================
   Logo glyph — three rhythm bars
========================================================================= */
function Glyph({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect x="3.5" y="11" width="4.5" height="15" rx="2.25" fill="#1E3A8A" />
      <rect x="11.75" y="4" width="4.5" height="22" rx="2.25" fill="#F97316" />
      <rect x="20" y="8" width="4.5" height="18" rx="2.25" fill="#1E3A8A" />
    </svg>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold text-accent uppercase tracking-[0.18em]">
      {children}
    </p>
  );
}

/* =========================================================================
   Nav
========================================================================= */
function Nav() {
  return (
    <header className="relative">
      <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Glyph />
          <span className="font-wordmark text-xl text-primary font-semibold tracking-tight">
            ClassCadence
          </span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm text-ink/75">
          <Link href="#features" className="hover:text-primary transition-colors">Features</Link>
          <Link href="#how" className="hover:text-primary transition-colors">How it works</Link>
          <Link href="#pricing" className="hover:text-primary transition-colors">Pricing</Link>
          <Link href="/login" className="hover:text-primary transition-colors">Sign in</Link>
          <Link
            href="/signup"
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-strong transition-colors font-medium text-[13px]"
          >
            Start free
          </Link>
        </nav>
        <Link
          href="/signup"
          className="md:hidden px-4 py-2 bg-primary text-white rounded-md text-sm font-medium"
        >
          Start free
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
      <div className="inline-flex items-center gap-2 px-3 py-1 mb-7 rounded-full bg-primary-soft text-primary text-[11px] font-semibold tracking-wide">
        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
        Early access · Built for US learning centers
      </div>
      <h1 className="font-display text-5xl md:text-7xl font-semibold text-primary leading-[1.05]">
        The rhythm of every
        <br />
        great learning center.
      </h1>
      <p className="mt-7 text-lg md:text-xl text-ink/70 max-w-2xl mx-auto leading-relaxed">
        The calm operations platform for multi-location supplemental learning centers. Schedules, attendance, make-ups, and parent communications — handled.
      </p>

      <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          href="/signup"
          className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-md bg-accent text-white font-medium shadow-card hover:bg-accent/90 hover:shadow-pop transition-all"
        >
          Get started free
          <ChevronRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
        </Link>
        <Link
          href="#tour"
          className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-md border border-line bg-surface text-primary font-medium hover:bg-primary-soft hover:border-primary/30 transition-colors"
        >
          <Play size={16} className="text-accent" />
          Watch the 2-minute tour
        </Link>
      </div>

      <p className="mt-6 text-sm text-muted">
        No credit card required · 30-day guided onboarding · Cancel anytime
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
    <section className="border-y border-line/60 bg-surface">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-14 text-center md:text-left">
          <TrustBlock label="Designed for" body="Weekly worksheets · two-day-a-week practice" />
          <Divider />
          <TrustBlock
            label="Compliance"
            body={
              <span className="flex items-center gap-4 text-sm text-ink/75">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-success" />
                  COPPA-aware
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-success" />
                  FERPA-friendly
                </span>
              </span>
            }
          />
          <Divider />
          <TrustBlock label="Reminder channels" body="Email · WhatsApp · in-app" />
        </div>
      </div>
    </section>
  );
}

function TrustBlock({ label, body }: { label: string; body: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.22em] text-muted font-semibold">
        {label}
      </p>
      <div className="mt-2 text-[15px] text-primary/80 font-medium">{body}</div>
    </div>
  );
}

function Divider() {
  return <div className="h-10 w-px bg-line hidden md:block" />;
}

/* =========================================================================
   Features grid
========================================================================= */
function Features() {
  return (
    <section id="features" className="max-w-6xl mx-auto px-6 py-24 md:py-28">
      <div className="text-center mb-16 max-w-2xl mx-auto">
        <Eyebrow>Capabilities</Eyebrow>
        <h2 className="mt-3 font-display text-4xl md:text-5xl font-semibold text-primary leading-tight">
          Everything your center runs on. In one place.
        </h2>
        <p className="mt-5 text-lg text-ink/70 leading-relaxed">
          From a parent's first phone call to a child's last worksheet — every step accounted for.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        <FeatureCard
          Icon={Clock}
          title="Effortless check-in"
          body="One tap to check students in. One tap to check them out. The clipboard goes away on day one."
        />
        <FeatureCard
          Icon={Users}
          title="Family-aware enrollment"
          body="Households group siblings under a single parent thread. Register a sibling in one click — no retyping contact details."
        />
        <FeatureCard
          Icon={AlertCircle}
          title="Automatic absence detection"
          body="No-shows surface automatically. You decide whether to offer a make-up. Parents confirm with one tap."
        />
        <FeatureCard
          Icon={MessageSquare}
          title="Email & WhatsApp reminders"
          body="Sent automatically in each location's timezone. Same-day, day-before, missed-class — all handled."
        />
        <FeatureCard
          Icon={Building2}
          title="Multi-location operations"
          body="Add a second center with its own hours, classrooms, and team. Each stays separate. You stay in command."
        />
        <FeatureCard
          Icon={Palette}
          title="Your brand, end to end"
          body="Logo, primary color, sender name, email signature. Parents see you — not us — in every message."
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
    <section className="bg-surface border-y border-line">
      <div className="max-w-6xl mx-auto px-6 py-24 md:py-28">
        <div className="grid md:grid-cols-2 gap-12 md:gap-20 items-center">
          <div>
            <Eyebrow>Communications</Eyebrow>
            <h2 className="mt-3 font-display text-4xl md:text-5xl font-semibold text-primary leading-tight">
              Reach every parent on the channel they read.
            </h2>
            <p className="mt-6 text-lg text-ink/70 leading-relaxed">
              Email reminders work — until they don't. ClassCadence sends the same message on WhatsApp too, so parents see it in the place they actually check.
            </p>
            <ul className="mt-8 space-y-3 text-ink/80">
              <FeatureBullet>Dispatched in each location's local time</FeatureBullet>
              <FeatureBullet>Pre-approved WhatsApp templates (Utility-priced)</FeatureBullet>
              <FeatureBullet>One-tap accept or decline on make-up offers</FeatureBullet>
              <FeatureBullet>Per-household channel preferences honored</FeatureBullet>
            </ul>
          </div>

          <div className="space-y-5">
            <WhatsAppMockup />
            <EmailMockup />
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureBullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-1 flex-shrink-0 w-5 h-5 rounded-full bg-success-soft flex items-center justify-center">
        <Check size={12} className="text-success" />
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
        <Eyebrow>How it works</Eyebrow>
        <h2 className="mt-3 font-display text-4xl md:text-5xl font-semibold text-primary leading-tight">
          Paper to digital, in one evening.
        </h2>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <StepCard n={1} title="Set up your center" body="Add operating hours, classrooms, and time slots. Upload your logo. Invite your team.">
          <StepMockSchedule />
        </StepCard>
        <StepCard n={2} title="Move students over" body="Import students and households from a CSV — or add them one at a time at the desk.">
          <StepMockImport />
        </StepCard>
        <StepCard n={3} title="Run calmer" body="Reminders dispatch automatically. Check-ins happen with a tap. Make-ups stop slipping through the cracks.">
          <StepMockReminder />
        </StepCard>
      </div>
    </section>
  );
}

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
  return (
    <div className="bg-surface rounded-lg border border-line shadow-card overflow-hidden">
      <div className="p-7">
        <div className="w-9 h-9 rounded-full bg-primary-soft text-primary font-display text-base font-semibold flex items-center justify-center mb-4">
          {n}
        </div>
        <h3 className="font-display text-xl text-primary font-semibold mb-2">
          {title}
        </h3>
        <p className="text-ink/70 leading-relaxed text-[15px]">{body}</p>
      </div>
      <div className="border-t border-line bg-bg/50 p-5">{children}</div>
    </div>
  );
}

/* =========================================================================
   Video tour
========================================================================= */
function VideoTour() {
  return (
    <section id="tour" className="bg-surface border-y border-line">
      <div className="max-w-5xl mx-auto px-6 py-24 md:py-28 text-center">
        <Eyebrow>Product tour</Eyebrow>
        <h2 className="mt-3 font-display text-4xl md:text-5xl font-semibold text-primary leading-tight">
          See a full day at the front desk, in two minutes.
        </h2>
        <p className="mt-5 text-lg text-ink/70 max-w-xl mx-auto leading-relaxed">
          From the 4 PM check-in rush to the next-day make-up follow-up — every core workflow in one walkthrough.
        </p>

        <div className="mt-12 relative mx-auto max-w-3xl aspect-video rounded-xl border border-line shadow-pop overflow-hidden bg-gradient-to-br from-primary to-primary-strong">
          <div className="absolute inset-0 flex items-center justify-center">
            <button className="group w-20 h-20 rounded-full bg-white/95 hover:bg-white shadow-pop transition-all hover:scale-105 flex items-center justify-center">
              <Play size={28} className="text-primary ml-1.5" fill="#1E3A8A" />
            </button>
          </div>
          <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-md bg-black/40 backdrop-blur-sm text-white text-xs font-medium">
            2:14 · Product walkthrough
          </div>
          <div className="absolute top-4 right-4 px-2.5 py-1 rounded-md bg-accent text-white text-[10px] font-semibold uppercase tracking-wide">
            Coming soon
          </div>
        </div>
      </div>
    </section>
  );
}

/* =========================================================================
   Stats
========================================================================= */
function Stats() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-24">
      <div className="grid md:grid-cols-3 gap-10 text-center">
        <Stat figure="< 2s" label="Average check-in time" />
        <Stat figure="2" label="Reminder channels (email + WhatsApp)" />
        <Stat figure="0" label="Paper forms required" />
      </div>
    </section>
  );
}

function Stat({ figure, label }: { figure: string; label: string }) {
  return (
    <div>
      <p className="font-display text-5xl md:text-6xl text-primary font-semibold">
        {figure}
      </p>
      <p className="mt-3 text-ink/70 text-[15px]">{label}</p>
    </div>
  );
}

/* =========================================================================
   CTA strip
========================================================================= */
function CTAStrip() {
  return (
    <section className="bg-primary text-white">
      <div className="max-w-4xl mx-auto px-6 py-20 md:py-24 text-center">
        <h2 className="font-display text-4xl md:text-5xl font-semibold leading-tight">
          Run your center calmer, starting tonight.
        </h2>
        <p className="mt-5 text-lg text-primary-soft/90 max-w-xl mx-auto leading-relaxed">
          Set up your location, import your students, and welcome the first check-in. Most centers are live in a single evening.
        </p>
        <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-4 bg-accent rounded-md font-medium hover:bg-accent/90 transition-colors shadow-pop"
          >
            Get started free
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
          <span className="inline-flex items-center gap-1.5"><Check size={14} /> 30-day onboarding</span>
          <span className="inline-flex items-center gap-1.5"><Check size={14} /> COPPA-respecting</span>
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
    <footer className="bg-bg border-t border-line">
      <div className="max-w-6xl mx-auto px-6 py-14">
        <div className="grid md:grid-cols-5 gap-10">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <Glyph size={22} />
              <span className="font-wordmark text-lg text-primary font-semibold">
                ClassCadence
              </span>
            </div>
            <p className="text-sm text-muted leading-relaxed max-w-xs">
              The rhythm of every great learning center. Multi-tenant student management for supplemental learning centers.
            </p>
          </div>
          <FooterCol title="Product" links={[
            ["Features", "#features"],
            ["How it works", "#how"],
            ["Pricing", "#pricing"],
            ["Changelog", "#"],
          ]} />
          <FooterCol title="Company" links={[
            ["About", "#"],
            ["Contact", "#"],
            ["Careers", "#"],
            ["Press", "#"],
          ]} />
          <FooterCol title="Legal" links={[
            ["Privacy", "#"],
            ["Terms", "#"],
            ["COPPA", "#"],
            ["Security", "#"],
          ]} />
        </div>
        <div className="mt-14 pt-6 border-t border-line text-sm text-muted flex flex-col md:flex-row justify-between items-center gap-3">
          <p>© 2026 ClassCadence. All rights reserved.</p>
          <p>Made for centers, by people who've worked the front desk.</p>
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
      <h4 className="font-semibold text-ink mb-3 text-[11px] uppercase tracking-[0.15em]">
        {title}
      </h4>
      <ul className="space-y-2.5">
        {links.map(([label, href]) => (
          <li key={label}>
            <Link href={href} className="text-sm text-muted hover:text-primary transition-colors">
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
function FeatureCard({
  Icon,
  title,
  body,
}: {
  Icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <div className="bg-surface rounded-lg p-7 border border-line shadow-card hover:shadow-pop hover:-translate-y-0.5 transition-all">
      <div className="w-11 h-11 rounded-md bg-primary-soft flex items-center justify-center mb-5">
        <Icon size={20} className="text-primary" />
      </div>
      <h3 className="font-display text-xl text-primary font-semibold mb-2">
        {title}
      </h3>
      <p className="text-ink/70 leading-relaxed text-[15px]">{body}</p>
    </div>
  );
}

/* =========================================================================
   Today screen mockup
========================================================================= */
function TodayMockup() {
  return (
    <div className="mt-16 md:mt-20 mx-auto max-w-4xl text-left">
      <div className="bg-surface rounded-xl shadow-pop border border-line overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-line bg-bg/60">
          <span className="w-3 h-3 rounded-full bg-danger" />
          <span className="w-3 h-3 rounded-full bg-warning" />
          <span className="w-3 h-3 rounded-full bg-success" />
          <div className="ml-4 px-3 py-1 rounded-md bg-surface border border-line text-xs text-muted font-mono">
            classcadence.app · Today at Pflugerville
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
   WhatsApp mockup
========================================================================= */
function WhatsAppMockup() {
  return (
    <div className="bg-[#ECE5DD] rounded-xl shadow-card overflow-hidden border border-line max-w-md">
      <div className="bg-[#075E54] text-white px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center">
          <Glyph size={20} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">Pflugerville Learning Center</p>
          <p className="text-[11px] text-white/80">via WhatsApp Business</p>
        </div>
        <span className="text-[10px] uppercase tracking-wider bg-white/15 px-2 py-0.5 rounded">
          Today
        </span>
      </div>
      <div className="px-4 py-5 space-y-3">
        <div className="max-w-[85%] bg-white rounded-lg rounded-tl-sm p-3 shadow-sm">
          <p className="text-[13px] text-ink leading-relaxed">
            Hi Meera 👋 Reminder that <strong>Aditya</strong> has class today at <strong>4:00 PM</strong> in the EL Room. See you soon — Pflugerville Learning Center.
          </p>
          <p className="text-[10px] text-muted mt-1.5 text-right">9:00 AM ✓✓</p>
        </div>
        <div className="max-w-[85%] bg-white rounded-lg rounded-tl-sm p-3 shadow-sm">
          <p className="text-[13px] text-ink leading-relaxed mb-2">
            Aditya missed today's class. We've held a make-up on <strong>Thursday, May 23 at 4:00 PM</strong>. Tap to confirm:
          </p>
          <button className="text-[13px] font-medium text-primary bg-primary-soft px-3 py-2 rounded-md w-full text-left">
            ✓ Confirm make-up class
          </button>
          <p className="text-[10px] text-muted mt-2 text-right">5:32 PM ✓✓</p>
        </div>
      </div>
      <div className="px-4 py-3 bg-[#F0F0F0] border-t border-black/5 flex items-center gap-2">
        <div className="flex-1 bg-white rounded-full px-4 py-2 text-xs text-muted">
          Type a message
        </div>
        <button className="w-9 h-9 rounded-full bg-[#075E54] flex items-center justify-center text-white">
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}

/* =========================================================================
   Email mockup
========================================================================= */
function EmailMockup() {
  return (
    <div className="bg-surface rounded-xl shadow-card border border-line overflow-hidden max-w-md ml-auto">
      <div className="px-5 py-3.5 border-b border-line flex items-center gap-3">
        <Mail size={16} className="text-muted" />
        <p className="text-xs text-muted flex-1">Inbox · Email</p>
        <p className="text-[11px] text-muted">9:00 AM</p>
      </div>
      <div className="px-5 py-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-md bg-primary-soft flex items-center justify-center">
            <Glyph size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-ink">Pflugerville Learning Center</p>
            <p className="text-[11px] text-muted truncate">hello@pflugerville-learning.com → meera.p@gmail.com</p>
          </div>
        </div>
        <p className="font-display text-base text-primary font-semibold mb-1.5">
          Aditya has class today at 4:00 PM
        </p>
        <p className="text-sm text-ink/80 leading-relaxed">
          Hi Meera, just a quick reminder that Aditya has class today at <strong>4:00 PM</strong> in the EL Room. Please plan for arrival a few minutes early.
        </p>
        <div className="mt-4 pt-4 border-t border-line text-xs text-muted">
          You're receiving this because you're enrolled at Pflugerville Learning Center.
        </div>
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
    <div className="text-xs">
      <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-primary-soft text-primary font-medium mb-2">
        <Users size={14} />
        <span>households.csv · 47 rows</span>
        <span className="ml-auto text-[9px] uppercase tracking-[0.18em]">Dry-run</span>
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between text-[11px] text-ink/70 px-1">
          <span>✓ 45 ready to import</span>
          <span className="text-warning">2 need review</span>
        </div>
        <div className="h-2 rounded-full bg-bg overflow-hidden">
          <div className="h-full bg-success w-[95%] rounded-full" />
        </div>
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
