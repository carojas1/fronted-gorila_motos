/* ─────────────────────────────────────────────
   GMotors — Custom GSAP hooks
   ───────────────────────────────────────────── */

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/** Animación de entrada en cascada para la página */
export function usePageReveal(deps: unknown[] = []) {
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('.reveal-up').forEach((el, i) => {
        gsap.to(el, {
          y: 0, opacity: 1,
          duration: 0.55,
          delay: i * 0.07,
          ease: 'power2.out',
        });
      });
    });
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/** Parallax suave de imágenes al hacer scroll */
export function useParallaxImages(selector = '.parallax-img', speed = 0.12) {
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(selector).forEach((img) => {
        gsap.fromTo(
          img,
          { scale: 1 },
          {
            scale: 1 + speed * 2,
            ease: 'none',
            scrollTrigger: {
              trigger: img.parentElement ?? img,
              start: 'top bottom',
              end:   'bottom top',
              scrub: 1.8,
            },
          }
        );
      });
    });
    return () => ctx.revert();
  }, [selector, speed]);
}

/** Animación de entrada GSAP para login/auth */
export function useAuthEntrance() {
  const leftRef  = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      if (leftRef.current) {
        tl.fromTo(
          leftRef.current,
          { x: -60, opacity: 0 },
          { x: 0,   opacity: 1, duration: 0.8 }
        );
      }

      if (rightRef.current) {
        const items = Array.from(rightRef.current.querySelectorAll('.auth-item'));
        if (items.length) {
          tl.fromTo(
            items,
            { y: 22, opacity: 0 },
            { y: 0,  opacity: 1, duration: 0.5, stagger: 0.08 },
            '-=0.4'
          );
        }
      }
    });

    return () => ctx.revert();
  }, []);

  return { leftRef, rightRef };
}

/** Contador animado de un número */
export function useCountUp(target: number, duration = 1.2) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const obj = { val: 0 };

    const ctx = gsap.context(() => {
      gsap.to(obj, {
        val: target,
        duration,
        ease: 'power2.out',
        onUpdate: () => {
          el.textContent = Math.round(obj.val).toString();
        },
        scrollTrigger: {
          trigger: el,
          start: 'top 90%',
          once: true,
        },
      });
    });

    return () => ctx.revert();
  }, [target, duration]);

  return ref;
}

/**
 * Tilt 3D al mover el ratón sobre un contenedor.
 * Devuelve `sceneRef` (aplica perspective) y `tiltRef` (rota en X/Y).
 * Incluye animación idle (flotación sutil) cuando no hay movimiento.
 */
export function useTilt3D(opts?: { max?: number; idle?: boolean }) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const tiltRef  = useRef<HTMLDivElement>(null);
  const max  = opts?.max  ?? 14;
  const idle = opts?.idle ?? true;

  useEffect(() => {
    const scene = sceneRef.current;
    const tilt  = tiltRef.current;
    if (!scene || !tilt) return;

    const ctx = gsap.context(() => {
      let idleTween: gsap.core.Tween | null = null;

      const startIdle = () => {
        if (!idle) return;
        idleTween = gsap.to(tilt, {
          y: -8,
          rotationX: 2,
          rotationY: -2,
          duration: 3.5,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
        });
      };

      const stopIdle = () => { idleTween?.kill(); idleTween = null; };

      const onMove = (e: MouseEvent) => {
        stopIdle();
        const r = scene.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width  - 0.5;  // [-0.5, 0.5]
        const y = (e.clientY - r.top)  / r.height - 0.5;
        gsap.to(tilt, {
          rotationY:  x *  max,
          rotationX: -y * (max * 0.7),
          y: y * 14,
          x: x * 14,
          scale: 1.02,
          duration: 0.55,
          ease: 'power3.out',
          overwrite: 'auto',
          transformPerspective: 1500,
        });
      };

      const onLeave = () => {
        gsap.to(tilt, {
          rotationX: 0, rotationY: 0, x: 0, y: 0, scale: 1,
          duration: 0.9, ease: 'power3.out',
          onComplete: () => startIdle(),
        });
      };

      scene.addEventListener('mousemove', onMove);
      scene.addEventListener('mouseleave', onLeave);
      startIdle();

      return () => {
        scene.removeEventListener('mousemove', onMove);
        scene.removeEventListener('mouseleave', onLeave);
        stopIdle();
      };
    });

    return () => ctx.revert();
  }, [max, idle]);

  return { sceneRef, tiltRef };
}

/**
 * Animación de entrada en cascada para un contenedor con children .card-enter
 * Uso: const ref = useCardEntrance(); <div ref={ref}>...</div>
 */
export function useCardEntrance(selector = '.card-enter', deps: unknown[] = []) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const ctx = gsap.context(() => {
      const els = gsap.utils.toArray<HTMLElement>(selector);
      if (!els.length) return;
      gsap.fromTo(
        els,
        { y: 36, opacity: 0, scale: 0.97 },
        {
          y: 0, opacity: 1, scale: 1,
          stagger: { amount: 0.45, ease: 'power1.inOut' },
          duration: 0.65,
          ease: 'power3.out',
          clearProps: 'transform',
        },
      );
    }, ref);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

/**
 * Animación tipo timeline para entrada de toda la página:
 * header → cards → sections
 */
export function usePageEntrance() {
  const pageRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const ctx = gsap.context(() => {
      const headers  = gsap.utils.toArray<HTMLElement>('.header-enter');
      const cards    = gsap.utils.toArray<HTMLElement>('.card-enter');
      const sections = gsap.utils.toArray<HTMLElement>('.section-enter');
      const rows     = gsap.utils.toArray<HTMLElement>('.row-enter');
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      if (headers.length)  tl.fromTo(headers,  { y: -18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55, stagger: 0.05 });
      if (cards.length)    tl.fromTo(cards,    { y: 36, opacity: 0, scale: 0.97 }, { y: 0, opacity: 1, scale: 1, stagger: 0.07, duration: 0.6, clearProps: 'transform' }, '-=0.3');
      if (sections.length) tl.fromTo(sections, { y: 24, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.08, duration: 0.55 }, '-=0.35');
      if (rows.length)     tl.fromTo(rows,     { x: -12, opacity: 0 }, { x: 0, opacity: 1, stagger: 0.04, duration: 0.4 }, '-=0.3');
    }, pageRef);
    return () => ctx.revert();
  }, []);
  return pageRef;
}

/** Parallax de mouse (movimiento suave del fondo) */
export function useMouseParallax(strength = 18) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const move = (e: MouseEvent) => {
      const { innerWidth: W, innerHeight: H } = window;
      const x = ((e.clientX / W) - 0.5) * strength;
      const y = ((e.clientY / H) - 0.5) * strength;
      gsap.to(el, { x, y, duration: 0.9, ease: 'power2.out', overwrite: true });
    };

    window.addEventListener('mousemove', move);
    return () => {
      window.removeEventListener('mousemove', move);
      gsap.killTweensOf(el);
    };
  }, [strength]);

  return ref;
}
