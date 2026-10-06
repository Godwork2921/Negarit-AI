"use client";

import { useLanguage } from "../contexts/LanguageContext";
import AmbientBackdrop from "./AmbientBackdrop";
import { SectionHeader, RevealGroup, RevealItem } from "./Reveal";

const TESTIMONIALS = [
  { quoteKey: "testimonial1Text", authorKey: "testimonial1Author", roleKey: "testimonial1Role" },
  { quoteKey: "testimonial2Text", authorKey: "testimonial2Author", roleKey: "testimonial2Role" },
  { quoteKey: "testimonial3Text", authorKey: "testimonial3Author", roleKey: "testimonial3Role" },
];

export default function Testimonials() {
  const { t } = useLanguage();

  return (
    <section
      id="testimonials"
      aria-labelledby="testimonials-heading"
      className="section"
    >
      <AmbientBackdrop grid="dots" orbs={1} />

      <div className="container-page">
        <div id="testimonials-heading">
          <SectionHeader
            eyebrow={t("testimonials")}
            title={t("trustedByTeams")}
            lede={t("testimonialsDesc")}
          />
        </div>

        <RevealGroup
          stagger={0.1}
          className="mt-14 grid gap-5 md:grid-cols-3 md:gap-6"
        >
          {TESTIMONIALS.map((item) => (
            <RevealItem key={item.quoteKey} as="div" className="h-full">
              <figure className="card flex h-full flex-col p-7">
                <span
                  aria-hidden="true"
                  className="select-none text-5xl font-serif leading-none text-[var(--primary)]/25"
                >
                  &ldquo;
                </span>

                <blockquote className="relative mt-1 flex-1">
                  <p className="text-sm leading-relaxed text-muted">
                    {t(item.quoteKey)}
                  </p>
                </blockquote>

                <figcaption className="mt-6 flex items-center gap-3 border-t border-[var(--border)] pt-5">
                  <span
                    aria-hidden="true"
                    className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-gradient text-sm font-bold text-[var(--text-inverse)]"
                  >
                    {t(item.authorKey).charAt(0)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-ink">
                      {t(item.authorKey)}
                    </p>
                    <p className="truncate text-xs text-subtle">{t(item.roleKey)}</p>
                  </div>
                </figcaption>
              </figure>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
