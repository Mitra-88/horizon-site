import type { ComponentType, SVGProps } from "react";
import { DiscordIcon, DollarIcon, GitHubIcon, ShieldIcon } from "@/components/icons";
import { BUILD_URL, DISCORD_URL, GITHUB_URL, SPONSOR_URL } from "@/components/links";
import { PixelAurora } from "@/components/pixel-aurora";

const GLASS = {
  card: "bg-white/[0.06] backdrop-blur-xl hover:bg-white/[0.1] focus-visible:ring-[#a98fff]",
  icon: "text-white/80 group-hover:text-white group-focus-visible:text-white",
  title: "text-white",
  body: "text-white/75",
};

const DISCORD = {
  card: "bg-[#5865f2] hover:bg-[#4752c4] focus-visible:ring-white",
  icon: "text-white",
  title: "text-white",
  body: "text-white",
};

const LIGHT = {
  card: "bg-white hover:bg-[#ece8f7] focus-visible:ring-[#a98fff]",
  icon: "text-background",
  title: "text-background",
  body: "text-background/70",
};

type Card = {
  title: string;
  body: string;
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  tone: typeof GLASS;
};

const LINKS: Card[] = [
  { title: "Discord", body: "Questions, bug reports and screenshots.", href: DISCORD_URL, icon: DiscordIcon, tone: DISCORD },
  { title: "Sponsor", body: "Sponsors on GitHub fund the next release.", href: SPONSOR_URL, icon: DollarIcon, tone: GLASS },
  { title: "Source", body: "Issues and pull requests are welcome.", href: GITHUB_URL, icon: GitHubIcon, tone: LIGHT },
  {
    title: "How it's built",
    body: "Who writes it, how changes are checked, why it's safe to run.",
    href: BUILD_URL,
    icon: ShieldIcon,
    tone: GLASS,
  },
];

export function Community() {
  return (
    <section
      id="community"
      aria-labelledby="community-title"
      className="relative isolate mb-8 scroll-mt-14 overflow-hidden py-16  sm:py-24"
    >
      <PixelAurora className="absolute top-0 left-0 -z-10" />

      <div className="mx-auto w-full max-w-6xl px-6 lg:px-10">
        <div className="reveal">
          <p className="text-sm font-medium text-white/60">Community</p>
          <h2
            id="community-title"
            className="mt-5 font-display text-[clamp(2rem,3.6vw,3rem)] leading-[1.08] font-semibold tracking-[-0.03em] text-balance text-white"
          >
            Built in the open.
          </h2>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-pretty text-white/60">
            Every change lands on GitHub in public. Come ask questions, report bugs or send a pull request.
          </p>
        </div>

        <ul className="mt-8 grid gap-3 sm:mt-10 sm:grid-cols-2 lg:grid-cols-4">
          {LINKS.map(({ title, body, href, icon: Icon, tone }) => (
            <li key={title} className="flex">
              <a
                href={href}
                className={`group flex w-full flex-col rounded-xl p-6 transition outline-none focus-visible:ring-2 motion-safe:hover:-translate-y-0.5 ${tone.card}`}
              >
                <span className={`flex items-center gap-2.5 text-[17px] font-medium ${tone.title}`}>
                  <Icon className={`size-5 shrink-0 transition-colors ${tone.icon}`} />
                  {title}
                </span>
                <span className={`mt-2 text-sm leading-relaxed text-pretty ${tone.body}`}>{body}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
