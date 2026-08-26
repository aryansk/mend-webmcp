import React from "react";

type HeroProps = {
  eyebrow: string;
  title: string;
};

export function Hero({ eyebrow, title }: HeroProps) {
  return (
    <section className="hero">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p className="hero-copy">Repair the details that make a site easier to use.</p>
      <div className="hero-media">
        <img
          src="/images/hero.webp"
          alt=""
          className="hero-image"
          loading="eager"
        />
      </div>
    </section>
  );
}
