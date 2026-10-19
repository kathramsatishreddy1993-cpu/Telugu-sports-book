import React, { useEffect, useState } from "react";

const ist = (value) =>
  new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));

async function getJSON(url) {
  const response = await fetch(url, {
    cache: "no-store",
    credentials: "same-origin",
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Unable to load matches.");
  return data;
}

// Ignore incomplete fixtures rather than assigning a fabricated date or opponent.
export function normalizeApiMatch(item) {
  if (!item || typeof item !== "object") return null;
  const type = String(
    item.dataFeedType || item.feedType || item.provider || item.source || "",
  );
  if (
    /mock|demo|sample/i.test(type) ||
    item.isMock === true ||
    item.isDemo === true
  )
    return null;
  const home =
    item.home_team || item.homeTeam || item.team1?.name || item.team1;
  const away =
    item.away_team || item.awayTeam || item.team2?.name || item.team2;
  const teams =
    typeof home === "string" && typeof away === "string"
      ? `${home} vs ${away}`
      : typeof item.teams === "string"
        ? item.teams
        : Array.isArray(item.teams) && item.teams.length === 2
          ? item.teams
              .map((t) => (typeof t === "string" ? t : t?.name))
              .filter(Boolean)
              .join(" vs ")
          : "";
  const start = Date.parse(
    item.commence_time ||
      item.startTime ||
      item.startAt ||
      item.start_time ||
      item.date ||
      "",
  );
  const status = String(item.status || "").toUpperCase();
  if (
    !teams ||
    !Number.isFinite(start) ||
    item.id === undefined ||
    item.id === null ||
    ["COMPLETED", "FINISHED", "CANCELLED", "ABANDONED", "ENDED"].includes(
      status,
    )
  )
    return null;
  const odds =
    Array.isArray(item.odds) &&
    item.odds.every((o) => typeof o === "string" || typeof o === "number")
      ? item.odds
      : [];
  return {
    ...item,
    key: `api-${item.id}`,
    type: "API",
    start,
    teams,
    date: `${ist(start)} IST`,
    odds,
    live:
      item.live === true ||
      item.isLive === true ||
      ["LIVE", "INPLAY", "IN_PLAY"].includes(status),
  };
}

export default function CricketMatchList({ onOpenMatch }) {
  const [virtual, setVirtual] = useState([]),
    [real, setReal] = useState([]);
  const [error, setError] = useState("");
  const [anchor, setAnchor] = useState({
    server: Date.now(),
    local: performance.now(),
  });
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let alive = true,
      loading = false;
    const load = async () => {
      if (loading) return;
      loading = true;
      try {
        const data = await getJSON("/api/animated-cricket/schedule");
        if (alive) {
          const server = Date.parse(data.serverTime);
          if (Number.isFinite(server))
            setAnchor({ server, local: performance.now() });
          setVirtual(
            (data.matches || [])
              .slice(0, 3)
              .map((m) => ({
                key: `so-${m.startAt}`,
                type: "SO",
                start: Date.parse(m.startAt),
                end:
                  Date.parse(m.endsAt || "") || Date.parse(m.startAt) + 120000,
                teams: m.teams.join(" vs "),
                phase: m.phase,
              }))
              .filter((m) => Number.isFinite(m.start)),
          );
          setError("");
        }
      } catch (e) {
        if (alive) setError(e.message);
      } finally {
        loading = false;
      }
    };
    load();
    const timer = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let alive = true,
      loading = false;
    const load = async () => {
      if (loading) return;
      loading = true;
      try {
        const health = await getJSON("/api/health");
        if (health.apiConnected !== true) {
          if (alive) setReal([]);
          return;
        }
        const data = await getJSON("/api/sports/events?sport=cricket");
        const feed = String(
          data.dataFeedType ||
            data.feedType ||
            data.provider ||
            data.source ||
            "",
        );
        const rows = /mock|demo|sample/i.test(feed)
          ? []
          : Array.isArray(data.data)
            ? data.data
            : Array.isArray(data.events)
              ? data.events
              : [];
        if (alive) {
          const unique = new Map(
            rows
              .map(normalizeApiMatch)
              .filter(Boolean)
              .map((m) => [m.key, m]),
          );
          setReal([...unique.values()]);
        }
      } catch {
        if (alive) setReal([]);
      } finally {
        loading = false;
      }
    };
    load();
    const timer = setInterval(load, 30000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const update = () =>
      setNow(anchor.server + performance.now() - anchor.local);
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [anchor]);

  const fixtures = [...virtual.filter((m) => m.end > now), ...real].sort(
    (a, b) => a.start - b.start || a.key.localeCompare(b.key),
  );

  return (
    <div aria-label="Cricket match list">
      {error && (
        <p role="alert" className="my-3 text-xs text-amber-300">
          {error}
        </p>
      )}
      {fixtures.map((match) => {
        const live =
          match.type === "SO"
            ? now >= match.start && now < match.end
            : match.live;
        const open = () => {
          if (match.type === "SO")
            window.location.assign(
              `/games/animated-super-over?start=${match.start}`,
            );
          else onOpenMatch?.(match);
        };
        return (
          <article
            key={match.key}
            aria-label={match.teams}
            className="mb-3 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#111827] to-[#0c1320] shadow-xl"
          >
            <div className="flex items-start justify-between gap-3 px-4 py-4">
              <div className="min-w-0 flex-1">
                <div
                  className={`mb-2 text-[9px] font-black uppercase tracking-wider ${live ? "text-red-400" : "text-cyan-300"}`}
                >
                  {live ? "● LIVE" : "● UPCOMING"}
                </div>
                <button
                  type="button"
                  onClick={open}
                  className="block w-full text-left text-[13px] font-black leading-5 text-white"
                >
                  {match.teams}
                </button>
                <p className="mt-2 text-[11px] font-bold text-emerald-300">
                  {ist(match.start)} IST
                </p>
              </div>
              <button
                type="button"
                onClick={open}
                className="shrink-0 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-[10px] font-black text-cyan-300"
              >
                OPEN ›
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
