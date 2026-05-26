import Link from "next/link";
import Image from "next/image";
import {
  Clock,
  Users,
  AlertCircle,
  MessageSquare,
  Building2,
  Palette,
  Check,
  Mail,
  Calendar,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

/* ============================================================================
   Landing page — Google Workspace aesthetic.
   White background, Google blue (#1A73E8) primary, charcoal #202124 text,
   light gray (#F8F9FA / pastel) feature surfaces, rounded-rect buttons, no
   gradient washes. Section structure mirrors the previous dark version so
   copy & mockup data port across cleanly.
============================================================================ */

// Palette (Google Workspace):
//   ink #202124  body #5F6368  mute #80868B  line #DADCE0  soft #F8F9FA
//   blue #1A73E8 / #1666D2 / #E8F0FE
//   green #1E8E3E / #E6F4EA
//   red #D93025 / #FCE8E6
//   yellow #F9AB00 / #FEF7E0

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-[#202124] font-ui antialiased">
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

/* -----------------------------------------------------------------------------
   Logo glyph
----------------------------------------------------------------------------- */
function Glyph({ size = 28 }: { size?: number }) {
  return (
    <Image
      src="/logo.svg"
      alt=""
      width={size}
      height={size}
      priority
      className="rounded"
    />
  );
}

/* -----------------------------------------------------------------------------
   Nav
----------------------------------------------------------------------------- */
function Nav() {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-[#DADCE0]">
      <div className="max-w-[1200px] mx-auto px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Glyph size={28} />
          <span className="text-[18px] font-medium text-[#202124] tracking-tight">
            ClassCadence
          </span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-[14px] text-[#5F6368]">
          <Link href="#features" className="hover:text-[#202124] transition-colors">
            Features
          </Link>
          <Link href="#how" className="hover:text-[#202124] transition-colors">
            How it works
          </Link>
          <Link href="/login" className="hover:text-[#202124] transition-colors">
            Sign in
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center px-5 py-2 bg-[#1A73E8] hover:bg-[#1666D2] text-white text-[14px] font-medium rounded-[6px] transition-colors"
          >
            Start free
          </Link>
        </nav>
        <Link
          href="/signup"
          className="md:hidden inline-flex items-center px-4 py-2 bg-[#1A73E8] hover:bg-[#1666D2] text-white text-sm font-medium rounded-[6px]"
        >
          Start free
        </Link>
      </div>
    </header>
  );
}

/* -----------------------------------------------------------------------------
   Hero
----------------------------------------------------------------------------- */
function Hero() {
  return (
    <section className="max-w-[1200px] mx-auto px-6 pt-20 md:pt-28 pb-16 text-center">
      <h1 className="text-[#202124] font-medium leading-[1.1] tracking-[-0.02em] text-[44px] md:text-[64px]">
        The rhythm of every
        <br />
        great learning center.
      </h1>
      <p className="mt-6 mx-auto max-w-[680px] text-[18px] md:text-[20px] text-[#5F6368] leading-[1.5]">
        Daily check-ins, automatic absence detection, and parent email reminders — all in one
        calm dashboard, ready the evening you sign up.
      </p>
      <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          href="/signup"
          className="inline-flex items-center px-7 py-3 bg-[#1A73E8] hover:bg-[#1666D2] text-white text-[15px] font-medium rounded-[6px] transition-colors"
        >
          Try ClassCadence for free
        </Link>
        <Link
          href="/login"
          className="inline-flex items-center px-7 py-3 border border-[#DADCE0] hover:border-[#9AA0A6] text-[#1A73E8] text-[15px] font-medium rounded-[6px] transition-colors"
        >
          Sign in
        </Link>
      </div>
      <p className="mt-5 text-[13px] text-[#80868B]">
        No credit card required · Cancel anytime
      </p>
      <TodayMockup />
    </section>
  );
}

/* -----------------------------------------------------------------------------
   Trust strip — flat, simple, light-gray surface
----------------------------------------------------------------------------- */
function TrustStrip() {
  return (
    <section className="bg-[#F8F9FA] border-y border-[#DADCE0]">
      <div className="max-w-[1200px] mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-14 text-center md:text-left">
          <TrustBlock
            label="Designed for"
            body="Worksheet-based learning · two-day weekly schedules"
          />
          <Divider />
          <TrustBlock
            label="Built with"
            body={
              <span className="flex items-center gap-4 text-[14px] text-[#5F6368]">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-[#1E8E3E]" />
                  COPPA-aware
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-[#1E8E3E]" />
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
      <p className="text-[11px] uppercase tracking-[0.08em] text-[#80868B] font-medium">
        {label}
      </p>
      <div className="mt-1.5 text-[14px] text-[#202124]">{body}</div>
    </div>
  );
}

function Divider() {
  return <div className="hidden md:block h-10 w-px bg-[#DADCE0]" />;
}

/* -----------------------------------------------------------------------------
   Section heading helper — Google's understated centered title pattern
----------------------------------------------------------------------------- */
function SectionHead({
  eyebrow,
  title,
  body,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  body?: string;
}) {
  return (
    <div className="text-center mb-14 max-w-[720px] mx-auto">
      {eyebrow ? (
        <p className="text-[13px] font-medium text-[#1A73E8] mb-3">{eyebrow}</p>
      ) : null}
      <h2 className="text-[#202124] font-medium leading-[1.15] tracking-[-0.015em] text-[32px] md:text-[44px]">
        {title}
      </h2>
      {body ? (
        <p className="mt-5 text-[16px] md:text-[18px] text-[#5F6368] leading-[1.5]">
          {body}
        </p>
      ) : null}
    </div>
  );
}

/* -----------------------------------------------------------------------------
   Features — Google-style pastel-filled cards
----------------------------------------------------------------------------- */
function Features() {
  return (
    <section id="features" className="max-w-[1200px] mx-auto px-6 py-24 md:py-28">
      <SectionHead
        eyebrow="Capabilities"
        title={<>Everything your center runs on, in one place.</>}
        body="Built to replace the clipboard, the group text, and the spreadsheet — without replacing the human touch that keeps families coming back."
      />

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <FeatureCard
          Icon={Clock}
          tone="blue"
          title="One-tap check-in"
          body="Open Today, see who's expected, check students in with a single tap. A live timer counts the minutes they've been on-site. Check out the same way."
        />
        <FeatureCard
          Icon={Users}
          tone="green"
          title="Student-first records"
          body="Parent contact info lives directly on the student. No separate household table to maintain. Add a sibling in seconds — each carries their own enrollment, attendance, and notes."
        />
        <FeatureCard
          Icon={AlertCircle}
          tone="red"
          title="Automatic absence detection"
          body="When a session ends and a student never showed, the system marks them absent and notifies the parent — without anyone having to remember."
        />
        <FeatureCard
          Icon={Mail}
          tone="yellow"
          title="Automatic parent email"
          body="Enrollment confirmations, day-of class reminders, absence alerts, and make-up offers. Each sent from your branded sender. Per-parent opt-out respected."
        />
        <FeatureCard
          Icon={Building2}
          tone="blue"
          title="Multi-location ready"
          body="Add a second center with its own hours, classrooms, and team. Each location keeps its own timezone and schedule. Tenant admins see everything; staff see just their own."
        />
        <FeatureCard
          Icon={Palette}
          tone="green"
          title="Your brand, end to end"
          body="Your logo, your primary color, your sender name and address. Parents see your center in every email and every page — never our name."
        />
      </div>
    </section>
  );
}

type FeatureTone = "blue" | "green" | "red" | "yellow";

const FEATURE_TONES: Record<FeatureTone, { bg: string; icon: string }> = {
  blue: { bg: "#E8F0FE", icon: "#1A73E8" },
  green: { bg: "#E6F4EA", icon: "#1E8E3E" },
  red: { bg: "#FCE8E6", icon: "#D93025" },
  yellow: { bg: "#FEF7E0", icon: "#B86E00" },
};

function FeatureCard({
  Icon,
  title,
  body,
  tone = "blue",
}: {
  Icon: LucideIcon;
  title: string;
  body: string;
  tone?: FeatureTone;
}) {
  const t = FEATURE_TONES[tone];
  return (
    <div
      className="rounded-[16px] p-7 transition hover:-translate-y-0.5"
      style={{ backgroundColor: t.bg }}
    >
      <div
        className="w-11 h-11 rounded-full flex items-center justify-center mb-5 bg-white"
        style={{ color: t.icon }}
      >
        <Icon size={22} />
      </div>
      <h3 className="text-[20px] text-[#202124] font-medium mb-2 tracking-tight">
        {title}
      </h3>
      <p className="text-[14px] text-[#5F6368] leading-[1.6]">{body}</p>
    </div>
  );
}

/* -----------------------------------------------------------------------------
   Parent communications showcase
----------------------------------------------------------------------------- */
function ParentComms() {
  return (
    <section className="bg-white">
      <div className="max-w-[1200px] mx-auto px-6 py-24 md:py-28">
        <div className="grid md:grid-cols-2 gap-12 md:gap-20 items-center">
          <div>
            <p className="text-[13px] font-medium text-[#1A73E8] mb-3">
              Stay in sync
            </p>
            <h2 className="text-[#202124] font-medium leading-[1.15] tracking-[-0.015em] text-[32px] md:text-[44px]">
              Parents stay informed. You stay focused.
            </h2>
            <p className="mt-5 text-[16px] md:text-[18px] text-[#5F6368] leading-[1.5]">
              Every reminder, absence alert, and make-up offer is sent automatically — branded as
              you. The same events surface in your in-app bell, so you can see at a glance what
              just happened.
            </p>
            <ul className="mt-8 space-y-3">
              <FeatureBullet>
                Day-of reminders go out each morning automatically
              </FeatureBullet>
              <FeatureBullet>
                Marked absent? Parent gets an email instantly, and you see it on your dashboard
              </FeatureBullet>
              <FeatureBullet>
                Make-up offers include a one-tap accept/decline link for parents
              </FeatureBullet>
              <FeatureBullet>
                Per-student email opt-out honored, no extra config
              </FeatureBullet>
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
    <li className="flex items-start gap-3 text-[15px] text-[#202124]">
      <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-[#E6F4EA] flex items-center justify-center">
        <Check size={12} className="text-[#1E8E3E]" />
      </span>
      <span className="leading-[1.6]">{children}</span>
    </li>
  );
}

/* -----------------------------------------------------------------------------
   How it works
----------------------------------------------------------------------------- */
function HowItWorks() {
  return (
    <section id="how" className="bg-white">
      <div className="max-w-[1200px] mx-auto px-6 py-24 md:py-28">
        <SectionHead
          eyebrow="How it works"
          title={<>Paper to digital, in one evening.</>}
        />

        <div className="grid md:grid-cols-3 gap-5">
          <StepCard
            n={1}
            tone="blue"
            title="Set up your center"
            body="Add operating hours, classrooms, and weekly time slots. Upload your logo and pick your brand color. Invite your team."
          >
            <StepMockSchedule />
          </StepCard>
          <StepCard
            n={2}
            tone="green"
            title="Add your students"
            body="Enter each student once — parent contact info lives right on the record. Assign them to a classroom and time slot. Their parent gets a confirmation email automatically."
          >
            <StepMockImport />
          </StepCard>
          <StepCard
            n={3}
            tone="yellow"
            title="Run calmer"
            body="The Today page opens to the next session. Check-ins are one tap. Reminders fire each morning. Make-ups never slip through the cracks."
          >
            <StepMockReminder />
          </StepCard>
        </div>
      </div>
    </section>
  );
}

function StepCard({
  n,
  tone,
  title,
  body,
  children,
}: {
  n: number;
  tone: FeatureTone;
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  const t = FEATURE_TONES[tone];
  return (
    <div className="rounded-[16px] border border-[#DADCE0] bg-white overflow-hidden transition hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-12px_rgba(60,64,67,0.18)]">
      <div className="p-7">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center mb-4 font-medium text-[15px]"
          style={{ backgroundColor: t.bg, color: t.icon }}
        >
          {n}
        </div>
        <h3 className="text-[20px] text-[#202124] font-medium mb-2 tracking-tight">
          {title}
        </h3>
        <p className="text-[14px] text-[#5F6368] leading-[1.6]">{body}</p>
      </div>
      <div className="border-t border-[#DADCE0] bg-[#F8F9FA] p-5">{children}</div>
    </div>
  );
}

/* -----------------------------------------------------------------------------
   Stats
----------------------------------------------------------------------------- */
function Stats() {
  return (
    <section className="bg-[#F8F9FA] border-y border-[#DADCE0]">
      <div className="max-w-[1200px] mx-auto px-6 py-20">
        <div className="grid md:grid-cols-3 gap-10 text-center">
          <Stat figure="One tap" label="To check a student in. No paper, no clipboard." />
          <Stat figure="Automatic" label="Absence detection — no admin has to remember." />
          <Stat
            figure="One evening"
            label="From signing up to the first real check-in."
          />
        </div>
      </div>
    </section>
  );
}

function Stat({ figure, label }: { figure: string; label: string }) {
  return (
    <div>
      <p className="text-[#1A73E8] font-medium text-[40px] md:text-[48px] tracking-[-0.02em] leading-tight">
        {figure}
      </p>
      <p className="mt-2 text-[14px] text-[#5F6368] leading-[1.5] max-w-[260px] mx-auto">
        {label}
      </p>
    </div>
  );
}

/* -----------------------------------------------------------------------------
   CTA strip
----------------------------------------------------------------------------- */
function CTAStrip() {
  return (
    <section className="bg-[#1A73E8] text-white">
      <div className="max-w-[1000px] mx-auto px-6 py-20 md:py-24 text-center">
        <h2 className="font-medium text-[32px] md:text-[44px] leading-[1.15] tracking-[-0.015em]">
          Run your center calmer, starting tonight.
        </h2>
        <p className="mt-5 text-[16px] md:text-[18px] text-white/85 max-w-[640px] mx-auto leading-[1.5]">
          Set up your location, add your students, and welcome the first check-in — all in a
          single evening. Cancel any time.
        </p>
        <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/signup"
            className="inline-flex items-center px-7 py-3 bg-white hover:bg-[#F1F3F4] text-[#1A73E8] text-[15px] font-medium rounded-[6px] transition-colors"
          >
            Start free
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center px-7 py-3 border border-white/40 hover:border-white text-white text-[15px] font-medium rounded-[6px] transition-colors"
          >
            Sign in
          </Link>
        </div>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] text-white/80">
          <span className="inline-flex items-center gap-1.5">
            <Check size={14} /> No credit card
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Check size={14} /> Cancel anytime
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Check size={14} /> COPPA-aware
          </span>
        </div>
      </div>
    </section>
  );
}

/* -----------------------------------------------------------------------------
   Footer
----------------------------------------------------------------------------- */
function Footer() {
  return (
    <footer className="bg-white border-t border-[#DADCE0]">
      <div className="max-w-[1200px] mx-auto px-6 py-14">
        <div className="grid md:grid-cols-3 gap-10">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <Glyph size={24} />
              <span className="text-[16px] text-[#202124] font-medium tracking-tight">
                ClassCadence
              </span>
            </div>
            <p className="text-[13px] text-[#5F6368] leading-[1.6] max-w-xs">
              The student-management platform for US supplemental learning centers. Daily
              check-ins, automatic absence detection, parent email reminders.
            </p>
          </div>
          <FooterCol
            title="Product"
            links={[
              ["Features", "#features"],
              ["How it works", "#how"],
              ["Sign in", "/login"],
              ["Start free", "/signup"],
            ]}
          />
          <FooterCol
            title="Get in touch"
            links={[["Contact", "mailto:hello@tryclasscadence.com"]]}
          />
        </div>
        <div className="mt-14 pt-6 border-t border-[#DADCE0] text-[13px] text-[#80868B] flex flex-col md:flex-row justify-between items-center gap-3">
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
      <h4 className="text-[13px] uppercase tracking-[0.08em] text-[#202124] font-medium mb-3">
        {title}
      </h4>
      <ul className="space-y-2.5">
        {links.map(([label, href]) => (
          <li key={label}>
            <Link
              href={href}
              className="text-[14px] text-[#5F6368] hover:text-[#1A73E8] transition-colors"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* =============================================================================
   MOCKUPS — preserved from the previous version, restyled flat & light
============================================================================= */

/* ---- Today screen ---- */
function TodayMockup() {
  return (
    <div className="mt-16 md:mt-20 mx-auto max-w-[960px] text-left">
      <div className="bg-white rounded-[12px] border border-[#DADCE0] overflow-hidden shadow-[0_12px_32px_-12px_rgba(60,64,67,0.18)]">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#DADCE0] bg-[#F8F9FA]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#EA4335]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#FBBC04]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#34A853]" />
          <div className="ml-3 px-3 py-0.5 rounded-md bg-white border border-[#DADCE0] text-[11px] text-[#5F6368] font-mono">
            tryclasscadence.com · Today
          </div>
        </div>
        <div className="p-7">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div>
              <h3 className="text-[20px] text-[#202124] font-medium tracking-tight">
                Today · Tuesday, May 21
              </h3>
              <p className="text-[13px] text-[#5F6368] mt-1">
                4:00 PM session · EL Room · 6 of 8 expected
              </p>
            </div>
            <span className="px-3 py-1 bg-[#E6F4EA] text-[#1E8E3E] rounded-[6px] text-[13px] font-medium">
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
    in: {
      label: "Checked in",
      bg: "#E6F4EA",
      text: "#1E8E3E",
      dot: "#1E8E3E",
      cta: "Check out",
      ctaStyle: "border border-[#DADCE0] text-[#1A73E8] hover:bg-[#F8F9FA]",
    },
    late: {
      label: "Late · checked in",
      bg: "#FEF7E0",
      text: "#B86E00",
      dot: "#F9AB00",
      cta: "Check out",
      ctaStyle: "border border-[#DADCE0] text-[#1A73E8] hover:bg-[#F8F9FA]",
    },
    expected: {
      label: "Expected",
      bg: "#F8F9FA",
      text: "#5F6368",
      dot: "#DADCE0",
      cta: "Check in",
      ctaStyle: "bg-[#1A73E8] hover:bg-[#1666D2] text-white",
    },
  }[status];
  return (
    <div className="flex items-center justify-between px-4 py-2.5 rounded-[8px] border border-[#DADCE0] hover:bg-[#F8F9FA] transition-colors">
      <div className="flex items-center gap-3">
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: config.dot }}
        />
        <span className="text-[14px] font-medium text-[#202124]">{name}</span>
        <span className="text-[12px] text-[#5F6368] font-mono">{time}</span>
      </div>
      <div className="flex items-center gap-3">
        <span
          className="hidden sm:inline text-[11px] font-medium px-2.5 py-0.5 rounded-[6px]"
          style={{ backgroundColor: config.bg, color: config.text }}
        >
          {config.label}
        </span>
        <button
          className={`text-[12px] font-medium px-3 py-1.5 rounded-[6px] transition-colors ${config.ctaStyle}`}
        >
          {config.cta}
        </button>
      </div>
    </div>
  );
}

/* ---- Bell / notifications ---- */
function BellMockup() {
  return (
    <div className="bg-white rounded-[12px] border border-[#DADCE0] overflow-hidden max-w-md ml-auto shadow-[0_4px_12px_-4px_rgba(60,64,67,0.12)]">
      <div className="px-5 py-3 border-b border-[#DADCE0] flex items-center gap-2.5">
        <div className="relative inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#F8F9FA] text-[#5F6368]">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
          <span className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#D93025] px-1 text-[9px] font-medium text-white ring-2 ring-white">
            3
          </span>
        </div>
        <p className="flex-1 text-[14px] font-medium text-[#202124]">Notifications</p>
        <p className="text-[11px] text-[#80868B]">Just now</p>
      </div>
      <ul className="divide-y divide-[#DADCE0]">
        <NotifRow
          unread
          title="Ella Johnson enrolled in Early Learning"
          sub="Mon 4:00 PM"
          time="2m ago"
          tone="blue"
        />
        <NotifRow
          unread
          title="Hao Chen marked absent"
          sub="Regular Class · 4:00 PM"
          time="14m ago"
          tone="red"
        />
        <NotifRow
          unread
          title="Make-up offer sent to Olivia"
          sub="Fri 5:00 PM — awaiting response"
          time="1h ago"
          tone="yellow"
        />
        <NotifRow
          title="3 sessions today"
          sub="11 students expected"
          time="9:00 AM"
          tone="mute"
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
  tone: "blue" | "red" | "yellow" | "mute";
}) {
  const dotColor = {
    blue: "#1A73E8",
    red: "#D93025",
    yellow: "#F9AB00",
    mute: "#DADCE0",
  }[tone];
  return (
    <li
      className={`flex items-start gap-2.5 px-4 py-2.5 ${
        unread ? "bg-[#E8F0FE]/40" : ""
      }`}
    >
      <span
        aria-hidden
        className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: unread ? dotColor : "#DADCE0" }}
      />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] leading-snug text-[#202124]">{title}</p>
        <p className="mt-0.5 text-[11px] text-[#5F6368]">{sub}</p>
      </div>
      <p className="text-[10px] uppercase tracking-wide text-[#80868B] shrink-0">
        {time}
      </p>
    </li>
  );
}

/* ---- Email mockup ---- */
function EmailMockup() {
  return (
    <div className="bg-white rounded-[12px] border border-[#DADCE0] overflow-hidden max-w-md shadow-[0_4px_12px_-4px_rgba(60,64,67,0.12)]">
      <div className="px-5 py-3 border-b border-[#DADCE0] flex items-center gap-3">
        <Mail size={16} className="text-[#5F6368]" />
        <p className="text-[12px] text-[#5F6368] flex-1">Inbox · Class reminder</p>
        <p className="text-[11px] text-[#80868B]">8:00 AM</p>
      </div>
      <div className="px-5 py-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-[6px] bg-[#E8F0FE] flex items-center justify-center">
            <Glyph size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-medium text-[#202124]">
              Spring Valley Learning Center
            </p>
            <p className="text-[11px] text-[#80868B] truncate">
              noreply@svlearning.com → o.johnson@gmail.com
            </p>
          </div>
        </div>
        <p className="text-[16px] text-[#1A73E8] font-medium mb-1.5">
          Reminder: Ella has class today
        </p>
        <p className="text-[14px] text-[#3C4043] leading-[1.6] mb-3">
          Hi Olivia, just a reminder that <strong>Ella</strong> has class today.
        </p>
        <div className="rounded-[8px] border border-[#DADCE0] bg-[#F8F9FA] border-l-[3px] border-l-[#1A73E8] px-3 py-2.5">
          <p className="text-[13px] text-[#202124]">
            <strong>Monday, May 24</strong>{" "}
            <span className="font-mono text-[#5F6368]">4:00 PM – 4:30 PM</span>
          </p>
          <p className="text-[11px] text-[#80868B] mt-0.5">Early Learning</p>
        </div>
        <p className="mt-3 text-[14px] text-[#3C4043]">See you there!</p>
        <p className="mt-3 text-[12px] text-[#80868B]">
          — Spring Valley Learning Center
        </p>
      </div>
    </div>
  );
}

/* ---- Step mini-mockups ---- */
function StepMockSchedule() {
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] uppercase tracking-[0.08em] text-[#80868B] font-medium mb-2">
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
          className={`flex items-center justify-between text-[12px] px-3 py-1.5 rounded-[6px] ${
            active
              ? "bg-[#E8F0FE] text-[#1A73E8]"
              : "bg-white border border-[#DADCE0] text-[#80868B]"
          }`}
        >
          <span className="font-medium">{day}</span>
          <span className="font-mono">{time}</span>
        </div>
      ))}
    </div>
  );
}

function StepMockImport() {
  return (
    <div className="space-y-2 text-[12px]">
      <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-[6px] border border-[#DADCE0] bg-white">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#E6F4EA] text-[9px] font-medium text-[#1E8E3E]">
            EJ
          </span>
          <span className="font-medium text-[#202124]">Ella Johnson</span>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-[#80868B]">
          4th grade
        </span>
      </div>
      <div className="flex items-center gap-2 px-3 py-2 rounded-[6px] bg-[#E8F0FE] text-[#1A73E8]">
        <Mail size={12} />
        <span className="font-medium">Parent email</span>
        <span className="ml-auto font-mono text-[10px]">o.johnson@…</span>
      </div>
      <div className="flex items-center gap-2 px-3 py-2 rounded-[6px] bg-white border border-[#DADCE0] text-[#3C4043]">
        <Calendar size={12} className="text-[#1A73E8]" />
        <span className="font-medium">Mon · 4:00 PM</span>
        <span className="ml-auto text-[10px] text-[#1E8E3E] font-medium inline-flex items-center gap-1">
          <Check size={10} /> Enrolled
        </span>
      </div>
    </div>
  );
}

function StepMockReminder() {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-3 py-2 rounded-[6px] bg-white border border-[#DADCE0] text-[12px]">
        <Calendar size={14} className="text-[#1A73E8]" />
        <span className="text-[#3C4043]">Class reminder · 9:00 AM</span>
        <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-[#1E8E3E] font-medium">
          <Check size={10} /> Sent
        </span>
      </div>
      <div className="flex items-center gap-2 px-3 py-2 rounded-[6px] bg-white border border-[#DADCE0] text-[12px]">
        <AlertCircle size={14} className="text-[#F9AB00]" />
        <span className="text-[#3C4043]">Missed class · 5:32 PM</span>
        <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-[#1E8E3E] font-medium">
          <Check size={10} /> Sent
        </span>
      </div>
      <div className="flex items-center gap-2 px-3 py-2 rounded-[6px] bg-white border border-[#DADCE0] text-[12px]">
        <MessageSquare size={14} className="text-[#F9AB00]" />
        <span className="text-[#3C4043]">Make-up offer · 5:33 PM</span>
        <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-[#1E8E3E] font-medium">
          <Check size={10} /> Sent
        </span>
      </div>
    </div>
  );
}

/* =============================================================================
   Product tour — four browser tiles
============================================================================= */
function ProductTour() {
  return (
    <section className="bg-[#F8F9FA] border-y border-[#DADCE0]">
      <div className="max-w-[1200px] mx-auto px-6 py-24 md:py-28">
        <SectionHead
          eyebrow="A glimpse inside"
          title={<>Every screen built for the front desk.</>}
          body="Dashboard for the tenant admin. Today screen for the front desk. Schedule, make-ups, and student records in between."
        />

        <div className="grid md:grid-cols-2 gap-5 md:gap-6">
          <BrowserTile
            chromePath="tryclasscadence.com / tenant"
            title="Tenant admin dashboard"
            tone="blue"
          >
            <PageMockDashboard />
          </BrowserTile>
          <BrowserTile
            chromePath="tryclasscadence.com / tenant / schedule"
            title="Weekly schedule"
            tone="green"
          >
            <PageMockSchedule />
          </BrowserTile>
          <BrowserTile
            chromePath="tryclasscadence.com / tenant / makeups"
            title="Make-up tracking"
            tone="yellow"
          >
            <PageMockMakeups />
          </BrowserTile>
          <BrowserTile
            chromePath="tryclasscadence.com / tenant / students"
            title="Students directory"
            tone="blue"
          >
            <PageMockStudents />
          </BrowserTile>
        </div>
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
  tone: FeatureTone;
  children: React.ReactNode;
}) {
  const t = FEATURE_TONES[tone];
  return (
    <div className="group">
      <div className="rounded-[12px] border border-[#DADCE0] overflow-hidden bg-white transition group-hover:-translate-y-0.5 shadow-[0_4px_12px_-4px_rgba(60,64,67,0.10)] group-hover:shadow-[0_8px_24px_-8px_rgba(60,64,67,0.18)]">
        <div className="flex items-center gap-2 px-3.5 py-2 border-b border-[#DADCE0] bg-[#F8F9FA]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#EA4335]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#FBBC04]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#34A853]" />
          <div className="ml-3 px-2.5 py-0.5 rounded-[6px] bg-white border border-[#DADCE0] text-[10px] text-[#5F6368] font-mono">
            {chromePath}
          </div>
        </div>
        <div className="bg-white p-4 min-h-[260px]">{children}</div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span
          aria-hidden
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: t.icon }}
        />
        <p className="text-[14px] font-medium text-[#202124]">{title}</p>
      </div>
    </div>
  );
}

/* ---- Dashboard mock ---- */
function PageMockDashboard() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2">
        <MockKpi label="Students" value="47" accent="#1A73E8" />
        <MockKpi label="Today" value="3" accent="#1E8E3E" />
        <MockKpi label="Make-ups" value="2" accent="#F9AB00" />
        <MockKpi label="Absent" value="1" accent="#D93025" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-1 rounded-[8px] border border-[#DADCE0] bg-white p-3">
          <p className="text-[9px] font-medium uppercase tracking-wider text-[#80868B]">
            Attendance
          </p>
          <div className="mt-1 flex items-center justify-center">
            <MiniRing pct={92} />
          </div>
        </div>
        <div className="col-span-2 rounded-[8px] border border-[#DADCE0] bg-white p-3">
          <p className="text-[9px] font-medium uppercase tracking-wider text-[#80868B]">
            Last 4 weeks
          </p>
          <div className="mt-2 flex items-end justify-around gap-2 h-[68px]">
            {[78, 84, 91, 92].map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[9px] font-medium tabular-nums text-[#1A73E8]">
                  {v}%
                </span>
                <div
                  className="w-full rounded-t-[4px] bg-[#1A73E8]"
                  style={{ height: `${v * 0.5}px` }}
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
    <div className="relative overflow-hidden rounded-[8px] border border-[#DADCE0] bg-white px-2 py-2">
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{ backgroundColor: accent }}
      />
      <p className="text-[9px] font-medium uppercase tracking-wider text-[#80868B]">
        {label}
      </p>
      <p className="mt-1 text-[18px] font-medium tabular-nums text-[#202124] leading-none">
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
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#E8EAED"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#1A73E8"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <p className="text-[14px] font-medium tabular-nums text-[#202124]">
          {pct}%
        </p>
      </div>
    </div>
  );
}

/* ---- Schedule mock ---- */
function PageMockSchedule() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const sessions: [number, number, number, string][] = [
    [0, 10, 22, "#1A73E8"],
    [0, 50, 22, "#1E8E3E"],
    [1, 30, 22, "#F9AB00"],
    [2, 20, 18, "#1A73E8"],
    [3, 40, 22, "#1E8E3E"],
    [4, 10, 24, "#F9AB00"],
    [4, 55, 20, "#1A73E8"],
  ];
  return (
    <div className="rounded-[8px] border border-[#DADCE0] bg-white overflow-hidden">
      <div className="grid grid-cols-5 border-b border-[#DADCE0] bg-[#F8F9FA]">
        {days.map((d, i) => (
          <div
            key={d}
            className={`px-2 py-1.5 text-center text-[10px] font-medium uppercase tracking-wider ${
              i === 2 ? "text-[#1A73E8]" : "text-[#80868B]"
            }`}
          >
            {d}
            {i === 2 ? (
              <span className="block text-[9px] font-normal text-[#1A73E8]">
                Today
              </span>
            ) : null}
          </div>
        ))}
      </div>
      <div className="relative grid grid-cols-5 h-[180px] divide-x divide-[#E8EAED]">
        {days.map((_, i) => (
          <div
            key={i}
            className={i === 2 ? "bg-[#E8F0FE]/40" : "bg-white"}
          >
            {Array.from({ length: 4 }).map((_, r) => (
              <div
                key={r}
                className="border-t border-[#E8EAED]"
                style={{ height: "25%" }}
              />
            ))}
          </div>
        ))}
        {sessions.map(([d, top, h, color], idx) => (
          <div
            key={idx}
            className="absolute rounded-[6px] bg-white px-1 py-0.5 overflow-hidden"
            style={{
              left: `calc(${d * 20}% + 4px)`,
              width: `calc(20% - 8px)`,
              top: `${top}%`,
              height: `${h}%`,
              borderLeft: `2px solid ${color}`,
              backgroundColor: `${color}14`,
            }}
          >
            <p className="text-[8px] font-medium tabular-nums text-[#202124]">
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
        label="Needs make-up"
        accentBorder="#D93025"
        accentBg="#FCE8E6"
        items={[
          { name: "Hao Chen", sub: "Absent · May 21", tag: "1 owed" },
          { name: "Sofia García", sub: "Absent · May 19", tag: "1 owed" },
        ]}
      />
      <MakeupSection
        label="Pending"
        accentBorder="#F9AB00"
        accentBg="#FEF7E0"
        items={[{ name: "Olivia W.", sub: "Offered Fri 5:00 PM", tag: "Awaiting" }]}
      />
      <MakeupSection
        label="Completed"
        accentBorder="#1E8E3E"
        accentBg="#E6F4EA"
        items={[{ name: "Liam C.", sub: "Made up May 22", tag: "Done" }]}
      />
    </div>
  );
}

function MakeupSection({
  label,
  accentBorder,
  accentBg,
  items,
}: {
  label: string;
  accentBorder: string;
  accentBg: string;
  items: { name: string; sub: string; tag: string }[];
}) {
  return (
    <div>
      <p className="text-[9px] font-medium uppercase tracking-wider text-[#80868B] mb-1.5">
        {label}
      </p>
      <div className="space-y-1.5">
        {items.map((it, i) => (
          <div
            key={i}
            className="flex items-center gap-2 rounded-[6px] border border-[#DADCE0] bg-white px-2.5 py-1.5"
            style={{ borderLeft: `3px solid ${accentBorder}` }}
          >
            <span
              className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-medium text-[#202124]"
              style={{ backgroundColor: accentBg }}
            >
              {it.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-[#202124] truncate">
                {it.name}
              </p>
              <p className="text-[9px] text-[#80868B]">{it.sub}</p>
            </div>
            <span className="text-[9px] font-medium uppercase tracking-wider text-[#5F6368]">
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
    { name: "Ella Johnson", grade: "4th", classes: 2, color: "#1A73E8" },
    { name: "Hao Chen", grade: "5th", classes: 2, color: "#1E8E3E" },
    { name: "Veer Patel", grade: "3rd", classes: 1, color: "#F9AB00" },
    { name: "Sofia García", grade: "6th", classes: 2, color: "#D93025" },
    { name: "Mateo Ramirez", grade: "4th", classes: 2, color: "#1A73E8" },
  ];
  return (
    <div className="rounded-[8px] border border-[#DADCE0] bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#DADCE0] bg-[#F8F9FA]">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-[6px] bg-[#E8F0FE] text-[#1A73E8]">
          <Users size={11} />
        </span>
        <p className="text-[11px] font-medium text-[#202124]">47 active students</p>
        <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#1A73E8] text-[9px] font-medium uppercase tracking-wider text-white">
          + Add
        </span>
      </div>
      <ul className="divide-y divide-[#E8EAED]">
        {rows.map((r) => (
          <li key={r.name} className="flex items-center gap-2.5 px-3 py-2">
            <span
              className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-medium text-white"
              style={{ backgroundColor: r.color }}
            >
              {r.name.split(" ").map((w) => w[0]).join("")}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-[#202124]">{r.name}</p>
              <p className="text-[9px] text-[#80868B]">Grade {r.grade}</p>
            </div>
            <span className="text-[9px] font-mono tabular-nums text-[#80868B]">
              {r.classes}/2
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* =============================================================================
   Reminder showcase
============================================================================= */
function ReminderShowcase() {
  return (
    <section className="bg-white">
      <div className="max-w-[1200px] mx-auto px-6 py-24 md:py-28">
        <SectionHead
          eyebrow="Parent reminders"
          title={<>What parents actually receive.</>}
          body="Three email types fire automatically — branded as you, sent from your domain, opted out per student if they ask."
        />

        <div className="grid md:grid-cols-3 gap-5">
          <ReminderTile title="Class reminder" tone="blue">
            <ReminderEmailReminder />
          </ReminderTile>
          <ReminderTile title="Absence alert" tone="red">
            <ReminderEmailAbsent />
          </ReminderTile>
          <ReminderTile title="Make-up offer" tone="yellow">
            <ReminderEmailMakeup />
          </ReminderTile>
        </div>
      </div>
    </section>
  );
}

function ReminderTile({
  title,
  tone,
  children,
}: {
  title: string;
  tone: FeatureTone;
  children: React.ReactNode;
}) {
  const t = FEATURE_TONES[tone];
  return (
    <div>
      <div className="rounded-[12px] border border-[#DADCE0] bg-white overflow-hidden transition hover:-translate-y-0.5 shadow-[0_4px_12px_-4px_rgba(60,64,67,0.10)] hover:shadow-[0_8px_24px_-8px_rgba(60,64,67,0.18)]">
        {children}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span
          aria-hidden
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: t.icon }}
        />
        <p className="text-[14px] font-medium text-[#202124]">{title}</p>
      </div>
    </div>
  );
}

function MiniEmailHeader({ subject }: { subject: string }) {
  return (
    <>
      <div className="px-4 py-2 border-b border-[#DADCE0] flex items-center gap-2 bg-[#F8F9FA]">
        <Mail size={13} className="text-[#5F6368]" />
        <p className="text-[10px] text-[#5F6368]">Inbox</p>
        <p className="text-[9px] text-[#80868B] ml-auto">9:00 AM</p>
      </div>
      <div className="px-4 pt-3 pb-2 flex items-center gap-2">
        <Glyph size={26} />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium text-[#202124]">Spring Valley LC</p>
          <p className="text-[9px] text-[#80868B] truncate">
            noreply@svlearning.com
          </p>
        </div>
      </div>
      <p className="px-4 text-[13px] text-[#1A73E8] font-medium leading-tight">
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
        <p className="text-[11px] text-[#3C4043] leading-relaxed mb-2">
          Hi Olivia, just a reminder that <strong>Ella</strong> has class today.
        </p>
        <div
          className="rounded-[6px] bg-[#F8F9FA] px-2.5 py-2 text-[11px]"
          style={{ borderLeft: "2px solid #1A73E8" }}
        >
          <p className="font-medium text-[#202124]">Mon, May 24</p>
          <p className="font-mono text-[#5F6368] text-[10px]">4:00 PM – 4:30 PM</p>
          <p className="text-[9px] text-[#80868B] mt-0.5">Early Learning</p>
        </div>
        <p className="mt-2 text-[10px] text-[#80868B]">— Spring Valley LC</p>
      </div>
    </>
  );
}

function ReminderEmailAbsent() {
  return (
    <>
      <MiniEmailHeader subject="Ella missed Early Learning today" />
      <div className="px-4 pt-2 pb-4">
        <p className="text-[11px] text-[#3C4043] leading-relaxed mb-2">
          Hi Olivia, <strong>Ella</strong> was marked absent from today&apos;s class:
        </p>
        <div
          className="rounded-[6px] bg-[#FCE8E6] px-2.5 py-2 text-[11px]"
          style={{ borderLeft: "2px solid #D93025" }}
        >
          <p className="font-medium text-[#202124]">Mon, May 24</p>
          <p className="font-mono text-[#5F6368] text-[10px]">4:00 PM</p>
          <p className="text-[9px] text-[#80868B] mt-0.5">Early Learning</p>
        </div>
        <p className="mt-2 text-[10px] text-[#3C4043]">
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
        <p className="text-[11px] text-[#3C4043] leading-relaxed mb-2">
          We&apos;d like to offer <strong>Ella</strong> a make-up class:
        </p>
        <div
          className="rounded-[6px] bg-[#FEF7E0] px-2.5 py-2 text-[11px]"
          style={{ borderLeft: "2px solid #F9AB00" }}
        >
          <p className="font-medium text-[#202124]">Fri, May 28</p>
          <p className="font-mono text-[#5F6368] text-[10px]">5:00 PM – 5:30 PM</p>
        </div>
        <button
          className="mt-2.5 w-full px-3 py-1.5 rounded-[6px] text-[10px] font-medium text-white bg-[#1A73E8] hover:bg-[#1666D2] transition-colors"
        >
          Accept or decline →
        </button>
      </div>
    </>
  );
}
