import React, {
  useEffect,
  useRef,
  useState,
} from "react";

async function request(options = {}) {
  const response = await fetch(
    "/api/admin/settings/sports-feed",
    {
      credentials: "same-origin",
      cache: "no-store",
      ...options,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error ||
        "Unable to load Sports API settings.",
    );
  }

  return data;
}

function time(value) {
  return value
    ? new Date(value).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      }) + " IST"
    : "No update saved yet";
}

export default function AdminSportsApiSettings() {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const mounted = useRef(false);
  const pending = useRef(false);
  const revision = useRef(0);

  useEffect(() => {
    mounted.current = true;

    let loading = false;

    const load = async () => {
      if (loading || pending.current) return;

      loading = true;

      const current = revision.current;

      try {
        const next = await request();

        if (
          mounted.current &&
          current === revision.current &&
          !pending.current
        ) {
          setData(next);
          setError("");
        }
      } catch (requestError) {
        if (
          mounted.current &&
          current === revision.current &&
          !pending.current
        ) {
          setError(requestError.message);
        }
      } finally {
        loading = false;
      }
    };

    void load();

    const timer = setInterval(load, 5000);

    return () => {
      mounted.current = false;
      clearInterval(timer);
    };
  }, []);

  const change = async enabled => {
    if (!data || pending.current) return;

    pending.current = true;
    revision.current += 1;

    setBusy(true);
    setMessage("");
    setError("");

    try {
      const next = await request({
        method: "POST",
        body: JSON.stringify({
          enabled,
          version: data.version,
        }),
      });

      if (mounted.current) {
        setData(next);

        setMessage(
          enabled
            ? "ON saved. Sports updates run automatically every 5 seconds."
            : "OFF saved. Provider calls stopped; saved matches remain visible.",
        );
      }
    } catch (requestError) {
      if (mounted.current) {
        setError(requestError.message);
      }

      try {
        const next = await request();

        if (mounted.current) {
          setData(next);
        }
      } catch {
        // Keep the previous state visible.
        // The next automatic refresh retries.
      }
    } finally {
      pending.current = false;

      if (mounted.current) {
        setBusy(false);
      }
    }
  };

  return (
    <section className="rounded-2xl border border-teal-700 bg-[#083d37] p-5 text-white">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-black text-amber-200">
          SPORTS API · SPORTMONKS
        </h2>

        <span
          className={`rounded-full px-3 py-1 text-xs font-black ${
            data?.enabled
              ? "bg-emerald-300 text-black"
              : "bg-slate-700 text-white"
          }`}
        >
          {!data
            ? "LOADING"
            : data.enabled
              ? "ON"
              : "OFF"}
        </span>
      </div>

      <p className="mt-3 text-sm leading-6 text-cyan-100">
        ON: the server updates live scores every
        5 seconds for all customers. OFF: provider
        calls stop. Saved live and upcoming matches
        remain visible, including after a refresh
        or server restart.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={!data || busy || data.enabled}
          onClick={() => change(true)}
          className="rounded-xl bg-emerald-300 py-3 font-black text-black disabled:opacity-40"
        >
          {busy ? "SAVING…" : "ON"}
        </button>

        <button
          type="button"
          disabled={!data || busy || !data.enabled}
          onClick={() => change(false)}
          className="rounded-xl bg-rose-600 py-3 font-black text-white disabled:opacity-40"
        >
          {busy ? "SAVING…" : "OFF"}
        </button>
      </div>

      {message && (
        <p
          role="status"
          className="mt-4 text-sm text-emerald-200"
        >
          {message}
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mt-4 text-sm text-amber-200"
        >
          {error}
        </p>
      )}

      {data && (
        <div className="mt-5 space-y-2 text-sm text-slate-200">
          <p>
            Mode:{" "}
            <strong>
              {data.mode === "demo"
                ? "DEMO / MOCK"
                : "LIVE"}
            </strong>
          </p>

          <p>
            Live score interval:{" "}
            <strong>5 seconds</strong>
          </p>

          <p>
            Upcoming schedule refresh:{" "}
            <strong>
              every 5 minutes while ON
            </strong>
          </p>

          <p>
            Saved matches:{" "}
            <strong>{data.savedMatches}</strong>
          </p>

          <p>
            Last score update:{" "}
            {time(data.lastUpdated)}
          </p>

          <p>
            Last schedule update:{" "}
            {time(data.scheduleUpdatedAt)}
          </p>

          <p>
            Connection:{" "}
            {data.mode === "demo"
              ? "Demo feed"
              : data.apiConnected
                ? "Connected"
                : data.enabled
                  ? "Waiting / unavailable"
                  : "Paused by Admin"}
          </p>

          {!data.configured && (
            <p className="text-amber-200">
              SPORTMONKS_API_TOKEN is missing
              in Render Environment.
            </p>
          )}

          {data.error && (
            <p className="text-amber-200">
              {data.error}
            </p>
          )}

          {data.scheduleError && (
            <p className="text-amber-200">
              Schedule: {data.scheduleError}
            </p>
          )}

          {data.retryAt && (
            <p className="text-amber-200">
              Provider retry after:{" "}
              {time(data.retryAt)}
            </p>
          )}

          <p className="pt-2 text-xs leading-5 text-slate-300">
            The current live integration supplies
            Cricket. Football and other sports need
            their own provider integration.
            Settings are saved automatically.
            You can close this page after
            switching ON or OFF.
          </p>
        </div>
      )}
    </section>
  );
}
