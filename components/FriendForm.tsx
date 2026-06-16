"use client";

import React, { useRef, useState } from "react";
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
  fontFamily: "var(--sans)",
  fontSize: 13,
  color: "#2E2A24",
  padding: "5px 0 6px",
  outline: "none",
  width: "100%",
};

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--sans)",
  fontSize: 10,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  color: "#9A8F82",
  fontWeight: 400,
  display: "block",
  marginBottom: 4,
};

function FieldLabel({ children, required }: { children: string; required?: boolean }) {
  return (
    <span style={labelStyle}>
      {children}
      {required && <span style={{ color: "#C46060", marginLeft: 2 }}>*</span>}
    </span>
  );
}

function Field({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", ...style }}>
      {children}
    </div>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <span style={{ color: "#C46060", fontSize: 11, marginTop: 3, fontFamily: "var(--sans)" }}>{msg}</span>;
}

const InputWithFocus = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function InputWithFocus({ style, onFocus, onBlur, ...props }, ref) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      ref={ref}
      {...props}
      style={{ ...inputStyle, borderBottomColor: focused ? "#A68B50" : "#E0D9CE", ...style }}
      onFocus={(e) => { setFocused(true); onFocus?.(e); }}
      onBlur={(e) => { setFocused(false); onBlur?.(e); }}
    />
  );
});
InputWithFocus.displayName = "InputWithFocus";

const SelectWithFocus = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function SelectWithFocus({ style, onFocus, onBlur, ...props }, ref) {
  const [focused, setFocused] = useState(false);
  return (
    <select
      ref={ref}
      {...props}
      style={{
        ...inputStyle,
        fontFamily: "var(--sans)",
        appearance: "none" as const,
        WebkitAppearance: "none" as const,
        borderBottomColor: focused ? "#A68B50" : "#E0D9CE",
        ...style,
      }}
      onFocus={(e) => { setFocused(true); onFocus?.(e); }}
      onBlur={(e) => { setFocused(false); onBlur?.(e); }}
    />
  );
});
SelectWithFocus.displayName = "SelectWithFocus";

function TextareaWithFocus({
  style,
  onFocus,
  onBlur,
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
      onFocus={(e) => { setFocused(true); onFocus?.(e); }}
      onBlur={(e) => { setFocused(false); onBlur?.(e); }}
    />
  );
}

function isoToDateInput(value?: string) {
  if (!value) return "";
  return value.slice(0, 10);
}

type FormErrors = { name?: string; category?: string; textFrequency?: string };

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
  const [category, setCategory] = useState<FriendCategory | "">(initial?.category ?? "");
  const [photoUrl, setPhotoUrl] = useState(initial?.photoUrl ?? "");
  const [sizeWarning, setSizeWarning] = useState(false);
  const [livesIn, setLivesIn] = useState(initial?.livesIn ?? "");
  const [birthday, setBirthday] = useState(initial?.birthday ?? "");
  const [metAt, setMetAt] = useState(initial?.metAt ?? "");
  const [lastTexted, setLastTexted] = useState(isoToDateInput(initial?.lastTexted));
  const [lastHungOut, setLastHungOut] = useState(isoToDateInput(initial?.lastHungOut));
  const [errors, setErrors] = useState<FormErrors>({});

  const nameRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLSelectElement>(null);
  const textAmountRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function clearError(field: keyof FormErrors) {
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }

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

  const initials = name.trim()
    ? name.trim().split(" ").map((p) => p[0]).slice(0, 2).join("")
    : "?";
  const avatarColor = initial?.color ?? "#7A5A3F";

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSizeWarning(file.size > 2 * 1024 * 1024);
    const reader = new FileReader();
    reader.onload = () => setPhotoUrl(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function removePhoto() {
    setPhotoUrl("");
    setSizeWarning(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function buildFriend(): Friend {
    return {
      id: initial?.id ?? crypto.randomUUID(),
      name: name.trim(),
      notes: notes.trim() || undefined,
      category: category as FriendCategory,
      livesIn: livesIn.trim() || undefined,
      birthday: birthday.trim() || undefined,
      metAt: metAt.trim() || undefined,
      color: initial?.color,
      photoUrl: photoUrl || undefined,
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

  function validate(): boolean {
    const next: FormErrors = {};
    if (!name.trim()) next.name = "This field is required";
    if (!category) next.category = "This field is required";
    if (!textAmount || textAmount <= 0) next.textFrequency = "This field is required";
    setErrors(next);
    if (next.name) { nameRef.current?.focus(); return false; }
    if (next.category) { categoryRef.current?.focus(); return false; }
    if (next.textFrequency) { textAmountRef.current?.focus(); return false; }
    return true;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    const friend = buildFriend();
    if (isEdit && onUpdate) {
      onUpdate(friend);
    } else {
      onAddFriend(friend);
    }
  }

  const dividerLabelStyle: React.CSSProperties = {
    fontFamily: "var(--sans)",
    fontSize: 10,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#9A8F82",
    fontWeight: 400,
    marginTop: 8,
    marginBottom: 4,
  };

  return (
    <>
      {/* ── Form body (scrollable) ── */}
      <form id="friend-form" onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: 12 }}>

        {/* ── Row 0: Avatar + Name/Category inline ── */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
          {/* Left: avatar circle + photo button */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <div style={{
              width: 64, height: 64, borderRadius: 999,
              background: photoUrl ? "transparent" : avatarColor,
              overflow: "hidden", display: "grid", placeItems: "center",
              boxShadow: "0 1px 0 rgba(50,30,10,0.12), inset 0 -2px 0 rgba(0,0,0,0.08)",
            }}>
              {photoUrl ? (
                <img src={photoUrl} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ color: "#FFFBF1", fontFamily: "var(--serif)", fontSize: 22, fontWeight: 400, userSelect: "none" }}>
                  {initials}
                </span>
              )}
            </div>

            {photoUrl ? (
              <button
                type="button"
                onClick={removePhoto}
                style={{ background: "transparent", border: 0, color: "#9A8F82", fontSize: 11, fontFamily: "var(--sans)", cursor: "pointer", padding: 0 }}
              >
                Remove
              </button>
            ) : (
              <label style={{ cursor: "pointer" }}>
                <span style={{ color: "#9A8F82", fontSize: 11, fontFamily: "var(--sans)", cursor: "pointer" }}>
                  Add photo
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handlePhotoChange}
                />
              </label>
            )}

            {sizeWarning && (
              <p style={{ color: "#D4A855", fontSize: 11, fontFamily: "var(--sans)", margin: 0, textAlign: "center", maxWidth: 80, lineHeight: 1.5 }}>
                Large image
              </p>
            )}
          </div>

          {/* Right: Name + Category stacked */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
            <Field>
              <FieldLabel required>Name</FieldLabel>
              <InputWithFocus
                ref={nameRef}
                placeholder="Their name"
                value={name}
                onChange={(e) => { setName(e.target.value); clearError("name"); }}
              />
              <FieldError msg={errors.name} />
            </Field>
            <Field>
              <FieldLabel required>Category</FieldLabel>
              <SelectWithFocus
                ref={categoryRef}
                value={category}
                onChange={(e) => { setCategory(e.target.value as FriendCategory | ""); clearError("category"); }}
              >
                {!isEdit && <option value="">Select…</option>}
                <option value="close friend">Close friend</option>
                <option value="family">Family</option>
                <option value="classmate">Classmate</option>
                <option value="coworker">Coworker</option>
                <option value="other">Other</option>
              </SelectWithFocus>
              <FieldError msg={errors.category} />
            </Field>
          </div>
        </div>

      {/* ── Row 2: Notes ── */}
      <Field>
        <FieldLabel>A note about them</FieldLabel>
        <TextareaWithFocus
          rows={2}
          placeholder="Anything important to remember?"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </Field>

      {/* ── Row 3: Lives in + Birthday ── */}
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

      {/* ── Row 4: How you met ── */}
      <Field>
        <FieldLabel>How you met</FieldLabel>
        <InputWithFocus
          placeholder="College, 2019"
          value={metAt}
          onChange={(e) => setMetAt(e.target.value)}
        />
      </Field>

      {/* ── Divider ── */}
      <div style={dividerLabelStyle}>Stay in touch</div>

      {/* ── Row 5: Frequency ── */}
      <div style={{ display: "flex", gap: 16 }}>
        <Field style={{ flex: 1 }}>
          <FieldLabel required>Talk every</FieldLabel>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <InputWithFocus
              ref={textAmountRef}
              type="number"
              min={1}
              value={textAmount}
              onChange={(e) => { setTextAmount(Number(e.target.value)); clearError("textFrequency"); }}
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
          <FieldError msg={errors.textFrequency} />
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

      {/* ── Row 6: Dates (edit only) ── */}
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

      </form>

      {/* ── Sticky footer ── */}
      <div className="modal-footer">
        <div>
          {isEdit && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              style={{ background: "transparent", border: 0, color: "#C46060", fontSize: 12, fontFamily: "var(--sans)", cursor: "pointer", padding: 0, textDecoration: "underline", textUnderlineOffset: 3 }}
            >
              Remove friend
            </button>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {onCancel && (
            <button type="button" onClick={onCancel} className="modal-footer-cancel">Cancel</button>
          )}
          <button type="submit" form="friend-form" className="modal-footer-save">
            {isEdit ? "Save changes" : "Add to my circle"}
          </button>
        </div>
      </div>
    </>
  );
}
