import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  flightApi,
  useFlightState,
  flightRequestKey,
  notifyFlightWallet,
} from "./flightClient";

import {
  flightPoint,
  GameAudio,
  seedOf,
  avatar,
  maskName,
  buildSamples,
  sampleIdentity,
  sampleIdentityGroup,
  activityRows,
} from "./aviatorCore";

/*
 * Aviator — same game plan, flight model and design as Super Fast Aviator.
 * Plane picture and sounds are served from /public:
 *   /aviator-plane.png, /plane.svg, /game-music.mp3, /crash-sound.mp3
 */

const CSS = `
.sfa{--green:#0cb2b7;--wine:#781a40;--line:#29373a;background:#000;color:#fff;font-family:Arial,Helvetica,sans-serif;min-height:100vh}
.sfa *{box-sizing:border-box}
.sfa button{border:1px solid transparent;border-radius:10px;padding:12px 18px;background:#15191a;color:#fff;cursor:pointer;font:inherit;font-weight:750;line-height:normal;transition:filter .15s}
.sfa button:hover{filter:brightness(1.15)}
.sfa button:focus-visible{outline:3px solid #fff;outline-offset:3px}
.sfa button:disabled{opacity:.5;cursor:default}
.sfa input{display:block;width:100%;padding:12px;border:1px solid #536165;border-radius:8px;background:#0d1112;color:#fff;margin:8px 0 18px;font:inherit}
.sfa input[type=checkbox]{width:auto;margin:0;accent-color:var(--green)}
.sfa label{display:block;font-size:14px;font-weight:650}
.sfa small{display:block}
.sfa p{margin:0 0 8px;line-height:1.6}
.sfa .green{background:var(--green);color:#fff}
.sfa .wine{background:var(--wine);color:#fff}
.sfa .outline{border:2px solid var(--green);background:#000}
.sfa .outline.wine{background:var(--wine)}
.sfa .mini{padding:7px 10px;font-size:12px;border-radius:6px}
.sfa .alert{border:1px solid #fb8eb4;background:#2a0f1a;color:#ffd5e3;border-radius:10px;padding:12px;margin:12px 0;font-size:14px}
.sfa .alert button{margin-left:10px;padding:4px 8px;font-size:12px}
.sfa .game{max-width:850px;margin:0 auto;padding:12px 16px}
.sfa .gamenav{display:flex;gap:12px;margin-bottom:12px}
.sfa .brand{display:flex;align-items:center;gap:12px;line-height:1}
.sfa .brand img{width:84px;height:auto}
.sfa .brand small{font-style:italic;font-weight:900;font-size:12px;letter-spacing:.6px}
.sfa .brand strong{display:block;color:var(--green);font-size:33px;font-style:italic}
.sfa .gamehead{display:flex;justify-content:space-between;align-items:center;gap:12px}
.sfa .balance{text-align:right;min-width:0}
.sfa .balance b{font-size:30px;white-space:nowrap}
.sfa .balance small{font-size:11px;color:#b1c7c7;margin-top:5px;overflow-wrap:anywhere}
.sfa .history{display:flex;gap:10px;overflow:auto;padding:18px 0 12px;min-height:55px}
.sfa .history span{white-space:nowrap;border-radius:40px;padding:7px 20px;font-weight:bold;font-size:17px}
.sfa .chart{height:290px;position:relative;overflow:hidden;border-bottom:2px solid #344244;margin-bottom:15px}
.sfa .chartgrid{position:absolute;inset:12px 0;background-image:linear-gradient(#ffffff12 1px,transparent 1px),linear-gradient(90deg,#ffffff12 1px,transparent 1px);background-size:20% 25%}
.sfa .trail{position:absolute;inset:0;width:100%;height:100%;fill:none;stroke:#ff1744;stroke-width:7}
.sfa .trail .fillpath{fill:rgba(255,23,68,.28);stroke:none}
.sfa .roundstatus{position:absolute;z-index:3;top:19%;left:5%;width:76%;text-align:center;pointer-events:none}
.sfa .roundstatus span{font-size:19px;font-weight:800;font-style:italic}
.sfa .roundstatus b{display:block;font-style:italic;font-size:clamp(40px,12vw,85px);margin:14px 0 7px}
.sfa .roundstatus small{color:#c0cece}
.sfa .roundstatus .crashed{color:#cf6190}
.sfa .flightplot{position:absolute;inset:10px 12px 20px;pointer-events:none}
.sfa .flightplot .plane{position:absolute;width:clamp(192px,56vw,420px);height:auto;max-width:none;z-index:1;mix-blend-mode:screen;transform-origin:0 0;translate:0 0;opacity:1;will-change:left,top,transform}
.sfa .flightplot .plane.gone{opacity:0;translate:120px -80px;transition:opacity .35s,translate .6s}
.sfa .betpanel{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:center;border:2px solid var(--green);border-radius:18px;padding:15px;gap:22px;margin:12px 0}
.sfa .paneltabs{grid-column:1/-1;display:flex;gap:4px;padding:3px;background:#101415;border-radius:24px}
.sfa .paneltabs button{width:50%;padding:7px;border-radius:20px;background:transparent;font-size:14px}
.sfa .paneltabs button.active{background:var(--green)}
.sfa .paneltitle{display:flex;justify-content:space-between;font-size:14px;font-weight:800;color:var(--green);margin-bottom:12px}
.sfa .paneltitle span{font-size:10px;color:#a4b4b5}
.sfa .stake{display:flex;gap:8px}
.sfa .stake button{border:1px solid var(--green);font-size:26px;padding:1px 12px}
.sfa .stake input{width:100%;min-width:0;margin:0;padding:6px 6px 6px 24px;font-size:25px;font-weight:bold;text-align:center;-moz-appearance:textfield;appearance:textfield}
.sfa .stake input::-webkit-inner-spin-button{-webkit-appearance:none;appearance:none}
.sfa .stakevalue{flex:1;min-width:0;position:relative}
.sfa .stakecurrency{position:absolute;left:9px;top:50%;transform:translateY(-50%);font-size:18px;color:var(--green);pointer-events:none}
.sfa .quick{display:flex;gap:7px;margin-top:10px}
.sfa .quick button{border:1px solid var(--green);flex:1;min-width:0;padding:6px 2px;font-size:13px}
.sfa .betaction{font-size:25px;min-height:93px;padding:10px}
.sfa .betaction small{font-size:13px;margin-top:8px}
.sfa .autooptions{grid-column:1/-1;display:grid;grid-template-columns:minmax(0,1fr) 110px;align-items:center;gap:10px;padding-top:10px;border-top:1px solid var(--line)}
.sfa .autooptions input{margin:0;padding:9px;font-size:14px}
.sfa .autocheck{display:flex;align-items:center;gap:8px;font-size:12px}
.sfa .autorounds{display:flex;align-items:center;gap:8px;font-size:12px}
.sfa .autorounds input{width:65px;min-width:0}
.sfa .autooptions>button{padding:10px 6px;font-size:12px}
.sfa .autonote{grid-column:1/-1;font-size:10px;line-height:1.5;color:#a7b5b7}
.sfa .autostatus{grid-column:1/-1;color:var(--green);font-size:11px;line-height:1.4}
.sfa .panelmsg{grid-column:1/-1;color:#9ee6ea;font-size:12px;line-height:1.4}
.sfa .betstabs{display:flex;gap:6px;margin:18px 0 8px;padding:4px;border-radius:30px;background:#111617}
.sfa .betstabs button{width:50%;border-radius:26px;padding:10px 4px;font-size:14px;background:transparent}
.sfa .betstabs button.green{background:var(--green)}
.sfa .activity{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;margin-bottom:8px;background:#101415;border-radius:12px;font-size:12px}
.sfa .activityleft{min-width:0}
.sfa .activityleft>span{display:block;margin-top:4px;white-space:nowrap}
.sfa .activity small{font-size:9px;color:#a7b5b7;margin-top:4px}
.sfa .avatarstack{display:flex;padding-left:0}
.sfa .avatarstack .playeravatar{width:22px;height:22px;border:1px solid #fff;margin-left:-5px}
.sfa .avatarstack .playeravatar:first-child{margin-left:0}
.sfa .activitywin{text-align:right;min-width:0}
.sfa .activitywin>b{font-size:15px;white-space:nowrap}
.sfa .tablewrap{overflow:auto}
.sfa .betslist{max-height:530px;overflow:auto;scrollbar-color:var(--green) #111}
.sfa table{width:100%;border-collapse:separate;border-spacing:0 5px;table-layout:fixed;font-size:12px;text-align:left}
.sfa th{position:sticky;top:0;z-index:1;background:#171d1e;padding:9px 5px;font-size:10px;font-weight:500;color:#b5c4c5}
.sfa th:first-child{width:31%;text-align:left}
.sfa th:nth-child(2){width:23%}
.sfa th:nth-child(3){width:16%}
.sfa th:nth-child(4){width:30%}
.sfa th:not(:first-child){text-align:right}
.sfa td{border:0;background:#101415;padding:7px 5px;text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap;font-size:clamp(10px,2.8vw,14px)}
.sfa td:first-child{border-radius:24px 0 0 24px;text-align:left;padding-left:7px}
.sfa td:last-child{border-radius:0 24px 24px 0;padding-right:9px}
.sfa .wonrow td{background:#063638}
.sfa .wonrow td:last-child{color:#fff;font-weight:750}
.sfa .playercell{display:flex;align-items:center;gap:6px;min-width:0}
.sfa .playercell>span{overflow:hidden;text-overflow:ellipsis}
.sfa .playeravatar{width:30px;height:30px;flex:0 0 auto;object-fit:cover;border-radius:50%;border:1px solid #536165}
.sfa td small{font-size:8px;margin-top:2px;color:#a7b5b7}
.sfa td .userlabel{color:#fff;font-weight:700}
.sfa .pill{display:inline-block;font-size:12px;padding:5px 9px;background:var(--wine);color:#fff;border-radius:20px;white-space:nowrap}
.sfa .morebets{display:block;margin:8px auto;padding:8px 14px;border:1px solid var(--green);font-size:11px;background:#000}
.sfa .listnote{font-size:10px;color:#a7b5b7;margin:10px 0 20px;line-height:1.5}
.sfa .muted{color:#a7b5b7;font-size:11px;line-height:1.5}
.sfa details{border:1px solid var(--line);border-radius:10px;padding:10px;font-size:11px;color:#a7b5b7;overflow-wrap:anywhere;margin-top:12px}
@media(max-width:600px){
.sfa .game{padding:10px}
.sfa .gamehead .brand{gap:5px}
.sfa .gamehead .brand img{width:40px}
.sfa .gamehead .brand strong{font-size:21px}
.sfa .balance b{font-size:20px}
.sfa .balance small{font-size:9px}
.sfa .chart{height:235px}
.sfa .betpanel{padding:12px;gap:12px}
.sfa .betaction{font-size:20px;min-height:93px;padding:7px}
.sfa .betaction small{font-size:10px}
.sfa .stake button{padding:1px 8px}
.sfa .quick{gap:4px}
.sfa .quick button{font-size:11px}
.sfa .paneltitle{font-size:12px}
.sfa .paneltitle span{font-size:8px}
.sfa .history span{font-size:14px;padding:6px 15px}
.sfa .activity{padding:8px;font-size:11px}
.sfa .activitywin>b{font-size:13px}
.sfa .activity small{font-size:8px}
}
@media(max-width:360px){
.sfa .gamehead{gap:5px}
.sfa .balance b{font-size:17px}
.sfa .gamehead .brand img{width:30px}
.sfa .gamehead .brand strong{font-size:18px}
.sfa .playeravatar{width:25px;height:25px}
.sfa .playercell{gap:3px}
.sfa .activity{gap:4px}
.sfa .activitywin>b{font-size:11px}
.sfa .activityleft>span{font-size:10px}
.sfa .autooptions{grid-template-columns:minmax(0,1fr) 96px}
.sfa .autorounds{gap:5px}
.sfa .autorounds input{width:52px}
.sfa .autocheck{font-size:11px}
}
@media(prefers-reduced-motion:reduce){.sfa *{animation:none!important;transition:none!important}}
`;

const inr = value =>
  "₹" + Number(value || 0).toLocaleString("en-IN");

const count = value =>
  Number(value || 0).toLocaleString("en-IN");

const statusText = status =>
  status === "CASHED_OUT"
    ? "WON"
    : status === "PLACED"
      ? "BET PLACED"
      : status;

// The plane picture has empty space around the aircraft, so its real tail is measured
// from the image itself. The trail then ends exactly on the tail, at any plane size.
function measurePlane(img, fit) {
  fit.done = true;

  try {
    const w = img.naturalWidth;
    const h = img.naturalHeight;

    if (!w || !h) {
      fit.done = false;
      return;
    }

    const scale = Math.min(1, 300 / w);
    const cw = Math.max(1, Math.round(w * scale));
    const ch = Math.max(1, Math.round(h * scale));

    const canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;

    const g = canvas.getContext("2d", { willReadFrequently: true });
    g.drawImage(img, 0, 0, cw, ch);

    const d = g.getImageData(0, 0, cw, ch).data;

    let minX = cw;
    let maxX = 0;
    let n = 0;

    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        const i = (y * cw + x) * 4;

        if (d[i + 3] > 100 && d[i] > 140 && d[i + 1] < 110) {
          n++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
        }
      }
    }

    if (n < 50) return;

    const span = maxX - minX;
    let sy = 0;
    let c = 0;

    for (let y = 0; y < ch; y++) {
      for (let x = minX; x <= minX + span * 0.18; x++) {
        const i = (y * cw + Math.round(x)) * 4;

        if (d[i + 3] > 100 && d[i] > 140 && d[i + 1] < 110) {
          sy += y;
          c++;
        }
      }
    }

    fit.x = (minX + span * 0.05) / cw;
    fit.y = c ? sy / c / ch : 0.55;
  } catch {
    // Keep the default tail position.
  }
}

/*
 * Smoothly approach server-confirmed values.
 * Never estimate beyond the latest confirmed multiplier.
 */
function useSmoothMultiplier(roundId, phase, multiplier) {
  const target = Number.isFinite(Number(multiplier))
    ? Math.max(1, Number(multiplier))
    : 1;

  const id = roundId == null ? null : String(roundId);

  const [paint, setPaint] = useState({ id, value: target });

  const motion = useRef({
    id: null,
    phase: "WAITING",
    value: 1,
    from: 1,
    target: 1,
    beganAt: 0,
    duration: 500,
    previousTargetAt: null,
  });

  useEffect(() => {
    const current = motion.current;
    const timestamp = performance.now();

    if (
      current.id !== id ||
      phase === "WAITING" ||
      phase === "COUNTDOWN"
    ) {
      const value =
        phase === "RUNNING" || phase === "CRASHED" ? target : 1;

      motion.current = {
        id,
        phase,
        value,
        from: value,
        target: value,
        beganAt: timestamp,
        duration: 500,
        previousTargetAt: null,
      };

      setPaint({ id, value });
      return;
    }

    if (phase === "CRASHED") {
      current.phase = phase;
      current.value = target;
      current.from = target;
      current.target = target;
      current.previousTargetAt = null;

      setPaint({ id, value: target });
      return;
    }

    current.phase = phase;

    if (
      phase !== "RUNNING" ||
      Math.abs(target - current.target) < 0.000001
    ) {
      return;
    }

    if (target < current.value) return;

    const interval =
      current.previousTargetAt === null
        ? 500
        : timestamp - current.previousTargetAt;

    current.previousTargetAt = timestamp;
    current.from = current.value;
    current.target = target;
    current.beganAt = timestamp;
    current.duration = Math.max(120, Math.min(1200, interval));
  }, [id, phase, target]);

  useEffect(() => {
    let frame;
    let disposed = false;

    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");

    const animate = timestamp => {
      if (disposed) return;

      const current = motion.current;

      if (
        current.phase === "RUNNING" &&
        current.value < current.target
      ) {
        const progress = media?.matches
          ? 1
          : Math.max(
              0,
              Math.min(
                1,
                (timestamp - current.beganAt) / current.duration,
              ),
            );

        const from = Math.max(1, current.from);
        const end = Math.max(from, current.target);
        const next = from * Math.pow(end / from, progress);

        current.value = Math.min(end, Math.max(current.value, next));

        setPaint({ id: current.id, value: current.value });
      }

      frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
    };
  }, []);

  if (phase === "CRASHED") return target;

  if (phase === "WAITING" || phase === "COUNTDOWN") return 1;

  return paint.id === id
    ? Math.min(target, Math.max(1, paint.value))
    : target;
}

function latestBetFor(bets, roundId, slot) {
  let best = null;

  for (const bet of bets || []) {
    if (
      String(bet.roundId) !== String(roundId) ||
      Number(bet.slot) !== slot ||
      bet.status === "CANCELLED"
    ) {
      continue;
    }

    if (!best || BigInt(bet.id) > BigInt(best.id)) best = bet;
  }

  return best;
}

function FlightScene({
  round,
  phase,
  multiplier,
  now,
  start,
  fresh,
  sceneRef,
}) {
  const planeRef = useRef(null);
  const trailRef = useRef(null);
  const fillRef = useRef(null);
  const fit = useRef({ x: 0.2, y: 0.55, done: false });

  const display = useSmoothMultiplier(round?.id, phase, multiplier);

  // Plane and trail are drawn straight from the server clock, every frame.
  useEffect(() => {
    let frame;

    const draw = () => {
      const plane = planeRef.current;
      const trail = trailRef.current;
      const fill = fillRef.current;
      const scene = sceneRef.current;

      if (plane && trail && fill && scene) {
        if (!fit.current.done && plane.complete && plane.naturalWidth) {
          measurePlane(plane, fit.current);
        }

        let elapsed = 0;

        if (scene.phase === "RUNNING") {
          const base = Number.isFinite(scene.serverTime)
            ? scene.serverTime - scene.start
            : 0;

          const since = Number.isFinite(scene.receivedAt)
            ? Math.min(2000, Math.max(0, Date.now() - scene.receivedAt))
            : 0;

          elapsed = Math.max(0, base + since);
        } else if (scene.phase === "CRASHED") {
          elapsed = scene.crashElapsed;
        }

        const waiting =
          scene.phase === "WAITING" || scene.phase === "COUNTDOWN";

        const point = flightPoint(elapsed);

        plane.style.left = `${(point.x / 600) * 100}%`;
        plane.style.top = `${(point.y / 250) * 100}%`;

        plane.style.transform =
          `rotate(${(point.angle + 11).toFixed(2)}deg) ` +
          `translate(${(-fit.current.x * 100).toFixed(2)}%,` +
          `${(-fit.current.y * 100).toFixed(2)}%)`;

        plane.classList.toggle("gone", scene.phase === "CRASHED");

        trail.setAttribute("d", waiting ? "M 10 228" : point.path);

        fill.setAttribute(
          "d",
          waiting
            ? ""
            : `${point.path} L ${point.x.toFixed(2)} 250 L 10 250 Z`,
        );
      }

      frame = requestAnimationFrame(draw);
    };

    frame = requestAnimationFrame(draw);

    return () => cancelAnimationFrame(frame);
  }, [sceneRef]);

  const crashed = phase === "CRASHED";
  const running = phase === "RUNNING";

  const multiplierText = crashed
    ? Number(multiplier).toFixed(2)
    : (Math.floor(display * 100 + 0.0000001) / 100).toFixed(2);

  const seconds = Math.max(0, Math.ceil((start - now) / 1000));

  const label =
    !fresh && round
      ? "CONNECTION LOST · RETRYING"
      : phase === "COUNTDOWN"
        ? `NEXT ROUND IN ${seconds}s`
        : running
          ? "FLYING"
          : crashed
            ? "FLEW AWAY"
            : "WAITING FOR NEXT ROUND";

  const big =
    phase === "COUNTDOWN" || phase === "WAITING"
      ? "GET READY"
      : `${multiplierText}x`;

  return (
    <section className="chart">
      <div className="chartgrid" />

      <div className="flightplot">
        <svg
          viewBox="0 0 600 250"
          preserveAspectRatio="none"
          className="trail"
          aria-hidden="true"
        >
          <path ref={fillRef} className="fillpath" d="" />
          <path ref={trailRef} d="M 10 228" />
        </svg>

        <img
          ref={planeRef}
          className="plane"
          src="/aviator-plane.png"
          alt="Flying airplane"
        />
      </div>

      <div className="roundstatus">
        <span>{label}</span>

        <b className={crashed ? "crashed" : ""}>{big}</b>

        <small>{round ? `ROUND #${round.id}` : ""}</small>
      </div>
    </section>
  );
}

function BetPanel({
  n,
  round,
  phase,
  fresh,
  multiplier,
  bets,
  plans,
  refresh,
}) {
  const [tab, setTab] = useState("BET");
  const [stake, setStake] = useState("10");
  const [cashOn, setCashOn] = useState(true);
  const [cashAt, setCashAt] = useState("2.00");
  const [rounds, setRounds] = useState("10");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const bet = useMemo(
    () => latestBetFor(bets, round?.id, n),
    [bets, round?.id, n],
  );

  const plan = (plans || []).find(item => Number(item.panel) === n);

  const running = Boolean(plan?.enabled);
  const active = bet?.status === "PLACED";
  const locked = running || active;
  const flying = phase === "RUNNING";

  const shownStake = running ? String(plan.stake) : stake;
  const shownRounds = running ? String(plan.remaining) : rounds;

  const shownOn = running
    ? plan.autoCashout > 0
    : active
      ? Number(bet.autoCashout) > 0
      : cashOn;

  const shownAt =
    running && plan.autoCashout > 0
      ? plan.autoCashout.toFixed(2)
      : active && Number(bet.autoCashout) > 0
        ? Number(bet.autoCashout).toFixed(2)
        : cashAt;

  const autoTarget = () => {
    if (tab !== "AUTO" || !cashOn) return 0;

    const value = Number(cashAt);

    if (
      !Number.isFinite(value) ||
      value < 1.01 ||
      value > 49.99 ||
      Math.abs(value * 100 - Math.round(value * 100)) > 0.000001
    ) {
      throw new Error(
        "Auto cash out must be 1.01–49.99x, with at most two decimals.",
      );
    }

    return Math.round(value * 100) / 100;
  };

  const checkedStake = () => {
    const amount = Number(stake);

    if (
      !Number.isSafeInteger(amount) ||
      amount < 10 ||
      amount > 25000
    ) {
      throw new Error("Enter a whole amount from ₹10 to ₹25,000.");
    }

    return amount;
  };

  const step = delta =>
    setStake(
      String(
        Math.max(
          10,
          Math.min(25000, (Number(stake) || 10) + delta),
        ),
      ),
    );

  let label;
  let sub = "";
  let disabled;

  if (!round) {
    label = "WAIT…";
    disabled = true;
  } else if (bet) {
    if (active && flying) {
      label = "CASH OUT";
      sub = `≈ ${inr(Math.floor((bet.stake * Math.round(multiplier * 100)) / 100))}`;
      disabled = false;
    } else {
      label = statusText(bet.status);
      sub = inr(bet.stake);
      disabled = true;
    }
  } else if (phase === "COUNTDOWN") {
    label = "BET";
    sub = "AMOUNT";
    disabled = false;
  } else {
    label = "NEXT ROUND";
    disabled = true;
  }

  disabled = disabled || busy || !fresh;

  const finish = async () => {
    setBusy(false);

    try {
      await refresh();
    } catch {
      setMessage("Unable to refresh. Waiting for the server connection.");
    }
  };

  const act = async () => {
    if (busy) return;

    setBusy(true);
    setMessage("");

    try {
      if (active && flying) {
        await flightApi(`/api/flight/bets/${bet.id}/cashout`, {});
      } else {
        await flightApi("/api/flight/bets", {
          roundId: round.id,
          slot: n,
          stake: checkedStake(),
          autoCashout: autoTarget(),
          requestKey: flightRequestKey(),
        });
      }

      notifyFlightWallet();
    } catch (failure) {
      setMessage(
        failure.status === 409
          ? failure.message || "Action closed."
          : failure.message || "Unable to complete action.",
      );
    } finally {
      await finish();
    }
  };

  const toggleAuto = async () => {
    if (busy) return;

    setBusy(true);
    setMessage("");

    try {
      if (running) {
        await flightApi("/api/flight/auto/stop", { slot: n });

        setMessage(
          "Auto stopped. Already placed bets keep their cash out setting.",
        );
      } else {
        const total = Number(rounds);

        if (
          !Number.isSafeInteger(total) ||
          total < 1 ||
          total > 100
        ) {
          throw new Error("Choose 1–100 auto rounds.");
        }

        await flightApi("/api/flight/auto/start", {
          slot: n,
          stake: checkedStake(),
          rounds: total,
          autoCashout: (() => {
            if (!cashOn) return 0;

            const value = Number(cashAt);

            if (
              !Number.isFinite(value) ||
              value < 1.01 ||
              value > 49.99 ||
              Math.abs(value * 100 - Math.round(value * 100)) > 0.000001
            ) {
              throw new Error(
                "Auto cash out must be 1.01–49.99x, with at most two decimals.",
              );
            }

            return Math.round(value * 100) / 100;
          })(),
        });

        setMessage("Auto bet started for the chosen rounds.");
      }

      notifyFlightWallet();
    } catch (failure) {
      setMessage(failure.message || "Unable to complete action.");
    } finally {
      await finish();
    }
  };

  const statusLine = running
    ? `AUTO BET ON · ${plan.remaining} rounds left · ${inr(plan.stake)}`
    : plan?.lastError
      ? `AUTO STOPPED · ${plan.lastError}`
      : active && Number(bet.autoCashout) > 0
        ? `AUTO CASH OUT · ${Number(bet.autoCashout).toFixed(2)}x`
        : "";

  return (
    <section className="betpanel">
      <div className="paneltabs" aria-label={`Bet ${n} mode`}>
        <button
          type="button"
          className={tab === "BET" ? "active" : ""}
          onClick={() => setTab("BET")}
        >
          Bet
        </button>

        <button
          type="button"
          className={tab === "AUTO" ? "active" : ""}
          onClick={() => setTab("AUTO")}
        >
          Auto
        </button>
      </div>

      <div>
        <div className="paneltitle">
          BET {n}
          <span>AMOUNT</span>
        </div>

        <div className="stake">
          <button
            type="button"
            aria-label={`Decrease bet ${n}`}
            disabled={running}
            onClick={() => step(-10)}
          >
            −
          </button>

          <div className="stakevalue">
            <span className="stakecurrency" aria-hidden="true">
              ₹
            </span>

            <input
              type="number"
              min="10"
              max="25000"
              step="1"
              value={shownStake}
              disabled={running}
              aria-label={`Bet ${n} stake`}
              onChange={event => setStake(event.target.value)}
            />
          </div>

          <button
            type="button"
            aria-label={`Increase bet ${n}`}
            disabled={running}
            onClick={() => step(10)}
          >
            +
          </button>
        </div>

        <div className="quick">
          {[10, 100, 500, 1000].map(value => (
            <button
              key={value}
              type="button"
              disabled={running}
              onClick={() => setStake(String(value))}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        className={`betaction green${active && flying ? " wine" : ""}`}
        disabled={disabled}
        onClick={act}
      >
        {label}
        <small>{sub}</small>
      </button>

      {tab === "AUTO" && (
        <div className="autooptions">
          <label className="autocheck">
            <input
              type="checkbox"
              checked={shownOn}
              disabled={locked}
              onChange={event => setCashOn(event.target.checked)}
            />
            Auto cash out
          </label>

          <input
            type="number"
            min="1.01"
            max="49.99"
            step="0.01"
            value={shownAt}
            disabled={locked || !shownOn}
            aria-label={`Bet ${n} auto cash out multiplier`}
            onChange={event => setCashAt(event.target.value)}
          />

          <label className="autorounds">
            Auto bet rounds
            <input
              type="number"
              min="1"
              max="100"
              step="1"
              value={shownRounds}
              disabled={running}
              onChange={event => setRounds(event.target.value)}
            />
          </label>

          <button
            type="button"
            className={`outline${running ? " wine" : ""}`}
            disabled={busy || !fresh}
            onClick={toggleAuto}
          >
            {running ? "STOP AUTO" : "START AUTO"}
          </button>

          <small className="autonote">
            Auto bet continues for the chosen rounds, even if this page
            closes. Press Stop Auto or log out to stop future bets.
          </small>
        </div>
      )}

      {statusLine && <small className="autostatus">{statusLine}</small>}

      {message && (
        <small className="panelmsg" role="status">
          {message}
        </small>
      )}
    </section>
  );
}

function AvatarImg({ id }) {
  return (
    <img
      className="playeravatar"
      src={avatar(id)}
      alt=""
      width="30"
      height="30"
    />
  );
}

const BetsSection = React.memo(function BetsSection({
  allBets,
  myBets,
  roundId,
  phase,
  liveRef,
}) {
  const [tab, setTab] = useState("ALL");
  const [visible, setVisible] = useState(50);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick(value => value + 1), 250);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setVisible(50);
  }, [roundId]);

  const samples = useMemo(
    () => (roundId != null ? buildSamples(Number(roundId)) : []),
    [roundId],
  );

  const all = tab === "ALL";

  const rows = useMemo(
    () =>
      all
        ? activityRows({
            samples,
            real: allBets || [],
            phase,
            countdown: liveRef.current.countdown,
            mult: liveRef.current.mult,
          })
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [all, samples, allBets, phase, tick],
  );

  const group = roundId != null ? sampleIdentityGroup(roundId) : 0;

  const online =
    4000 +
    (seedOf(`online-${group}-${Math.floor(Date.now() / 5000)}`) % 4001);

  const totalWin = rows.reduce(
    (sum, bet) => sum + Number(bet.payout || 0),
    0,
  );

  return (
    <section>
      <div className="betstabs">
        <button
          type="button"
          className={all ? "green" : ""}
          onClick={() => {
            setTab("ALL");
            setVisible(50);
          }}
        >
          ALL BETS
        </button>

        <button
          type="button"
          className={!all ? "green" : ""}
          onClick={() => {
            setTab("MY");
            setVisible(50);
          }}
        >
          MY BETS
        </button>
      </div>

      {all && (
        <div className="activity">
          <div className="activityleft">
            <div className="avatarstack">
              {[0, 1, 2].map(index => (
                <AvatarImg
                  key={index}
                  id={sampleIdentity(index, roundId || 1).avatarId}
                />
              ))}
            </div>

            <span>
              <b>{count(rows.length)}</b> Bets · Online {count(online)}
            </span>

            <small>Simulated online count · Sample + user bets</small>
          </div>

          <div className="activitywin">
            <b>{inr(totalWin)}</b>
            <small>Total win · includes samples</small>
          </div>
        </div>
      )}

      <div className="tablewrap betslist">
        <table>
          <thead>
            {all ? (
              <tr>
                <th>PLAYER</th>
                <th>BET ₹</th>
                <th>X</th>
                <th>WIN ₹</th>
              </tr>
            ) : (
              <tr>
                <th>ROUND</th>
                <th>BET ₹</th>
                <th>RESULT</th>
              </tr>
            )}
          </thead>

          <tbody>
            {all
              ? rows.slice(0, visible).map(bet => (
                  <tr
                    key={bet.key}
                    className={bet.status === "WON" ? "wonrow" : ""}
                  >
                    <td>
                      <div className="playercell">
                        <AvatarImg id={bet.avatarId} />

                        <span>
                          {maskName(bet.username)}

                          <small
                            className={
                              bet.simulated ? "samplelabel" : "userlabel"
                            }
                          >
                            {bet.simulated ? "Simulated" : "User bet"}
                          </small>
                        </span>
                      </div>
                    </td>

                    <td>{count(bet.stake)}</td>

                    <td>
                      {bet.status === "WON"
                        ? `${Number(bet.mult).toFixed(2)}x`
                        : "—"}
                    </td>

                    <td>
                      {bet.status === "WON"
                        ? count(bet.payout)
                        : bet.status === "LOST"
                          ? "LOST"
                          : "—"}
                    </td>
                  </tr>
                ))
              : (myBets || []).map(bet => (
                  <tr key={bet.id}>
                    <td>
                      #{bet.roundId}
                      <small>BET {bet.slot}</small>
                    </td>

                    <td>{count(bet.stake)}</td>

                    <td>
                      <span className="pill">
                        {statusText(bet.status)}

                        {bet.status === "CASHED_OUT"
                          ? ` · ${Number(bet.cashoutMultiplier).toFixed(2)}x · ${inr(bet.payout)}`
                          : ""}
                      </span>
                    </td>
                  </tr>
                ))}

            {!all && !(myBets || []).length && (
              <tr>
                <td colSpan={3} className="muted">
                  No bets yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {all && rows.length > visible && (
        <button
          type="button"
          className="morebets"
          onClick={() => setVisible(value => value + 50)}
        >
          {`SHOW MORE (${count(Math.min(visible, rows.length))}/${count(rows.length)})`}
        </button>
      )}

      <p className="listnote">
        {all
          ? "Sample bets are fictional. Only your own bets affect your balance."
          : "Your own bets only · Simulation balance"}
      </p>
    </section>
  );
});

export default function TSBFlightPage({
  user,
  onBack,
  onLogout,
}) {
  const {
    data,
    error,
    unauthorized,
    receivedAt,
    refresh,
  } = useFlightState("/api/flight/state");

  const [clock, setClock] = useState(Date.now());
  const [soundOn, setSoundOn] = useState(false);
  const [soundNote, setSoundNote] = useState("");

  const audio = useRef(null);
  if (!audio.current) audio.current = new GameAudio();

  const sceneRef = useRef(null);
  const liveRef = useRef({ countdown: 0, mult: 1 });
  const lastBalance = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 100);
    return () => clearInterval(timer);
  }, []);

  const customerId =
    user?.id ?? user?.customerId ?? user?.customer_id;

  const wrongAccount = Boolean(
    data && String(data.customerId) !== String(customerId),
  );

  const round = data?.round;

  const elapsed = Number.isFinite(receivedAt)
    ? Math.max(0, clock - receivedAt)
    : Infinity;

  const serverTime = data?.serverTime
    ? new Date(data.serverTime).getTime()
    : NaN;

  const serverNow =
    Number.isFinite(serverTime) && Number.isFinite(elapsed)
      ? serverTime + elapsed
      : clock;

  const start = round ? new Date(round.startsAt).getTime() : 0;

  const fresh = Boolean(
    data &&
      !error &&
      !unauthorized &&
      Number.isFinite(serverTime) &&
      elapsed < 3500 &&
      !wrongAccount,
  );

  const phase =
    round?.phase === "CRASHED"
      ? "CRASHED"
      : !round
        ? "WAITING"
        : serverNow < start
          ? "COUNTDOWN"
          : "RUNNING";

  const confirmed = Number(
    round?.phase === "CRASHED"
      ? round.crashMultiplier
      : round?.multiplier,
  );

  const multiplier =
    phase === "COUNTDOWN" || phase === "WAITING"
      ? 1
      : Number.isFinite(confirmed)
        ? Math.max(1, confirmed)
        : 1;

  const growthRate =
    Number.isFinite(Number(data?.growthRate)) &&
    Number(data?.growthRate) > 0
      ? Number(data.growthRate)
      : 0.16;

  sceneRef.current = {
    phase,
    start,
    serverTime,
    receivedAt,

    crashElapsed:
      phase === "CRASHED" && Number.isFinite(confirmed)
        ? (Math.log(Math.max(1, confirmed)) / growthRate) * 1000
        : 0,
  };

  liveRef.current = {
    countdown:
      phase === "COUNTDOWN"
        ? Math.max(0, Math.ceil((start - serverNow) / 1000))
        : 0,

    mult: multiplier,
  };

  // Sound follows each server update; any lost connection stops it.
  useEffect(() => {
    const sound = audio.current;

    if (
      !round ||
      error ||
      unauthorized ||
      wrongAccount ||
      document.hidden
    ) {
      if (error || unauthorized || wrongAccount) sound.reset();
      return;
    }

    sound.sync({ id: round.id, phase: round.phase });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receivedAt]);

  useEffect(() => {
    if (!fresh) audio.current.stopEngine();
  }, [fresh]);

  useEffect(() => {
    const sound = audio.current;

    const changed = () => {
      if (document.hidden) sound.reset();
    };

    document.addEventListener("visibilitychange", changed);

    return () => {
      document.removeEventListener("visibilitychange", changed);
      sound.reset();
    };
  }, []);

  const toggleSound = async () => {
    const sound = audio.current;

    try {
      await sound.toggle();
      setSoundOn(sound.enabled);
      setSoundNote("");

      if (sound.enabled && round && !document.hidden) {
        sound.sync({ id: round.id, phase: round.phase });
      }
    } catch (failure) {
      setSoundOn(false);
      setSoundNote(failure.message);
    }
  };

  const balanceAvailable =
    !wrongAccount &&
    !unauthorized &&
    data?.balance !== null &&
    data?.balance !== undefined &&
    Number.isFinite(Number(data.balance));

  useEffect(() => {
    if (!balanceAvailable) {
      lastBalance.current = null;
      return;
    }

    const balance = Number(data.balance);
    const previous = lastBalance.current;

    lastBalance.current = balance;

    if (previous !== null && previous !== balance) {
      notifyFlightWallet();
    }
  }, [data?.balance, balanceAvailable]);

  const visibleBets =
    !wrongAccount && !unauthorized ? data?.bets || [] : [];

  const visibleAll =
    !wrongAccount && !unauthorized ? data?.allBets || [] : [];

  const visiblePlans =
    !wrongAccount && !unauthorized ? data?.autoPlans || [] : [];

  return (
    <div className="sfa">
      <style>{CSS}</style>

      <main className="game">
        <nav className="gamenav">
          <button
            type="button"
            className="outline"
            onClick={onBack}
          >
            ← Home
          </button>
        </nav>

        <header className="gamehead">
          <div className="brand">
            <img src="/plane.svg" alt="" />

            <div>
              <small>TELUGU SPORTS BOOK</small>
              <strong>AVIATOR</strong>
            </div>
          </div>

          <button
            type="button"
            className="mini outline"
            aria-label="Toggle sound"
            aria-pressed={soundOn}
            onClick={toggleSound}
          >
            {soundOn ? "🔊" : "🔇"}
          </button>

          <div className="balance" aria-live="polite">
            <b>
              {balanceAvailable
                ? inr(data.balance)
                : data || error || unauthorized
                  ? "—"
                  : "…"}
            </b>

            <small>BALANCE</small>
          </div>
        </header>

        {soundNote && <p className="muted">{soundNote}</p>}

        {(error || wrongAccount || unauthorized) && (
          <div role="alert" className="alert">
            {wrongAccount
              ? "Customer session does not match. Logout and login again."
              : unauthorized
                ? "Login required."
                : String(error?.message || error)}

            <button type="button" onClick={onLogout}>
              Logout / login again
            </button>
          </div>
        )}

        <div className="history">
          {data?.history?.length ? (
            data.history.map((item, index) => (
              <span
                key={item.id}
                className={index % 2 ? "wine" : "green"}
                title={
                  item.mode === "ADMIN" || item.mode === "ADMIN2"
                    ? "Admin-Controlled Demo"
                    : "Random Demo"
                }
              >
                {Number(item.crashMultiplier).toFixed(2)}x
                {item.mode === "ADMIN" || item.mode === "ADMIN2"
                  ? " · A"
                  : ""}
              </span>
            ))
          ) : (
            <span>First round</span>
          )}
        </div>

        <FlightScene
          round={round}
          phase={phase}
          multiplier={multiplier}
          now={serverNow}
          start={start}
          fresh={fresh}
          sceneRef={sceneRef}
        />

        {[1, 2].map(slot => (
          <BetPanel
            key={`${customerId}-${slot}`}
            n={slot}
            round={round}
            phase={phase}
            fresh={fresh}
            multiplier={multiplier}
            bets={visibleBets}
            plans={visiblePlans}
            refresh={refresh}
          />
        ))}

        <BetsSection
          allBets={visibleAll}
          myBets={visibleBets}
          roundId={round?.id ?? null}
          phase={phase}
          liveRef={liveRef}
        />

        <p className="muted">
          Demo coins only · ₹ is the display symbol for the virtual demo
          balance. Cash out must be accepted by the server before the
          plane flies away; closing the page does not cash out.
        </p>

        {round && (
          <details>
            <summary>Round verification</summary>

            <p>SHA-256 commitment: {round.commitment}</p>

            {round.seed && <p>Revealed seed: {round.seed}</p>}

            <p>
              Commitment input: round ID : crash multiplier × 100 : seed.
              The result is locked before betting opens.
            </p>
          </details>
        )}
      </main>
    </div>
  );
}
