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

  if (!response.ok) {
    throw new Error(
      data.error || "Unable to load matches.",
    );
  }

  return data;
}

function parseStart(value) {
  if (typeof value === "number") {
    return value < 100000000000
      ? value * 1000
      : value;
  }

  if (
    typeof value === "string" &&
    /^\d{10,13}$/.test(value)
  ) {
    return parseStart(Number(value));
  }

  return Date.parse(value || "");
}

export function normalizeApiMatch(item, feed = "") {
  if (!item || typeof item !== "object") return null;

  const home =
    item.home_team ||
    item.homeTeam?.name ||
    item.homeTeam ||
    item.team1?.name ||
    item.team1;

  const away =
    item.away_team ||
    item.awayTeam?.name ||
    item.awayTeam ||
    item.team2?.name ||
    item.team2;

  const names = Array.isArray(item.teams)
    ? item.teams
        .map((t) =>
          typeof t === "string" ? t : t?.name,
        )
        .filter(Boolean)
    : [];

  const teams =
    typeof home === "string" &&
    typeof away === "string"
      ? `${home} vs ${away}`
      : typeof item.teams === "string"
        ? item.teams
        : names.length === 2
          ? names.join(" vs ")
          : item.title ||
            item.name ||
            item.eventName ||
            item.event_name ||
            "";

  const start = parseStart(
    item.commence_time ||
      item.startTime ||
      item.startAt ||
      item.start_time ||
      item.startDate ||
      item.start_date ||
      item.scheduledAt ||
      item.date,
  );

  const status = String(
    item.status || "",
  ).toUpperCase();

  if (
    typeof teams !== "string" ||
    !teams.trim() ||
    [
      "COMPLETED",
      "FINISHED",
      "CANCELLED",
      "ABANDONED",
      "ENDED",
    ].includes(status)
  ) {
    return null;
  }

  const source = String(
    item.dataFeedType ||
      item.feedType ||
      item.provider ||
      item.source ||
      feed,
  );

  const demo =
    /mock|demo|sample/i.test(source) ||
    item.isMock === true ||
    item.isDemo === true;

  const id =
    item.id ??
    item.eventId ??
    item.event_id ??
    `${teams}:${
      Number.isFinite(start) ? start : "pending"
    }`;

  return {
    ...item,
    id,
    key: `api-${id}`,
    type: "API",
    start: Number.isFinite(start) ? start : null,
    teams,
    date: Number.isFinite(start)
      ? `${ist(start)} IST`
      : "Time unavailable",
    demo,
    live:
      item.live === true ||
      item.isLive === true ||
      [
        "LIVE",
        "INPLAY",
        "IN_PLAY",
        "IN PROGRESS",
        "IN_PROGRESS",
      ].includes(status),
  };
}

function eventRows(data) {
  if (Array.isArray(data)) return data;

  for (const rows of [
    data?.data,
    data?.events,
    data?.matches,
    data?.data?.events,
    data?.data?.matches,
  ]) {
    if (Array.isArray(rows)) return rows;
  }

  return [];
}

export default function CricketMatchList({
  onOpenMatch,
}) {
  const [virtual, setVirtual] = useState([]);
  const [real, setReal] = useState([]);

  const [error, setError] = useState("");
  const [sportsError, setSportsError] = useState("");
  const [sportsLoaded, setSportsLoaded] =
    useState(false);
  const [feedDemo, setFeedDemo] = useState(false);

  const [anchor, setAnchor] = useState({
    server: Date.now(),
    local: performance.now(),
  });

  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let alive = true;
    let loading = false;

    const load = async () => {
      if (loading) return;
      loading = true;

      try {
        const data = await getJSON(
          "/api/animated-cricket/schedule",
        );

        if (alive) {
          const server = Date.parse(data.serverTime);

          if (Number.isFinite(server)) {
            setAnchor({
              server,
              local: performance.now(),
            });
          }

          setVirtual(
            (data.matches || [])
              .slice(0, 3)
              .map((m) => ({
                key: `so-${m.startAt}`,
                type: "SO",
                start: Date.parse(m.startAt),
                end:
                  Date.parse(m.endsAt || "") ||
                  Date.parse(m.startAt) + 120000,
                teams: m.teams.join(" vs "),
                phase: m.phase,
              }))
              .filter((m) =>
                Number.isFinite(m.start),
              ),
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
    let alive = true;
    let loading = false;

    const load = async () => {
      if (loading) return;
      loading = true;

      try {
        const data = await getJSON(
          "/api/sports/events?sport=cricket",
        );

        const feed = String(
          data.dataFeedType ||
            data.feedType ||
            data.provider ||
            data.source ||
            "",
        );

        const rows = eventRows(data);

        if (alive) {
          const unique = new Map(
            rows
              .map((item) =>
                normalizeApiMatch(item, feed),
              )
              .filter(Boolean)
              .map((m) => [m.key, m]),
          );

          setReal([...unique.values()]);
          setFeedDemo(
            /mock|demo|sample/i.test(feed),
          );
          setSportsError("");
          setSportsLoaded(true);
        }
      } catch (e) {
        if (alive) {
          setSportsError(e.message);
          setSportsLoaded(true);
        }
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
      setNow(
        anchor.server +
          performance.now() -
          anchor.local,
      );

    update();

    const timer = setInterval(update, 1000);

    return () => clearInterval(timer);
  }, [anchor]);

  const fixtures = [
    ...virtual.filter((m) => m.end > now),
    ...real,
  ].sort(
    (a, b) =>
      (a.start ?? Infinity) -
        (b.start ?? Infinity) ||
      a.key.localeCompare(b.key),
  );

  return (
    <div aria-label="Cricket match list">
      {(error || sportsError) && (
        <p
          role="alert"
          className="my-3 text-xs text-amber-800"
        >
          {sportsError
            ? `Sports feed: ${sportsError}.`
            : ""}

          {sportsError && real.length > 0
            ? " Showing the last received list; it may be outdated."
            : ""}

          {error ? ` Super Over: ${error}` : ""}
        </p>
      )}

      {fixtures.length === 0 && (
        <div
          role="status"
          className="my-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700"
        >
          {!sportsLoaded
            ? "Loading sports matches…"
            : sportsError
              ? "Sports matches could not be loaded. Retrying automatically."
              : feedDemo
                ? "The demo feed currently has no cricket fixtures."
                : "The sports server returned no cricket fixtures. Prepared Super Over matches appear five minutes before start."}
        </div>
      )}

      {fixtures.map((match) => {
        const live =
          match.type === "SO"
            ? now >= match.start && now < match.end
            : match.live;

        const open = () => {
          if (match.type === "SO") {
            window.location.assign(
              `/games/animated-super-over?start=${match.start}`,
            );
          } else {
            onOpenMatch?.(match);
          }
        };

        return (
          <article
            key={match.key}
            aria-label={match.teams}
            className="mb-3 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3 px-4 py-4">
              <div className="min-w-0 flex-1">
                <div
                  className={`mb-2 text-[9px] font-black uppercase tracking-wider ${
                    live
                      ? "text-red-600"
                      : "text-teal-700"
                  }`}
                >
                  {match.demo
                    ? "● DEMO FEED"
                    : live
                      ? "● LIVE"
                      : "● UPCOMING"}
                </div>

                <button
                  type="button"
                  onClick={open}
                  className="block w-full text-left text-[13px] font-black leading-5 text-slate-900"
                >
                  {match.teams}
                </button>

                <p className="mt-2 text-[11px] font-bold text-teal-700">
                  {match.start === null
                    ? "Time unavailable"
                    : `${ist(match.start)} IST`}
                </p>
              </div>

              <button
                type="button"
                onClick={open}
                className="shrink-0 rounded-lg border border-[#791b3e] bg-[#791b3e] px-3 py-2 text-[10px] font-black text-white"
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
