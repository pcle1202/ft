"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Friend, Interaction, InteractionType } from "@/types/friend";
import { formatLastInteraction, getStatus } from "@/lib/date";
import FriendForm from "@/components/FriendForm";
import { FriendAvatar } from "@/components/Avatar";

type FriendCardProps = {
  friend: Friend;
  onUpdateFriend: (friend: Friend) => void;
  onDeleteFriend: (friendId: string) => void;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function getDaysAgo(date?: string): number {
  if (!date) return Infinity;
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}

function statusFor(f: Friend): "healthy" | "attention" | "overdue" {
  const td = getDaysAgo(f.lastTexted);
  const hd = getDaysAgo(f.lastHungOut);
  const tR = td === Infinity ? 2 : td / f.textFrequencyDays;
  const hR = hd === Infinity ? 2 : hd / f.hangoutFrequencyDays;
  const worst = Math.max(tR, hR);
  if (worst >= 1.2) return "overdue";
  if (worst >= 0.85) return "attention";
  return "healthy";
}

function initialsOf(name: string): string {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("");
}

function daysAgoLabel(d: number): string {
  if (d === Infinity) return "never";
  if (d <= 0) return "today";
  if (d < 7) return d + "d ago";
  if (d < 30) return Math.round(d / 7) + "w ago";
  if (d < 365) return Math.round(d / 30) + "mo ago";
  return Math.round(d / 365) + "y ago";
}

function cadenceLabel(d: number): string {
  if (d < 14) return d + " days";
  if (d < 60) return Math.round(d / 7) + " weeks";
  if (d < 365) return Math.round(d / 30) + " months";
  return Math.round(d / 365) + " year";
}

function kindLabel(t: InteractionType): string {
  if (t === "hangout") return "Hung out";
  if (t === "text") return "Texted";
  return "Note";
}

const MOODS = ["warm", "deep", "fun", "awkward"] as const;
type MoodTag = (typeof MOODS)[number];

function moodStyle(mood: string): React.CSSProperties {
  switch (mood) {
    case "warm": return { background: "#EAF2EC", color: "#3D7A58", borderColor: "rgba(61,122,88,0.3)" };
    case "deep": return { background: "#F0EAE0", color: "#7A6038", borderColor: "rgba(122,96,56,0.3)" };
    case "fun": return { background: "#EAF2EC", color: "#3D7A58", borderColor: "rgba(61,122,88,0.3)" };
    case "awkward": return { background: "#FCF0F0", color: "#8B3D3D", borderColor: "rgba(139,61,61,0.3)" };
    default: return { background: "var(--paper)", color: "var(--muted)", borderColor: "var(--hair)" };
  }
}

// ─── RhythmRow ───────────────────────────────────────────────────────────────

function RhythmRow({ label, cadenceDays, lastDays, overdue }: {
  label: string;
  cadenceDays: number;
  lastDays: number;
  overdue: boolean;
}) {
  const daysLeft = cadenceDays - (lastDays === Infinity ? 0 : lastDays);
  const close = !overdue && daysLeft <= 3;

  const fillPct = lastDays === Infinity ? 100 : Math.min((lastDays / cadenceDays) * 100, 100);

  const trackBg = overdue ? "#F5E8E8" : close ? "#FDF3E3" : "#E8F4EE";
  const fillColor = overdue ? "#C46060" : close ? "#D4A855" : "#6BAF85";

  return (
    <div className="rhythm-row">
      <div className="rhythm-top">
        <span className="rhythm-label">{label}</span>
        <span className="rhythm-target">every {cadenceLabel(cadenceDays)}</span>
      </div>
      <div className="rhythm-bar">
        <div style={{
          position: "relative",
          height: 4,
          borderRadius: 999,
          background: trackBg,
          overflow: "hidden",
        }}>
          <div style={{
            position: "absolute",
            inset: "0 auto 0 0",
            width: fillPct + "%",
            background: fillColor,
            borderRadius: 999,
            transition: "width 0.35s ease",
          }} />
        </div>
      </div>
      <div className="rhythm-bot">
        <span className="rhythm-last">last {daysAgoLabel(lastDays)}</span>
        {overdue && lastDays !== Infinity && (
          <span style={{ color: "#C46060", fontFamily: "var(--sans)", fontSize: 11, fontWeight: 400 }}>
            {lastDays - cadenceDays}d past
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Modal ───────────────────────────────────────────────────────────────────

function Modal({ open, title, onClose, children, size }: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: "lg";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="modal-scrim" onClick={onClose}>
      <div className={`modal${size === "lg" ? " modal-lg" : ""}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <header className="modal-head">
          <h2 className="modal-title">{title}</h2>
          <button className="modal-x" onClick={onClose} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6 6 18"/></svg>
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>,
    document.body
  );
}

// ─── Timeline list ────────────────────────────────────────────────────────────

function TimelineList({ interactions, onEdit }: { interactions: Interaction[]; onEdit: (i: Interaction) => void }) {
  return (
    <ol className="timeline timeline-modal">
      {interactions.map((i, idx) => (
        <li key={i.id} className="t-item">
          <span className="t-rail">
            <span className={`t-dot t-dot-${i.type}`} />
          </span>
          <span className="t-body">
            <span className="t-top">
              <span className="t-kind">{kindLabel(i.type)}</span>
              <span className="t-when">{formatLastInteraction(i.date)}</span>
            </span>
            {i.notes && <span className="t-note">{i.notes}</span>}
          </span>
          <button className="t-edit" onClick={() => onEdit(i)} title="Edit">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
            </svg>
          </button>
        </li>
      ))}
      {interactions.length === 0 && <li className="sidebar-empty" style={{ padding: "20px 0" }}>No moments logged yet.</li>}
    </ol>
  );
}

// ─── Log moment form ──────────────────────────────────────────────────────────

function LogMomentForm({ friend, defaultKind, initial, onSave, onCancel, onDelete }: {
  friend: Friend;
  defaultKind: InteractionType;
  initial?: Interaction;
  onSave: (data: { type: InteractionType; date: string; notes: string; location: string; mood: string; topics: string[] }) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [kind, setKind] = useState<InteractionType>(initial?.type ?? defaultKind);
  const [date, setDate] = useState(initial ? initial.date.slice(0, 10) : todayStr);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [mood, setMood] = useState<MoodTag | "">(initial?.mood as MoodTag ?? "");
  const [topics, setTopics] = useState<string[]>(initial?.topics ?? []);
  const [aiLoading, setAiLoading] = useState(false);

  const firstName = (friend.name ?? "").split(" ")[0];
  const notePlaceholder = kind === "hangout"
    ? `What did you and ${firstName} get up to?`
    : kind === "text"
    ? `What did you and ${firstName} talk about?`
    : "What do you want to remember?";

  // Debounced AI mood + topics
  useEffect(() => {
    if (notes.trim().length < 15) return;
    const timer = setTimeout(() => {
      setAiLoading(true);
      Promise.all([
        fetch("/api/ai/mood", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note: notes }) }).then((r) => r.json() as Promise<{ mood: MoodTag | null }>),
        fetch("/api/ai/topics", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note: notes }) }).then((r) => r.json() as Promise<{ topics: string[] }>),
      ])
        .then(([moodData, topicsData]) => {
          if (moodData.mood && !mood) setMood(moodData.mood);
          if (topicsData.topics?.length && topics.length === 0) setTopics(topicsData.topics);
        })
        .catch(() => {})
        .finally(() => setAiLoading(false));
    }, 800);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes]);

  return (
    <form
      className="ff"
      onSubmit={(e) => { e.preventDefault(); onSave({ type: kind, date, notes, location, mood, topics }); }}
    >
      {/* Kind tabs */}
      <div className="moment-kind-tabs" role="tablist">
        {(["text", "hangout", "note"] as InteractionType[]).map((t) => (
          <button
            key={t}
            type="button"
            className={`mkt${kind === t ? " is-on" : ""}`}
            onClick={() => setKind(t)}
          >
            <span className={`mkt-dot${t === "hangout" ? " mkt-hangout" : t === "note" ? " mkt-note" : ""}`} />
            {kindLabel(t)}
          </button>
        ))}
      </div>

      {/* Date + location */}
      <div className="ff-row">
        <label className="ff-field ff-grow">
          <span className="ff-label">Date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        {kind === "hangout" && (
          <label className="ff-field ff-grow">
            <span className="ff-label">Where?</span>
            <input placeholder="Coffee shop, park…" value={location} onChange={(e) => setLocation(e.target.value)} />
          </label>
        )}
      </div>

      {/* Notes */}
      <label className="ff-field">
        <span className="ff-label">{kind === "note" ? "Note" : "What happened?"}</span>
        <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={notePlaceholder} autoFocus />
      </label>

      {/* AI mood */}
      {(mood || aiLoading) && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span className="ff-label" style={{ margin: 0 }}>Mood</span>
            {aiLoading && <span style={{ fontSize: 10, color: "var(--faded)", fontStyle: "italic" }}>AI thinking…</span>}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {MOODS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMood(mood === m ? "" : m)}
                style={{
                  fontSize: 11.5, borderRadius: 999, padding: "3px 10px", border: "1px solid", cursor: "pointer", textTransform: "capitalize",
                  ...(mood === m ? moodStyle(m) : { background: "transparent", color: "var(--muted)", borderColor: "var(--hair)" }),
                }}
              >{m}</button>
            ))}
          </div>
        </div>
      )}

      {/* AI topics */}
      {topics.length > 0 && (
        <div>
          <span className="ff-label">Topics</span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 2 }}>
            {topics.map((t) => (
              <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, background: "var(--paper)", border: "1px solid var(--hair)", borderRadius: 999, padding: "3px 10px", color: "var(--muted)" }}>
                {t}
                <button type="button" onClick={() => setTopics(topics.filter((x) => x !== t))} style={{ background: "transparent", border: 0, color: "var(--faded)", cursor: "pointer", fontSize: 12, padding: 0, lineHeight: 1 }}>×</button>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="ff-actions">
        {onDelete ? (
          <button type="button" className="ff-danger" onClick={onDelete}>Remove moment</button>
        ) : <span />}
        <div className="ff-actions-right">
          <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn-prim">{initial ? "Save" : "Save moment"}</button>
        </div>
      </div>
    </form>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function FriendCard({ friend, onUpdateFriend, onDeleteFriend }: FriendCardProps) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [logModal, setLogModal] = useState<{ open: boolean; editing?: Interaction } | null>(null);
  const [showTopicInput, setShowTopicInput] = useState(false);
  const [newTopicText, setNewTopicText] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  const interactions = friend.interactions ?? [];
  const st = statusFor(friend);
  const textLastDays = getDaysAgo(friend.lastTexted);
  const hangoutLastDays = getDaysAgo(friend.lastHungOut);
  const textOverdue = getStatus(friend.lastTexted, friend.textFrequencyDays) === "overdue";
  const hangoutOverdue = getStatus(friend.lastHungOut, friend.hangoutFrequencyDays) === "overdue";

  // Fetch AI topic suggestions
  useEffect(() => {
    const existing = new Set((friend.nextTopics ?? []).map((t) => t.toLowerCase()));
    const fallbacks = ["How's life going?", "What have you been up to lately?", "Any big plans coming up?"]
      .filter((s) => !existing.has(s.toLowerCase()));

    const notes = interactions.filter((i) => i.notes).map((i) => i.notes!).slice(0, 5);
    if (notes.length === 0) {
      setAiSuggestions(fallbacks);
      return;
    }
    setSuggestionsLoading(true);
    fetch("/api/ai/suggest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: friend.name, notes }) })
      .then((r) => r.json())
      .then((d: { suggestions: string[] }) => {
        const aiResults = (d.suggestions ?? []).filter((s) => !existing.has(s.toLowerCase()));
        setAiSuggestions(aiResults.length > 0 ? aiResults : fallbacks);
      })
      .catch(() => setAiSuggestions(fallbacks))
      .finally(() => setSuggestionsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSaveEdit(updated: Friend) {
    onUpdateFriend(updated);
    setShowEditModal(false);
  }

  function openLog(kind?: InteractionType) {
    setLogModal({ open: true, editing: undefined });
  }

  function handleSaveMoment(data: { type: InteractionType; date: string; notes: string; location: string; mood: string; topics: string[] }) {
    const selectedDate = new Date(data.date).toISOString();
    if (logModal?.editing) {
      const updated = interactions.map((i) =>
        i.id === logModal.editing!.id ? { ...i, ...data, date: selectedDate } : i
      );
      const latestText = updated.filter((i) => i.type === "text").sort((a, b) => b.date.localeCompare(a.date))[0]?.date;
      const latestHangout = updated.filter((i) => i.type === "hangout").sort((a, b) => b.date.localeCompare(a.date))[0]?.date;
      onUpdateFriend({ ...friend, lastTexted: latestText ?? friend.lastTexted, lastHungOut: latestHangout ?? friend.lastHungOut, interactions: updated });
    } else {
      const newI: Interaction = {
        id: crypto.randomUUID(),
        type: data.type,
        date: selectedDate,
        notes: data.notes.trim() || undefined,
        location: data.type === "hangout" ? data.location.trim() || undefined : undefined,
        mood: data.mood || undefined,
        topics: data.topics.length > 0 ? data.topics : undefined,
      };
      onUpdateFriend({
        ...friend,
        lastTexted: data.type === "text" ? selectedDate : friend.lastTexted,
        lastHungOut: data.type === "hangout" ? selectedDate : friend.lastHungOut,
        interactions: [newI, ...interactions],
      });
    }
    setLogModal(null);
  }

  function handleDeleteMoment() {
    if (!logModal?.editing) return;
    if (!confirm("Remove this moment?")) return;
    onUpdateFriend({ ...friend, interactions: interactions.filter((i) => i.id !== logModal.editing!.id) });
    setLogModal(null);
  }

  function handleAddTopic() {
    const trimmed = newTopicText.trim();
    if (!trimmed) return;
    onUpdateFriend({ ...friend, nextTopics: [...(friend.nextTopics ?? []), trimmed] });
    setNewTopicText("");
    setShowTopicInput(false);
  }

  function handleRemoveTopic(topic: string) {
    onUpdateFriend({ ...friend, nextTopics: (friend.nextTopics ?? []).filter((t) => t !== topic) });
  }

  return (
    <>
      <div className="d">
        {/* ─── Header ─── */}
        <header className="d-head" style={{ position: "relative" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <FriendAvatar friend={friend} size="lg" />
            <span className={`d-status d-status-${st}`}>
              <span className={`dot dot-${st}`} />
              {st === "overdue" ? "distant" : st === "attention" ? "quiet" : "active"}
            </span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="d-name-row">
              <h1 className="d-name">{friend.name}</h1>
              <span style={{ fontSize: 14, color: "#9A8F82", textTransform: "capitalize", fontFamily: "var(--sans)", fontWeight: 400 }}>· {friend.category}</span>
            </div>
            <div className="d-meta">
              {friend.birthday && (
                <><span style={{ color: "#9A8F82", fontSize: 12 }}>Birthday:</span><span style={{ color: "#2E2A24", fontSize: 13, fontWeight: 500 }}>{friend.birthday}</span></>
              )}
              {friend.birthday && friend.livesIn && <span className="d-meta-sep">·</span>}
              {friend.livesIn && (
                <><span style={{ color: "#9A8F82", fontSize: 12 }}>Lives in:</span><span style={{ color: "#2E2A24", fontSize: 13, fontWeight: 500 }}>{friend.livesIn}</span></>
              )}
              {(friend.birthday || friend.livesIn) && friend.metAt && <span className="d-meta-sep">·</span>}
              {friend.metAt && (
                <><span style={{ color: "#9A8F82", fontSize: 12 }}>Met:</span><span style={{ color: "#2E2A24", fontSize: 13, fontWeight: 500 }}>{friend.metAt}</span></>
              )}
            </div>
            {(friend.notes || friend.bio) && (
              <p className="d-bio">{friend.notes ?? friend.bio}</p>
            )}
          </div>
          <button
            onClick={() => setShowEditModal(true)}
            style={{ position: "absolute", top: 0, right: 0, background: "transparent", border: 0, padding: 0, fontFamily: "var(--sans)", fontSize: 11.5, fontWeight: 500, color: "var(--muted)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--ink)"; e.currentTarget.style.textDecoration = "underline"; e.currentTarget.style.textUnderlineOffset = "2px"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--muted)"; e.currentTarget.style.textDecoration = "none"; }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
            </svg>
            Edit
          </button>
        </header>

        <hr className="rule" />

        {/* ─── Check-in goals + Ask about ─── */}
        <div className="d-cols" style={{ gridTemplateColumns: "1.2fr 1fr" }}>
          <section>
            <div className="section-label">Check-in goals</div>
            <div className="rhythm">
              <RhythmRow label="Text" cadenceDays={friend.textFrequencyDays} lastDays={textLastDays} overdue={textOverdue} />
              <RhythmRow label="Hang out" cadenceDays={friend.hangoutFrequencyDays} lastDays={hangoutLastDays} overdue={hangoutOverdue} />
            </div>
            <div className="d-actions">
              <button
                onClick={() => openLog()}
                style={{ display: "flex", alignItems: "center", gap: 12, background: "transparent", border: 0, padding: 0, cursor: "pointer" }}
              >
                <span
                  style={{ width: 44, height: 44, borderRadius: 999, background: "#A68B50", display: "grid", placeItems: "center", color: "#FAF7F2", fontSize: 22, flexShrink: 0, transition: "background 0.15s" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#8A7440"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#A68B50"; }}
                >+</span>
                <span style={{ fontSize: 13, color: "#6B6259", fontFamily: "var(--sans)", fontWeight: 400 }}>Add a new moment</span>
              </button>
            </div>
          </section>

          <section>
            <div className="section-label">Ask about next time</div>
            <ul className="topics">
              {(friend.nextTopics ?? []).map((topic) => (
                <li key={topic} className="topic">
                  <span className="topic-mark">○</span>
                  <span>
                    {topic}
                    <button
                      onClick={() => handleRemoveTopic(topic)}
                      style={{ background: "transparent", border: 0, color: "var(--faded)", cursor: "pointer", fontSize: 12, padding: "0 0 0 6px", lineHeight: 1 }}
                    >×</button>
                  </span>
                </li>
              ))}
            </ul>

            {/* AI suggestions */}
            {(suggestionsLoading || aiSuggestions.length > 0) && (
              <div>
                {suggestionsLoading ? (
                  <p style={{ fontSize: 11, color: "var(--faded)", fontStyle: "italic", margin: "6px 0 0" }}>Thinking of topics…</p>
                ) : (
                  aiSuggestions.map((s) => (
                    <div key={s} className="topic">
                      <span className="topic-mark" style={{ color: "var(--hair)" }}>○</span>
                      <span style={{ fontSize: 12.5, color: "var(--hint)", fontStyle: "italic" }}>
                        {s.endsWith("?") ? s : `${s}?`}
                        <button
                          onClick={() => {
                            const withQ = s.endsWith("?") ? s : `${s}?`;
                            onUpdateFriend({ ...friend, nextTopics: [...(friend.nextTopics ?? []), withQ] });
                            setAiSuggestions(aiSuggestions.filter((x) => x !== s));
                          }}
                          style={{ background: "transparent", border: 0, color: "var(--accent)", cursor: "pointer", fontSize: 11, padding: "0 0 0 6px" }}
                        >+ add</button>
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {showTopicInput ? (
              <div style={{ display: "flex", gap: 6, marginTop: 6, alignItems: "center" }}>
                <input
                  autoFocus
                  value={newTopicText}
                  onChange={(e) => setNewTopicText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); handleAddTopic(); }
                    if (e.key === "Escape") { setShowTopicInput(false); setNewTopicText(""); }
                  }}
                  placeholder="Something to ask…"
                  style={{ flex: 1, border: 0, borderBottom: "1px solid var(--accent)", background: "transparent", fontSize: 12.5, color: "var(--ink)", padding: "3px 0", outline: "none" }}
                />
                <button onClick={handleAddTopic} style={{ background: "transparent", border: 0, color: "var(--accent)", cursor: "pointer", fontSize: 12 }}>Add</button>
              </div>
            ) : (
              <button
                className="topic topic-add"
                onClick={() => setShowTopicInput(true)}
                style={{ display: "grid", gridTemplateColumns: "18px 1fr", gap: 5, width: "100%", border: 0, padding: "7px 0", background: "transparent", cursor: "pointer", textAlign: "left", fontFamily: "var(--sans)", fontWeight: 400 }}
              >
                <span className="topic-mark">+</span>
                <span>Something to bring up…</span>
              </button>
            )}
          </section>
        </div>

        <hr className="rule" />

        {/* ─── Timeline ─── */}
        <section>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
            <div className="section-label">Timeline</div>
            {interactions.length > 5 && (
              <button
                className="text-link"
                onClick={() => setShowHistoryModal(true)}
              >
                View all {interactions.length} moments →
              </button>
            )}
          </div>

          {interactions.length === 0 ? (
            <p style={{ color: "var(--hint)", fontSize: 12, fontStyle: "italic" }}>No moments logged yet.</p>
          ) : (
            <ol className="timeline">
              {interactions.slice(0, 5).map((i, idx) => (
                <li key={i.id} className="t-item">
                  <span className="t-rail">
                    {idx < Math.min(interactions.length, 5) - 1 && null}
                    <span className={`t-dot t-dot-${i.type}`} />
                  </span>
                  <span className="t-body">
                    <span className="t-top">
                      <span className="t-kind">{kindLabel(i.type)}</span>
                      <span className="t-when">{formatLastInteraction(i.date)}</span>
                    </span>
                    {i.location && <span style={{ fontSize: 11.5, color: "var(--hint)" }}>{i.location}</span>}
                    {i.notes && <span className="t-note">{i.notes}</span>}
                    {(i.mood || (i.topics && i.topics.length > 0)) && (
                      <span style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 3, alignItems: "center" }}>
                        {i.mood && (
                          <span style={{ fontSize: 10.5, borderRadius: 999, padding: "2px 8px", border: "1px solid", whiteSpace: "nowrap", ...moodStyle(i.mood) }}>{i.mood}</span>
                        )}
                        {i.topics?.map((t) => (
                          <span key={t} style={{ fontSize: 10.5, background: "var(--paper)", border: "1px solid var(--hair)", borderRadius: 999, padding: "1px 8px", color: "var(--muted)", whiteSpace: "nowrap" }}>{t}</span>
                        ))}
                      </span>
                    )}
                  </span>
                  <button className="t-edit" onClick={() => setLogModal({ open: true, editing: i })} title="Edit">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
                    </svg>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </section>

        <hr className="rule" />

        {/* ─── Footer ─── */}
        <footer className="d-foot">
          <span />
          <button className="text-link text-link-warn" onClick={() => {
            if (confirm(`Remove ${friend.name}?`)) onDeleteFriend(friend.id);
          }}>Remove friend</button>
        </footer>
      </div>

      {/* ─── Edit modal ─── */}
      <Modal open={showEditModal} title="Edit details" onClose={() => setShowEditModal(false)}>
        <FriendForm
          onAddFriend={() => {}}
          initial={friend}
          onUpdate={handleSaveEdit}
          onDelete={() => { setShowEditModal(false); onDeleteFriend(friend.id); }}
          onCancel={() => setShowEditModal(false)}
        />
      </Modal>

      {/* ─── Log moment modal ─── */}
      <Modal
        open={!!logModal?.open}
        title={logModal?.editing ? "Edit moment" : `Log a moment with ${friend.name.split(" ")[0]}`}
        onClose={() => setLogModal(null)}
      >
        {logModal?.open && (
          <LogMomentForm
            friend={friend}
            defaultKind={logModal.editing?.type ?? "text"}
            initial={logModal.editing}
            onSave={handleSaveMoment}
            onCancel={() => setLogModal(null)}
            onDelete={logModal.editing ? handleDeleteMoment : undefined}
          />
        )}
      </Modal>

      {/* ─── All moments modal ─── */}
      <Modal
        open={showHistoryModal}
        title={`All moments with ${friend.name.split(" ")[0]}`}
        onClose={() => setShowHistoryModal(false)}
        size="lg"
      >
        <TimelineList
          interactions={interactions}
          onEdit={(i) => { setShowHistoryModal(false); setLogModal({ open: true, editing: i }); }}
        />
      </Modal>
    </>
  );
}
