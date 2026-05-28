"use client";

import { useState, useEffect } from "react";
import { Friend, FriendCategory, Interaction, InteractionType } from "@/types/friend";
import { formatLastInteraction, getStatus } from "@/lib/date";
import FriendForm from "@/components/FriendForm";

type FriendCardProps = {
  friend: Friend;
  onUpdateFriend: (friend: Friend) => void;
  onDeleteFriend: (friendId: string) => void;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function daysToAmountAndUnit(days: number) {
  if (days % 30 === 0) return { amount: days / 30, unit: "months" as const };
  return { amount: days, unit: "days" as const };
}

function formatFrequency(days: number) {
  if (days % 30 === 0) {
    const months = days / 30;
    return `${months} month${months > 1 ? "s" : ""}`;
  }
  return `${days} day${days > 1 ? "s" : ""}`;
}

function getDaysAgo(date?: string) {
  if (!date) return Infinity;
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}

function getUrgency(friend: Friend) {
  return Math.max(
    getDaysAgo(friend.lastTexted) - friend.textFrequencyDays,
    getDaysAgo(friend.lastHungOut) - friend.hangoutFrequencyDays
  );
}

function getHealthScore(friend: Friend) {
  const urgency = getUrgency(friend);
  if (urgency === Infinity) return 0;
  return Math.max(Math.min(100 - Math.max(urgency, 0) * 8, 100), 0);
}

const AVATAR_PALETTE = [
  "#7A5A3F",
  "#5E6E5A",
  "#A06A4A",
  "#604838",
  "#7C5840",
  "#4A5E7A",
  "#7A4A5E",
  "#5A5E7A",
];

function friendColor(f: Friend): string {
  if (f.color) return f.color;
  const h = f.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

function moodStyle(mood: string): React.CSSProperties {
  switch (mood) {
    case "warm":
      return { background: "#EAF2EC", color: "#3D7A58", borderColor: "rgba(61,122,88,0.3)" };
    case "deep":
      return { background: "#F0EAE0", color: "#7A6038", borderColor: "rgba(122,96,56,0.3)" };
    case "fun":
      return { background: "#EAF2EC", color: "#3D7A58", borderColor: "rgba(61,122,88,0.3)" };
    case "awkward":
      return { background: "#FCF0F0", color: "#8B3D3D", borderColor: "rgba(139,61,61,0.3)" };
    default:
      return { background: "#F3EDE3", color: "#6B6259", borderColor: "#E0D9CE" };
  }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return (
    <div
      style={{
        fontFamily: "var(--font-lora)",
        fontSize: 17,
        fontWeight: 500,
        letterSpacing: "-0.005em",
        color: "#2E2A24",
        marginBottom: 12,
        display: "inline-flex",
        alignItems: "center",
      }}
    >
      {children}
      <span style={{ color: "#2E2A24" }}>:</span>
    </div>
  );
}

function Rule() {
  return (
    <hr style={{ height: 1, border: "none", background: "#E0D9CE", margin: "20px 0" }} />
  );
}

function RhythmRow({
  label,
  cadenceDays,
  lastDays,
  overdue,
}: {
  label: string;
  cadenceDays: number;
  lastDays: number;
  overdue: boolean;
}) {
  const ratio = lastDays === Infinity ? 1 : Math.min(lastDays / cadenceDays, 1);
  const pct = ratio * 100;
  const fillColor = overdue ? "#C46060" : ratio > 0.85 ? "#D4A855" : "#6BAF85";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontWeight: 500, color: "#2E2A24", fontSize: 12 }}>{label}</span>
        <span style={{ color: "#9A8F82", fontSize: 11 }}>
          {lastDays === Infinity ? "never" : lastDays === 0 ? "today" : `${lastDays}d ago`}
          {overdue && (
            <span style={{ color: "#C46060", marginLeft: 6, fontSize: 10 }}>
              {lastDays - cadenceDays}d overdue
            </span>
          )}
        </span>
      </div>
      <div
        style={{
          position: "relative",
          height: 4,
          background: "rgba(224,217,206,0.7)",
          borderRadius: 999,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: "0 auto 0 0",
            width: pct + "%",
            background: fillColor,
            borderRadius: 999,
            transition: "width 0.35s ease",
          }}
        />
      </div>
    </div>
  );
}

// ─── Modal container ─────────────────────────────────────────────────────────

function ModalBackdrop({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(46,42,36,0.4)",
        backdropFilter: "blur(2px)",
        zIndex: 100,
        display: "grid",
        placeItems: "center",
        animation: "scrim-in 0.15s ease-out",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "min(480px, calc(100vw - 32px))",
          maxHeight: "calc(100vh - 48px)",
          background: "#F3EDE3",
          border: "1px solid #E0D9CE",
          borderRadius: 6,
          boxShadow:
            "0 18px 48px -16px rgba(50,30,10,0.35), 0 2px 6px rgba(50,30,10,0.08)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "modal-in 0.18s cubic-bezier(.34,1.4,.6,1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function ModalHeader({
  title,
  subtitle,
  onClose,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
}) {
  return (
    <header
      style={{
        padding: "14px 16px 10px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1px solid #E8E1D6",
        flexShrink: 0,
      }}
    >
      <div>
        <h2
          style={{
            margin: 0,
            fontFamily: "var(--font-lora)",
            fontSize: 19,
            fontWeight: 500,
            color: "#2E2A24",
          }}
        >
          {title}
        </h2>
        {subtitle && (
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "#9A8F82" }}>{subtitle}</p>
        )}
      </div>
      <button
        onClick={onClose}
        style={{
          background: "transparent",
          border: "1px solid transparent",
          width: 24,
          height: 24,
          borderRadius: 999,
          cursor: "pointer",
          display: "grid",
          placeItems: "center",
          color: "#6B6259",
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
    </header>
  );
}

const MOODS = ["warm", "deep", "fun", "awkward"] as const;
type MoodTag = (typeof MOODS)[number];

const underlineInputStyle: React.CSSProperties = {
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

const modalLabelStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: 9.5,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "#9A8F82",
  display: "block",
  marginBottom: 4,
};

// ─── Main component ──────────────────────────────────────────────────────────

export default function FriendCard({ friend, onUpdateFriend, onDeleteFriend }: FriendCardProps) {
  const initialText = daysToAmountAndUnit(friend.textFrequencyDays);
  const initialHangout = daysToAmountAndUnit(friend.hangoutFrequencyDays);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [logType, setLogType] = useState<InteractionType | null>(null);
  const [logDate, setLogDate] = useState(new Date().toISOString().slice(0, 10));
  const [logNotes, setLogNotes] = useState("");
  const [logLocation, setLogLocation] = useState("");
  const [editingInteractionId, setEditingInteractionId] = useState<string | null>(null);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showTopicInput, setShowTopicInput] = useState(false);
  const [newTopicText, setNewTopicText] = useState("");
  const [logMood, setLogMood] = useState<MoodTag | "">("");
  const [logTopics, setLogTopics] = useState<string[]>([]);
  const [aiModalLoading, setAiModalLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  // Keep local state for edit form (FriendForm handles it)
  const [, setTextAmount] = useState(initialText.amount);
  const [, setTextUnit] = useState<"days" | "months">(initialText.unit);
  const [, setHangoutAmount] = useState(initialHangout.amount);
  const [, setHangoutUnit] = useState<"days" | "months">(initialHangout.unit);

  const interactions = friend.interactions ?? [];
  const healthScore = getHealthScore(friend);

  const textLastDays = getDaysAgo(friend.lastTexted);
  const hangoutLastDays = getDaysAgo(friend.lastHungOut);
  const textOverdue = getStatus(friend.lastTexted, friend.textFrequencyDays) === "overdue";
  const hangoutOverdue = getStatus(friend.lastHungOut, friend.hangoutFrequencyDays) === "overdue";

  const color = friendColor(friend);

  // Status chip
  const statusKey = healthScore >= 75 ? "healthy" : healthScore >= 45 ? "attention" : "overdue";
  const statusChipStyle: React.CSSProperties =
    statusKey === "healthy"
      ? { color: "#6BAF85", borderColor: "rgba(107,175,133,0.3)" }
      : statusKey === "attention"
        ? { color: "#D4A855", borderColor: "rgba(212,168,85,0.35)" }
        : { color: "#C46060", borderColor: "rgba(196,96,96,0.35)" };
  const statusText =
    statusKey === "healthy" ? "healthy" : statusKey === "attention" ? "needs attention" : "overdue";

  // Fetch AI topic suggestions on mount (component remounts per friend via key prop)
  useEffect(() => {
    const interactionNotes = interactions
      .filter((i) => i.notes)
      .map((i) => i.notes!)
      .slice(0, 5);
    if (interactionNotes.length === 0) return;
    setSuggestionsLoading(true);
    fetch("/api/ai/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: friend.name, notes: interactionNotes }),
    })
      .then((r) => r.json())
      .then((data: { suggestions: string[] }) => {
        const existing = new Set((friend.nextTopics ?? []).map((t) => t.toLowerCase()));
        setAiSuggestions((data.suggestions ?? []).filter((s) => !existing.has(s.toLowerCase())));
      })
      .catch(() => {})
      .finally(() => setSuggestionsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced AI mood + topics when typing interaction notes
  useEffect(() => {
    if (!logType || logNotes.trim().length < 15) return;
    const timer = setTimeout(() => {
      setAiModalLoading(true);
      Promise.all([
        fetch("/api/ai/mood", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note: logNotes }),
        }).then((r) => r.json() as Promise<{ mood: MoodTag | null }>),
        fetch("/api/ai/topics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note: logNotes }),
        }).then((r) => r.json() as Promise<{ topics: string[] }>),
      ])
        .then(([moodData, topicsData]) => {
          if (moodData.mood && !logMood) setLogMood(moodData.mood);
          if (topicsData.topics?.length && logTopics.length === 0) setLogTopics(topicsData.topics);
        })
        .catch(() => {})
        .finally(() => setAiModalLoading(false));
    }, 800);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logNotes]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleSaveEdit(updated: Friend) {
    onUpdateFriend(updated);
    setShowEditModal(false);
  }

  function openLogModal() {
    setShowLogModal(true);
    setLogType(null);
    setLogNotes("");
    setLogLocation("");
    setLogDate(new Date().toISOString().slice(0, 10));
    setEditingInteractionId(null);
    setLogMood("");
    setLogTopics([]);
  }

  function closeLogModal() {
    setShowLogModal(false);
    setLogType(null);
    setLogNotes("");
    setLogLocation("");
    setLogDate(new Date().toISOString().slice(0, 10));
    setEditingInteractionId(null);
    setLogMood("");
    setLogTopics([]);
  }

  function handleLogInteraction() {
    if (!logType) return;
    const selectedDate = new Date(logDate).toISOString();

    if (editingInteractionId) {
      const updated = interactions.map((i) =>
        i.id === editingInteractionId
          ? {
              ...i,
              type: logType,
              date: selectedDate,
              notes: logNotes.trim() || undefined,
              location: logType === "hangout" ? logLocation.trim() || undefined : undefined,
              mood: logMood || undefined,
              topics: logTopics.length > 0 ? logTopics : undefined,
            }
          : i
      );
      const latestText = updated
        .filter((i) => i.type === "text")
        .sort((a, b) => b.date.localeCompare(a.date))[0]?.date;
      const latestHangout = updated
        .filter((i) => i.type === "hangout")
        .sort((a, b) => b.date.localeCompare(a.date))[0]?.date;
      onUpdateFriend({
        ...friend,
        lastTexted: latestText ?? friend.lastTexted,
        lastHungOut: latestHangout ?? friend.lastHungOut,
        interactions: updated,
      });
      closeLogModal();
      return;
    }

    const newInteraction: Interaction = {
      id: crypto.randomUUID(),
      type: logType,
      date: selectedDate,
      notes: logNotes.trim() || undefined,
      location: logType === "hangout" ? logLocation.trim() || undefined : undefined,
      mood: logMood || undefined,
      topics: logTopics.length > 0 ? logTopics : undefined,
    };

    onUpdateFriend({
      ...friend,
      lastTexted: logType === "text" ? selectedDate : friend.lastTexted,
      lastHungOut: logType === "hangout" ? selectedDate : friend.lastHungOut,
      interactions: [newInteraction, ...interactions],
    });
    closeLogModal();
  }

  function handleEditInteraction(interaction: Interaction) {
    setShowLogModal(true);
    setLogType(interaction.type);
    setLogDate(interaction.date.slice(0, 10));
    setLogNotes(interaction.notes ?? "");
    setLogLocation(interaction.location ?? "");
    setEditingInteractionId(interaction.id);
    setLogMood((interaction.mood as MoodTag) ?? "");
    setLogTopics(interaction.topics ?? []);
  }

  function handleDeleteInteraction(interactionId: string) {
    onUpdateFriend({
      ...friend,
      interactions: interactions.filter((i) => i.id !== interactionId),
    });
  }

  function handleAddTopic() {
    const trimmed = newTopicText.trim();
    if (!trimmed) return;
    onUpdateFriend({
      ...friend,
      nextTopics: [...(friend.nextTopics ?? []), trimmed],
    });
    setNewTopicText("");
    setShowTopicInput(false);
  }

  function handleRemoveTopic(topic: string) {
    onUpdateFriend({
      ...friend,
      nextTopics: (friend.nextTopics ?? []).filter((t) => t !== topic),
    });
  }

  // Suppress unused-variable warnings for state setters we keep for potential use
  void setTextAmount;
  void setTextUnit;
  void setHangoutAmount;
  void setHangoutUnit;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      <div style={{ padding: "28px 36px 48px" }}>
        {/* Header */}
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 18, alignItems: "flex-start", marginBottom: 16 }}>
          {/* Avatar */}
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 999,
              background: color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-lora)",
              fontSize: 22,
              color: "#FFFBF1",
              transform: "rotate(-2deg)",
              flexShrink: 0,
              boxShadow:
                "0 2px 0 rgba(50,30,10,0.14), inset 0 -3px 0 rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.3)",
            }}
          >
            {friend.name[0]}
          </div>

          {/* Name + status */}
          <div>
            <h2
              style={{
                fontFamily: "var(--font-lora)",
                fontSize: 28,
                color: "#2E2A24",
                letterSpacing: "-0.015em",
                margin: 0,
                lineHeight: 1.1,
              }}
            >
              {friend.name}
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontFamily: "monospace",
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  padding: "3px 8px",
                  borderRadius: 999,
                  border: "1px solid",
                  ...statusChipStyle,
                }}
              >
                {statusText}
              </span>
            </div>

          </div>
        </div>

        <Rule />

        {/* Rhythm section */}
        <SectionLabel>Rhythm</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <RhythmRow
            label="Texting"
            cadenceDays={friend.textFrequencyDays}
            lastDays={textLastDays}
            overdue={textOverdue}
          />
          <RhythmRow
            label="Hanging out"
            cadenceDays={friend.hangoutFrequencyDays}
            lastDays={hangoutLastDays}
            overdue={hangoutOverdue}
          />
        </div>

        {/* Action button */}
        <div style={{ marginTop: 16 }}>
          <button
            onClick={openLogModal}
            style={{
              border: "1px solid rgba(166,139,80,0.35)",
              color: "#A68B50",
              background: "transparent",
              borderRadius: 999,
              padding: "5px 14px",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Log interaction
          </button>
        </div>

        <Rule />

        {/* Two-column: About + Ask about */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: 32 }}>
          {/* About */}
          <div>
            <SectionLabel>About</SectionLabel>
            <dl style={{ margin: 0 }}>
              {[
                { dt: "Birthday", dd: friend.birthday },
                { dt: "Lives in", dd: friend.livesIn },
                { dt: "Met", dd: friend.metAt },
                { dt: "Category", dd: friend.category },
              ].map(({ dt, dd }) => (
                <div
                  key={dt}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "90px 1fr",
                    gap: 10,
                    padding: "7px 0",
                    borderBottom: "1px dashed #E0D9CE",
                  }}
                >
                  <dt
                    style={{
                      fontFamily: "monospace",
                      fontSize: 9.5,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "#9A8F82",
                      margin: 0,
                    }}
                  >
                    {dt}
                  </dt>
                  <dd style={{ fontSize: 12.5, color: dd ? "#2E2A24" : "#C4BAB0", margin: 0, fontStyle: dd ? "normal" : "italic" }}>
                    {dd ?? "-"}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Ask about next time */}
          <div>
            <SectionLabel>Ask about next time</SectionLabel>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {(friend.nextTopics ?? []).map((topic) => (
                <li
                  key={topic}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "18px 1fr auto",
                    gap: 5,
                    padding: "7px 0",
                    borderBottom: "1px dashed #E0D9CE",
                    alignItems: "baseline",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-lora)",
                      fontSize: 14,
                      color: "#A68B50",
                    }}
                  >
                    ○
                  </span>
                  <span style={{ fontSize: 12.5, color: "#2E2A24" }}>{topic}</span>
                  <button
                    onClick={() => handleRemoveTopic(topic)}
                    style={{
                      background: "transparent",
                      border: 0,
                      color: "#B0A89E",
                      cursor: "pointer",
                      fontSize: 12,
                      padding: "0 0 0 4px",
                    }}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>

            {/* AI suggestions */}
            {(suggestionsLoading || aiSuggestions.length > 0) && (
              <div style={{ marginTop: 4 }}>
                {suggestionsLoading ? (
                  <p style={{ fontSize: 11, color: "#B0A89E", fontStyle: "italic", margin: "6px 0 0" }}>
                    Thinking of topics...
                  </p>
                ) : (
                  aiSuggestions.map((s) => (
                    <div
                      key={s}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "18px 1fr auto",
                        gap: 5,
                        padding: "7px 0",
                        borderBottom: "1px dashed #E0D9CE",
                        alignItems: "baseline",
                      }}
                    >
                      <span style={{ fontFamily: "var(--font-lora)", fontSize: 14, color: "#D9C9A8" }}>○</span>
                      <span style={{ fontSize: 12.5, color: "#9A8F82", fontStyle: "italic" }}>{s.endsWith("?") ? s : `${s}?`}</span>
                      <button
                        onClick={() => {
                          const withQ = s.endsWith("?") ? s : `${s}?`;
                          onUpdateFriend({ ...friend, nextTopics: [...(friend.nextTopics ?? []), withQ] });
                          setAiSuggestions(aiSuggestions.filter((x) => x !== s));
                        }}
                        style={{
                          background: "transparent",
                          border: 0,
                          color: "#A68B50",
                          cursor: "pointer",
                          fontSize: 11,
                          padding: "0 0 0 4px",
                        }}
                      >
                        + add
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {showTopicInput ? (
              <div style={{ display: "flex", gap: 6, marginTop: 8, alignItems: "center" }}>
                <input
                  autoFocus
                  value={newTopicText}
                  onChange={(e) => setNewTopicText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTopic();
                    }
                    if (e.key === "Escape") {
                      setShowTopicInput(false);
                      setNewTopicText("");
                    }
                  }}
                  placeholder="Something to ask…"
                  style={{
                    flex: 1,
                    border: 0,
                    borderBottom: "1px solid #A68B50",
                    background: "transparent",
                    fontSize: 12.5,
                    color: "#2E2A24",
                    padding: "3px 0",
                    outline: "none",
                  }}
                />
                <button
                  onClick={handleAddTopic}
                  style={{
                    background: "transparent",
                    border: 0,
                    color: "#A68B50",
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                >
                  Add
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowTopicInput(true)}
                style={{
                  background: "transparent",
                  border: 0,
                  cursor: "pointer",
                  fontSize: 12,
                  color: "#9A8F82",
                  fontStyle: "italic",
                  padding: "7px 0",
                  textAlign: "left",
                }}
              >
                + Add something to remember…
              </button>
            )}
          </div>
        </div>

        {friend.notes && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "90px 1fr",
              gap: 10,
              padding: "10px 0 0",
              borderTop: "1px dashed #E0D9CE",
              marginTop: 12,
            }}
          >
            <span
              style={{
                fontFamily: "monospace",
                fontSize: 9.5,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#9A8F82",
                paddingTop: 2,
              }}
            >
              Notes
            </span>
            <ul style={{ margin: 0, padding: "0 0 0 14px", display: "flex", flexDirection: "column", gap: 3 }}>
              {friend.notes.split(". ").filter(Boolean).map((s, i) => (
                <li key={i} style={{ fontSize: 12.5, color: "#2E2A24", lineHeight: 1.5 }}>
                  {s.endsWith(".") ? s : `${s}.`}
                </li>
              ))}
            </ul>
          </div>
        )}

        <Rule />

        {/* Timeline */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
          <SectionLabel>Timeline</SectionLabel>
          {interactions.length > 5 && (
            <button
              onClick={() => setShowHistoryModal(true)}
              style={{
                background: "transparent",
                border: 0,
                color: "#9A8F82",
                fontSize: 11.5,
                cursor: "pointer",
                textDecoration: "underline",
                textUnderlineOffset: 2,
              }}
            >
              View all →
            </button>
          )}
        </div>

        {interactions.length === 0 ? (
          <p style={{ color: "#9A8F82", fontSize: 12, fontStyle: "italic" }}>
            No interactions logged yet.
          </p>
        ) : (
          <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {interactions.slice(0, 5).map((interaction, index) => (
              <li
                key={interaction.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "22px 1fr auto",
                  gap: 10,
                  padding: "8px 0 10px",
                  position: "relative",
                }}
              >
                {/* Rail */}
                <span
                  style={{
                    position: "relative",
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  {index < Math.min(interactions.length, 5) - 1 && (
                    <span
                      style={{
                        position: "absolute",
                        top: 0,
                        bottom: -10,
                        left: "50%",
                        width: 1,
                        background: "#E0D9CE",
                        transform: "translateX(-0.5px)",
                      }}
                    />
                  )}
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 999,
                      background:
                        interaction.type === "hangout" ? "#A68B50" : "#F3EDE3",
                      border: `1.5px solid #A68B50`,
                      marginTop: 5,
                      zIndex: 1,
                      position: "relative",
                      flexShrink: 0,
                    }}
                  />
                </span>

                {/* Body */}
                <span
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      gap: 8,
                    }}
                  >
                    <span style={{ fontWeight: 500, fontSize: 12.5, color: "#2E2A24" }}>
                      {interaction.type === "text" ? "Texted" : "Hung out"}
                    </span>
                    <span
                      style={{
                        color: "#9A8F82",
                        fontSize: 10.5,
                        fontFamily: "monospace",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {formatLastInteraction(interaction.date)}
                    </span>
                  </span>

                  {interaction.location && (
                    <span style={{ fontSize: 11.5, color: "#9A8F82" }}>
                      📍 {interaction.location}
                    </span>
                  )}
                  {interaction.notes && (
                    <ul style={{ margin: 0, padding: "0 0 0 14px", display: "flex", flexDirection: "column", gap: 2 }}>
                      {interaction.notes.split(". ").filter(Boolean).map((s, i) => (
                        <li
                          key={i}
                          style={{ fontSize: 12, color: "#9A8F82", fontStyle: "italic", lineHeight: 1.5 }}
                        >
                          {s.endsWith(".") ? s : `${s}.`}
                        </li>
                      ))}
                    </ul>
                  )}

                  {interaction.mood && (
                    <span
                      style={{
                        display: "inline-flex",
                        alignSelf: "flex-start",
                        fontSize: 10.5,
                        borderRadius: 999,
                        padding: "2px 8px",
                        border: "1px solid",
                        ...moodStyle(interaction.mood),
                      }}
                    >
                      {interaction.mood}
                    </span>
                  )}

                  {interaction.topics && interaction.topics.length > 0 && (
                    <span
                      style={{
                        display: "flex",
                        gap: 4,
                        flexWrap: "wrap",
                        marginTop: 2,
                      }}
                    >
                      {interaction.topics.map((t) => (
                        <span
                          key={t}
                          style={{
                            fontSize: 10.5,
                            background: "#F3EDE3",
                            border: "1px solid #E0D9CE",
                            borderRadius: 999,
                            padding: "1px 8px",
                            color: "#6B6259",
                          }}
                        >
                          {t}
                        </span>
                      ))}
                    </span>
                  )}
                </span>

                {/* Edit button */}
                <button
                  onClick={() => handleEditInteraction(interaction)}
                  style={{
                    background: "transparent",
                    border: "1px solid transparent",
                    width: 24,
                    height: 24,
                    borderRadius: 999,
                    cursor: "pointer",
                    display: "grid",
                    placeItems: "center",
                    color: "#9A8F82",
                    alignSelf: "flex-start",
                    marginTop: 3,
                  }}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                  </svg>
                </button>
              </li>
            ))}
          </ol>
        )}

        {interactions.length > 5 && (
          <button
            onClick={() => setShowHistoryModal(true)}
            style={{
              background: "transparent",
              border: 0,
              color: "#9A8F82",
              fontSize: 11.5,
              cursor: "pointer",
              marginTop: 6,
              textDecoration: "underline",
              textUnderlineOffset: 2,
            }}
          >
            View all {interactions.length} →
          </button>
        )}

        <Rule />

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button
            onClick={() => setShowEditModal(true)}
            style={{
              background: "transparent",
              border: 0,
              color: "#A68B50",
              fontSize: 12.5,
              cursor: "pointer",
              textDecoration: "underline",
              textUnderlineOffset: 3,
              padding: 0,
            }}
          >
            Edit details
          </button>
          <button
            onClick={() => onDeleteFriend(friend.id)}
            style={{
              background: "transparent",
              border: 0,
              color: "#C46060",
              fontSize: 12.5,
              cursor: "pointer",
              textDecoration: "underline",
              textUnderlineOffset: 3,
              padding: 0,
            }}
          >
            Remove friend
          </button>
        </div>
      </div>

      {/* Edit modal */}
      {showEditModal && (
        <ModalBackdrop onClose={() => setShowEditModal(false)}>
          <ModalHeader
            title="Edit details"
            onClose={() => setShowEditModal(false)}
          />
          <div style={{ padding: "14px 16px 4px", overflowY: "auto" }}>
            <FriendForm
              onAddFriend={() => {}}
              initial={friend}
              onUpdate={handleSaveEdit}
              onDelete={() => {
                setShowEditModal(false);
                onDeleteFriend(friend.id);
              }}
              onCancel={() => setShowEditModal(false)}
            />
          </div>
        </ModalBackdrop>
      )}

      {/* Log modal */}
      {showLogModal && (
        <ModalBackdrop onClose={closeLogModal}>
          <ModalHeader
            title={editingInteractionId ? "Edit interaction" : "Log interaction"}
            onClose={closeLogModal}
          />
          <div style={{ padding: "14px 16px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>

            {/* Type picker */}
            <div>
              <span style={modalLabelStyle}>Type</span>
              <div style={{ display: "flex", gap: 8 }}>
                {(["text", "hangout"] as InteractionType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setLogType(t)}
                    style={{
                      flex: 1,
                      padding: "7px 0",
                      borderRadius: 4,
                      border: "1px solid",
                      cursor: "pointer",
                      fontSize: 12.5,
                      fontWeight: logType === t ? 500 : 400,
                      background: logType === t ? "#F0EBE0" : "transparent",
                      color: logType === t ? "#A68B50" : "#9A8F82",
                      borderColor: logType === t ? "#D9C9A8" : "#E0D9CE",
                      transition: "all 0.12s",
                    }}
                  >
                    {t === "text" ? "Text" : "Hangout"}
                  </button>
                ))}
              </div>
            </div>

            {logType && (
            <>
            <div>
              <span style={modalLabelStyle}>Date</span>
              <input
                type="date"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
                style={underlineInputStyle}
              />
            </div>

            {logType === "hangout" && (
              <div>
                <span style={modalLabelStyle}>Where?</span>
                <input
                  placeholder="Coffee shop, campus, their place…"
                  value={logLocation}
                  onChange={(e) => setLogLocation(e.target.value)}
                  style={underlineInputStyle}
                />
              </div>
            )}

            <div>
              <span style={modalLabelStyle}>
                {logType === "text" ? "What did you talk about?" : "What did you do?"}
              </span>
              <textarea
                rows={3}
                placeholder="Optional…"
                value={logNotes}
                onChange={(e) => setLogNotes(e.target.value)}
                style={{ ...underlineInputStyle, resize: "none" }}
              />
            </div>

            {/* AI mood pills */}
            {(logMood || aiModalLoading) && (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={modalLabelStyle}>Mood</span>
                  {aiModalLoading && (
                    <span style={{ fontSize: 10, color: "#B0A89E", fontStyle: "italic" }}>
                      AI thinking…
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {MOODS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setLogMood(logMood === m ? "" : m)}
                      style={{
                        fontSize: 11.5,
                        borderRadius: 999,
                        padding: "3px 10px",
                        border: "1px solid",
                        cursor: "pointer",
                        textTransform: "capitalize",
                        transition: "all 0.12s",
                        ...(logMood === m
                          ? moodStyle(m)
                          : { background: "transparent", color: "#9A8F82", borderColor: "#E0D9CE" }),
                      }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* AI topics pills */}
            {logTopics.length > 0 && (
              <div>
                <span style={modalLabelStyle}>Topics</span>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {logTopics.map((topic) => (
                    <span
                      key={topic}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 11.5,
                        background: "#F3EDE3",
                        border: "1px solid #E0D9CE",
                        borderRadius: 999,
                        padding: "3px 10px",
                        color: "#6B6259",
                      }}
                    >
                      {topic}
                      <button
                        type="button"
                        onClick={() => setLogTopics(logTopics.filter((t) => t !== topic))}
                        style={{
                          background: "transparent",
                          border: 0,
                          color: "#B0A89E",
                          cursor: "pointer",
                          fontSize: 12,
                          padding: 0,
                          lineHeight: 1,
                        }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 8, borderTop: "1px solid #E0D9CE" }}>
              <button
                onClick={closeLogModal}
                style={{
                  background: "#F3EDE3",
                  border: "1px solid #E0D9CE",
                  borderRadius: 999,
                  padding: "5px 12px",
                  fontSize: 12,
                  cursor: "pointer",
                  color: "#6B6259",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleLogInteraction}
                style={{
                  background: "transparent",
                  color: "#A68B50",
                  border: "1px solid rgba(166,139,80,0.35)",
                  padding: "5px 12px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                {editingInteractionId ? "Save changes" : "Confirm"}
              </button>
            </div>
            </>
            )}
          </div>
        </ModalBackdrop>
      )}

      {/* History modal */}
      {showHistoryModal && (
        <ModalBackdrop onClose={() => setShowHistoryModal(false)}>
          <ModalHeader
            title="Interaction history"
            subtitle={`${friend.name} · ${interactions.length} total`}
            onClose={() => setShowHistoryModal(false)}
          />
          <div style={{ padding: "14px 16px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
            {interactions.map((interaction) => (
              <div
                key={interaction.id}
                style={{
                  borderRadius: 4,
                  border: "1px solid #E0D9CE",
                  background: "#FAF7F2",
                  padding: "10px 12px",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span
                        style={{
                          fontSize: 10.5,
                          borderRadius: 999,
                          padding: "1px 8px",
                          fontWeight: 500,
                          background:
                            interaction.type === "text" ? "#EAF2EC" : "#F5EDD8",
                          color:
                            interaction.type === "text" ? "#3D7A58" : "#7A6038",
                        }}
                      >
                        {interaction.type === "text" ? "Text" : "Hangout"}
                      </span>
                      <span style={{ fontSize: 10.5, color: "#9A8F82" }}>
                        {formatLastInteraction(interaction.date)}
                      </span>
                    </div>
                    {interaction.location && (
                      <p style={{ fontSize: 11.5, color: "#9A8F82", margin: "0 0 2px" }}>
                        📍 {interaction.location}
                      </p>
                    )}
                    {interaction.notes && (
                      <p
                        style={{
                          fontSize: 12,
                          color: "#6B6259",
                          fontStyle: "italic",
                          margin: 0,
                          lineHeight: 1.5,
                        }}
                      >
                        {interaction.notes}
                      </p>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <button
                      onClick={() => {
                        setShowHistoryModal(false);
                        handleEditInteraction(interaction);
                      }}
                      style={{
                        background: "transparent",
                        border: 0,
                        fontSize: 11.5,
                        color: "#9A8F82",
                        cursor: "pointer",
                        textDecoration: "underline",
                        textUnderlineOffset: 2,
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteInteraction(interaction.id)}
                      style={{
                        background: "transparent",
                        border: 0,
                        fontSize: 11.5,
                        color: "#C46060",
                        cursor: "pointer",
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ModalBackdrop>
      )}
    </>
  );
}
