import React, {
  useEffect,
  useRef,
  useState,
} from "react";

const NUMBERS = [
  "1", "2", "5", "10", "20", "40",
];

const MAX_BONUSES = 3;

async function api(
  path,
  method = "GET",
  body,
) {
  const controller =
    new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    15000,
  );

  try {
    const response = await fetch(
      path,
      {
        method,
        credentials: "same-origin",
        cache: "no-store",
        signal: controller.signal,

        headers:
          body === undefined
            ? {
                Accept: "application/json",
              }
            : {
                Accept: "application/json",
                "Content-Type":
                  "application/json",
              },

        ...(
          body === undefined
            ? {}
            : {
                body:
                  JSON.stringify(body),
              }
        ),
      },
    );

    const value =
      await response.json();

    if (
      !response.ok ||
      value.success === false
    ) {
      throw Object.assign(
        new Error(
          value.error ||
            "Request failed.",
        ),
        {
          status: response.status,
        },
      );
    }

    return value;
  } finally {
    clearTimeout(timeout);
  }
}

function newKey() {
  const bytes =
    new Uint8Array(20);

  window.crypto.getRandomValues(
    bytes,
  );

  return Array.from(
    bytes,
    value =>
      value
        .toString(16)
        .padStart(2, "0"),
  ).join("");
}

const storageKey = id =>
  `tsb_dream_publish_v1:${id}`;

function readPending(id) {
  try {
    const value = JSON.parse(
      sessionStorage.getItem(
        storageKey(id),
      ) || "null",
    );

    return value?.controllerId === id &&
      typeof value.body?.requestKey ===
        "string" &&
      Array.isArray(
        value.body.outcomes,
      )
      ? value.body
      : null;
  } catch {
    return null;
  }
}

function savePending(id, body) {
  try {
    sessionStorage.setItem(
      storageKey(id),

      JSON.stringify({
        controllerId: id,
        body,
      }),
    );

    return true;
  } catch {
    return false;
  }
}

function removePending(id) {
  try {
    sessionStorage.removeItem(
      storageKey(id),
    );
  } catch {}
}

export default function DreamWheelControlPage({
  onBack,
}) {
  const [mode, setMode] =
    useState("checking");

  const [loginId, setLoginId] =
    useState("");

  const [
    loginPassword,
    setLoginPassword,
  ] = useState("");

  const [
    currentPassword,
    setCurrentPassword,
  ] = useState("");

  const [
    newPassword,
    setNewPassword,
  ] = useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    controllerId,
    setControllerId,
  ] = useState("");

  const [state, setState] =
    useState(null);

  const [bonuses, setBonuses] =
    useState([]);

  const [winner, setWinner] =
    useState("1");

  const [pending, setPending] =
    useState(null);

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState("");

  const [notice, setNotice] =
    useState("");

  const [now, setNow] =
    useState(Date.now());

  const [lastSync, setLastSync] =
    useState(0);

  const alive = useRef(false);
  const working = useRef(false);
  const reading = useRef(false);
  const offset = useRef(0);

  const controllerRef =
    useRef("");

  const pendingRef =
    useRef(null);

  const modeRef =
    useRef("checking");

  const loadRef =
    useRef(null);

  const revision =
    useRef(0);

  const round =
    state?.round;

  const canPublish =
    !round ||
    round.phase === "FINISHED";

  const stale =
    !lastSync ||
    Date.now() - lastSync > 5000;

  const formLocked =
    busy ||
    Boolean(pending) ||
    !canPublish ||
    stale;

  const plan = [
    ...bonuses,
    winner,
  ];

  const bonusProduct =
    bonuses.reduce(
      (product, value) =>
        product *
        (
          value === "2x"
            ? 2
            : 7
        ),
      1,
    );

  const profitOdds =
    Number(winner) *
    bonusProduct;

  const boundary =
    round?.phase === "WAITING"
      ? round.opensAt
      : round?.phase === "BETTING"
        ? round.closesAt
        : round?.phase === "SPINNING"
          ? round.spinEndsAt
          : round?.endsAt;

  const seconds =
    boundary
      ? Math.max(
          0,
          Math.ceil(
            (
              new Date(
                boundary,
              ).getTime() - now
            ) / 1000,
          ),
        )
      : 0;

  const changeMode = value => {
    modeRef.current = value;
    setMode(value);
  };

  const acceptController = id => {
    if (
      controllerRef.current !== id
    ) {
      controllerRef.current = id;

      setControllerId(id);

      const recovered =
        readPending(id);

      pendingRef.current =
        recovered;

      setPending(recovered);

      if (recovered) {
        setBonuses(
          recovered.outcomes.slice(
            0,
            -1,
          ),
        );

        setWinner(
          recovered.outcomes.at(-1),
        );
      }
    }
  };

  const load = async () => {
    if (
      reading.current ||
      working.current
    ) {
      return;
    }

    reading.current = true;

    const version =
      revision.current;

    const started =
      Date.now();

    try {
      const value = await api(
        "/api/dream-wheel/controller/state",
      );

      if (
        !alive.current ||
        version !== revision.current
      ) {
        return;
      }

      const finished =
        Date.now();

      offset.current =
        new Date(
          value.serverTime,
        ).getTime() -
        (started + finished) / 2;

      setNow(
        finished + offset.current,
      );

      setLastSync(finished);
      setState(value);

      acceptController(
        value.controllerId,
      );

      changeMode("ready");
    } catch (err) {
      if (
        !alive.current ||
        version !== revision.current
      ) {
        return;
      }

      if (
        err.status === 401 ||
        err.status === 403
      ) {
        const wasChecking =
          modeRef.current ===
          "checking";

        changeMode("login");

        setState(null);
        setLastSync(0);

        if (!wasChecking) {
          setError(
            "Login with your Dream Wheel controller ID. Complete password setup if required.",
          );
        }
      } else {
        setError(
          err.message ||
            "Unable to check controller session.",
        );

        if (
          modeRef.current ===
          "checking"
        ) {
          changeMode("login");
        }
      }
    } finally {
      reading.current = false;
    }
  };

  loadRef.current = load;

  useEffect(() => {
    alive.current = true;

    void loadRef.current();

    const poll = setInterval(
      () => {
        if (
          modeRef.current ===
          "ready"
        ) {
          void loadRef.current();
        }
      },
      1000,
    );

    const clock = setInterval(
      () => {
        if (alive.current) {
          setNow(
            Date.now() +
              offset.current,
          );
        }
      },
      250,
    );

    const focus = () => {
      if (
        modeRef.current ===
        "ready"
      ) {
        void loadRef.current();
      }
    };

    window.addEventListener(
      "focus",
      focus,
    );

    return () => {
      alive.current = false;

      clearInterval(poll);
      clearInterval(clock);

      window.removeEventListener(
        "focus",
        focus,
      );
    };
  }, []);

  const login = async event => {
    event.preventDefault();

    if (
      working.current
    ) {
      return;
    }

    if (
      !loginId.trim() ||
      !loginPassword
    ) {
      setError(
        "Enter controller ID and password.",
      );

      return;
    }

    working.current = true;
    revision.current += 1;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const value = await api(
        "/api/game-control/login",
        "POST",
        {
          id: loginId.trim(),
          password: loginPassword,
          game: "DREAM_WHEEL",
        },
      );

      if (!alive.current) return;

      setLoginPassword("");

      if (
        value.game !==
        "DREAM_WHEEL"
      ) {
        throw new Error(
          "This ID does not belong to Dream Wheel.",
        );
      }

      acceptController(
        value.controllerId,
      );

      if (
        value.mustChangePassword
      ) {
        changeMode("password");
      } else {
        changeMode("ready");
      }
    } catch (err) {
      if (alive.current) {
        setLoginPassword("");
        setError(err.message);
      }
    } finally {
      working.current = false;

      if (alive.current) {
        setBusy(false);

        if (
          modeRef.current ===
          "ready"
        ) {
          void loadRef.current();
        }
      }
    }
  };

  const changePassword =
    async event => {
      event.preventDefault();

      if (
        working.current
      ) {
        return;
      }

      if (
        !currentPassword ||
        newPassword.length < 12 ||
        new TextEncoder()
          .encode(newPassword)
          .length > 72 ||
        newPassword !==
          confirmPassword ||
        newPassword ===
          currentPassword
      ) {
        setError(
          "Use a different password of at least 12 characters, within 72 UTF-8 bytes, and matching confirmation.",
        );

        return;
      }

      working.current = true;
      revision.current += 1;

      setBusy(true);
      setError("");

      try {
        const value = await api(
          "/api/game-control/change-password",
          "POST",
          {
            currentPassword,
            newPassword,
            confirmPassword,
            game: "DREAM_WHEEL",
          },
        );

        if (
          !alive.current
        ) {
          return;
        }

        if (
          value.game !==
          "DREAM_WHEEL"
        ) {
          throw new Error(
            "Dream Wheel controller session required.",
          );
        }

        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");

        setNotice(
          "Password changed. Controller ready.",
        );

        changeMode("ready");
      } catch (err) {
        if (alive.current) {
          setCurrentPassword("");
          setError(err.message);
        }
      } finally {
        working.current = false;

        if (alive.current) {
          setBusy(false);

          if (
            modeRef.current ===
            "ready"
          ) {
            void loadRef.current();
          }
        }
      }
    };

  const publish = async event => {
    event?.preventDefault();

    if (
      working.current
    ) {
      return;
    }

    const id =
      controllerRef.current;

    let body =
      pendingRef.current;

    if (!body) {
      if (
        !canPublish ||
        stale
      ) {
        setError(
          "Wait for the current round to finish and the controller state to refresh.",
        );

        return;
      }

      if (
        !NUMBERS.includes(winner) ||
        bonuses.length >
          MAX_BONUSES ||
        bonuses.some(
          value =>
            !["2x", "7x"].includes(
              value,
            ),
        )
      ) {
        setError(
          "Choose a valid plan.",
        );

        return;
      }

      try {
        body = {
          requestKey:
            newKey(),

          outcomes: [
            ...bonuses,
            winner,
          ],
        };
      } catch {
        setError(
          "A secure HTTPS browser connection is required.",
        );

        return;
      }

      if (
        !savePending(
          id,
          body,
        )
      ) {
        setError(
          "Enable browser session storage before publishing so interrupted plans can be recovered.",
        );

        return;
      }

      pendingRef.current =
        body;

      setPending(body);
    }

    working.current = true;
    revision.current += 1;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const value = await api(
        "/api/dream-wheel/controller/rounds",
        "POST",
        body,
      );

      removePending(id);
      pendingRef.current = null;

      if (!alive.current) return;

      setPending(null);

      setNotice(
        value.replayed
          ? `Round #${value.roundId} recovered. No duplicate round created.`
          : `Round #${value.roundId} locked. Betting opens after the preparation countdown.`,
      );
    } catch (err) {
      if (!alive.current) return;

      if (
        [
          400,
          401,
          403,
          404,
          409,
          422,
        ].includes(err.status)
      ) {
        removePending(id);
        pendingRef.current = null;
        setPending(null);
      }

      setError(
        err.status
          ? err.message
          : "Connection interrupted. Retry the same plan; do not create another request.",
      );
    } finally {
      working.current = false;

      if (alive.current) {
        setBusy(false);

        void loadRef.current();
      }
    }
  };

  const logout = async () => {
    if (
      working.current
    ) {
      return;
    }

    working.current = true;
    revision.current += 1;

    setBusy(true);
    setError("");

    try {
      await api(
        "/api/game-control/logout",
        "POST",
        {},
      );

      if (alive.current) {
        controllerRef.current = "";
        pendingRef.current = null;

        setControllerId("");
        setPending(null);
        setState(null);
        setLastSync(0);
        setNotice("");

        setLoginPassword("");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");

        changeMode("login");
      }
    } catch (err) {
      if (alive.current) {
        setError(
          `Logout failed: ${err.message}`,
        );
      }
    } finally {
      working.current = false;

      if (alive.current) {
        setBusy(false);
      }
    }
  };

  return (
    <div className="dc-page">
      <style>{`
        .dc-page {
          min-height: 100vh;
          background:
            radial-gradient(
              ellipse at top,
              #2c2944,
              #0c1322 75%
            );
          color: #f4f2e9;
          font-family: Arial, sans-serif;
          padding-bottom: 25px;
        }

        .dc-page * {
          box-sizing: border-box;
        }

        .dc-page button,
        .dc-page input,
        .dc-page select {
          font: inherit;
        }

        .dc-page button {
          cursor: pointer;
        }

        .dc-page button:disabled {
          opacity: .45;
          cursor: default;
        }

        .dc-header {
          display: flex;
          gap: 12px;
          align-items: center;
          justify-content: space-between;
          padding: 18px;
          background: #0004;
          border-bottom:
            1px solid #ffffff20;
        }

        .dc-header h1 {
          font-size: 20px;
          margin: 0;
          color: #efd28a;
        }

        .dc-header p {
          font-size: 10px;
          color: #cec9df;
          margin: 6px 0 0;
        }

        .dc-wrap {
          max-width: 850px;
          margin: auto;
          padding: 15px;
        }

        .dc-card {
          border:
            1px solid #ffffff25;
          border-radius: 14px;
          background: #ffffff06;
          padding: 18px;
          margin-top: 14px;
        }

        .dc-card h2 {
          font-size: 18px;
          color: #ecd18c;
          margin-top: 0;
        }

        .dc-form {
          max-width: 430px;
          margin: 25px auto;
        }

        .dc-label {
          display: block;
          font-size: 12px;
          font-weight: bold;
          margin: 14px 0 7px;
          color: #e8dfcb;
        }

        .dc-input,
        .dc-select {
          width: 100%;
          background: #172536;
          color: #fff;
          border:
            1px solid #ffffff40;
          border-radius: 8px;
          padding: 13px;
        }

        .dc-btn {
          padding: 10px 13px;
          border:
            1px solid #ffffff30;
          border-radius: 8px;
          background: #ffffff10;
          color: inherit;
        }

        .dc-primary {
          width: 100%;
          border: 0;
          background: #e7ca7e;
          color: #292333;
          border-radius: 10px;
          font-weight: 900;
          padding: 15px;
          margin-top: 18px;
        }

        .dc-row {
          display: flex;
          gap: 9px;
          flex-wrap: wrap;
          align-items: center;
          margin-top: 12px;
        }

        .dc-hint {
          font-size: 12px;
          line-height: 1.8;
          color: #cbd4e3;
        }

        .dc-alert {
          border:
            1px solid #d3ac64;
          background: #4a331e;
          color: #ffe5ad;
          border-radius: 10px;
          padding: 12px;
          font-size: 13px;
          line-height: 1.7;
          margin: 12px 0;
        }

        .dc-notice {
          border:
            1px solid #5a9f92;
          background: #15332f;
          color: #cbf4e6;
          border-radius: 10px;
          padding: 12px;
          font-size: 13px;
          line-height: 1.7;
          margin: 12px 0;
        }

        .dc-plan {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
          padding: 14px;
          background: #0004;
          border-radius: 10px;
          margin-top: 12px;
        }

        .dc-plan span {
          background: #594479;
          border:
            1px solid #b596d2;
          border-radius: 8px;
          padding: 10px 14px;
          font-weight: bold;
          color: #f7e6ff;
        }

        .dc-plan span.dc-number {
          background: #68572c;
          border-color: #d6ba72;
          color: #fff0b9;
        }

        .dc-status {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
        }

        .dc-status strong {
          font-size: 19px;
          color: #f1d592;
        }

        .dc-countdown {
          width: 64px;
          height: 64px;
          border:
            3px solid #ddc17a;
          border-radius: 50%;
          display: grid;
          place-items: center;
          font-size: 25px;
          font-weight: bold;
          flex-shrink: 0;
        }

        .dc-bonus-row {
          display: grid;
          grid-template-columns:
            1fr auto;
          gap: 8px;
          align-items: center;
          margin-top: 10px;
        }

        .dc-commitment {
          font-size: 11px;
          color: #d3d5e4;
          overflow-wrap: anywhere;
          line-height: 1.7;
        }

        .dc-private {
          display: inline-block;
          background: #4b2c48;
          color: #f5d7ee;
          border:
            1px solid #91517b;
          border-radius: 6px;
          padding: 5px 8px;
          font-size: 10px;
          font-weight: bold;
        }

        .dc-page :focus-visible {
          outline:
            3px solid #ffe3a0;
          outline-offset: 3px;
        }

        @media (max-width: 400px) {
          .dc-wrap {
            padding: 10px;
          }

          .dc-header {
            padding: 15px 10px;
          }

          .dc-header h1 {
            font-size: 17px;
          }

          .dc-card {
            padding: 14px;
          }
        }
      `}</style>

      <header className="dc-header">
        <div>
          <h1>
            DREAM WHEEL CONTROL
          </h1>

          <p>
            DEMO ROUND PLANNING ·
            CONTROLLER ACCOUNT
          </p>
        </div>

        {(
          mode === "ready" ||
          mode === "password"
        ) && (
          <button
            type="button"
            className="dc-btn"
            disabled={busy}
            onClick={() =>
              void logout()
            }
          >
            Logout
          </button>
        )}
      </header>

      <main className="dc-wrap">
        {error && (
          <div
            className="dc-alert"
            role="alert"
          >
            {error}
          </div>
        )}

        {notice && (
          <div
            className="dc-notice"
            role="status"
          >
            {notice}
          </div>
        )}

        {mode === "checking" && (
          <p
            className="dc-hint"
            role="status"
          >
            Checking controller session…
          </p>
        )}

        {mode === "login" && (
          <form
            className="dc-card dc-form"
            onSubmit={login}
          >
            <h2>
              Controller login
            </h2>

            <p className="dc-hint">
              Use the separate Dream
              Wheel controller ID created
              by your main admin.
            </p>

            <label
              className="dc-label"
              htmlFor="dc-id"
            >
              Controller ID
            </label>

            <input
              id="dc-id"
              className="dc-input"
              value={loginId}
              disabled={busy}
              autoComplete="username"
              onChange={event =>
                setLoginId(
                  event.target.value,
                )
              }
              required
            />

            <label
              className="dc-label"
              htmlFor="dc-password"
            >
              Password
            </label>

            <input
              id="dc-password"
              className="dc-input"
              type="password"
              value={loginPassword}
              disabled={busy}
              autoComplete="current-password"
              onChange={event =>
                setLoginPassword(
                  event.target.value,
                )
              }
              required
            />

            <button
              type="submit"
              className="dc-primary"
              disabled={busy}
            >
              {busy
                ? "CHECKING…"
                : "LOGIN"}
            </button>
          </form>
        )}

        {mode === "password" && (
          <form
            className="dc-card dc-form"
            onSubmit={
              changePassword
            }
          >
            <h2>
              Change temporary password
            </h2>

            <p className="dc-hint">
              Controller {controllerId}.
              Set a different password
              before opening game controls.
            </p>

            <label
              className="dc-label"
              htmlFor="dc-current"
            >
              Temporary password
            </label>

            <input
              id="dc-current"
              className="dc-input"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              disabled={busy}
              onChange={event =>
                setCurrentPassword(
                  event.target.value,
                )
              }
              required
            />

            <label
              className="dc-label"
              htmlFor="dc-new"
            >
              New password
            </label>

            <input
              id="dc-new"
              className="dc-input"
              type="password"
              autoComplete="new-password"
              minLength={12}
              value={newPassword}
              disabled={busy}
              onChange={event =>
                setNewPassword(
                  event.target.value,
                )
              }
              required
            />

            <label
              className="dc-label"
              htmlFor="dc-confirm"
            >
              Confirm new password
            </label>

            <input
              id="dc-confirm"
              className="dc-input"
              type="password"
              autoComplete="new-password"
              minLength={12}
              value={confirmPassword}
              disabled={busy}
              onChange={event =>
                setConfirmPassword(
                  event.target.value,
                )
              }
              required
            />

            <p className="dc-hint">
              At least 12 characters,
              within 72 UTF-8 bytes.
            </p>

            <button
              type="submit"
              className="dc-primary"
              disabled={busy}
            >
              {busy
                ? "SAVING…"
                : "SAVE NEW PASSWORD"}
            </button>
          </form>
        )}

        {mode === "ready" && (
          <>
            <section className="dc-card">
              <div className="dc-status">
                <div>
                  <span className="dc-private">
                    PRIVATE CONTROLLER VIEW
                  </span>

                  <p className="dc-hint">
                    Signed in: {controllerId}
                  </p>

                  <strong>
                    {stale
                      ? "RECONNECTING…"
                      : round
                        ? round.phase
                        : "NO ROUND PUBLISHED"}
                  </strong>

                  <p className="dc-hint">
                    Round #{round?.id || "—"}

                    {round?.spinNumber
                      ? ` · Spin ${round.spinNumber}`
                      : ""}
                  </p>
                </div>

                <div className="dc-countdown">
                  {round &&
                  round.phase !== "FINISHED"
                    ? seconds
                    : "—"}
                </div>
              </div>

              <button
                type="button"
                className="dc-btn"
                disabled={busy}
                onClick={() =>
                  void loadRef.current()
                }
              >
                Refresh state
              </button>

              {round && (
                <>
                  <h2
                    style={{
                      marginTop: 20,
                    }}
                  >
                    Current locked plan
                  </h2>

                  <div className="dc-plan">
                    {(
                      round.lockedPlan || []
                    ).map(
                      (step, index) => (
                        <React.Fragment
                          key={index}
                        >
                          {index > 0 && (
                            <b
                              aria-hidden="true"
                            >
                              →
                            </b>
                          )}

                          <span
                            className={
                              NUMBERS.includes(
                                step.value,
                              )
                                ? "dc-number"
                                : ""
                            }
                          >
                            {step.value}
                          </span>
                        </React.Fragment>
                      ),
                    )}
                  </div>

                  <p className="dc-hint">
                    The full plan is visible
                    only in this controller
                    view. Players see each
                    result after that spin
                    ends. This plan cannot
                    be edited.
                  </p>

                  <p className="dc-commitment">
                    Commitment:{" "}
                    {round.commitment}
                  </p>

                  {round.result && (
                    <p className="dc-hint">
                      Final number{" "}
                      {round.result.winner}
                      {" "}· Bonus{" "}
                      {round.result.bonusMultiplier}x
                      {" "}· Profit odds{" "}
                      1:{round.result.profitOdds}
                    </p>
                  )}
                </>
              )}
            </section>

            {pending && (
              <div
                className="dc-alert"
                role="status"
              >
                A plan publication needs
                recovery. Retry sends the
                same plan and request key.

                <button
                  type="button"
                  className="dc-btn"
                  disabled={busy}
                  onClick={() =>
                    void publish()
                  }
                >
                  RETRY SAME PLAN
                </button>
              </div>
            )}

            <form
              className="dc-card"
              onSubmit={publish}
            >
              <h2>
                Prepare next round
              </h2>

              <p className="dc-hint">
                Choose zero to three bonus
                spins, followed by one final
                number. This is a
                controller-planned demo;
                outcomes are fixed before
                betting opens.
              </p>

              <label
                className="dc-label"
                htmlFor="dc-winner"
              >
                Final winning number
              </label>

              <select
                id="dc-winner"
                className="dc-select"
                value={winner}
                disabled={formLocked}
                onChange={event =>
                  setWinner(
                    event.target.value,
                  )
                }
              >
                {NUMBERS.map(value => (
                  <option
                    key={value}
                    value={value}
                  >
                    {value}
                  </option>
                ))}
              </select>

              <h3
                style={{
                  fontSize: 14,
                  marginTop: 20,
                }}
              >
                Bonus spins before the number
              </h3>

              {bonuses.map(
                (value, index) => (
                  <div
                    className="dc-bonus-row"
                    key={index}
                  >
                    <select
                      className="dc-select"
                      aria-label={
                        `Bonus spin ${index + 1}`
                      }
                      value={value}
                      disabled={formLocked}
                      onChange={event =>
                        setBonuses(
                          items =>
                            items.map(
                              (item, i) =>
                                i === index
                                  ? event.target.value
                                  : item,
                            ),
                        )
                      }
                    >
                      <option value="2x">
                        2x
                      </option>

                      <option value="7x">
                        7x
                      </option>
                    </select>

                    <button
                      type="button"
                      className="dc-btn"
                      disabled={formLocked}
                      aria-label={
                        `Remove bonus spin ${index + 1}`
                      }
                      onClick={() =>
                        setBonuses(
                          items =>
                            items.filter(
                              (_, i) =>
                                i !== index,
                            ),
                        )
                      }
                    >
                      Remove
                    </button>
                  </div>
                ),
              )}

              <div className="dc-row">
                <button
                  type="button"
                  className="dc-btn"
                  disabled={
                    formLocked ||
                    bonuses.length >=
                      MAX_BONUSES
                  }
                  onClick={() =>
                    setBonuses(
                      items => [
                        ...items,
                        "2x",
                      ],
                    )
                  }
                >
                  Add bonus spin
                </button>

                <button
                  type="button"
                  className="dc-btn"
                  disabled={
                    formLocked ||
                    !bonuses.length
                  }
                  onClick={() =>
                    setBonuses([])
                  }
                >
                  Clear bonuses
                </button>
              </div>

              <div
                className="dc-plan"
                aria-label="Plan preview"
              >
                {plan.map(
                  (value, index) => (
                    <React.Fragment
                      key={index}
                    >
                      {index > 0 && (
                        <b
                          aria-hidden="true"
                        >
                          →
                        </b>
                      )}

                      <span
                        className={
                          index ===
                          plan.length - 1
                            ? "dc-number"
                            : ""
                        }
                      >
                        {value}
                      </span>
                    </React.Fragment>
                  ),
                )}
              </div>

              <p className="dc-hint">
                Accumulated bonus{" "}
                {bonusProduct}x
                {" "}· Winning profit odds{" "}
                1:{profitOdds}. A 10-coin
                winning bet would return{" "}
                {10 * (1 + profitOdds)}
                {" "}total coins.
              </p>

              <p className="dc-hint">
                LOCK &amp; OPEN ROUND saves
                the entire plan immediately.
                It cannot be edited afterward.
                Betting starts after a
                5-second preparation countdown,
                stays open for 30 seconds,
                then each spin takes 10 seconds.
                No new bets are accepted
                during bonus spins.
              </p>

              <button
                type="submit"
                className="dc-primary"
                disabled={formLocked}
              >
                {busy
                  ? "LOCKING…"
                  : !canPublish
                    ? "CURRENT ROUND IN PROGRESS"
                    : "LOCK & OPEN ROUND"}
              </button>
            </form>
          </>
        )}

        <footer className="dc-row">
          <button
            type="button"
            className="dc-btn"
            onClick={() =>
              onBack
                ? onBack()
                : window.location.assign("/")
            }
          >
            ← Customer home
          </button>
        </footer>
      </main>
    </div>
  );
}
