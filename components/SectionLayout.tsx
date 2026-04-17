"use client";

import { ReactNode } from "react";
import { SectionHeading } from "@/components/SectionHeading";

interface SectionLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  align?: "left" | "center" | "right";
  className?: string;
  contentClassName?: string;
  headingClassName?: string;
  size?: "default" | "compact";
  as?: "h1" | "h2" | "h3";
}

export function SectionLayout({
  children,
  title,
  subtitle,
  align = "left",
  className = "",
  contentClassName = "",
  headingClassName = "",
  size = "default",
  as = "h2",
}: SectionLayoutProps) {
  return (
    <section className={`w-full py-8 sm:py-10 ${className}`}>
      {(title || subtitle) && (
        <SectionHeading
          title={title || ""}
          subtitle={subtitle}
          align={align}
          size={size}
          as={as}
          className={`mb-6 sm:mb-8 ${headingClassName}`}
        />
      )}

      <div className={contentClassName}>{children}</div>
    </section>
  );
}