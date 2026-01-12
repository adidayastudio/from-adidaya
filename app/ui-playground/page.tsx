// src/app/ui-playground/page.tsx
"use client";

import PrimitivesPlayground from "./sections/primitives";
import HeadersPlayground from "./sections/headers";
import ListViewPlayground from "./sections/list-view";
import FiltersPlayground from "./sections/filters";
import BoardViewPlayground from "./sections/board-view";
import CalendarViewPlayground from "./sections/calendar-view";
import TimelinePlayground from "./sections/timeline-view";
import TableViewPlayground from "./sections/table-view";
import OverlayPlayground from "./sections/overlays";
import { ModalSection } from "./sections/modal"
import PopoverPlayground from "./sections/popover"

export default function UIPlaygroundPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-20 px-6 py-10 bg-bg-100 text-text-primary">

      {/* PAGE HEADER */}
      <header>
        <h1 className="text-h1 mb-1">fromAdidaya · UI Playground</h1>
        <p className="text-small text-text-muted">
          Living playground for shared UI components.
        </p>
      </header>

      {/* ------------------------------------------------ */}
      {/* PRIMITIVES */}
      {/* ------------------------------------------------ */}
      <section className="space-y-6">
        <h2 className="text-h2">Primitives</h2>
        <PrimitivesPlayground />
      </section>

      {/* ------------------------------------------------ */}
      {/* HEADERS */}
      {/* ------------------------------------------------ */}
      <section className="space-y-6">
        <h2 className="text-h2">Headers</h2>
        <HeadersPlayground />
      </section>

      {/* ------------------------------------------------ */}
      {/* LIST VIEW */}
      {/* ------------------------------------------------ */}
      <section className="space-y-6">
        <h2 className="text-h2">List View</h2>
        <ListViewPlayground />
      </section>

      {/* FILTERS */}
      <section className="space-y-6">
        <h2 className="text-h2">Filters</h2>
        <FiltersPlayground />
      </section>

      {/* BOARD VIEW */}
      <section className="space-y-6">
        <h2 className="text-h2">Board View</h2>
        <BoardViewPlayground />
      </section>

      {/* CALENDAR VIEW */}
      <section className="space-y-6">
        <h2 className="text-h2">Calendar View</h2>
        <CalendarViewPlayground />
      </section>

      {/* TIMELINE VIEW */}
      <section className="space-y-6">
        <h2 className="text-h2">Timeline View</h2>
        <TimelinePlayground />
      </section>

      {/* TABLE VIEW */}
      <section className="space-y-6">
        <h2 className="text-h2">Table View</h2>
        <TableViewPlayground />
      </section>

      {/* OVERLAYS 1 */}
      <section className="space-y-6">
        <h2 className="text-h2">Overlay #1</h2>
        <OverlayPlayground />
      </section>

      {/* MODAL */}
      <section className="space-y-6">
        <h2 className="text-h2">Modal</h2>
        <ModalSection />
      </section>

      {/* POPOVER */}
      <section className="space-y-6">
        <h2 className="text-h2">Popover</h2>
        <PopoverPlayground />
      </section>

    </div>
  );
}
