"use client";

import { useState } from "react";
import { Friend, FriendCategory } from "@/types/friend";

type FriendFormProps = {
  onAddFriend: (friend: Friend) => void;
  initial?: Friend;
  onUpdate?: (friend: Friend) => void;
  onDelete?: () => void;
  onCancel?: () => void;
};

const inputStyle: React.CSSProperties = {
  border: 0,
  borderBottom: "1px solid #E0D9CE",
  background: "transparent",
  font: "inherit",
  fontSize: 13,
  color: "#2E2A24",
  padding: "5px 0 6px",
  outline: "none",
  width: "100%",
};

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: 9.5,
  letterSpacing: "0.12em",
  textTransform: "uppercase" as const,
  color: "#9A8F82",
  display: "block",
  marginBottom: 4,
};

function FieldLabel({ children }: { children: string }) {
  return <span style={labelStyle}>{children}</span>;
}

function Field({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", ...style }}>
      {children}
    </div>
  );
}

function InputWithFocus({
  style,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      {...props}
      style={{
        ...inputStyle,
        borderBottomColor: focused ? "#A68B50" : "#E0D9CE",
        ...style,
      }}
      onFocus={(e) => {
        setFocused(true);
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        props.onBlur?.(e);
      }}
    />
  );
}

function TextareaWithFocus({
  style,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const [focused, setFocused] = useState(false);
  return (
    <textarea
      {...props}
      style={{
        ...inputStyle,
        resize: "none" as const,
        borderBottomColor: focused ? "#A68B50" : "#E0D9CE",
        ...style,
      }}
      onFocus={(e) => {
        setFocused(true);
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        props.onBlur?.(e);
      }}
    />
  );
}

function SelectWithFocus({
  style,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const [focused, setFocused] = useState(false);
  return (
    <select
      {...props}
      style={{
        ...inputStyle,
        fontFamily: "var(--font-lora)",
        appearance: "none" as const,
        WebkitAppearance: "none" as const,
        borderBottomColor: focused ? "#A68B50" : "#E0D9CE",
        ...style,
      }}
      onFocus={(e) => {
        setFocused(true);
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        props.onBlur?.(e);
      }}
    />
  );
}

function isoToDateInput(value?: string) {
  if (!value) return "";
  return value.slice(0, 10);
}

export default function FriendForm({
  onAddFriend,
  initial,
  onUpdate,
  onDelete,
  onCancel,
}: FriendFormProps) {
  const isEdit = !!initial;

  const [name, setName] = useState(initial?.name ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [category, setCategory] = useState<FriendCategory>(initial?.category ?? "close friend");
  const [livesIn, setLivesIn] = useState(initial?.livesIn ?? "");
  const [birthday, setBirthday] = useState(initial?.birthday ?? "");
  const [metAt, setMetAt] = useState(initial?.metAt ?? "");
  const [lastTexted, setLastTexted] = useState(isoToDateInput(initial?.lastTexted));
  const [lastHungOut, setLastHungOut] = useState(isoToDateInput(initial?.lastHungOut));

  // Frequency
  function daysToAmountAndUnit(days: number) {
    if (days % 30 === 0) return { amount: days / 30, unit: "months" as const };
    return { amount: days, unit: "days" as const };
  }

  const initText = daysToAmountAndUnit(initial?.textFrequencyDays ?? 14);
  const initHangout = daysToAmountAndUnit(initial?.hangoutFrequencyDays ?? 30);

  const [textAmount, setTextAmount] = useState(initText.amount);
  const [textUnit, setTextUnit] = useState<"days" | "months">(initText.unit);
  const [hangoutAmount, setHangoutAmount] = useState(initHangout.amount);
  const [hangoutUnit, setHangoutUnit] = useState<"days" | "months">(initHangout.unit);

  function buildFriend(): Friend {
    return {
      id: initial?.id ?? crypto.randomUUID(),
      name,
      notes: notes.trim() || undefined,
      category,
      livesIn: livesIn.trim() || undefined,
      birthday: birthday.trim() || undefined,
      metAt: metAt.trim() || undefined,
      color: initial?.color,
      nextTopics: initial?.nextTopics,
      bio: initial?.bio,
      lastTexted: lastTexted ? new Date(lastTexted).toISOString() : initial?.lastTexted,
      lastHungOut: lastHungOut ? new Date(lastHungOut).toISOString() : initial?.lastHungOut,
      textFrequencyDays: textUnit === "months" ? textAmount * 30 : textAmount,
      hangoutFrequencyDays: hangoutUnit === "months" ? hangoutAmount * 30 : hangoutAmount,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
      interactions: initial?.interactions ?? [],
    };
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const friend = buildFriend();
    if (isEdit && onUpdate) {
      onUpdate(friend);
    } else {
      onAddFriend(friend);
    }
  }

  const dividerLabelStyle: React.CSSProperties = {
    fontFamily: "monospace",
    fontSize: 9.5,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "#9A8F82",
    marginTop: 8,
    marginBottom: 4,
  };

  const btnPrimStyle: React.CSSProperties = {
    background: "transparent",
    color: "#A68B50",
    border: "1px solid rgba(166,139,80,0.35)",
    padding: "5px 12px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
  };

  const btnGhostStyle: React.CSSProperties = {
    background: "#F3EDE3",
    border: "1px solid #E0D9CE",
    borderRadius: 999,
    padding: "5px 12px",
    fontSize: 12,
    cursor: "pointer",
    color: "#6B6259",
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Row 1: Name + Category */}
      <div style={{ display: "flex", gap: 12 }}>
        <Field style={{ flex: 1 }}>
          <FieldLabel>Name</FieldLabel>
          <InputWithFocus
            placeholder="Their name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </Field>
        <Field style={{ width: 140 }}>
          <FieldLabel>Category</FieldLabel>
          <SelectWithFocus
            value={category}
            onChange={(e) => setCategory(e.target.value as FriendCategory)}
          >
            <option value="close friend">Close friend</option>
            <option value="family">Family</option>
            <option value="classmate">Classmate</option>
            <option value="coworker">Coworker</option>
            <option value="other">Other</option>
          </SelectWithFocus>
        </Field>
      </div>

      {/* Row 2: Notes */}
      <Field>
        <FieldLabel>A note about them</FieldLabel>
        <TextareaWithFocus
          rows={2}
          placeholder="Anything important to remember?"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </Field>

      {/* Row 3: Lives in + Birthday */}
      <div style={{ display: "flex", gap: 12 }}>
        <Field style={{ flex: 1 }}>
          <FieldLabel>Lives in</FieldLabel>
          <InputWithFocus
            placeholder="City, Country"
            value={livesIn}
            onChange={(e) => setLivesIn(e.target.value)}
          />
        </Field>
        <Field style={{ width: 120 }}>
          <FieldLabel>Birthday</FieldLabel>
          <InputWithFocus
            placeholder="Jun 12"
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
          />
        </Field>
      </div>

      {/* Row 4: How you met */}
      <Field>
        <FieldLabel>How you met</FieldLabel>
        <InputWithFocus
          placeholder="College, 2019"
          value={metAt}
          onChange={(e) => setMetAt(e.target.value)}
        />
      </Field>

      {/* Divider */}
      <div style={dividerLabelStyle}>Stay in touch</div>

      {/* Row 5: Frequency */}
      <div style={{ display: "flex", gap: 16 }}>
        <Field style={{ flex: 1 }}>
          <FieldLabel>Text every</FieldLabel>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <InputWithFocus
              type="number"
              min={1}
              value={textAmount}
              onChange={(e) => setTextAmount(Number(e.target.value))}
              style={{ width: 60 }}
            />
            <SelectWithFocus
              value={textUnit}
              onChange={(e) => setTextUnit(e.target.value as "days" | "months")}
              style={{ flex: 1 }}
            >
              <option value="days">days</option>
              <option value="months">months</option>
            </SelectWithFocus>
          </div>
        </Field>
        <Field style={{ flex: 1 }}>
          <FieldLabel>Hang out every</FieldLabel>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <InputWithFocus
              type="number"
              min={1}
              value={hangoutAmount}
              onChange={(e) => setHangoutAmount(Number(e.target.value))}
              style={{ width: 60 }}
            />
            <SelectWithFocus
              value={hangoutUnit}
              onChange={(e) => setHangoutUnit(e.target.value as "days" | "months")}
              style={{ flex: 1 }}
            >
              <option value="days">days</option>
              <option value="months">months</option>
            </SelectWithFocus>
          </div>
        </Field>
      </div>

      {/* Row 6: Dates (edit only) */}
      {isEdit && (
        <div style={{ display: "flex", gap: 12 }}>
          <Field style={{ flex: 1 }}>
            <FieldLabel>Last texted</FieldLabel>
            <InputWithFocus
              type="date"
              value={lastTexted}
              onChange={(e) => setLastTexted(e.target.value)}
            />
          </Field>
          <Field style={{ flex: 1 }}>
            <FieldLabel>Last hung out</FieldLabel>
            <InputWithFocus
              type="date"
              value={lastHungOut}
              onChange={(e) => setLastHungOut(e.target.value)}
            />
          </Field>
        </div>
      )}

      {/* Actions */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 8,
          paddingTop: 8,
          borderTop: "1px solid #E0D9CE",
        }}
      >
        {/* Danger */}
        <div>
          {isEdit && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              style={{
                background: "transparent",
                border: 0,
                color: "#C46060",
                fontSize: 12,
                cursor: "pointer",
                textDecoration: "underline",
                textUnderlineOffset: 3,
                padding: 0,
              }}
            >
              Remove friend
            </button>
          )}
        </div>

        {/* Cancel + Submit */}
        <div style={{ display: "flex", gap: 8 }}>
          {onCancel && (
            <button type="button" onClick={onCancel} style={btnGhostStyle}>
              Cancel
            </button>
          )}
          <button type="submit" style={btnPrimStyle}>
            {isEdit ? "Save changes" : "Add to my circle"}
          </button>
        </div>
      </div>
    </form>
  );
}
