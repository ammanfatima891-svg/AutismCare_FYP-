import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const SLIDES = [
  {
    title: "Hey… take a breath 💙",
    desc: "Parenting is not easy. And when something feels different, it can feel overwhelming. You’re not alone in this.",
  },
  {
    title: "Autism isn’t a disease",
    desc: "It’s a different way of experiencing the world. Different doesn’t mean broken.",
  },
  {
    title: "Understanding brings clarity",
    desc: "Small steps can help you understand your child better and support their growth with confidence.",
  },
  {
    title: "We guide you, step by step",
    desc: "From simple screening to expert guidance, everything is designed to support you and your child.",
  },
  {
    title: "You’re doing better than you think 🌱",
    desc: "Let’s take the next step together.",
  },
];

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function SlideCard({ title, desc }) {
  return (
    <div className="mx-auto w-full max-w-md rounded-2xl bg-white/70 p-6 shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="mb-5 h-28 w-full rounded-2xl bg-gradient-to-br from-sky-100/70 via-emerald-50/70 to-sky-50/70" />
      <h1 className="text-balance text-2xl font-semibold tracking-tight text-slate-800 sm:text-3xl">
        {title}
      </h1>
      <p className="mt-3 text-pretty text-sm leading-relaxed text-slate-600 sm:text-base">
        {desc}
      </p>
    </div>
  );
}

function DotIndicator({ total, activeIndex, onSelect }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }).map((_, i) => {
        const isActive = i === activeIndex;
        return (
          <button
            key={i}
            type="button"
            aria-label={`Go to slide ${i + 1}`}
            aria-current={isActive ? "true" : "false"}
            onClick={() => onSelect(i)}
            className="rounded-full p-1"
          >
            <span
              className={[
                "block h-2.5 rounded-full transition-all duration-300",
                isActive ? "w-7 bg-sky-400/80" : "w-2.5 bg-slate-300/80",
              ].join(" ")}
            />
          </button>
        );
      })}
    </div>
  );
}

export default function Onboarding() {
  const navigate = useNavigate();
  const slides = useMemo(() => SLIDES, []);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(1);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const isSwiping = useRef(false);

  useEffect(() => {
    const seen = localStorage.getItem("seenOnboarding");
    if (seen === "true") {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  const goTo = (idx) => {
    const nextIdx = clamp(idx, 0, slides.length - 1);
    setDirection(nextIdx > currentSlide ? 1 : -1);
    setCurrentSlide(nextIdx);
  };

  const next = () => {
    if (currentSlide >= slides.length - 1) {
      localStorage.setItem("seenOnboarding", "true");
      navigate("/login");
      return;
    }
    setDirection(1);
    setCurrentSlide((s) => clamp(s + 1, 0, slides.length - 1));
  };

  const skip = () => {
    localStorage.setItem("seenOnboarding", "true");
    navigate("/login");
  };

  const onTouchStart = (e) => {
    const t = e.touches?.[0];
    if (!t) return;
    touchStartX.current = t.clientX;
    touchStartY.current = t.clientY;
    isSwiping.current = false;
  };

  const onTouchMove = (e) => {
    const t = e.touches?.[0];
    if (!t || touchStartX.current == null || touchStartY.current == null) return;

    const dx = t.clientX - touchStartX.current;
    const dy = t.clientY - touchStartY.current;

    if (!isSwiping.current) {
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        isSwiping.current = true;
      } else if (Math.abs(dy) > 12) {
        touchStartX.current = null;
        touchStartY.current = null;
      }
    }

    if (isSwiping.current) {
      e.preventDefault();
    }
  };

  const onTouchEnd = (e) => {
    const t = e.changedTouches?.[0];
    if (!t || touchStartX.current == null) return;

    const dx = t.clientX - touchStartX.current;
    const threshold = 45;

    touchStartX.current = null;
    touchStartY.current = null;

    if (Math.abs(dx) < threshold) return;

    if (dx < 0) {
      goTo(currentSlide + 1);
    } else {
      goTo(currentSlide - 1);
    }
  };

  const isLast = currentSlide === slides.length - 1;

  const variants = {
    enter: (dir) => ({
      opacity: 0,
      x: dir > 0 ? 24 : -24,
      filter: "blur(2px)",
    }),
    center: {
      opacity: 1,
      x: 0,
      filter: "blur(0px)",
    },
    exit: (dir) => ({
      opacity: 0,
      x: dir > 0 ? -24 : 24,
      filter: "blur(2px)",
    }),
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-emerald-50/40 to-sky-50 px-5">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col">
        <div className="flex items-center justify-end py-5">
          <button
            type="button"
            onClick={skip}
            className="rounded-2xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-white/60 hover:text-slate-700 active:bg-white/70"
          >
            Skip
          </button>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div
            className="w-full"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentSlide}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                <SlideCard title={slides[currentSlide].title} desc={slides[currentSlide].desc} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="pb-8 pt-6">
          <DotIndicator total={slides.length} activeIndex={currentSlide} onSelect={goTo} />

          <div className="mt-6 flex items-center justify-center">
            <button
              type="button"
              onClick={next}
              className="w-full max-w-md rounded-2xl bg-sky-500/80 px-5 py-3 text-base font-semibold text-white shadow-[0_10px_24px_rgba(14,165,233,0.22)] transition hover:bg-sky-500/90 active:bg-sky-500"
            >
              {isLast ? "Get Started" : "Next"}
            </button>
          </div>

          <p className="mx-auto mt-4 max-w-md text-center text-xs text-slate-500">
            You can swipe left or right to move between slides.
          </p>
        </div>
      </div>
    </div>
  );
}

