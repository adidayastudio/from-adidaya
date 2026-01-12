"use client";

import React, { useState } from "react";
import clsx from "clsx";

import {
  Button,
  Input,
  Select,
  Checkbox,
  Radio,
  Switch,
  Chip,
  SearchBar,
} from "@/shared/ui/primitives";

// -----------------------------------------------------
// REUSABLE SECTION WRAPPER
// -----------------------------------------------------
function Section({
  title,
  children,
  padded = true,
}: {
  title: string;
  children: React.ReactNode;
  padded?: boolean;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-h3">{title}</h2>

      <div
        className={clsx(
          "rounded-lg border border-border-default bg-bg-surface",
          padded && "p-6"
        )}
      >
        {children}
      </div>
    </section>
  );
}

// -----------------------------------------------------
// MAIN PAGE
// -----------------------------------------------------
export default function UIPlaygroundPage() {
  const [searchValue, setSearchValue] = useState("");
  const [selectValue, setSelectValue] = useState("option1");
  const [checked, setChecked] = useState(true);
  const [radioValue, setRadioValue] = useState("a");
  const [switchOn, setSwitchOn] = useState(true);
  const [chipSelected, setChipSelected] = useState("all");

  const selectOptions = [
    { label: "Option 1", value: "option1" },
    { label: "Option 2", value: "option2" },
    { label: "Option 3", value: "option3" },
  ];

  return (
    <div className="min-h-screen bg-bg-100 text-text-primary px-10 py-12 space-y-16">

      {/* PAGE HEADER */}
      <header>
        <h1 className="text-h1 mb-1">fromAdidaya · UI Playground</h1>
        <p className="text-small text-text-muted">
          Testing page for shared styles & components.
        </p>
      </header>

      {/* -----------------------------------------------------
          SURFACE TOKENS
         ----------------------------------------------------- */}
      <Section title="Surfaces & Text Tokens">
        <div className="grid gap-4 md:grid-cols-4 text-small">
          {[
            { name: "bg-0", class: "bg-bg-0" },
            { name: "bg-100", class: "bg-bg-100" },
            { name: "bg-surface", class: "bg-bg-surface" },
            { name: "bg-raised", class: "bg-bg-raised shadow-card" },
          ].map((t) => (
            <div
              key={t.name}
              className={clsx(
                "rounded-lg border border-border-light p-4",
                t.class
              )}
            >
              <div className="font-medium mb-1">{t.name}</div>
              <div className="text-text-secondary">Surface token</div>
            </div>
          ))}
        </div>
      </Section>

      {/* -----------------------------------------------------
          BUTTONS
         ----------------------------------------------------- */}
      <Section title="Buttons">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="text">Text</Button>
            <Button variant="danger">Danger</Button>
            <Button loading>Loading</Button>
            <Button disabled>Disabled</Button>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <Button variant="icon" iconOnly={<span>🔍</span>} />
            <Button icon={<span>➕</span>}>With icon</Button>
            <Button size="sm">Small</Button>
            <Button size="lg">Large</Button>
          </div>
        </div>
      </Section>

      {/* -----------------------------------------------------
          INPUTS
         ----------------------------------------------------- */}
      <Section title="Inputs">
        <div className="grid md:grid-cols-2 gap-6">
          <Input label="Default input" placeholder="Type something..." />

          <Input
            label="With helper text"
            placeholder="Email address"
            helperText="We’ll never share your email."
          />

          <Input
            label="Filled variant"
            variant="filled"
            placeholder="Filled input"
          />

          <Input
            label="With error"
            placeholder="Wrong format"
            error="This value is invalid."
          />
        </div>
      </Section>

      {/* -----------------------------------------------------
          SELECT
         ----------------------------------------------------- */}
      <Section title="Select">
        <div className="grid md:grid-cols-2 gap-6">
          <Select
            label="Default select"
            options={selectOptions}
            value={selectValue}
            onChange={(e: any) => setSelectValue(e.target.value)}
          />

          <Select
            label="Filled select"
            variant="filled"
            options={selectOptions}
          />
        </div>
      </Section>

      {/* -----------------------------------------------------
          SEARCH
         ----------------------------------------------------- */}
      <Section title="Search Bar">
        <div className="space-y-4">
          <SearchBar
            placeholder="Search projects, docs, people..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />

          <SearchBar
            variant="filled"
            placeholder="Search with error"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            error={
              searchValue.length > 0 && searchValue.length < 3
                ? "Please type at least 3 characters."
                : undefined
            }
          />
        </div>
      </Section>

      {/* -----------------------------------------------------
          CONTROLS
         ----------------------------------------------------- */}
      <Section title="Controls">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Checkbox */}
          <div className="space-y-3">
            <div className="text-small text-text-muted font-medium">
              Checkbox
            </div>
            <Checkbox
              checked={checked}
              label="Receive updates"
              onChange={(e) => setChecked(e.target.checked)}
            />
            <Checkbox label="Static / unchecked" />
          </div>

          {/* Radio */}
          <div className="space-y-3">
            <div className="text-small text-text-muted font-medium">Radio</div>
            <Radio
              name="demo-radio"
              checked={radioValue === "a"}
              label="Option A"
              onChange={() => setRadioValue("a")}
            />
            <Radio
              name="demo-radio"
              checked={radioValue === "b"}
              label="Option B"
              onChange={() => setRadioValue("b")}
            />
          </div>

          {/* Switch */}
          <div className="space-y-3">
            <div className="text-small text-text-muted font-medium">Switch</div>
            <Switch
              checked={switchOn}
              onClick={() => setSwitchOn((v) => !v)}
              label={switchOn ? "Notifications enabled" : "Notifications off"}
            />
          </div>
        </div>
      </Section>

      {/* -----------------------------------------------------
          CHIPS
         ----------------------------------------------------- */}
      <Section title="Chips">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Chip label="Default" />
            <Chip label="Outline" variant="outline" />
            <Chip label="Selected" variant="selected" />
          </div>

          {/* Filter Chips */}
          <div className="space-y-2">
            <div className="text-small text-text-muted font-medium">
              Filter chips (controlled)
            </div>

            <div className="flex flex-wrap gap-2">
              {["all", "active", "archived"].map((key) => (
                <Chip
                  key={key}
                  label={key[0].toUpperCase() + key.slice(1)}
                  variant={chipSelected === key ? "selected" : "default"}
                  onClick={() => setChipSelected(key)}
                />
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* FOOTER */}
      <footer className="text-small text-text-muted pt-4">
        UI Playground · Powered by fromAdidaya System Tokens.
      </footer>
    </div>
  );
}
