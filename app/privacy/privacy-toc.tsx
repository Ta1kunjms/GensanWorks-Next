"use client";

import { useEffect, useState } from "react";

type TocSection = {
  id: string;
  label: string;
};

type PrivacyTocProps = {
  sections: TocSection[];
};

export function PrivacyToc({ sections }: PrivacyTocProps) {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? "");

  useEffect(() => {
    const sectionElements = sections
      .map((section) => document.getElementById(section.id))
      .filter((element): element is HTMLElement => Boolean(element));

    if (sectionElements.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        const topEntry = visibleEntries.at(0);
        if (topEntry) {
          setActiveId(topEntry.target.id);
        }
      },
      {
        rootMargin: "-35% 0px -55% 0px",
        threshold: [0.1, 0.25, 0.5, 0.75],
      }
    );

    sectionElements.forEach((element) => observer.observe(element));

    return () => {
      sectionElements.forEach((element) => observer.unobserve(element));
      observer.disconnect();
    };
  }, [sections]);

  return (
    <nav className="mt-3">
      <ul className="space-y-1">
        {sections.map((section) => {
          const isActive = section.id === activeId;

          return (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                aria-current={isActive ? "location" : undefined}
                className={
                  isActive
                    ? "block rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800"
                    : "block rounded-md px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                }
              >
                {section.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
