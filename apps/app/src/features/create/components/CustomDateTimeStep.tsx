import React, { useState, useRef, useEffect } from "react";
import { ArrowLeft, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { CreatePlanCTAButton } from "./active/CreatePlanCTAButton";

interface CustomDateTimeStepProps {
  newPlanTime: string;
  setNewPlanTime: (val: string) => void;
  setNewPlanIsoDateTime: (val: string) => void;
  setCreateFlowStep: (step: any) => void;
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
  bgColor:  string;
}

const ITEM_H   = 40;   // slightly more compact height for inline layout
const VISIBLE  = 5;
const DRUM_H   = ITEM_H * VISIBLE;

const DrumCol = ({ values, selected, onSelect, format, bgColor }: DrumColProps) => {
  const ref   = useRef<HTMLDivElement>(null);
  const count = values.length;
  const drum  = [...values, ...values, ...values, ...values, ...values];
  const midOffset = count * 2;

  const getScrollTopFor = (idx: number) => idx * ITEM_H - ITEM_H * 2;
  const [localSel, setLocalSel] = useState(selected);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const startIdx  = midOffset + values.indexOf(selected);
    el.scrollTop    = getScrollTopFor(startIdx);
  }, []);

  useEffect(() => {
    setLocalSel(selected);
  }, [selected]);

  const snapToNearest = () => {
    const el = ref.current;
    if (!el) return;
    const rawIdx    = Math.round(el.scrollTop / ITEM_H) + 2;
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
      {/* Hairline highlight */}
      <div
        className="absolute inset-x-0 pointer-events-none z-10"
        style={{
          top:          ITEM_H * 2,
          height:       ITEM_H,
          borderTop:    "1px solid rgba(255,94,58,0.22)",
          borderBottom: "1px solid rgba(255,94,58,0.22)",
        }}
      />

      {/* Fade masks */}
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

      {/* Drum */}
      <div
        ref={ref}
        onScroll={snapToNearest}
        className="absolute inset-0 overflow-y-scroll"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {drum.map((v, i) => {
          const isActive = v === localSel;
          return (
            <div
              key={i}
              onClick={() => clickItem(v, i)}
              className="flex items-center justify-center cursor-pointer select-none"
              style={{
                height:     ITEM_H,
                fontSize:   isActive ? 16 : 13,
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

// ─── Main Component ───────────────────────────────────────────────────────────
const CARD_BG = "#0a0a0c";
const BORDER_CLR = "rgba(255,255,255,0.06)";

export const CustomDateTimeStep = ({
  newPlanTime,
  setNewPlanTime,
  setNewPlanIsoDateTime,
  setCreateFlowStep,
}: CustomDateTimeStepProps) => {
  const today = new Date();
  const [calYear,  setCalYear]  = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selDate,  setSelDate]  = useState<Date>(today);

  const hours   = Array.from({ length: 24 }, (_, i) => i);
  const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
  const [selHour,   setSelHour]   = useState(20); // 8 PM default
  const [selMinute, setSelMinute] = useState(30); // 30 mins default

  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay    = getFirstDay(calYear, calMonth);

  const prevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else {
      setCalMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else {
      setCalMonth((m) => m + 1);
    }
  };

  const handleConfirm = () => {
    const final = new Date(selDate.getFullYear(), selDate.getMonth(), selDate.getDate(), selHour, selMinute, 0, 0);
    const iso   = final.toISOString();
    const label = `${formatDateLabel(selDate)} • ${fmt12(selHour, selMinute)}`;

    setNewPlanTime(label);
    setNewPlanIsoDateTime(iso);
    setCreateFlowStep("WHO");
  };

  return (
    <div className="space-y-5 animate-fade-in text-left flex flex-col justify-between min-h-[520px]">
      <div className="space-y-4">
        {/* Back Button */}
        <button
          type="button"
          onClick={() => setCreateFlowStep("LOCATION")}
          className="text-xs font-mono font-medium text-zinc-550 hover:text-zinc-200 flex items-center gap-1.5 cursor-pointer py-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to location</span>
        </button>

        {/* Header */}
        <div className="space-y-1">
          <h2 className="text-2xl font-display font-black text-zinc-100 tracking-tight leading-tight">
            When are we meeting?
          </h2>
          <p className="text-xs text-zinc-550 font-sans">
            Schedule a date and time for the plan.
          </p>
        </div>

        {/* ── Calendar Card ── */}
        <div
          style={{
            background:   CARD_BG,
            border:       `1px solid ${BORDER_CLR}`,
            borderRadius: 20,
            padding:      "12px 12px 8px",
          }}
        >
          {/* Month nav */}
          <div className="flex items-center justify-between mb-2 px-1">
            <button
              type="button"
              onClick={prevMonth}
              className="w-7 h-7 rounded-full bg-zinc-950/80 border border-zinc-900 flex items-center justify-center text-zinc-400 hover:text-zinc-100 cursor-pointer"
            >
              <ChevronLeft style={{ width: 14, height: 14 }} />
            </button>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#e4e4e7", fontFamily: "var(--font-display)" }}>
              {MONTHS[calMonth]} {calYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="w-7 h-7 rounded-full bg-zinc-950/80 border border-zinc-900 flex items-center justify-center text-zinc-400 hover:text-zinc-100 cursor-pointer"
            >
              <ChevronRight style={{ width: 14, height: 14 }} />
            </button>
          </div>

          {/* DOW headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", marginBottom: 3 }}>
            {DAYS_SHORT.map(d => (
              <div key={d} style={{ textAlign: "center", fontSize: 8, color: "#3f3f46",
                fontFamily: "var(--font-mono)", textTransform: "uppercase",
                letterSpacing: "0.1em", padding: "2px 0" }}>
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", rowGap: 1 }}>
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
                    width: 28, height: 28,
                    borderRadius: "50%",
                    margin: "0 auto",
                    display:        "flex",
                    alignItems:     "center",
                    justifyContent: "center",
                    fontSize: 10,
                    fontWeight:  isSel ? 700 : 400,
                    cursor:      isPast ? "not-allowed" : "pointer",
                    border:      isTod && !isSel ? "1px solid rgba(255,94,58,0.40)" : "1px solid transparent",
                    background:  isSel ? "#ff5e3a" : "transparent",
                    color:       isSel ? "#ffffff"
                                : isPast ? "#1f1f22"
                                : isTod  ? "#ff8b66"
                                : "#9090a0",
                    boxShadow:   isSel ? "0 0 10px rgba(255,94,58,0.40)" : "none",
                    transition:  "all 0.12s",
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Time Picker Card ── */}
        <div
          style={{
            background:   CARD_BG,
            border:       `1px solid ${BORDER_CLR}`,
            borderRadius: 20,
            padding:      "12px 14px 8px",
          }}
        >
          <p style={{ fontSize: 8, letterSpacing: "0.12em", color: "#555560", fontFamily: "var(--font-mono)",
            textTransform: "uppercase", marginBottom: 4 }}>
            TIME
          </p>

          <div className="flex items-center gap-0">
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
            <div style={{ width: 16, textAlign: "center", color: "#3f3f46",
              fontSize: 16, fontWeight: 700, flexShrink: 0, userSelect: "none" }}>
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

        {/* ── Selected Summary Card ── */}
        <div
          style={{
            background:   "rgba(255,94,58,0.05)",
            border:       "1px solid rgba(255,94,58,0.18)",
            borderRadius: 16,
            padding:      "10px 14px",
            display:      "flex",
            alignItems:   "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <p style={{ fontSize: 8, color: "#ff8b66", fontFamily: "var(--font-mono)",
              textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 2 }}>
              Selected Timing
            </p>
            <p style={{ fontSize: 11, fontWeight: 650, color: "#f4f4f5",
              fontFamily: "var(--font-display)", lineHeight: 1.2 }}>
              {formatDateFull(selDate)}&nbsp;•&nbsp;{fmt12(selHour, selMinute)}
            </p>
          </div>
          <div style={{
            width: 24, height: 24, borderRadius: "50%",
            background: "rgba(255,94,58,0.15)",
            border: "1px solid rgba(255,94,58,0.30)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Clock style={{ width: 11, height: 11, color: "#ff8b66" }} />
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="pt-4">
        <CreatePlanCTAButton
          text="SET THE TIME"
          onPress={handleConfirm}
        />
      </div>
    </div>
  );
};
