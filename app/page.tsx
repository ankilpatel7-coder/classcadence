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
        Built for US supplemental learning centers
      </div>
      <h1 className="font-display text-5xl md:text-7xl font-semibold text-primary leading-[1.05]">
        The rhythm of every
        <br />
        great learning center.
      </h1>
      <p className="mt-7 text-lg md:text-xl text-ink/70 max-w-2xl mx-auto leading-relaxed">
        Daily check-ins, automatic absence detection, and parent email reminders — all in one calm dashboard, ready the evening you sign up.
      </p>

      <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          href="/signup"
          className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-md bg-accent text-white font-medium shadow-card hover:bg-accent/90 hover:shadow-pop transition-all"
        >
          Start free
          <ChevronRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
        </Link>
        <Link
          href="/login"
          className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-md border border-line bg-surface text-primary font-medium hover:bg-primary-soft hover:border-primary/30 transition-colors"
        >
          Sign in
        </Link>
      </div>

      <p className="mt-6 text-sm text-muted">
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
    <section className="border-y border-line/60 bg-surface">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-14 text-center md:text-left">
          <TrustBlock label="Designed for" body="Worksheet-based learning · two-day weekly schedules" />
          <Divider />
          <TrustBlock
            label="Built with"
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
          <TrustBlock label="Reminders" body="Parent email · in-app dashboard" />
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
          Built to replace the clipboard, the group text, and the spreadsheet — without replacing the human touch that keeps families coming back.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        <FeatureCard
          Icon={Clock}
          title="One-tap check-in"
          body="Open Today, see who's expected, check students in with a single tap. A live timer counts the minutes they've been on-site. Check out the same way."
        />
        <FeatureCard
          Icon={Users}
          title="Student-first records"
          body="Parent contact info lives directly on the student. No separate household table to maintain. Add a sibling in seconds — each carries their own enrollment, attendance, and notes."
        />
        <FeatureCard
          Icon={AlertCircle}
          title="Automatic absence detection"
          body="When a session ends and a student never showed, the system marks them absent and notifies the parent — without anyone having to remember."
        />
        <FeatureCard
          Icon={Mail}
          title="Automatic parent email"
          body="Enrollment confirmations, day-of class reminders, absence alerts, and make-up offers. Each sent from your branded sender. Per-parent opt-out respected."
        />
        <FeatureCard
          Icon={Building2}
          title="Multi-location ready"
          body="Add a second center with its own hours, classrooms, and team. Each location keeps its own timezone and schedule. Tenant admins see everything; staff see just their own."
        />
        <FeatureCard
          Icon={Palette}
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
    <section className="bg-surface border-y border-line">
      <div className="max-w-6xl mx-auto px-6 py-24 md:py-28">
        <div className="grid md:grid-cols-2 gap-12 md:gap-20 items-center">
          <div>
            <Eyebrow>Stay in sync</Eyebrow>
            <h2 className="mt-3 font-display text-4xl md:text-5xl font-semibold text-primary leading-tight">
              Parents stay informed. You stay focused.
            </h2>
            <p className="mt-6 text-lg text-ink/70 leading-relaxed">
              Every reminder, absence alert, and make-up offer is sent automatically — branded as you. The same events surface in your in-app bell, so you can see at a glance what just happened.
            </p>
            <ul className="mt-8 space-y-3 text-ink/80">
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
   Stats
========================================================================= */
function Stats() {
  return (
    <section className="bg-surface border-y border-line">
      <div className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-3 gap-10 text-center">
          <Stat figure="One tap" label="To check a student in. No paper, no clipboard." />
          <Stat figure="Automatic" label="Absence detection — no admin has to remember." />
          <Stat figure="One evening" label="From signing up to the first real check-in." />
        </div>
      </div>
    </section>
  );
}

function Stat({ figure, label }: { figure: string; label: string }) {
  return (
    <div>
      <p className="font-display text-4xl md:text-5xl text-primary font-semibold tracking-tight">
        {figure}
      </p>
      <p className="mt-3 text-ink/70 text-[15px] leading-relaxed max-w-xs mx-auto">{label}</p>
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
    <footer className="bg-bg border-t border-line">
      <div className="max-w-6xl mx-auto px-6 py-14">
        <div className="grid md:grid-cols-3 gap-10">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <Glyph size={22} />
              <span className="font-wordmark text-lg text-primary font-semibold">
                ClassCadence
              </span>
            </div>
            <p className="text-sm text-muted leading-relaxed max-w-xs">
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
        <div className="mt-14 pt-6 border-t border-line text-sm text-muted flex flex-col md:flex-row justify-between items-center gap-3">
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
