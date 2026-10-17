"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

const NEAR_PX = 80;
const EDGE_PX = 12;
const COOLDOWN_MS = 160;

type Point = { x: number; y: number };
type Bounds = { left: number; top: number; right: number; bottom: number };

function readSafeInsets() {
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)";
  document.body.appendChild(probe);
  const cs = getComputedStyle(probe);
  const insets = {
    top: parseFloat(cs.paddingTop) || 0,
    right: parseFloat(cs.paddingRight) || 0,
    bottom: parseFloat(cs.paddingBottom) || 0,
    left: parseFloat(cs.paddingLeft) || 0,
  };
  probe.remove();
  return insets;
}

/** Distance from a point to the nearest edge of a rect (0 when inside). */
function distanceToRect(p: Point, r: DOMRect) {
  const dx = Math.max(r.left - p.x, 0, p.x - r.right);
  const dy = Math.max(r.top - p.y, 0, p.y - r.bottom);
  return Math.hypot(dx, dy);
}

/**
 * The famous shy "No" button. It never performs an action: any attempt to
 * hover, approach, touch, focus, click or press it just makes it hop away.
 *
 * - `container` given (preview): it hops around inside that element.
 * - otherwise (live): it hops around the visible viewport, respecting the
 *   visual viewport (on-screen keyboard, pinch zoom) and safe-area insets.
 */
export function DodgeButton({
  label,
  scale,
  onDodge,
  container,
  className = "",
  style,
}: {
  label: string;
  scale: number;
  onDodge: () => void;
  container?: RefObject<HTMLElement | null>;
  className?: string;
  style?: CSSProperties;
}) {
  const reduceMotion = useReducedMotion();
  const inlineRef = useRef<HTMLButtonElement>(null);
  const floatRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<Point | null>(null);
  const [origin, setOrigin] = useState<Point | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const posRef = useRef<Point | null>(null);
  const isFloating = pos !== null;
  const lastDodge = useRef(0);
  const insets = useRef({ top: 0, right: 0, bottom: 0, left: 0 });
  const onDodgeRef = useRef(onDodge);

  useLayoutEffect(() => {
    onDodgeRef.current = onDodge;
  });

  useEffect(() => {
    insets.current = readSafeInsets();
  }, []);

  /** Bounds in the coordinate space the floating button is positioned in. */
  const getBounds = useCallback((): Bounds => {
    if (container?.current) {
      const r = container.current.getBoundingClientRect();
      return { left: EDGE_PX, top: EDGE_PX, right: r.width - EDGE_PX, bottom: r.height - EDGE_PX };
    }
    const vv = window.visualViewport;
    const ox = vv?.offsetLeft ?? 0;
    const oy = vv?.offsetTop ?? 0;
    const w = vv?.width ?? window.innerWidth;
    const h = vv?.height ?? window.innerHeight;
    const s = insets.current;
    return { left: ox + s.left + EDGE_PX, top: oy + s.top + EDGE_PX, right: ox + w - s.right - EDGE_PX, bottom: oy + h - s.bottom - EDGE_PX };
  }, [container]);

  /** Convert a client (viewport) point into positioning space. */
  const toLocal = useCallback(
    (p: Point): Point => {
      if (container?.current) {
        const r = container.current.getBoundingClientRect();
        return { x: p.x - r.left, y: p.y - r.top };
      }
      return p;
    },
    [container],
  );

  const currentRect = () => (floatRef.current ?? inlineRef.current)?.getBoundingClientRect() ?? null;

  const dodge = useCallback(
    (pointer?: Point) => {
      const now = performance.now();
      if (now - lastDodge.current < COOLDOWN_MS) return;
      lastDodge.current = now;

      const rect = currentRect();
      if (!rect) return;
      const w = size?.w ?? rect.width;
      const h = size?.h ?? rect.height;
      if (!size) setSize({ w: rect.width, h: rect.height });

      const b = getBounds();
      const here = toLocal({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
      const avoid = pointer ? toLocal(pointer) : here;
      const maxX = Math.max(b.left, b.right - w);
      const maxY = Math.max(b.top, b.bottom - h);

      let best: Point = { x: b.left, y: b.top };
      let bestScore = -1;
      for (let i = 0; i < 28; i++) {
        const x = b.left + Math.random() * (maxX - b.left);
        const y = b.top + Math.random() * (maxY - b.top);
        const c = { x: x + w / 2, y: y + h / 2 };
        const fromPointer = Math.hypot(c.x - avoid.x, c.y - avoid.y);
        const fromHere = Math.hypot(c.x - here.x, c.y - here.y);
        const score = Math.min(fromPointer, fromHere * 1.2);
        if (score > bestScore) {
          bestScore = score;
          best = { x, y };
        }
        if (fromPointer > 170 && fromHere > 110) break;
      }

      if (!posRef.current) {
        setOrigin(toLocal({ x: rect.left, y: rect.top }));
      }
      posRef.current = best;
      setPos(best);
      onDodgeRef.current();
    },
    [getBounds, size, toLocal],
  );

  const dodgeRef = useRef(dodge);
  useLayoutEffect(() => {
    dodgeRef.current = dodge;
  });

  // Proximity: move away when the pointer or a finger gets close.
  useEffect(() => {
    const near = (p: Point) => {
      const r = currentRect();
      return r ? distanceToRect(p, r) < NEAR_PX : false;
    };
    const onMove = (e: PointerEvent) => {
      const p = { x: e.clientX, y: e.clientY };
      if (near(p)) dodgeRef.current(p);
    };
    const onTouch = (e: TouchEvent) => {
      for (const t of Array.from(e.touches)) {
        const p = { x: t.clientX, y: t.clientY };
        if (near(p)) {
          dodgeRef.current(p);
          break;
        }
      }
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onMove, { passive: true });
    window.addEventListener("touchstart", onTouch, { passive: true });
    window.addEventListener("touchmove", onTouch, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onMove);
      window.removeEventListener("touchstart", onTouch);
      window.removeEventListener("touchmove", onTouch);
    };
  }, []);

  // Non-passive touchstart on the button itself so preventDefault can stop
  // the synthetic click before it ever registers.
  useEffect(() => {
    const els = [inlineRef.current, floatRef.current].filter(Boolean) as HTMLButtonElement[];
    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0];
      dodgeRef.current(t ? { x: t.clientX, y: t.clientY } : undefined);
    };
    els.forEach((el) => el.addEventListener("touchstart", onTouchStart, { passive: false }));
    return () => els.forEach((el) => el.removeEventListener("touchstart", onTouchStart));
  }, [isFloating]);

  // Keep it on-screen when the viewport changes (rotation, keyboard opening).
  useEffect(() => {
    if (!pos) return;
    const clamp = () => {
      const p = posRef.current;
      if (!p || !size) return;
      const b = getBounds();
      const next = {
        x: Math.min(Math.max(p.x, b.left), Math.max(b.left, b.right - size.w)),
        y: Math.min(Math.max(p.y, b.top), Math.max(b.top, b.bottom - size.h)),
      };
      if (next.x !== p.x || next.y !== p.y) {
        posRef.current = next;
        setPos(next);
      }
    };
    const vv = window.visualViewport;
    window.addEventListener("resize", clamp);
    vv?.addEventListener("resize", clamp);
    vv?.addEventListener("scroll", clamp);
    return () => {
      window.removeEventListener("resize", clamp);
      vv?.removeEventListener("resize", clamp);
      vv?.removeEventListener("scroll", clamp);
    };
  }, [pos, size, getBounds]);

  const handlers = {
    onPointerEnter: (e: ReactPointerEvent) => dodge({ x: e.clientX, y: e.clientY }),
    onPointerDown: (e: ReactPointerEvent) => {
      e.preventDefault();
      dodge({ x: e.clientX, y: e.clientY });
    },
    onMouseDown: (e: ReactMouseEvent) => e.preventDefault(),
    onClick: (e: ReactMouseEvent) => {
      // Never acts. If a click somehow lands, it just hops again.
      e.preventDefault();
      e.stopPropagation();
      lastDodge.current = 0;
      dodge();
    },
    onFocus: () => dodge(),
    onKeyDown: (e: ReactKeyboardEvent) => {
      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        lastDodge.current = 0;
        dodge();
      }
    },
    onContextMenu: (e: ReactMouseEvent) => e.preventDefault(),
  };

  const common = {
    type: "button" as const,
    "aria-label": `${label} (this button is a little shy)`,
    className: `select-none touch-none ${className}`,
    ...handlers,
  };

  const transition = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 520, damping: 26, mass: 0.7 };

  const floating =
    pos && origin ? (
      <motion.button
        ref={floatRef}
        {...common}
        initial={{ x: origin.x, y: origin.y, scale }}
        animate={{ x: pos.x, y: pos.y, scale }}
        transition={transition}
        style={{
          ...style,
          position: container ? "absolute" : "fixed",
          left: 0,
          top: 0,
          width: size?.w,
          height: size?.h,
          zIndex: 50,
          transformOrigin: "center",
          WebkitTouchCallout: "none",
        }}
      >
        {label}
      </motion.button>
    ) : null;

  return (
    <>
      {pos ? (
        // Placeholder keeps the layout stable once the real button has fled.
        <span aria-hidden className={className} style={{ ...style, visibility: "hidden", width: size?.w, height: size?.h }} />
      ) : (
        <button ref={inlineRef} {...common} style={{ ...style, WebkitTouchCallout: "none" }}>
          {label}
        </button>
      )}
      {floating && (container ? (container.current ? createPortal(floating, container.current) : null) : createPortal(floating, document.body))}
    </>
  );
}
