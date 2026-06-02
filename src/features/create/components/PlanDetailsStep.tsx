import React, { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import { ArrowLeft, MapPin, Clock, ChevronRight, ChevronLeft } from "lucide-react";
import { CreatePlanCTAButton } from "./CreatePlanCTAButton";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlanDetailsStepProps {
  newPlanTitle: string;
  setNewPlanTitle: (val: string) => void;
  newPlanLocation: string;
  setNewPlanLocation: (val: string) => void;
  newPlanTime: string;
  setNewPlanTime: (val: string) => void;
  setNewPlanIsoDateTime: (val: string) => void;
  setCreateFlowStep: (step: "BROWSE" | "DETAILS" | "RECIPIENTS" | "EXTRA" | "PREVIEW") => void;
  triggerToast: (msg: string) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAYS_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const DAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
const getFirstDay   = (y: number, m: number) => new Date(y, m, 1).getDay();

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth()    === b.getMonth()    &&
  a.getDate()     === b.getDate();

const formatDateLabel = (date: Date): string => {
  const today    = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  if (isSameDay(date, today))    return "Today";
  if (isSameDay(date, tomorrow)) return "Tomorrow";
  return date.toLocaleDateString("en-US", { day: "numeric", month: "short" });
};

const formatDateFull = (date: Date): string => {
  const today    = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  if (isSameDay(date, today))    return `Today, ${MONTHS[date.getMonth()]} ${date.getDate()}`;
  if (isSameDay(date, tomorrow)) return `Tomorrow, ${MONTHS[date.getMonth()]} ${date.getDate()}`;
  return `${DAYS_LONG[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}`;
};

const fmt12 = (h: number, m: number): string => {
  const ampm = h >= 12 ? "PM" : "AM";
  const hh   = h % 12 === 0 ? 12 : h % 12;
  const mm   = String(m).padStart(2, "0");
  return `${hh}:${mm} ${ampm}`;
};

// ─── iOS-style Drum Column ────────────────────────────────────────────────────

interface DrumColProps {
  values:   number[];
  selected: number;
  onSelect: (v: number) => void;
  format?:  (v: number) => string;
  bgColor:  string; // the card background color so fade matches exactly
}

const ITEM_H   = 44;   // px per row
const VISIBLE  = 5;    // visible rows (centre = selected)
const DRUM_H   = ITEM_H * VISIBLE;

const DrumCol = ({ values, selected, onSelect, format, bgColor }: DrumColProps) => {
  const ref   = useRef<HTMLDivElement>(null);
  const count = values.length;
  // Repeat 5× to give ample scroll room either side
  const drum  = [...values, ...values, ...values, ...values, ...values];
  const midOffset = count * 2; // start in the 3rd repetition

  const getScrollTopFor = (idx: number) => idx * ITEM_H - ITEM_H * 2;

  const [localSel, setLocalSel] = useState(selected);

  // Initialise scroll position
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const startIdx  = midOffset + values.indexOf(selected);
    el.scrollTop    = getScrollTopFor(startIdx);
  }, []); // intentionally runs once on mount

  // Sync if parent changes selection
  useEffect(() => {
    setLocalSel(selected);
  }, [selected]);

  const snapToNearest = () => {
    const el = ref.current;
    if (!el) return;
    const rawIdx    = Math.round(el.scrollTop / ITEM_H) + 2; // +2 because centre offset
    const safeMin   = midOffset;
    const safeMax   = midOffset + count - 1;
    const clamped   = Math.max(safeMin, Math.min(safeMax, rawIdx));
    const val       = values[clamped - midOffset];
    setLocalSel(val);
    onSelect(val);
    el.scrollTo({ top: getScrollTopFor(clamped), behavior: "smooth" });
  };

  const clickItem = (v: number, i: number) => {
    const el = ref.current;
    setLocalSel(v);
    onSelect(v);
    if (el) el.scrollTo({ top: getScrollTopFor(i), behavior: "smooth" });
  };

  return (
    <div className="relative flex-1" style={{ height: DRUM_H, overflow: "hidden" }}>
      {/* Selected-row highlight — two hairlines only, no fill */}
      <div
        className="absolute inset-x-0 pointer-events-none z-10"
        style={{
          top:          ITEM_H * 2,
          height:       ITEM_H,
          borderTop:    "1px solid rgba(255,94,58,0.22)",
          borderBottom: "1px solid rgba(255,94,58,0.22)",
        }}
      />

      {/* Fade mask — top: 2 rows, bottom: 2 rows */}
      <div
        className="absolute inset-x-0 top-0 pointer-events-none z-20"
        style={{
          height:     ITEM_H * 2,
          background: `linear-gradient(to bottom, ${bgColor} 0%, transparent 100%)`,
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 pointer-events-none z-20"
        style={{
          height:     ITEM_H * 2,
          background: `linear-gradient(to top, ${bgColor} 0%, transparent 100%)`,
        }}
      />

      {/* Scrollable drum */}
      <div
        ref={ref}
        onScroll={snapToNearest}
        className="absolute inset-0 overflow-y-scroll"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <style>{`.drum-hide-scroll::-webkit-scrollbar { display: none; }`}</style>
        {drum.map((v, i) => {
          const isActive = v === localSel;
          // distance from centre
          const dist     = Math.abs(i - (Math.round((ref.current?.scrollTop ?? 0) / ITEM_H) + 2));
          return (
            <div
              key={i}
              onClick={() => clickItem(v, i)}
              className="flex items-center justify-center cursor-pointer select-none"
              style={{
                height:     ITEM_H,
                fontSize:   isActive ? 17 : 13,
                fontWeight: isActive ? 700 : 400,
                color:      isActive ? "#ff5e3a" : "#3f3f46",
                letterSpacing: isActive ? "0.01em" : "0",
                textShadow: isActive ? "0 0 16px rgba(255,94,58,0.55)" : "none",
                transition: "color 0.15s, font-size 0.15s, text-shadow 0.15s",
              }}
            >
              {format ? format(v) : String(v).padStart(2, "0")}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Date/Time Modal ──────────────────────────────────────────────────────────

interface DateTimeModalProps {
  onClose:   () => void;
  onConfirm: (date: Date, hour: number, minute: number) => void;
}

// Design tokens — centralised so drum fades exactly match card background
const MODAL_BG   = "#000000";
const CARD_BG    = "#0a0a0c";
const BORDER_CLR = "rgba(255,255,255,0.06)";

const DateTimeModal = ({ onClose, onConfirm }: DateTimeModalProps) => {
  const today = new Date();
  const [calYear,  setCalYear]  = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selDate,  setSelDate]  = useState<Date>(today);

  const hours   = Array.from({ length: 24 }, (_, i) => i);
  const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
  const [selHour,   setSelHour]   = useState(20);
  const [selMinute, setSelMinute] = useState(30);

  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay    = getFirstDay(calYear, calMonth);

  const prevMonth = () => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); };
  const nextMonth = () => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); };

  const portalTarget = document.getElementById("app_tab_content_wrapper") || document.body;

  const content = (
    <div
      className="absolute inset-0 z-[200] flex flex-col justify-end"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(10px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* ── Sheet ── */}
      <div
        className="w-full flex flex-col"
        style={{
          background:   MODAL_BG,
          borderRadius: "28px 28px 0 0",
          border:       `1px solid ${BORDER_CLR}`,
          borderBottom: "none",
          maxHeight:    "92%",
          boxShadow:    "0 -24px 80px rgba(0,0,0,0.9)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-0">
          <div style={{ width: 36, height: 4, borderRadius: 99, background: "#2a2a2d" }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-3 pb-4">
          <div>
            <p style={{ fontSize: 9, letterSpacing: "0.12em", color: "#555560", fontFamily: "var(--font-mono)" }} className="uppercase mb-0.5">
              SCHEDULE
            </p>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#f4f4f5", fontFamily: "var(--font-display)", lineHeight: 1.15 }}>
              Set Timing
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: "50%",
              background: "#141416",
              border: `1px solid ${BORDER_CLR}`,
              color: "#555560",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, cursor: "pointer", transition: "color 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.color = "#e4e4e7")}
            onMouseLeave={e => (e.currentTarget.style.color = "#555560")}
          >
            ✕
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div
          className="overflow-y-auto"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none", paddingBottom: 24 }}
        >
          <style>{`.modal-body::-webkit-scrollbar { display: none; }`}</style>

          {/* ── Calendar ── */}
          <div className="px-4 mb-3">
            <div
              style={{
                background:   CARD_BG,
                border:       `1px solid ${BORDER_CLR}`,
                borderRadius: 20,
                padding:      "14px 14px 10px",
              }}
            >
              {/* Month nav */}
              <div className="flex items-center justify-between mb-3">
                <button
                  type="button" onClick={prevMonth}
                  style={{
                    width: 30, height: 30, borderRadius: "50%",
                    background: "#141416", border: `1px solid ${BORDER_CLR}`,
                    color: "#888890", display: "flex", alignItems: "center",
                    justifyContent: "center", cursor: "pointer",
                  }}
                >
                  <ChevronLeft style={{ width: 14, height: 14 }} />
                </button>

                <span style={{ fontSize: 14, fontWeight: 600, color: "#e4e4e7", fontFamily: "var(--font-display)" }}>
                  {MONTHS[calMonth]} {calYear}
                </span>

                <button
                  type="button" onClick={nextMonth}
                  style={{
                    width: 30, height: 30, borderRadius: "50%",
                    background: "#141416", border: `1px solid ${BORDER_CLR}`,
                    color: "#888890", display: "flex", alignItems: "center",
                    justifyContent: "center", cursor: "pointer",
                  }}
                >
                  <ChevronRight style={{ width: 14, height: 14 }} />
                </button>
              </div>

              {/* DOW headers */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", marginBottom: 4 }}>
                {DAYS_SHORT.map(d => (
                  <div key={d} style={{ textAlign: "center", fontSize: 9, color: "#3f3f46",
                    fontFamily: "var(--font-mono)", textTransform: "uppercase",
                    letterSpacing: "0.1em", padding: "4px 0" }}>
                    {d}
                  </div>
                ))}
              </div>

              {/* Day grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", rowGap: 2 }}>
                {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                  const cell       = new Date(calYear, calMonth, day);
                  const isSel      = isSameDay(cell, selDate);
                  const isTod      = isSameDay(cell, today);
                  const isPast     = cell < new Date(today.getFullYear(), today.getMonth(), today.getDate());
                  return (
                    <button
                      key={day}
                      type="button"
                      disabled={isPast}
                      onClick={() => setSelDate(new Date(calYear, calMonth, day))}
                      style={{
                        width: 32, height: 32,
                        borderRadius: "50%",
                        margin: "0 auto",
                        display:        "flex",
                        alignItems:     "center",
                        justifyContent: "center",
                        fontSize: 11,
                        fontWeight:  isSel ? 700 : 400,
                        cursor:      isPast ? "not-allowed" : "pointer",
                        border:      isTod && !isSel ? "1px solid rgba(255,94,58,0.40)" : "1px solid transparent",
                        background:  isSel ? "#ff5e3a" : "transparent",
                        color:       isSel ? "#ffffff"
                                    : isPast ? "#2a2a2d"
                                    : isTod  ? "#ff8b66"
                                    : "#9090a0",
                        boxShadow:   isSel ? "0 0 14px rgba(255,94,58,0.45)" : "none",
                        transition:  "all 0.12s",
                      }}
                      onMouseEnter={e => { if (!isSel && !isPast) e.currentTarget.style.background = "#1a1a1e"; }}
                      onMouseLeave={e => { if (!isSel && !isPast) e.currentTarget.style.background = "transparent"; }}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Time picker ── */}
          <div className="px-4 mb-3">
            <div
              style={{
                background:   CARD_BG,
                border:       `1px solid ${BORDER_CLR}`,
                borderRadius: 20,
                padding:      "14px 14px 10px",
              }}
            >
              <p style={{ fontSize: 9, letterSpacing: "0.12em", color: "#555560", fontFamily: "var(--font-mono)",
                textTransform: "uppercase", marginBottom: 8 }}>
                TIME
              </p>

              {/* Drum columns */}
              <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
                <DrumCol
                  values={hours}
                  selected={selHour}
                  onSelect={setSelHour}
                  bgColor={CARD_BG}
                  format={v => {
                    const ampm = v >= 12 ? "PM" : "AM";
                    const h    = v % 12 === 0 ? 12 : v % 12;
                    return `${h} ${ampm}`;
                  }}
                />
                {/* Colon separator */}
                <div style={{ width: 20, textAlign: "center", color: "#3f3f46",
                  fontSize: 18, fontWeight: 700, flexShrink: 0, userSelect: "none" }}>
                  :
                </div>
                <DrumCol
                  values={minutes}
                  selected={selMinute}
                  onSelect={setSelMinute}
                  bgColor={CARD_BG}
                  format={v => String(v).padStart(2, "0")}
                />
              </div>
            </div>
          </div>

          {/* ── Selected summary card ── */}
          <div className="px-4 mb-4">
            <div
              style={{
                background:   "rgba(255,94,58,0.05)",
                border:       "1px solid rgba(255,94,58,0.18)",
                borderRadius: 16,
                padding:      "11px 16px",
                display:      "flex",
                alignItems:   "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <p style={{ fontSize: 9, color: "#ff8b66", fontFamily: "var(--font-mono)",
                  textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 3 }}>
                  Selected
                </p>
                <p style={{ fontSize: 12, fontWeight: 600, color: "#f4f4f5",
                  fontFamily: "var(--font-display)", lineHeight: 1.3 }}>
                  {formatDateFull(selDate)}&nbsp;•&nbsp;{fmt12(selHour, selMinute)}
                </p>
              </div>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: "rgba(255,94,58,0.15)",
                border: "1px solid rgba(255,94,58,0.30)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Clock style={{ width: 13, height: 13, color: "#ff8b66" }} />
              </div>
            </div>
          </div>

          {/* ── NEXT CTA ── */}
          <div className="px-4">
            <button
              type="button"
              onClick={() => onConfirm(selDate, selHour, selMinute)}
              style={{
                width:          "100%",
                padding:        "14px 0",
                borderRadius:   999,
                background:     "linear-gradient(135deg, #ff5e3a 0%, #ff8b66 100%)",
                color:          "#ffffff",
                fontSize:       11,
                fontWeight:     800,
                fontFamily:     "var(--font-display)",
                letterSpacing:  "0.14em",
                textTransform:  "uppercase",
                border:         "none",
                cursor:         "pointer",
                boxShadow:      "0 8px 32px rgba(255,94,58,0.35)",
                transition:     "opacity 0.15s, transform 0.1s",
              }}
              onMouseEnter={e  => { e.currentTarget.style.opacity  = "0.9";  e.currentTarget.style.transform = "scale(0.99)"; }}
              onMouseLeave={e  => { e.currentTarget.style.opacity  = "1";    e.currentTarget.style.transform = "scale(1)"; }}
              onMouseDown={e   => { e.currentTarget.style.transform = "scale(0.97)"; }}
              onMouseUp={e     => { e.currentTarget.style.transform = "scale(1)"; }}
            >
              NEXT
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                width:         "100%",
                marginTop:     12,
                background:    "none",
                border:        "none",
                cursor:        "pointer",
                textAlign:     "center",
                fontSize:      10,
                color:         "#444450",
                fontFamily:    "var(--font-sans)",
                letterSpacing: "0.06em",
                transition:    "color 0.15s",
              }}
              onMouseEnter={e => (e.currentTarget.style.color = "#888890")}
              onMouseLeave={e => (e.currentTarget.style.color = "#444450")}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(content, portalTarget);
};

// ─── Main PlanDetailsStep ─────────────────────────────────────────────────────

export const PlanDetailsStep = ({
  newPlanTitle,
  setNewPlanTitle,
  newPlanLocation,
  setNewPlanLocation,
  newPlanTime,
  setNewPlanTime,
  setNewPlanIsoDateTime,
  setCreateFlowStep,
  triggerToast,
}: PlanDetailsStepProps) => {
  const [showTimeModal, setShowTimeModal] = useState(false);

  const handleConfirm = (date: Date, hour: number, minute: number) => {
    const final = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute, 0, 0);
    const iso   = final.toISOString();
    const label = `${formatDateLabel(date)} • ${fmt12(hour, minute)}`;

    console.log("[DateTimePicker] date:", date.toDateString());
    console.log("[DateTimePicker] time:", hour, "h", minute, "m");
    console.log("[DateTimePicker] ISO:", iso);

    setNewPlanTime(label);
    setNewPlanIsoDateTime(iso);
    setShowTimeModal(false);
  };

  return (
    <div className="space-y-5 animate-fade-in text-left">
      {/* Back */}
      <button
        type="button"
        onClick={() => setCreateFlowStep("BROWSE")}
        className="text-xs font-mono font-medium text-zinc-500 hover:text-zinc-200 flex items-center gap-1.5 cursor-pointer py-1"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to suggestions</span>
      </button>

      <div className="space-y-1">
        <h3 className="text-sm font-display font-semibold text-zinc-200">Set Core Coordinates</h3>
        <p className="text-[11px] text-zinc-500 font-sans">Enter name, spot &amp; timing. Select suggestions to bypass typing.</p>
      </div>

      <div className="bg-zinc-905 border border-zinc-900 rounded-2xl p-4 space-y-4">

        {/* 1. Activity Name */}
        <div className="space-y-1.5">
          <label className="text-[9px] font-mono uppercase tracking-widest block font-extrabold text-brand-peach">
            1. Activity Name
          </label>
          <input
            type="text"
            placeholder="e.g., Turf Football Session, Rooftop Sundowner"
            value={newPlanTitle}
            onChange={e => setNewPlanTitle(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-650 focus:outline-none focus:border-brand-peach transition-all"
            required
          />
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {["⚽ Turf Football", "🍿 Cinema Crew", "☕ Late Brew Coffee", "🍜 Ramen Dinner", "🍹 Drinks Lounge", "🎮 FIFA League"].map(p => (
              <button
                key={p} type="button" onClick={() => setNewPlanTitle(p)}
                className={`shrink-0 px-2.5 py-1 rounded-full text-[9px] font-semibold font-mono border transition-all ${
                  newPlanTitle === p
                    ? "bg-brand-peach/15 text-brand-peach border-brand-peach/40"
                    : "bg-zinc-950/50 text-zinc-500 border-zinc-900 hover:text-zinc-300"
                }`}
              >{p}</button>
            ))}
          </div>
        </div>

        {/* 2. Venue */}
        <div className="space-y-1.5">
          <label className="text-[9px] font-mono uppercase tracking-widest block font-extrabold text-brand-peach">
            2. Target Venue / Spot
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <MapPin className="w-3.5 h-3.5 text-[#ff8b66]" />
            </span>
            <input
              type="text"
              placeholder="e.g., Starbucks Corner, City Football Turf"
              value={newPlanLocation}
              onChange={e => setNewPlanLocation(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-850 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-650 focus:outline-none focus:border-brand-peach transition-all"
              required
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {["📍 Starbucks HQ", "📍 Elite Turf Area", "📍 Phoenix Sky Deck", "📍 Downtown Pizzeria", "📍 Brew House Cafe", "📍 Local Park Loft"].map(loc => {
              const clean = loc.replace("📍 ", "");
              return (
                <button key={loc} type="button" onClick={() => setNewPlanLocation(clean)}
                  className={`shrink-0 px-2.5 py-1 rounded-full text-[9px] font-semibold font-mono border transition-all ${
                    newPlanLocation === clean
                      ? "bg-brand-peach/15 text-brand-peach border-brand-peach/40"
                      : "bg-zinc-950/50 text-zinc-500 border-zinc-900 hover:text-zinc-300"
                  }`}
                >{loc}</button>
              );
            })}
          </div>
        </div>

        {/* 3. Timing */}
        <div className="space-y-1.5">
          <label className="text-[9px] font-mono uppercase tracking-widest block font-extrabold text-brand-peach">
            3. Spontaneous Timing
          </label>
          <button
            type="button"
            onClick={() => setShowTimeModal(true)}
            className="w-full bg-zinc-950 border border-zinc-850 hover:border-zinc-700 rounded-xl pl-3.5 pr-3.5 py-3 text-xs text-left flex items-center justify-between transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <Clock className="w-3.5 h-3.5 text-[#ff8b66]" />
              <span className={newPlanTime ? "text-zinc-100 font-semibold" : "text-zinc-500 group-hover:text-zinc-400"}>
                {newPlanTime || "ADD TIME"}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-650" />
          </button>
        </div>
      </div>

      <CreatePlanCTAButton
        text="SET THE DETAILS"
        onPress={() => {
          if (!newPlanTitle.trim())    { triggerToast("Please enter or pick an Activity Name first."); return; }
          if (!newPlanLocation.trim()) { triggerToast("Please specify a target venue/spot first."); return; }
          if (!newPlanTime.trim())     { triggerToast("Please select spontaneous timings."); return; }
          setCreateFlowStep("RECIPIENTS");
        }}
      />

      {/* Premium modal — portaled into #app_tab_content_wrapper */}
      {showTimeModal && (
        <DateTimeModal
          onClose={() => setShowTimeModal(false)}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  );
};
