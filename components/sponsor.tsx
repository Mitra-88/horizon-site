import Image from "next/image";
import { CopyCode } from "@/components/copy-code";
import { HideButton, PartnersGate } from "@/components/hide-partners";
import { SCULK_URL } from "@/components/links";

export function Sponsor() {
  return (
    <PartnersGate>
      <section id="sculk" aria-labelledby="sculk-title" className="scroll-mt-14 pb-10 sm:pb-12">
        <div className="reveal @container mx-auto w-full max-w-6xl">
          <div className="pt-6">
            <div className="relative flow-root rounded-2xl bg-[radial-gradient(ellipse_at_78%_60%,rgba(92,201,242,0.2),transparent_55%),linear-gradient(100deg,#0a0f17,#0d151f_50%,#10283a)]">
              <div aria-hidden className="absolute inset-0 overflow-hidden rounded-2xl">
                <div className="absolute inset-x-0 top-0 h-[60%] [mask-image:linear-gradient(to_bottom,black_25%,transparent)] @[48rem]:inset-y-0 @[48rem]:left-auto @[48rem]:h-full @[48rem]:w-[50%] @[48rem]:[mask-image:linear-gradient(to_right,transparent,black_65%)]">
                  <Image
                    src="/media/cherry-grove.jpg"
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 44rem, 100vw"
                    className="object-cover opacity-45"
                  />
                </div>
              </div>

              <Image
                src="/media/steve-alex-wolf.webp"
                alt=""
                width={575}
                height={450}
                sizes="(min-width: 1024px) 36rem, (min-width: 768px) 54vw, 90vw"
                className="relative mx-auto -mt-16 block w-[80%] @[48rem]:absolute @[48rem]:-top-[16%] @[48rem]:right-0 @[48rem]:mt-0 @[48rem]:h-[132%] @[48rem]:w-[52%] @[48rem]:object-contain @[48rem]:object-right-bottom"
              />
              <HideButton className="absolute top-3 right-3 z-10 grid size-8 place-items-center rounded-full bg-black/45 text-white/70 transition-colors hover:bg-black/70 hover:text-white focus-visible:ring-2 focus-visible:ring-[#5cc9f2] focus-visible:outline-none" />
              <div className="relative px-6 pt-1 pb-6 @[48rem]:max-w-[56%] @[48rem]:px-[4.5cqi] @[48rem]:py-[3.5cqi]">
                <Image
                  src="/media/sculk-wordmark.webp"
                  alt="Sculk"
                  width={751}
                  height={164}
                  className="h-5 w-auto @[48rem]:h-6"
                />
                <h2
                  id="sculk-title"
                  className="mt-4 text-[clamp(1.75rem,4cqi,2.75rem)] leading-[1.08] tracking-[-0.01em] text-white/90"
                >
                  Your Minecraft
                  <br />
                  Server, <span className="whitespace-nowrap text-[#5ccff5]">24/7 Online.</span>
                </h2>
                <p className="mt-2 text-[15px] text-pretty text-white/60 @[48rem]:text-base">
                  Get your server now in under ~60 seconds!
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <a
                    href={SCULK_URL}
                    target="_blank"
                    rel="sponsored noopener"
                    className="inline-flex h-11 items-center rounded-lg bg-[#5cc9f2] px-5 text-[15px] font-medium text-[#03131b] transition-colors hover:bg-[#86d8f6]"
                  >
                    Get my server
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                  <CopyCode
                    code="HORIZON15"
                    className="inline-flex h-11 items-center gap-2 rounded-lg border border-dashed border-[#5cc9f2]/60 px-4 text-[15px] font-medium tracking-wide text-white transition-colors hover:border-[#5cc9f2] hover:bg-[#5cc9f2]/10 [&>svg]:text-[#5cc9f2]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PartnersGate>
  );
}
