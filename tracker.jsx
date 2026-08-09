import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import {
  LayoutGrid,
  PlusCircle,
  ScrollText,
  BarChart3,
  Flame,
  ChevronRight,
  Trash2,
  Loader2,
  AlertCircle,
} from "lucide-react";

/* ============================================================================
   DAILY PERFORMANCE TRACKER
   A personal performance-analytics dashboard: log study/skill/meditation data,
   get a weighted 0-100 score, an F→SSS rank, a same-day analysis, and trends.
   All data is stored per-user via window.storage under a single key so the
   whole ledger loads and saves in one round trip.
   ========================================================================= */

const STORAGE_KEY = "performance-records";

/* ----------------------------- design tokens ----------------------------- */
const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');`;

const STYLES = `
${FONT_IMPORT}
.dpt-app {
  --bg: #0F1115;
  --surface: #171A21;
  --surface-raised: #1E222B;
  --hairline: #2A2F3B;
  --hairline-soft: #21262F;
  --text: #EDEAE2;
  --text-muted: #8B909D;
  --text-faint: #565C6B;
  --gold: #C9A15C;
  --gold-soft: rgba(201,161,92,0.14);
  --teal: #6FAF9E;
  --teal-soft: rgba(111,175,158,0.14);
  --blue: #6C8EBF;
  --blue-soft: rgba(108,142,191,0.14);
  --rust: #C06B52;
  --rust-soft: rgba(192,107,82,0.14);
  background: var(--bg);
  color: var(--text);
  font-family: 'Inter', -apple-system, sans-serif;
  min-height: 100%;
  width: 100%;
  display: flex;
  position: relative;
  letter-spacing: 0.01em;
}
.dpt-app * { box-sizing: border-box; }
.dpt-display { font-family: 'Fraunces', serif; }
.dpt-mono { font-family: 'IBM Plex Mono', monospace; }

.dpt-sidebar {
  width: 208px;
  flex-shrink: 0;
  border-right: 1px solid var(--hairline);
  padding: 28px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.dpt-brand {
  padding: 0 10px 22px 10px;
  margin-bottom: 10px;
  border-bottom: 1px solid var(--hairline-soft);
}
.dpt-brand-mark { font-size: 11px; letter-spacing: 0.16em; color: var(--text-faint); text-transform: uppercase; }
.dpt-brand-title { font-family: 'Fraunces', serif; font-size: 19px; font-weight: 600; margin-top: 4px; line-height: 1.15; }

.dpt-nav-item {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 10px; border-radius: 3px;
  font-size: 13.5px; font-weight: 500;
  color: var(--text-muted);
  cursor: pointer;
  border: 1px solid transparent;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
  background: none;
  width: 100%;
  text-align: left;
}
.dpt-nav-item:hover { color: var(--text); background: var(--surface); }
.dpt-nav-item.active { color: var(--gold); background: var(--gold-soft); border-color: rgba(201,161,92,0.25); }
.dpt-nav-item svg { flex-shrink: 0; }

.dpt-main { flex: 1; min-width: 0; padding: 32px 40px 60px 40px; overflow-y: auto; }
.dpt-main-inner { max-width: 980px; margin: 0 auto; }

.dpt-page-head { margin-bottom: 26px; }
.dpt-eyebrow { font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--text-faint); margin-bottom: 6px; }
.dpt-page-title { font-family: 'Fraunces', serif; font-size: 26px; font-weight: 600; }
.dpt-page-sub { color: var(--text-muted); font-size: 13.5px; margin-top: 6px; }

.dpt-card {
  background: var(--surface);
  border: 1px solid var(--hairline);
  border-radius: 4px;
  padding: 20px 22px;
}
.dpt-card + .dpt-card { margin-top: 16px; }
.dpt-card-title { font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-faint); font-weight: 600; margin-bottom: 14px; }

.dpt-grid { display: grid; gap: 16px; }
.dpt-grid-2 { grid-template-columns: 1fr 1fr; }
.dpt-grid-3 { grid-template-columns: 1fr 1fr 1fr; }

.dpt-medallion {
  width: 148px; height: 148px; border-radius: 50%;
  border: 2px solid var(--ring, var(--gold));
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  position: relative; flex-shrink: 0;
  background: radial-gradient(circle at 50% 40%, var(--ring-soft, var(--gold-soft)), transparent 70%);
}
.dpt-medallion::before {
  content: ''; position: absolute; inset: 8px; border-radius: 50%;
  border: 1px dashed var(--hairline);
}
.dpt-medallion-rank { font-family: 'Fraunces', serif; font-weight: 700; font-size: 40px; line-height: 1; color: var(--ring, var(--gold)); }
.dpt-medallion-score { font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: var(--text-muted); margin-top: 4px; }

.dpt-stat-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-faint); margin-bottom: 3px; }
.dpt-stat-value { font-family: 'IBM Plex Mono', monospace; font-size: 20px; font-weight: 600; }
.dpt-stat-unit { font-size: 12px; color: var(--text-muted); font-weight: 400; margin-left: 2px; }

.dpt-field { display: flex; flex-direction: column; gap: 6px; }
.dpt-label { font-size: 12px; color: var(--text-muted); font-weight: 500; }
.dpt-input, .dpt-select, .dpt-textarea {
  background: var(--surface-raised);
  border: 1px solid var(--hairline);
  color: var(--text);
  border-radius: 3px;
  padding: 8px 10px;
  font-size: 13.5px;
  font-family: 'Inter', sans-serif;
  outline: none;
  width: 100%;
  transition: border-color 0.15s ease;
}
.dpt-input:focus, .dpt-select:focus, .dpt-textarea:focus { border-color: var(--gold); }
.dpt-textarea { resize: vertical; min-height: 64px; font-family: 'IBM Plex Mono', monospace; font-size: 12.5px; line-height: 1.6; }
.dpt-hm-row { display: flex; gap: 8px; align-items: center; }
.dpt-hm-row .dpt-input { width: 62px; flex-shrink: 0; }
.dpt-hm-suffix { font-size: 11.5px; color: var(--text-faint); }

.dpt-btn {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 9px 16px; border-radius: 3px;
  font-size: 13px; font-weight: 600;
  cursor: pointer; border: 1px solid var(--hairline);
  background: var(--surface-raised); color: var(--text);
  transition: all 0.15s ease;
}
.dpt-btn:hover { border-color: var(--text-faint); }
.dpt-btn-primary { background: var(--gold); color: #16130B; border-color: var(--gold); }
.dpt-btn-primary:hover { filter: brightness(1.08); }
.dpt-btn-ghost { background: transparent; border-color: transparent; color: var(--text-muted); }
.dpt-btn-ghost:hover { color: var(--rust); background: var(--rust-soft); }
.dpt-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.dpt-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.dpt-table th { text-align: left; font-size: 10.5px; letter-spacing: 0.07em; text-transform: uppercase; color: var(--text-faint); font-weight: 600; padding: 8px 10px; border-bottom: 1px solid var(--hairline); }
.dpt-table td { padding: 9px 10px; border-bottom: 1px solid var(--hairline-soft); font-family: 'IBM Plex Mono', monospace; color: var(--text); }
.dpt-table tr:hover td { background: var(--surface-raised); }

.dpt-pill { display: inline-flex; align-items: center; justify-content: center; min-width: 30px; padding: 2px 7px; border-radius: 3px; font-family: 'Fraunces', serif; font-weight: 700; font-size: 12.5px; }

.dpt-tag { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-muted); }
.dpt-dot { width: 6px; height: 6px; border-radius: 50%; }

.dpt-list-item { display: flex; gap: 9px; align-items: flex-start; font-size: 13px; padding: 5px 0; color: var(--text); }
.dpt-empty { text-align: center; padding: 50px 20px; color: var(--text-muted); }
.dpt-empty svg { margin-bottom: 10px; opacity: 0.5; }

.dpt-divider { height: 1px; background: var(--hairline-soft); margin: 16px 0; }

.dpt-slider-row { display: flex; align-items: center; gap: 10px; }
.dpt-slider-row input[type=range] { flex: 1; accent-color: var(--gold); }
.dpt-slider-val { font-family: 'IBM Plex Mono', monospace; font-size: 13px; width: 40px; text-align: right; }

.dpt-tab-row { display: flex; gap: 6px; margin-bottom: 18px; border-bottom: 1px solid var(--hairline); }
.dpt-tab { padding: 8px 4px; margin-right: 18px; font-size: 13px; color: var(--text-muted); cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; font-weight: 500; }
.dpt-tab.active { color: var(--text); border-color: var(--gold); }

.dpt-spin { animation: dpt-spin 0.9s linear infinite; }
@keyframes dpt-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

@media (max-width: 760px) {
  .dpt-app { flex-direction: column; }
  .dpt-sidebar { width: 100%; flex-direction: row; overflow-x: auto; border-right: none; border-bottom: 1px solid var(--hairline); padding: 12px 14px; }
  .dpt-brand { display: none; }
  .dpt-nav-item { flex-shrink: 0; }
  .dpt-main { padding: 20px 16px 50px 16px; }
  .dpt-grid-2, .dpt-grid-3 { grid-template-columns: 1fr; }
}
`;

/* ------------------------------- utilities -------------------------------- */

const RANK_ORDER = ["F", "E", "D", "C", "B", "A", "S", "SS", "SSS"];

function getRank(score) {
  if (score >= 97) return "SSS";
  if (score >= 90) return "SS";
  if (score >= 80) return "S";
  if (score >= 70) return "A";
  if (score >= 60) return "B";
  if (score >= 50) return "C";
  if (score >= 40) return "D";
  if (score >= 30) return "E";
  return "F";
}

function rankTier(rank) {
  // returns { color: cssVar, soft: cssVar }
  if (["SSS", "SS", "S"].includes(rank)) return { ring: "var(--gold)", soft: "var(--gold-soft)" };
  if (["A", "B"].includes(rank)) return { ring: "var(--teal)", soft: "var(--teal-soft)" };
  if (rank === "C") return { ring: "var(--blue)", soft: "var(--blue-soft)" };
  return { ring: "var(--rust)", soft: "var(--rust-soft)" };
}

function hm(hours, minutes) {
  return (Number(hours) || 0) * 60 + (Number(minutes) || 0);
}

function fmtMinutes(mins) {
  const m = Math.round(mins || 0);
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h === 0) return `${rem}m`;
  if (rem === 0) return `${h}h`;
  return `${h}h ${rem}m`;
}

function pct(v) {
  return `${Math.round(v)}%`;
}

function todayStr() {
  // Build the date in LOCAL time. toISOString() returns UTC, so for any
  // timezone ahead of UTC a record logged in the evening would silently be
  // attributed to "yesterday" (and the date input's max would be wrong).
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function prevDateStr(dateStr) {
  // Same local-time discipline as todayStr: parsing as local midnight but
  // then formatting via toISOString() (UTC) would subtract an EXTRA day in
  // UTC+ timezones, silently breaking streak / consistency calculations.
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

function formatDateLabel(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/* ---------------------------- scoring engine ------------------------------ */

const WEIGHTS = {
  studyQuality: 0.30,
  studyRetention: 0.15,
  skillDevelopment: 0.25,
  outputCompletion: 0.15,
  meditation: 0.10,
  consistency: 0.05,
};

function computeStudyMetrics(study) {
  const total = study.deep + study.moderate + study.distracted;
  const effective = study.deep + study.moderate;
  const efficiency = total > 0 ? (effective / total) * 100 : 0;
  return { total, effective, efficiency };
}

function computeSkillMetrics(skill) {
  const total = skill.deep + skill.moderate + skill.distracted;
  const effective = skill.deep + skill.moderate;
  const efficiency = total > 0 ? (effective / total) * 100 : 0;
  // Skill development blends how focused the session was with how much was
  // actually shipped — a distracted-but-"complete" session shouldn't score high.
  const development = total > 0 ? efficiency * 0.55 + (skill.output || 0) * 0.45 : 0;
  return { total, effective, efficiency, development };
}

function computeMeditationScore(meditation) {
  if (!meditation.minutes) return 0;
  // 20 minutes of practice reaches full duration credit; quality (if given) blends in.
  const durationScore = Math.min(100, (meditation.minutes / 20) * 100);
  if (meditation.quality === null || meditation.quality === undefined || meditation.quality === "") {
    return durationScore;
  }
  return durationScore * 0.5 + meditation.quality * 0.5;
}

// Consistency: reward unbroken daily logging, capped at a 7-day horizon.
function computeConsistencyScore(existingRecordsAsc, dateStr) {
  const datesLogged = new Set(existingRecordsAsc.map((r) => r.date));
  let streak = 1; // today counts
  let cursor = prevDateStr(dateStr);
  while (datesLogged.has(cursor) && streak < 7) {
    streak += 1;
    cursor = prevDateStr(cursor);
  }
  return Math.min(100, (streak / 7) * 100);
}

function computeOverallScore(parts) {
  const raw =
    parts.studyQuality * WEIGHTS.studyQuality +
    parts.studyRetention * WEIGHTS.studyRetention +
    parts.skillDevelopment * WEIGHTS.skillDevelopment +
    parts.outputCompletion * WEIGHTS.outputCompletion +
    parts.meditation * WEIGHTS.meditation +
    parts.consistency * WEIGHTS.consistency;
  return Math.max(0, Math.min(100, raw));
}

// Category-level sub-scores, so the dashboard can show a rank per area (Study /
// Skill / Meditation) without re-deriving weights inline everywhere.
function computeCategoryScores(record) {
  const c = record.computed;
  const studyWeight = WEIGHTS.studyQuality + WEIGHTS.studyRetention + WEIGHTS.outputCompletion;
  const studyScore =
    (c.studyEfficiency * WEIGHTS.studyQuality + record.study.retention * WEIGHTS.studyRetention + record.study.completion * WEIGHTS.outputCompletion) /
    studyWeight;
  const skillScore = c.skillDevelopment;
  const meditationScore = c.meditationScore;
  return {
    study: { score: studyScore, rank: getRank(studyScore) },
    skill: { score: skillScore, rank: getRank(skillScore) },
    meditation: { score: meditationScore, rank: getRank(meditationScore) },
  };
}

// Builds the full computed record from raw form input + prior history.
function buildRecord(form, existingRecordsAsc) {
  const study = {
    deep: hm(form.study.deepH, form.study.deepM),
    moderate: hm(form.study.modH, form.study.modM),
    distracted: hm(form.study.distH, form.study.distM),
    retention: Number(form.study.retention) || 0,
    completion: Number(form.study.completion) || 0,
    tasks: form.study.tasks.split("\n").map((t) => t.trim()).filter(Boolean),
  };
  const skill = {
    category: form.skill.category === "Other" ? (form.skill.customCategory || "Other") : form.skill.category,
    deep: hm(form.skill.deepH, form.skill.deepM),
    moderate: hm(form.skill.modH, form.skill.modM),
    distracted: hm(form.skill.distH, form.skill.distM),
    output: Number(form.skill.output) || 0,
  };
  const meditation = {
    minutes: hm(form.meditation.durH, form.meditation.durM),
    quality: form.meditation.quality === "" ? null : Number(form.meditation.quality),
  };

  const studyMetrics = computeStudyMetrics(study);
  const skillMetrics = computeSkillMetrics(skill);
  const meditationScore = computeMeditationScore(meditation);
  const consistencyScore = computeConsistencyScore(existingRecordsAsc, form.date);

  const parts = {
    studyQuality: studyMetrics.efficiency,
    studyRetention: study.retention,
    skillDevelopment: skillMetrics.development,
    outputCompletion: study.completion,
    meditation: meditationScore,
    consistency: consistencyScore,
  };

  const overallScore = computeOverallScore(parts);
  const rank = getRank(overallScore);

  return {
    id: form.date,
    date: form.date,
    study,
    skill,
    meditation,
    computed: {
      studyTotal: studyMetrics.total,
      studyEffective: studyMetrics.effective,
      studyEfficiency: studyMetrics.efficiency,
      skillTotal: skillMetrics.total,
      skillEffective: skillMetrics.effective,
      skillEfficiency: skillMetrics.efficiency,
      skillDevelopment: skillMetrics.development,
      meditationScore,
      consistencyScore,
      overallScore,
      rank,
      parts,
    },
    createdAt: form.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/* ------------------------------ analysis text ------------------------------ */

function generateAnalysis(record) {
  const c = record.computed;
  const s = record.study;
  const sk = record.skill;
  const m = record.meditation;

  const distractedShare = c.studyTotal > 0 ? (s.distracted / c.studyTotal) * 100 : 0;

  // ---- summary ----
  const lines = [];
  if (c.studyTotal > 0) {
    lines.push(
      `You studied for ${fmtMinutes(c.studyTotal)} and produced roughly ${fmtMinutes(c.studyEffective)} of effective, focused work (${pct(c.studyEfficiency)} efficiency).`
    );
  } else {
    lines.push(`No study time was logged today.`);
  }
  if (s.deep >= s.moderate && s.deep > 0) {
    lines.push(`Your strongest input was deep focus: ${fmtMinutes(s.deep)} of genuinely concentrated work.`);
  } else if (s.moderate > 0) {
    lines.push(`Most of your study time landed in moderate focus (${fmtMinutes(s.moderate)}), with less time in deep focus (${fmtMinutes(s.deep)}).`);
  }
  if (s.distracted > 0) {
    lines.push(`${fmtMinutes(s.distracted)} went to distraction, about ${pct(distractedShare)} of total study time.`);
  }
  if (s.retention > 0) {
    lines.push(`Retention came in at ${pct(s.retention)}.`);
  }
  if (c.skillTotal > 0) {
    lines.push(`Skill work (${sk.category}) added ${fmtMinutes(c.skillTotal)}, with ${pct(sk.output)} output completion.`);
  } else {
    lines.push(`No skill-building session was logged.`);
  }
  if (m.minutes > 0) {
    lines.push(`You meditated for ${fmtMinutes(m.minutes)}${m.quality != null ? ` at ${pct(m.quality)} quality` : ""}.`);
  } else {
    lines.push(`No meditation was logged.`);
  }
  lines.push(`Overall: ${c.rank} (${Math.round(c.overallScore)}/100).`);

  // ---- strengths ----
  const strengths = [];
  if (s.deep >= 240) strengths.push("Excellent deep-focus volume");
  else if (s.deep >= 120) strengths.push("Solid deep-focus time");
  if (s.retention >= 80) strengths.push("Strong retention");
  if (s.completion >= 80) strengths.push("High task completion");
  if (c.studyEfficiency >= 80) strengths.push("Very little wasted study time");
  if (c.skillTotal > 0 && c.skillDevelopment >= 70) strengths.push("Solid skill development");
  if (c.consistencyScore >= (6 / 7) * 100) strengths.push("Consistent daily logging streak");
  if (m.minutes >= 20 && (m.quality == null || m.quality >= 75)) strengths.push("Good meditation practice");
  if (strengths.length === 0) strengths.push("Showed up and logged the day — the streak itself is worth something");

  // ---- weaknesses ----
  const weaknesses = [];
  if (s.distracted >= 60) weaknesses.push(`${fmtMinutes(s.distracted)} distracted (${pct(distractedShare)} of study time)`);
  if (s.moderate > s.deep && s.moderate > 0) weaknesses.push("Moderate focus could be converted into deep focus");
  if (s.retention > 0 && s.retention < 60) weaknesses.push(`Retention was low at ${pct(s.retention)}`);
  if (c.studyTotal > 0 && c.studyEfficiency < 60) weaknesses.push(`Study efficiency was only ${pct(c.studyEfficiency)}`);
  if (c.skillTotal === 0) weaknesses.push("No skill-building session logged");
  else if (sk.output < 60) weaknesses.push(`Skill output completion was low at ${pct(sk.output)}`);
  if (m.minutes === 0) weaknesses.push("No meditation logged");
  if (weaknesses.length === 0) weaknesses.push("Nothing significant dragged the score down today");

  // ---- recommendations (1-3, ranked by biggest gap, concrete) ----
  const candidates = [];
  if (s.distracted >= 60) {
    const target = Math.max(0, Math.round(s.distracted / 60) - 1);
    candidates.push({
      gap: distractedShare,
      text: `Reduce distraction from ${fmtMinutes(s.distracted)} → under ${target > 0 ? `${target}h` : "1h"}.`,
    });
  }
  if (s.deep < 240 && c.studyTotal > 0) {
    candidates.push({ gap: 240 - s.deep, text: `Push deep focus toward 4h+ (today: ${fmtMinutes(s.deep)}).` });
  }
  if (s.retention > 0 && s.retention < 75) {
    candidates.push({ gap: 75 - s.retention, text: `Spend 15 minutes reviewing today's material to lift retention above ${pct(Math.min(90, s.retention + 15))}.` });
  }
  if (c.skillTotal === 0) {
    candidates.push({ gap: 80, text: `Log at least 45 minutes of skill work tomorrow — it's 25% of the score and got nothing today.` });
  } else if (sk.output < 75) {
    candidates.push({ gap: 75 - sk.output, text: `Aim to finish more of the ${sk.category} session — today's output was ${pct(sk.output)}.` });
  }
  if (m.minutes === 0) {
    candidates.push({ gap: 50, text: `Add a short 10–15 minute meditation session tomorrow.` });
  } else if (m.minutes < 20) {
    candidates.push({ gap: 20 - m.minutes, text: `Stretch meditation from ${fmtMinutes(m.minutes)} toward 20 minutes.` });
  }
  candidates.sort((a, b) => b.gap - a.gap);
  const recommendations = candidates.slice(0, 3).map((c2) => c2.text);
  if (recommendations.length === 0) {
    recommendations.push("Hold the same routine tomorrow — every input is already in a good range.");
  }

  return { summary: lines.join(" "), strengths, weaknesses, recommendations };
}

/* -------------------------------- storage ---------------------------------- */

async function loadRecords() {
  if (!window.storage) {
    // Surface this loudly instead of silently showing an empty ledger — the
    // app needs per-user storage to work at all.
    throw new Error("storage-unavailable");
  }
  try {
    const res = await window.storage.get(STORAGE_KEY, false);
    if (!res || !res.value) return [];
    const parsed = JSON.parse(res.value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

async function saveRecords(records) {
  await window.storage.set(STORAGE_KEY, JSON.stringify(records), false);
}

/* --------------------------------- streaks ---------------------------------- */

function computeGlobalStreaks(recordsAsc) {
  if (recordsAsc.length === 0) {
    return { currentStreak: 0, sOrHigherStreak: 0, bestRank: "F", bestScore: 0 };
  }
  const byDate = new Map(recordsAsc.map((r) => [r.date, r]));
  const latest = recordsAsc[recordsAsc.length - 1];

  let currentStreak = 0;
  let cursor = latest.date;
  while (byDate.has(cursor)) {
    currentStreak += 1;
    cursor = prevDateStr(cursor);
  }

  let sOrHigherStreak = 0;
  cursor = latest.date;
  while (byDate.has(cursor) && ["S", "SS", "SSS"].includes(byDate.get(cursor).computed.rank)) {
    sOrHigherStreak += 1;
    cursor = prevDateStr(cursor);
  }

  let bestScore = 0;
  let bestRank = "F";
  for (const r of recordsAsc) {
    if (r.computed.overallScore > bestScore) bestScore = r.computed.overallScore;
    if (RANK_ORDER.indexOf(r.computed.rank) > RANK_ORDER.indexOf(bestRank)) bestRank = r.computed.rank;
  }

  return { currentStreak, sOrHigherStreak, bestRank, bestScore: Math.round(bestScore) };
}

function trendArrow(deltaPct) {
  if (deltaPct > 4) return "↑";
  if (deltaPct < -4) return "↓";
  return "→";
}

function computeTrends(recordsAsc) {
  const last7 = recordsAsc.slice(-7);
  if (last7.length < 2) return null;
  const mid = Math.ceil(last7.length / 2);
  const firstHalf = last7.slice(0, mid);
  const secondHalf = last7.slice(mid);
  if (secondHalf.length === 0) return null;

  const avg = (arr, sel) => arr.reduce((a, r) => a + sel(r), 0) / arr.length;

  const metrics = [
    { key: "studyTime", label: "Study time", sel: (r) => r.computed.studyTotal },
    { key: "efficiency", label: "Study efficiency", sel: (r) => r.computed.studyEfficiency },
    { key: "retention", label: "Retention", sel: (r) => r.study.retention },
    { key: "skillHours", label: "Skill hours", sel: (r) => r.computed.skillTotal },
    { key: "meditation", label: "Meditation", sel: (r) => r.meditation.minutes },
  ];

  return metrics.map((m) => {
    const a = avg(firstHalf, m.sel);
    const b = avg(secondHalf, m.sel);
    const delta = a === 0 ? (b > 0 ? 100 : 0) : ((b - a) / a) * 100;
    return { ...m, arrow: trendArrow(delta), delta };
  });
}

/* ================================ APP ROOT ================================= */

export default function DailyPerformanceTracker() {
  const [tab, setTab] = useState("dashboard");
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    loadRecords()
      .then((r) => {
        if (mounted) {
          setRecords(r.sort((a, b) => (a.date < b.date ? -1 : 1)));
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setError("Storage is unavailable in this environment — data can't be loaded or saved.");
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  const recordsAsc = useMemo(() => [...records].sort((a, b) => (a.date < b.date ? -1 : 1)), [records]);
  const recordsDesc = useMemo(() => [...records].sort((a, b) => (a.date < b.date ? 1 : -1)), [records]);
  const todayRecord = useMemo(() => records.find((r) => r.date === todayStr()) || recordsDesc[0] || null, [records, recordsDesc]);

  const persist = useCallback(async (next) => {
    setSaving(true);
    setError(null);
    try {
      await saveRecords(next);
      setRecords(next);
      return true;
    } catch (e) {
      setError("Could not save. Please try again.");
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const handleSubmitDay = useCallback(
    async (form) => {
      const existing = recordsAsc.filter((r) => r.date !== form.date);
      // When overwriting an existing day, keep its original creation time
      // instead of silently resetting it to "now".
      const prev = recordsAsc.find((r) => r.date === form.date);
      const record = buildRecord(prev ? { ...form, createdAt: prev.createdAt } : form, existing);
      const next = [...existing, record].sort((a, b) => (a.date < b.date ? -1 : 1));
      const ok = await persist(next);
      // Only leave the form page when the save actually succeeded, so a
      // failed write doesn't strand the user on a page that lost their input.
      if (ok) setTab("dashboard");
      return ok;
    },
    [recordsAsc, persist]
  );

  const handleDelete = useCallback(
    async (date) => {
      const next = records.filter((r) => r.date !== date);
      await persist(next);
    },
    [records, persist]
  );

  return (
    <div className="dpt-app">
      <style>{STYLES}</style>
      <aside className="dpt-sidebar">
        <div className="dpt-brand">
          <div className="dpt-brand-mark">Ledger</div>
          <div className="dpt-brand-title">Daily Performance<br />Tracker</div>
        </div>
        <NavItem icon={<LayoutGrid size={15} />} label="Dashboard" active={tab === "dashboard"} onClick={() => setTab("dashboard")} />
        <NavItem icon={<PlusCircle size={15} />} label="Add Day" active={tab === "add"} onClick={() => setTab("add")} />
        <NavItem icon={<ScrollText size={15} />} label="History" active={tab === "history"} onClick={() => setTab("history")} />
        <NavItem icon={<BarChart3 size={15} />} label="Analytics" active={tab === "analytics"} onClick={() => setTab("analytics")} />
      </aside>
      <main className="dpt-main">
        <div className="dpt-main-inner">
          {loading ? (
            <div className="dpt-empty">
              <Loader2 size={22} className="dpt-spin" />
              <div style={{ marginTop: 10, fontSize: 13 }}>Loading your ledger…</div>
            </div>
          ) : (
            <>
              {error && (
                <div className="dpt-card" style={{ borderColor: "var(--rust)", marginBottom: 16, display: "flex", gap: 8, alignItems: "center", color: "var(--rust)", fontSize: 13 }}>
                  <AlertCircle size={15} /> {error}
                </div>
              )}
              {tab === "dashboard" && <Dashboard record={todayRecord} recordsAsc={recordsAsc} onGoAdd={() => setTab("add")} onGoAnalysis={() => setTab("analytics")} />}
              {tab === "add" && <AddDay onSubmit={handleSubmitDay} saving={saving} existingDates={records.map((r) => r.date)} />}
              {tab === "history" && <HistoryPage records={recordsDesc} onDelete={handleDelete} />}
              {tab === "analytics" && <AnalyticsPage recordsAsc={recordsAsc} />}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <button className={`dpt-nav-item${active ? " active" : ""}`} onClick={onClick}>
      {icon}
      {label}
    </button>
  );
}

/* ================================ DASHBOARD ================================ */

function Dashboard({ record, recordsAsc, onGoAdd, onGoAnalysis }) {
  if (!record) {
    return (
      <div>
        <PageHead eyebrow="Today" title="Dashboard" sub="No entries yet." />
        <div className="dpt-card dpt-empty">
          <ScrollText size={26} />
          <div style={{ marginTop: 8, marginBottom: 14 }}>Nothing logged yet. Add your first day to see your score and rank.</div>
          <button className="dpt-btn dpt-btn-primary" onClick={onGoAdd}>
            <PlusCircle size={15} /> Add Day
          </button>
        </div>
      </div>
    );
  }

  const c = record.computed;
  const tier = rankTier(c.rank);
  const categories = computeCategoryScores(record);
  const isToday = record.date === todayStr();

  return (
    <div>
      <PageHead eyebrow={isToday ? "Today" : formatDateLabel(record.date)} title="Dashboard" sub={isToday ? "Your latest logged performance." : "Most recent entry — nothing logged for today yet."} />

      <div className="dpt-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "30px 22px" }}>
        <div className="dpt-medallion" style={{ "--ring": tier.ring, "--ring-soft": tier.soft }}>
          <div className="dpt-medallion-rank">{c.rank}</div>
          <div className="dpt-medallion-score">{Math.round(c.overallScore)}/100</div>
        </div>
        <div className="dpt-stat-label" style={{ marginTop: 10 }}>Overall rank</div>
      </div>

      <div className="dpt-grid dpt-grid-3" style={{ marginTop: 16 }}>
        <CategoryRankCard label="Study" rank={categories.study.rank} score={categories.study.score} />
        <CategoryRankCard label="Skill" rank={categories.skill.rank} score={categories.skill.score} />
        <CategoryRankCard label="Meditation" rank={categories.meditation.rank} score={categories.meditation.score} />
      </div>

      <button className="dpt-btn dpt-btn-primary" style={{ marginTop: 18, width: "100%", justifyContent: "center", padding: "12px 16px" }} onClick={onGoAnalysis}>
        <BarChart3 size={16} /> View graphical analysis
      </button>
    </div>
  );
}

function CategoryRankCard({ label, rank, score }) {
  const tier = rankTier(rank);
  return (
    <div className="dpt-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div>
        <div className="dpt-stat-label">{label}</div>
        <div className="dpt-stat-value" style={{ fontSize: 15, marginTop: 4, color: "var(--text-muted)" }}>{Math.round(score)}/100</div>
      </div>
      <span className="dpt-pill" style={{ color: tier.ring, background: tier.soft, fontSize: 18, minWidth: 44, padding: "6px 10px" }}>{rank}</span>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="dpt-stat-label">{label}</div>
      <div className="dpt-stat-value">{value}</div>
    </div>
  );
}

function StreakStat({ icon, label, value }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {icon}
      <div>
        <div className="dpt-stat-label">{label}</div>
        <div className="dpt-stat-value" style={{ fontSize: 16 }}>{value}</div>
      </div>
    </div>
  );
}

function PageHead({ eyebrow, title, sub }) {
  return (
    <div className="dpt-page-head">
      {eyebrow && <div className="dpt-eyebrow">{eyebrow}</div>}
      <div className="dpt-page-title">{title}</div>
      {sub && <div className="dpt-page-sub">{sub}</div>}
    </div>
  );
}

/* ================================= ADD DAY ================================= */

const SKILL_CATEGORIES = ["Backend", "AI/ML", "DSA", "Projects", "Other"];

function emptyForm() {
  return {
    date: todayStr(),
    study: { deepH: "", deepM: "", modH: "", modM: "", distH: "", distM: "", retention: "", completion: "", tasks: "" },
    skill: { category: "Backend", customCategory: "", deepH: "", deepM: "", modH: "", modM: "", distH: "", distM: "", output: "" },
    meditation: { durH: "", durM: "", quality: "" },
  };
}

function AddDay({ onSubmit, saving, existingDates }) {
  const [form, setForm] = useState(emptyForm());
  const overwriting = existingDates.includes(form.date);

  const setStudy = (patch) => setForm((f) => ({ ...f, study: { ...f.study, ...patch } }));
  const setSkill = (patch) => setForm((f) => ({ ...f, skill: { ...f.skill, ...patch } }));
  const setMeditation = (patch) => setForm((f) => ({ ...f, meditation: { ...f.meditation, ...patch } }));

  const preview = useMemo(() => {
    const study = {
      deep: hm(form.study.deepH, form.study.deepM),
      moderate: hm(form.study.modH, form.study.modM),
      distracted: hm(form.study.distH, form.study.distM),
    };
    const skill = {
      deep: hm(form.skill.deepH, form.skill.deepM),
      moderate: hm(form.skill.modH, form.skill.modM),
      distracted: hm(form.skill.distH, form.skill.distM),
    };
    const studyTotal = study.deep + study.moderate + study.distracted;
    const studyEff = study.deep + study.moderate;
    const skillTotal = skill.deep + skill.moderate + skill.distracted;
    return {
      studyTotal,
      studyEfficiency: studyTotal > 0 ? Math.round((studyEff / studyTotal) * 100) : 0,
      skillTotal,
    };
  }, [form]);

  const handleSubmit = async () => {
    // Only reset the form if the save actually succeeded — otherwise a failed
    // persist (e.g. storage error) would wipe everything the user just typed.
    const ok = await onSubmit(form);
    if (ok) setForm(emptyForm());
  };

  return (
    <div>
      <PageHead eyebrow="New entry" title="Add Day" sub="Log study, skill, and meditation data for a single day." />
      <div>
        <div className="dpt-card">
          <div className="dpt-card-title">Date</div>
          <div className="dpt-field" style={{ maxWidth: 220 }}>
            <input className="dpt-input" type="date" value={form.date} max={todayStr()} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} required />
          </div>
          {overwriting && (
            <div style={{ marginTop: 10, fontSize: 12, color: "var(--gold)" }}>An entry for this date already exists — saving will overwrite it.</div>
          )}
        </div>

        <div className="dpt-card">
          <div className="dpt-card-title">Study</div>
          <div className="dpt-grid dpt-grid-3">
            <TimeField label="Deep focus" h={form.study.deepH} m={form.study.deepM} onH={(v) => setStudy({ deepH: v })} onM={(v) => setStudy({ deepM: v })} />
            <TimeField label="Moderate focus" h={form.study.modH} m={form.study.modM} onH={(v) => setStudy({ modH: v })} onM={(v) => setStudy({ modM: v })} />
            <TimeField label="Distracted" h={form.study.distH} m={form.study.distM} onH={(v) => setStudy({ distH: v })} onM={(v) => setStudy({ distM: v })} />
          </div>
          <div className="dpt-divider" />
          <div className="dpt-grid dpt-grid-2">
            <PercentField label="Retention / recall" value={form.study.retention} onChange={(v) => setStudy({ retention: v })} />
            <PercentField label="Task completion" value={form.study.completion} onChange={(v) => setStudy({ completion: v })} />
          </div>
          <div className="dpt-divider" />
          <div className="dpt-field">
            <label className="dpt-label">Completed tasks (one per line)</label>
            <textarea
              className="dpt-textarea"
              placeholder={"FastAPI authentication\n3 LeetCode problems\nCollege chapter 4"}
              value={form.study.tasks}
              onChange={(e) => setStudy({ tasks: e.target.value })}
            />
          </div>
          <div style={{ marginTop: 10, fontSize: 12, color: "var(--text-faint)" }}>
            Total: <span className="dpt-mono">{fmtMinutes(preview.studyTotal)}</span> · Efficiency: <span className="dpt-mono">{preview.studyEfficiency}%</span>
          </div>
        </div>

        <div className="dpt-card">
          <div className="dpt-card-title">Skill</div>
          <div className="dpt-grid dpt-grid-2" style={{ marginBottom: 16 }}>
            <div className="dpt-field">
              <label className="dpt-label">Category</label>
              <select className="dpt-select" value={form.skill.category} onChange={(e) => setSkill({ category: e.target.value })}>
                {SKILL_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            {form.skill.category === "Other" && (
              <div className="dpt-field">
                <label className="dpt-label">Custom category</label>
                <input className="dpt-input" value={form.skill.customCategory} onChange={(e) => setSkill({ customCategory: e.target.value })} placeholder="e.g. System design" />
              </div>
            )}
          </div>
          <div className="dpt-grid dpt-grid-3">
            <TimeField label="Deep focus" h={form.skill.deepH} m={form.skill.deepM} onH={(v) => setSkill({ deepH: v })} onM={(v) => setSkill({ deepM: v })} />
            <TimeField label="Moderate focus" h={form.skill.modH} m={form.skill.modM} onH={(v) => setSkill({ modH: v })} onM={(v) => setSkill({ modM: v })} />
            <TimeField label="Distracted" h={form.skill.distH} m={form.skill.distM} onH={(v) => setSkill({ distH: v })} onM={(v) => setSkill({ distM: v })} />
          </div>
          <div className="dpt-divider" />
          <PercentField label="Output / completion" value={form.skill.output} onChange={(v) => setSkill({ output: v })} />
          <div style={{ marginTop: 10, fontSize: 12, color: "var(--text-faint)" }}>
            Total: <span className="dpt-mono">{fmtMinutes(preview.skillTotal)}</span>
          </div>
        </div>

        <div className="dpt-card">
          <div className="dpt-card-title">Meditation</div>
          <div className="dpt-grid dpt-grid-2">
            <TimeField label="Duration" h={form.meditation.durH} m={form.meditation.durM} onH={(v) => setMeditation({ durH: v })} onM={(v) => setMeditation({ durM: v })} />
            <PercentField label="Quality (optional)" value={form.meditation.quality} onChange={(v) => setMeditation({ quality: v })} optional />
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
          <button type="button" onClick={handleSubmit} className="dpt-btn dpt-btn-primary" disabled={saving}>
            {saving ? <Loader2 size={15} className="dpt-spin" /> : <ChevronRight size={15} />}
            {saving ? "Saving…" : overwriting ? "Update day" : "Calculate & save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TimeField({ label, h, m, onH, onM }) {
  return (
    <div className="dpt-field">
      <label className="dpt-label">{label}</label>
      <div className="dpt-hm-row">
        <input className="dpt-input" type="number" min="0" placeholder="0" value={h} onChange={(e) => onH(e.target.value)} />
        <span className="dpt-hm-suffix">h</span>
        <input className="dpt-input" type="number" min="0" max="59" placeholder="0" value={m} onChange={(e) => onM(e.target.value)} />
        <span className="dpt-hm-suffix">m</span>
      </div>
    </div>
  );
}

function PercentField({ label, value, onChange, optional }) {
  return (
    <div className="dpt-field">
      <label className="dpt-label">{label}{optional ? " (optional)" : ""}</label>
      <div className="dpt-slider-row">
        <input type="range" min="0" max="100" value={value === "" ? 0 : value} onChange={(e) => onChange(e.target.value)} />
        <span className="dpt-slider-val dpt-mono">{value === "" ? "—" : `${value}%`}</span>
      </div>
    </div>
  );
}

/* ================================= HISTORY ================================= */

function HistoryPage({ records, onDelete }) {
  if (records.length === 0) {
    return (
      <div>
        <PageHead eyebrow="Ledger" title="History" sub="Every logged day, most recent first." />
        <div className="dpt-card dpt-empty">
          <ScrollText size={24} />
          <div style={{ marginTop: 8 }}>No entries yet.</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHead eyebrow="Ledger" title="History" sub={`${records.length} day${records.length === 1 ? "" : "s"} logged.`} />
      <div className="dpt-card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="dpt-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Study</th>
              <th>Effective</th>
              <th>Efficiency</th>
              <th>Retention</th>
              <th>Skills</th>
              <th>Meditation</th>
              <th>Score</th>
              <th>Rank</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => {
              const c = r.computed;
              const tier = rankTier(c.rank);
              return (
                <tr key={r.date}>
                  <td style={{ color: "var(--text-muted)" }}>{formatDateLabel(r.date)}</td>
                  <td>{fmtMinutes(c.studyTotal)}</td>
                  <td>{fmtMinutes(c.studyEffective)}</td>
                  <td>{pct(c.studyEfficiency)}</td>
                  <td>{pct(r.study.retention)}</td>
                  <td>{fmtMinutes(c.skillTotal)}</td>
                  <td>{fmtMinutes(r.meditation.minutes)}</td>
                  <td>{Math.round(c.overallScore)}</td>
                  <td>
                    <span className="dpt-pill" style={{ color: tier.ring, background: tier.soft }}>{c.rank}</span>
                  </td>
                  <td>
                    <button className="dpt-btn dpt-btn-ghost" style={{ padding: "4px 6px" }} onClick={() => onDelete(r.date)} title="Delete entry">
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ================================ ANALYTICS ================================ */

const CHART_TEXT = { fontSize: 11, fill: "#8B909D", fontFamily: "IBM Plex Mono, monospace" };

function AnalyticsPage({ recordsAsc }) {
  const last7 = recordsAsc.slice(-7);
  const trends = useMemo(() => computeTrends(recordsAsc), [recordsAsc]);
  const streaks = useMemo(() => computeGlobalStreaks(recordsAsc), [recordsAsc]);

  const distribution = useMemo(() => {
    const counts = Object.fromEntries(RANK_ORDER.map((r) => [r, 0]));
    recordsAsc.forEach((r) => {
      counts[r.computed.rank] += 1;
    });
    return RANK_ORDER.slice().reverse().map((rank) => ({ rank, count: counts[rank] }));
  }, [recordsAsc]);

  if (recordsAsc.length === 0) {
    return (
      <div>
        <PageHead eyebrow="Trends" title="Analytics" sub="Charts, streaks, and rank distribution." />
        <div className="dpt-card dpt-empty">
          <BarChart3 size={24} />
          <div style={{ marginTop: 8 }}>Log a few days to unlock analytics.</div>
        </div>
      </div>
    );
  }

  const chartData = last7.map((r) => ({
    date: formatDateLabel(r.date),
    studyHours: +(r.computed.studyTotal / 60).toFixed(2),
    effectiveHours: +(r.computed.studyEffective / 60).toFixed(2),
    efficiency: Math.round(r.computed.studyEfficiency),
    skillHours: +(r.computed.skillTotal / 60).toFixed(2),
    meditation: r.meditation.minutes,
    score: Math.round(r.computed.overallScore),
  }));

  const avgScore = Math.round(chartData.reduce((a, d) => a + d.score, 0) / chartData.length);
  const avgRank = getRank(avgScore);

  return (
    <div>
      <PageHead eyebrow="Trends" title="Analytics" sub={`Last ${last7.length} day${last7.length === 1 ? "" : "s"} · full history below.`} />

      <div className="dpt-card" style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
        <StreakStat icon={<Flame size={15} color="var(--gold)" />} label="Current streak" value={`${streaks.currentStreak}d`} />
        <StreakStat icon={<Flame size={15} color="var(--teal)" />} label="S-or-higher streak" value={`${streaks.sOrHigherStreak}d`} />
        <StreakStat label="Best rank" value={streaks.bestRank} />
        <StreakStat label="Best score" value={streaks.bestScore} />
        <StreakStat label="7-day avg score" value={avgScore} />
        <StreakStat label="7-day avg rank" value={avgRank} />
      </div>

      {trends && (
        <div className="dpt-card">
          <div className="dpt-card-title">Trend detection</div>
          <div style={{ display: "flex", gap: 22, flexWrap: "wrap" }}>
            {trends.map((t) => (
              <div key={t.key} className="dpt-tag">
                {t.label} <span className="dpt-mono" style={{ color: t.arrow === "↑" ? "var(--teal)" : t.arrow === "↓" ? "var(--rust)" : "var(--text-faint)", fontSize: 15 }}>{t.arrow}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="dpt-grid dpt-grid-2">
        <ChartCard title="Study vs effective hours">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="#2A2F3B" vertical={false} />
              <XAxis dataKey="date" tick={CHART_TEXT} axisLine={{ stroke: "#2A2F3B" }} tickLine={false} />
              <YAxis tick={CHART_TEXT} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#1E222B", border: "1px solid #2A2F3B", fontSize: 12 }} />
              <Line type="monotone" dataKey="studyHours" stroke="#6C8EBF" strokeWidth={2} dot={false} name="Study (h)" />
              <Line type="monotone" dataKey="effectiveHours" stroke="#C9A15C" strokeWidth={2} dot={false} name="Effective (h)" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Study efficiency %">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="#2A2F3B" vertical={false} />
              <XAxis dataKey="date" tick={CHART_TEXT} axisLine={{ stroke: "#2A2F3B" }} tickLine={false} />
              <YAxis tick={CHART_TEXT} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: "#1E222B", border: "1px solid #2A2F3B", fontSize: 12 }} />
              <Line type="monotone" dataKey="efficiency" stroke="#6FAF9E" strokeWidth={2} dot={{ r: 3 }} name="Efficiency %" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Skill hours">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="#2A2F3B" vertical={false} />
              <XAxis dataKey="date" tick={CHART_TEXT} axisLine={{ stroke: "#2A2F3B" }} tickLine={false} />
              <YAxis tick={CHART_TEXT} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#1E222B", border: "1px solid #2A2F3B", fontSize: 12 }} />
              <Bar dataKey="skillHours" fill="#6C8EBF" radius={[2, 2, 0, 0]} name="Skill (h)" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Overall score">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="#2A2F3B" vertical={false} />
              <XAxis dataKey="date" tick={CHART_TEXT} axisLine={{ stroke: "#2A2F3B" }} tickLine={false} />
              <YAxis tick={CHART_TEXT} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: "#1E222B", border: "1px solid #2A2F3B", fontSize: 12 }} />
              <Line type="monotone" dataKey="score" stroke="#C9A15C" strokeWidth={2} dot={{ r: 3 }} name="Score" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="dpt-card">
        <div className="dpt-card-title">Rank distribution — all time</div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={distribution} layout="vertical" margin={{ top: 6, right: 20, left: 4, bottom: 0 }}>
            <CartesianGrid stroke="#2A2F3B" horizontal={false} />
            <XAxis type="number" tick={CHART_TEXT} axisLine={false} tickLine={false} allowDecimals={false} />
            <YAxis type="category" dataKey="rank" tick={{ ...CHART_TEXT, fontSize: 12 }} axisLine={false} tickLine={false} width={38} />
            <Tooltip contentStyle={{ background: "#1E222B", border: "1px solid #2A2F3B", fontSize: 12 }} />
            <Bar dataKey="count" radius={[0, 3, 3, 0]}>
              {distribution.map((d, i) => (
                <Cell key={i} fill={rankTier(d.rank).ring} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="dpt-card">
      <div className="dpt-card-title">{title}</div>
      {children}
    </div>
  );
}
