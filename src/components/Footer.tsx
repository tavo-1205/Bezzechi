import { useMemo } from 'react';
import type { ReactElement } from 'react';
import { GALLERY, SOCIALS } from '../data/content';
import { scrollToSection } from '../lib/scroll';
import MagneticButton from './MagneticButton';

/* ---------------------------------------------------------------------------
 * Footer de la landing: enlaces oficiales, aviso legal, atribución de datos
 * (API de MotoGP + Wikipedia) y de fotos (Wikimedia Commons, autores y
 * licencias derivados de GALLERY — sin duplicar texto a mano).
 * ------------------------------------------------------------------------ */

interface PhotoCredit {
  author: string;
  license: string;
  count: number;
}

export default function Footer(): ReactElement {
  const year = new Date().getFullYear();

  /** Autores/licencias agrupados a partir de los datos de la galería. */
  const photoCredits = useMemo<PhotoCredit[]>(() => {
    const groups = new Map<string, PhotoCredit>();
    for (const item of GALLERY) {
      const key = `${item.author}|${item.license}`;
      const found = groups.get(key);
      if (found) found.count += 1;
      else groups.set(key, { author: item.author, license: item.license, count: 1 });
    }
    return Array.from(groups.values());
  }, []);

  return (
    <footer className="relative x-park-ferme border-t border-accent/40 bg-carbon">
      <div className="container-x py-14">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="x-hud-line x-hud-line--drawn">
            <p className="font-display text-2xl text-mist md:text-3xl">
              <span className="accent-gradient">#72</span> MARCO BEZZECCHI
            </p>
            <p className="font-cond mt-2 text-sm tracking-[0.3em] text-ash uppercase">Aprilia Racing · MotoGP</p>
          </div>

          <MagneticButton
            onClick={() => scrollToSection('inicio')}
            strength={0.3}
            className="font-cond glass rounded-full px-5 py-2.5 text-sm tracking-[0.2em] text-mist uppercase transition-colors hover:border-accent/60 hover:text-accent"
          >
            <span aria-hidden="true">↑ </span>Volver al inicio
          </MagneticButton>
        </div>

        <nav aria-label="Enlaces oficiales" className="mt-10">
          <h2 className="eyebrow">Enlaces oficiales</h2>
          <ul className="mt-4 flex flex-wrap gap-3">
            {SOCIALS.map((social) => (
              <li key={social.id}>
                <a
                  href={social.href}
                  target={social.external ? '_blank' : undefined}
                  rel={social.external ? 'noopener noreferrer' : undefined}
                  className="glass group flex items-center gap-2 rounded-full px-4 py-2 text-sm text-mist transition-colors hover:border-accent/60 hover:text-accent"
                >
                  <span className="font-cond tracking-wider uppercase">{social.label}</span>
                  {social.handle ? (
                    <span className="text-xs text-ash transition-colors group-hover:text-accent-300">
                      {social.handle}
                    </span>
                  ) : null}
                  {social.external ? (
                    <>
                      <span aria-hidden="true" className="text-xs text-accent">
                        ↗
                      </span>
                      <span className="sr-only">(se abre en una pestaña nueva)</span>
                    </>
                  ) : null}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-10 grid gap-8 border-t border-line/60 pt-8 md:grid-cols-2">
          <div>
            <h2 className="eyebrow">Aviso legal</h2>
            <p className="mt-3 text-sm text-mist">
              Sitio de fans no oficial. Sin relación con MotoGP™, Dorna Sports, Aprilia Racing ni con el piloto.
            </p>
            <p className="mt-4 text-xs text-ash">
              Datos:{' '}
              <a
                href="https://www.motogp.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-mist underline decoration-accent/60 underline-offset-4 transition-colors hover:text-accent"
              >
                API pública de MotoGP (pulselive)
                <span className="sr-only"> (se abre en una pestaña nueva)</span>
              </a>
              {' · '}
              Contenido biográfico:{' '}
              <a
                href="https://en.wikipedia.org/wiki/Marco_Bezzecchi"
                target="_blank"
                rel="noopener noreferrer"
                className="text-mist underline decoration-accent/60 underline-offset-4 transition-colors hover:text-accent"
              >
                Wikipedia
                <span className="sr-only"> (se abre en una pestaña nueva)</span>
              </a>
            </p>
          </div>

          <div>
            <h2 className="eyebrow">Fotografías</h2>
            <p className="mt-3 text-xs text-ash">
              Fotografías:{' '}
              <a
                href="https://commons.wikimedia.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-mist underline decoration-accent/60 underline-offset-4 transition-colors hover:text-accent"
              >
                Wikimedia Commons
                <span className="sr-only"> (se abre en una pestaña nueva)</span>
              </a>
              , con licencias libres. Autores:
            </p>
            <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ash">
              {photoCredits.map((credit) => (
                <li key={`${credit.author}-${credit.license}`}>
                  {credit.author} · {credit.license}
                  <span className="sr-only"> ({credit.count === 1 ? '1 fotografía' : `${credit.count} fotografías`})</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="num mt-10 border-t border-line/60 pt-6 text-xs text-ash">
          © {year} · Marco Bezzecchi #72 — sitio de fans sin ánimo de lucro.
        </p>
      </div>
    </footer>
  );
}
