"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ImageMeta } from "./DemoWrapper"; // Adjust import path as needed

const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function getLabelBg(label: string = "Approved"): string {
  switch (label) {
    case "Approved":
      return "bg-green-500";
    case "Needs Revision":
      return "bg-orange-500";
    case "Ready for Approval":
      return "bg-purple-500";
    case "Scheduled":
      return "bg-blue-500";
    default:
      return "bg-gray-500";
  }
}

function formatLabel(label: string | undefined): string {
  if (!label) return "";
  if (label === "Ready for Approval") return "For Approval";
  if (label === "Needs Revision") return "Revision";
  return label;
}

interface ContinuousCalendarProps {
  onClick?: (day: number, month: number, year: number) => void;
  onImageDrop?: (
    day: number,
    month: number,
    year: number,
    imageId: string,
    sourceKey?: string
  ) => void;
  droppedImages?: { [date: string]: { id: string; url: string } };
  imageMetadata?: { [id: string]: ImageMeta };
  onSeeDetails?: (id: string) => void;
}

export const ContinuousCalendar: React.FC<ContinuousCalendarProps> = ({
  onClick,
  onImageDrop,
  droppedImages,
  imageMetadata,
  onSeeDetails,
}) => {
  const today = new Date();
  const dayRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [year, setYear] = useState<number>(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth());
  const monthOptions = monthNames.map((month, index) => ({
    name: month,
    value: `${index}`,
  }));

  const scrollToDay = (monthIndex: number, dayIndex: number) => {
    const targetDayIndex = dayRefs.current.findIndex(
      (ref) =>
        ref &&
        ref.getAttribute("data-month") === `${monthIndex}` &&
        ref.getAttribute("data-day") === `${dayIndex}`
    );
    const targetElement = dayRefs.current[targetDayIndex];
    if (targetDayIndex !== -1 && targetElement) {
      const container = document.querySelector(".calendar-container");
      const elementRect = targetElement.getBoundingClientRect();
      const is2xl = window.matchMedia("(min-width: 1536px)").matches;
      const offsetFactor = is2xl ? 3 : 2.5;
      if (container) {
        const containerRect = container.getBoundingClientRect();
        const offset =
          elementRect.top -
          containerRect.top -
          containerRect.height / offsetFactor +
          elementRect.height / 2;
        container.scrollTo({
          top: container.scrollTop + offset,
          behavior: "smooth",
        });
      } else {
        const offset =
          window.scrollY +
          elementRect.top -
          window.innerHeight / offsetFactor +
          elementRect.height / 2;
        window.scrollTo({
          top: offset,
          behavior: "smooth",
        });
      }
    }
  };

  const handlePrevYear = () => setYear((prev) => prev - 1);
  const handleNextYear = () => setYear((prev) => prev + 1);
  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const monthIndex = parseInt(e.target.value, 10);
    setSelectedMonth(monthIndex);
    scrollToDay(monthIndex, 1);
  };
  const handleTodayClick = () => {
    setYear(today.getFullYear());
    scrollToDay(today.getMonth(), today.getDate());
  };
  const handleDayClick = (day: number, month: number, year: number) => {
    if (!onClick) return;
    if (month < 0) {
      onClick(day, 11, year - 1);
    } else {
      onClick(day, month, year);
    }
  };

  useEffect(() => {
    setTimeout(() => {
      handleTodayClick();
    }, 100);
  }, []);

  const generateCalendar = useMemo(() => {
    const daysInYear = (): { month: number; day: number }[] => {
      const days: { month: number; day: number }[] = [];
      const startDayOfWeek = new Date(year, 0, 1).getDay();
      if (startDayOfWeek < 6) {
        for (let i = 0; i < startDayOfWeek; i++) {
          days.push({ month: -1, day: 32 - startDayOfWeek + i });
        }
      }
      for (let m = 0; m < 12; m++) {
        const daysInMonth = new Date(year, m + 1, 0).getDate();
        for (let d = 1; d <= daysInMonth; d++) {
          days.push({ month: m, day: d });
        }
      }
      const remainder = days.length % 7;
      if (remainder > 0) {
        const extra = 7 - remainder;
        for (let i = 1; i <= extra; i++) {
          days.push({ month: 0, day: i });
        }
      }
      return days;
    };

    const calendarDays = daysInYear();
    const weeks: { month: number; day: number }[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      weeks.push(calendarDays.slice(i, i + 7));
    }

    return weeks.map((week, weekIndex) => (
      <div className="flex w-full" key={`week-${weekIndex}`}>
        {week.map(({ month, day }, dayIndex) => {
          const index = weekIndex * 7 + dayIndex;
          const isNewMonth = index === 0 || calendarDays[index - 1].month !== month;
          const isToday =
            today.getMonth() === month &&
            today.getDate() === day &&
            today.getFullYear() === year;
          const dayKey = `${year}-${month}-${day}`;
          return (
            <div
              key={`${month}-${day}`}
              ref={(el) => { dayRefs.current[index] = el; }}
              data-month={month}
              data-day={day}
              onClick={() => handleDayClick(day, month, year)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const imageId = e.dataTransfer.getData("imageId");
                const sourceKey = e.dataTransfer.getData("sourceKey");
                if (onImageDrop && month >= 0) {
                  onImageDrop(day, month, year, imageId, sourceKey);
                }
              }}
              className="relative z-10 m-[-0.5px] group aspect-square w-full sm:w-1/6 md:w-1/6 lg:w-1/7 xl:w-1/8 2xl:w-1/9 grow rounded-xl border lg:rounded-2xl font-medium transition-all hover:z-20 hover:border-cyan-400 p-1"
            >
              <span
                className={`absolute left-1 top-1 size-7 flex items-center justify-center rounded-full select-none text-[0.5rem] sm:text-[0.6rem] md:text-[0.75rem] lg:text-sm ${
                  isToday ? "bg-blue-500 font-semibold text-white" : ""
                } ${month < 0 ? "text-slate-400" : "text-slate-800"}`}
              >
                {day}
              </span>
              {isNewMonth && (
                <span className="absolute bottom-0.5 left-0 w-full truncate px-1.5 text-[0.5rem] sm:text-[0.6rem] md:text-[0.75rem] lg:text-lg font-semibold text-slate-500 select-none">
                  {monthNames[month]}
                </span>
              )}
              {month >= 0 && droppedImages && droppedImages[dayKey] && (
                <>
                  <img
                    src={droppedImages[dayKey].url}
                    alt="Dropped"
                    draggable={true}
                    onDragStart={(e) => {
                      e.dataTransfer.setData("imageId", droppedImages[dayKey].id);
                      e.dataTransfer.setData("sourceKey", dayKey);
                    }}
                    className="absolute right-1 top-1 bottom-1 my-auto h-[80%] w-auto object-contain rounded-lg cursor-grab"
                  />
                  {imageMetadata && (
                    <div className="absolute left-1 top-1/2 transform -translate-y-1/2 flex flex-col items-start space-y-0.5 p-1 whitespace-pre-line select-none">
                      <div
                        className={`px-1 rounded text-[0.2rem] sm:text-[0.22rem] md:text-[0.35rem] lg:text-[0.62rem] font-semibold text-white ${getLabelBg(
                          imageMetadata[droppedImages[dayKey].id]?.label
                        )}`}
                      >
                        {formatLabel(imageMetadata[droppedImages[dayKey].id]?.label)}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSeeDetails && onSeeDetails(droppedImages[dayKey].id);
                        }}
                        className="bg-gradient-to-r from-[#047AC0] to-[#8EC9FF] text-[0.5rem] sm:text-[0.40rem] md:text-[0.55rem] lg:text-[0.68rem] text-white px-1 py-0.5 rounded cursor-pointer"
                      >
                        See Details
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    ));
  }, [year, onImageDrop, droppedImages, imageMetadata, onSeeDetails]);

  useEffect(() => {
    const calendarContainer = document.querySelector(".calendar-container");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const m = parseInt(entry.target.getAttribute("data-month")!, 10);
            setSelectedMonth(m);
          }
        });
      },
      {
        root: calendarContainer,
        rootMargin: "-75% 0px -25% 0px",
        threshold: 0,
      }
    );
    dayRefs.current.forEach((ref) => {
      if (ref && ref.getAttribute("data-day") === "15") {
        observer.observe(ref);
      }
    });
    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div
      className="calendar-container no-scrollbar overflow-auto rounded-t-2xl bg-white pb-10 text-slate-800 shadow-xl"
      style={{ maxHeight: "calc(100vh - 120px)" }}
    >
      <div className="sticky top-0 z-50 w-full rounded-t-2xl bg-white px-4 sm:px-6 md:px-8 py-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <Select
              name="month"
              value={`${selectedMonth}`}
              options={monthOptions}
              onChange={handleMonthChange}
            />
            <button
              onClick={handleTodayClick}
              type="button"
              className="rounded border border-gray-300 bg-white px-3 py-1 text-[0.6rem] sm:text-[0.75rem] md:text-xs font-medium text-gray-900 hover:bg-gray-100"
            >
              Today
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevYear}
              className="rounded-full border border-slate-300 p-1 hover:bg-slate-100"
            >
              <svg
                className="h-5 w-5 text-slate-800"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-[0.75rem] sm:text-xs md:text-sm font-semibold">{year}</h1>
            <button
              onClick={handleNextYear}
              className="rounded-full border border-slate-300 p-1 hover:bg-slate-100"
            >
              <svg
                className="h-5 w-5 text-slate-800"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[0.6rem] sm:text-[0.75rem] md:text-xs text-slate-500">
          {daysOfWeek.map((day, index) => (
            <div key={index} className="py-1 border-b border-slate-200">
              {day}
            </div>
          ))}
        </div>
      </div>
      <div className="px-4 sm:px-6 md:px-8 pt-4">{generateCalendar}</div>
    </div>
  );
};

export interface SelectProps {
  name: string;
  value: string;
  label?: string;
  options: { name: string; value: string }[];
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  className?: string;
}

export const Select = ({
  name,
  value,
  label,
  options = [],
  onChange,
  className,
}: SelectProps) => (
  <div className={`relative ${className}`}>
    {label && (
      <label
        htmlFor={name}
        className="mb-1 block font-medium text-slate-800 select-none text-[0.6rem]"
      >
        {label}
      </label>
    )}
    <select
      id={name}
      name={name}
      value={value}
      onChange={onChange}
      className="cursor-pointer rounded-lg border border-gray-300 bg-white py-1 pl-2 pr-6 text-[0.6rem] font-medium text-gray-900 hover:bg-gray-100 sm:rounded-xl"
      required
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.name}
        </option>
      ))}
    </select>
    <span className="pointer-events-none absolute inset-y-0 right-0 ml-2 flex items-center pr-1">
      <svg
        className="h-4 w-4 text-slate-600"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M10 3a.75.75 0 01.55.24l3.25 3.5a.75.75 0 11-1.1 1.02L10 4.852 7.3 7.76a.75.75 0 01-1.1-1.02l3.25-3.5A.75.75 0 0110 3zm-3.76 9.2a.75.75 0 011.06.04l2.7 2.908 2.7-2.908a.75.75 0 111.1 1.02l-3.25 3.5a.75.75 0 01-1.1 0l-3.25-3.5a.75.75 0 01.04-1.06z"
          clipRule="evenodd"
        />
      </svg>
    </span>
  </div>
);
