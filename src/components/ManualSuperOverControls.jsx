import React, { useEffect, useRef, useState } from "react";

const API = "/api/admin/so-control";

const ist = (value) =>
  new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(value));

const initial = [
  { back: 95, lay: 105 },
  { back: 95, lay: 105 },
];

async function api(path = "", body) {
  const r = await fetch(API + path, {
    credentials: "same-origin",
    cache: "no-store",
    ...(body
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });

  const data = await r.json();

  if (!r.ok) {
    throw new Error(data.error || "Unable to connect.");
  }

  return data;
}

export default function ManualSuperOverControls({ onBack }) {
  const [data, setData] = useState(null),
    [selected, setSelected] = useState(""),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");

  const [plan, setPlan] = useState(Array(12).fill(null)),
    [rates, setRates] = useState(initial),
    [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false);

  const [editVersion, setEditVersion] = useState(null);

  const alive = useRef(false),
    polling = useRef(false),
    current = useRef(null),
    refresh = useRef(() => {});

  useEffect(() => {
    alive.current = true;

    async function load() {
      if (polling.current) return;

      polling.current = true;

      try {
        const d = await api();

        if (alive.current) {
          setData(d);
          setError("");
        }
      } catch (e) {
        if (alive.current) setError(e.message);
      } finally {
        polling.current = false;
      }
    }

    refresh.current = load;
    load();

    const timer = setInterval(load, 1000);

    return () => {
      alive.current = false;
      clearInterval(timer);
    };
  }, []);

  const row =
    data?.matches.find((m) => m.id === selected) || null;

  current.current = row;

  useEffect(() => {
    if (!data || selected) return;

    const now = Date.parse(data.serverTime);

    const first =
      data.matches.find(
        (m) => m.ready && Date.parse(m.startAt) + 120000 > now,
      ) ||
      data.matches.find(
        (m) => Date.parse(m.releaseAt) > now,
      );

    if (first) setSelected(first.id);
  }, [data, selected]);

  useEffect(() => {
    if (!row || dirty) return;

    setPlan([...row.plan]);
    setRates(row.rates.map((r) => ({ ...r })));
    setEditVersion(row.version);
  }, [row, dirty]);

  const choose = (id) => {
    setSelected(id);
    setDirty(false);
    setMessage("");
  };

  const updatePlan = (i, value) => {
    setPlan((p) =>
      p.map((v, n) => (n === i ? value : v)),
    );

    setDirty("PLAN");
  };

  const updateRate = (i, key, value) => {
    setRates((p) =>
      p.map((r, n) =>
        n === i ? { ...r, [key]: Number(value) } : r,
      ),
    );

    setDirty("RATES");
  };

  async function act(action) {
    if (!row || busy) return;

    setBusy(true);
    setMessage("");
    setError("");

    try {
      const body = {
        action,
        version: editVersion,
      };

      if (action === "SAVE_PLAN") body.plan = plan;
      if (action === "SET_RATES") body.rates = rates;

      await api("/" + row.id, body);

      setDirty(false);
      setMessage(
        "Saved. Customer views use the server state.",
      );

      await refresh.current();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const reset = () => {
    if (!row) return;

    setDirty(false);
    setPlan([...row.plan]);
    setRates(row.rates.map((r) => ({ ...r })));
    setEditVersion(row.version);
    setError("");
  };

  const now = data
      ? Date.parse(data.serverTime)
      : Date.now(),
    ended =
      row &&
      (row.settled ||
        now >= Date.parse(row.startAt) + 120000);

  const stale = Boolean(
    row && dirty && row.version !== editVersion,
  );

  const lockFor = (index) =>
    row?.committed.some(
      (b) => b.team * 6 + b.teamBall - 1 === index,
    );

  const firstDone = Boolean(
    row?.public &&
      (row.public.scores[0].balls.length === 6 ||
        row.public.scores[0].wickets === 2),
  );

  return (
    <main className="so-admin min-h-screen bg-[#061c1a] p-4 text-white">
      <style>{`
        .so-admin select,
        .so-admin input {
          background: #102e2a;
          color: white;
          border: 1px solid #3b786b;
          border-radius: 7px;
          padding: 10px;
          max-width: 100%;
        }

        .so-admin button {
          border-radius: 9px;
          padding: 11px 15px;
          font-weight: 800;
        }

        .so-admin button:disabled {
          opacity: .4;
          cursor: not-allowed;
        }

        .so-admin .panel {
          border: 1px solid #286c5f;
          background: #0b2b26;
          border-radius: 14px;
          padding: 16px;
          margin-top: 16px;
        }

        .so-admin .action {
          background: #5eead4;
          color: #052e26;
        }

        .so-admin .muted {
          color: #b4c6c0;
          font-size: 12px;
          line-height: 1.7;
        }
      `}</style>

      <div className="mx-auto max-w-5xl">
        <button
          type="button"
          className="border border-white/20"
          onClick={onBack}
        >
          ← GAME IDs
        </button>

        <h1 className="mt-6 text-2xl font-black text-amber-300">
          SUPER OVER · ADMIN CONTROL
        </h1>

        <p className="muted mt-2">
          Prepare six results per team. Publish before the
          five-minute release deadline. Each ball: 8 seconds
          betting, 2 seconds locked. At most 2 minutes per
          match.
        </p>

        <section className="panel">
          <label className="block text-sm font-bold">
            MATCH · IST
          </label>

          <select
            aria-label="Select match"
            className="mt-3 w-full"
            value={selected}
            onChange={(e) => choose(e.target.value)}
          >
            <option value="">Select a match</option>

            {data?.matches.map((m) => (
              <option key={m.id} value={m.id}>
                {ist(m.startAt)} · {m.teams.join(" vs ")} ·{" "}
                {m.settled
                  ? "COMPLETE"
                  : m.ready
                    ? "PREPARED"
                    : "DRAFT"}
              </option>
            ))}
          </select>

          {row && (
            <>
              <p className="mt-3 font-bold">
                {row.teams.join(" vs ")}
              </p>

              <p className="muted">
                Release: {ist(row.releaseAt)} IST
                <br />
                Start: {ist(row.startAt)} IST
                <br />
                Status:{" "}
                {row.settled
                  ? "COMPLETE"
                  : row.ready
                    ? now < Date.parse(row.releaseAt)
                      ? "PREPARED · NOT RELEASED"
                      : "RELEASED"
                    : "DRAFT · NOT VISIBLE TO CUSTOMERS"}
              </p>
            </>
          )}
        </section>

        {row && (
          <>
            <section className="panel">
              <h2 className="font-black text-cyan-200">
                BALL RESULTS · ADMIN ONLY
              </h2>

              <p className="muted mt-2">
                A ball locks as its betting window opens.
                The first ball locks at the five-minute
                pre-match release. Fill the complete queue
                before publishing. Unopened balls can be
                changed live.
              </p>

              {row.teams.map((team, t) => (
                <div key={team} className="mt-5">
                  <h3 className="font-bold">{team}</h3>

                  <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6">
                    {Array.from({ length: 6 }, (_, b) => {
                      const i = t * 6 + b,
                        locked = lockFor(i),
                        skipped =
                          t === 0 && firstDone && !locked;

                      return (
                        <label key={i} className="text-xs">
                          <span className="mb-2 block">
                            BALL {b + 1}
                          </span>

                          <select
                            aria-label={`${team} ball ${b + 1}`}
                            value={
                              plan[i] === null
                                ? ""
                                : String(plan[i])
                            }
                            disabled={
                              busy ||
                              ended ||
                              locked ||
                              skipped ||
                              dirty === "RATES"
                            }
                            onChange={(e) =>
                              updatePlan(
                                i,
                                e.target.value === ""
                                  ? null
                                  : e.target.value === "W"
                                    ? "W"
                                    : Number(e.target.value),
                              )
                            }
                            className="w-full"
                          >
                            <option value="">—</option>

                            {[0, 1, 2, 3, 4, 6, "W"].map(
                              (v) => (
                                <option key={v} value={v}>
                                  {v === "W"
                                    ? "WICKET"
                                    : v}
                                </option>
                              ),
                            )}
                          </select>

                          <span className="muted mt-1 block">
                            {locked
                              ? "LOCKED"
                              : skipped
                                ? "SKIPPED"
                                : "EDITABLE"}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  className="action"
                  disabled={
                    busy ||
                    ended ||
                    stale ||
                    dirty === "RATES"
                  }
                  onClick={() => act("SAVE_PLAN")}
                >
                  SAVE BALL QUEUE
                </button>

                <button
                  type="button"
                  className="border border-white/20"
                  disabled={busy}
                  onClick={reset}
                >
                  RELOAD SAVED VALUES
                </button>

                <button
                  type="button"
                  className="bg-amber-300 text-black"
                  disabled={
                    busy ||
                    ended ||
                    dirty ||
                    row.ready ||
                    now >= Date.parse(row.releaseAt) ||
                    plan.some((v) => v === null)
                  }
                  onClick={() => act("PUBLISH")}
                >
                  PUBLISH PREPARED MATCH
                </button>
              </div>

              {row.ready && (
                <p className="muted mt-3">
                  Published. Save only future editable balls;
                  committed balls cannot be changed.
                </p>
              )}
            </section>

            <section className="panel">
              <h2 className="font-black text-cyan-200">
                LIVE MATCH RATES · MANUAL
              </h2>

              <p className="muted mt-2">
                Initial Back points: 95 / 95. Lay defaults
                to 105 on each team. Existing bets retain
                their accepted points; new rates apply to
                new bets only.
              </p>

              {row.teams.map((team, i) => (
                <div
                  key={team}
                  className="mt-4 grid grid-cols-3 items-end gap-3"
                >
                  <strong className="text-sm">
                    {team}
                  </strong>

                  {["back", "lay"].map((key) => (
                    <label
                      key={key}
                      className="text-xs uppercase"
                    >
                      {key}

                      <input
                        aria-label={`${team} ${key}`}
                        className="mt-2 w-full"
                        type="number"
                        min="1"
                        max="999"
                        value={rates[i][key]}
                        disabled={
                          busy ||
                          ended ||
                          dirty === "PLAN"
                        }
                        onChange={(e) =>
                          updateRate(
                            i,
                            key,
                            e.target.value,
                          )
                        }
                      />
                    </label>
                  ))}
                </div>
              ))}

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  className="action"
                  disabled={
                    busy ||
                    ended ||
                    stale ||
                    dirty === "PLAN"
                  }
                  onClick={() => act("SET_RATES")}
                >
                  SAVE LIVE RATES
                </button>

                <button
                  type="button"
                  className="bg-amber-300 text-black"
                  disabled={busy || ended || dirty}
                  onClick={() =>
                    act(
                      row.market_closed
                        ? "OPEN_MARKET"
                        : "CLOSE_MARKET",
                    )
                  }
                >
                  {row.market_closed
                    ? "OPEN MARKET"
                    : "CLOSE MARKET"}
                </button>
              </div>

              {row.public && (
                <p className="muted mt-4">
                  Customer market: {row.public.phase}
                  <br />
                  {row.public.lockReason ||
                    "Current manual rates are active during open betting windows."}
                </p>
              )}
            </section>

            {row.public && (
              <section className="panel">
                <h2 className="font-black">
                  LIVE SCORE
                </h2>

                <div className="mt-3 grid grid-cols-2 gap-4">
                  {row.teams.map((team, i) => (
                    <p key={team}>
                      {team}
                      <br />

                      <strong className="text-2xl">
                        {row.public.scores[i].runs}/
                        {row.public.scores[i].wickets}
                      </strong>{" "}
                      ({row.public.scores[i].overs})
                    </p>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {stale && (
          <p
            role="alert"
            className="panel text-amber-200"
          >
            Another Admin changed this match. Reload saved
            values before editing further.
          </p>
        )}

        {(error || message) && (
          <p
            role="status"
            className="panel text-amber-100"
          >
            {error || message}
          </p>
        )}
      </div>
    </main>
  );
}
