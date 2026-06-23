import React, { useState, useEffect, useRef } from "react";
import { PoseLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { Camera, X, Check, RotateCcw, Ruler, ShieldCheck, Loader2, AlertCircle } from "lucide-react";

/* ──────────────────────────────────────────────────────────────────────────
   BodyScanner — AUTO-CAPTURE camera measure for Darzi (prototype)

   Speed notes:
   • Uses the LITE pose model (smaller, faster download). For a bit more
     precision and slower load, swap "_lite" → "_full" in MODEL_URL.
   • The camera opens immediately; the model loads in the background and
     auto-capture begins the moment it's ready. The model (a few MB) downloads
     once and is cached by the browser, so later opens are quick.

   Camera needs a secure context: HTTPS or localhost. Over plain http
   (e.g. opening the dev server's 192.168.x.x address on a phone) the browser
   blocks getUserMedia and the camera won't open.

   Accuracy: lengths (shoulder/sleeve/forearm/torso) are measured; girths
   (chest/waist/hip/neck) are ESTIMATED from widths — the tailor confirms.
   ────────────────────────────────────────────────────────────────────────── */

const C = {
  magenta: "#C2185B", magentaDeep: "#9E1350", ink: "#3D1A2B", marigold: "#F4A300",
  teal: "#0E7C7B", bg: "#FBF6F0", surface: "#FFFFFF", tint: "#FBE7F0", tint2: "#FCEFD6",
  muted: "#7A5C68", border: "#EBD9E2", line: "#F3E9EE",
};

// keep this version in sync with: npm install @mediapipe/tasks-vision@0.10.35
const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
// "_lite" = fast download. swap to "_full" for slightly better landmarks (slower).
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

const COUNTDOWN_MS = 3000;
const DETECT_EVERY_MS = 55;
const CAM_TIMEOUT_MS = 9000;

const PT = { nose: 0, lEar: 7, rEar: 8, lSh: 11, rSh: 12, lEl: 13, rEl: 14, lWr: 15, rWr: 16, lHip: 23, rHip: 24, lKnee: 25, rKnee: 26, lAnk: 27, rAnk: 28 };

const F = {
  statureFromShoulderAnkle: 0.78,
  chestWidth: 0.93, chestDepth: 0.66,
  waistWidth: 0.86, waistDepth: 0.72,
  hipWidth: 1.35, hipDepth: 0.70,
  neckFromShoulder: 0.82,
};

const READY = { vis: 0.6, headVis: 0.5, minSpan: 0.4 };

const cmToIn = (cm) => Math.round((cm / 2.54) * 2) / 2;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const ellipse = (a, b) => { const h = ((a - b) ** 2) / (((a + b) ** 2) || 1); return Math.PI * (a + b) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h))); };

function framedWell(lm) {
  if (!lm) return false;
  const need = [PT.lSh, PT.rSh, PT.lHip, PT.rHip, PT.lAnk, PT.rAnk];
  if (need.some((i) => (lm[i]?.visibility ?? 0) < READY.vis)) return false;
  if ((lm[PT.nose]?.visibility ?? 0) < READY.headVis) return false;
  const span = Math.abs(((lm[PT.lAnk].y + lm[PT.rAnk].y) / 2) - ((lm[PT.lSh].y + lm[PT.rSh].y) / 2));
  return span >= READY.minSpan;
}

function framedHint(lm) {
  if (!lm) return "Step into the frame";
  const feet = ((lm[PT.lAnk]?.visibility ?? 0) + (lm[PT.rAnk]?.visibility ?? 0)) / 2;
  if (feet < READY.vis) return "Step back — I need to see your feet";
  if ((lm[PT.nose]?.visibility ?? 0) < READY.headVis) return "Make sure your head is in frame";
  const span = Math.abs(((lm[PT.lAnk].y + lm[PT.rAnk].y) / 2) - ((lm[PT.lSh].y + lm[PT.rSh].y) / 2));
  if (span < READY.minSpan) return "Step back a little";
  return "Hold still…";
}

function measure(lm, W, H, heightCm) {
  const vis = (i) => lm[i]?.visibility ?? 0;
  const need = [PT.lSh, PT.rSh, PT.lHip, PT.rHip, PT.lAnk, PT.rAnk];
  if (need.some((i) => vis(i) < 0.4)) return null;

  const P = (i) => ({ x: lm[i].x * W, y: lm[i].y * H });
  const lSh = P(PT.lSh), rSh = P(PT.rSh), lHip = P(PT.lHip), rHip = P(PT.rHip), lAnk = P(PT.lAnk), rAnk = P(PT.rAnk);
  const mSh = mid(lSh, rSh), mHip = mid(lHip, rHip), mAnk = mid(lAnk, rAnk);

  const pxStature = dist(mSh, mAnk) / F.statureFromShoulderAnkle;
  const cmPerPx = heightCm / pxStature;

  const shoulderCm = dist(lSh, rSh) * cmPerPx;
  const hipSpanCm = dist(lHip, rHip) * cmPerPx;

  const useL = (vis(PT.lSh) + vis(PT.lEl) + vis(PT.lWr)) >= (vis(PT.rSh) + vis(PT.rEl) + vis(PT.rWr));
  const sh = P(useL ? PT.lSh : PT.rSh), el = P(useL ? PT.lEl : PT.rEl), wr = P(useL ? PT.lWr : PT.rWr);
  const sleeveCm = (dist(sh, el) + dist(el, wr)) * cmPerPx;
  const forearmCm = dist(el, wr) * cmPerPx;
  const torsoCm = dist(mSh, mHip) * cmPerPx;

  const chestW = shoulderCm * F.chestWidth, chestD = chestW * F.chestDepth;
  const waistW = ((shoulderCm + hipSpanCm) / 2) * F.waistWidth, waistD = waistW * F.waistDepth;
  const hipW = hipSpanCm * F.hipWidth, hipD = hipW * F.hipDepth;

  return {
    "Shoulder": { v: cmToIn(shoulderCm), kind: "measured" },
    "Sleeve length": { v: cmToIn(sleeveCm), kind: "measured" },
    "Forearm length": { v: cmToIn(forearmCm), kind: "measured" },
    "Garment length": { v: cmToIn(torsoCm), kind: "measured" },
    "Chest / Bust": { v: cmToIn(ellipse(chestW / 2, chestD / 2)), kind: "estimated" },
    "Waist": { v: cmToIn(ellipse(waistW / 2, waistD / 2)), kind: "estimated" },
    "Hips": { v: cmToIn(ellipse(hipW / 2, hipD / 2)), kind: "estimated" },
    "Neck": { v: cmToIn(shoulderCm * F.neckFromShoulder), kind: "estimated" },
  };
}

const CONNECTIONS = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28]];
function drawSkeleton(ctx, lm, W, H) {
  ctx.lineWidth = Math.max(2.5, W * 0.005);
  ctx.strokeStyle = "rgba(244,163,0,0.92)";
  ctx.lineCap = "round";
  CONNECTIONS.forEach(([a, b]) => {
    if ((lm[a]?.visibility ?? 0) < 0.3 || (lm[b]?.visibility ?? 0) < 0.3) return;
    ctx.beginPath(); ctx.moveTo(lm[a].x * W, lm[a].y * H); ctx.lineTo(lm[b].x * W, lm[b].y * H); ctx.stroke();
  });
  ctx.fillStyle = "#C2185B";
  [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28].forEach((i) => {
    if ((lm[i]?.visibility ?? 0) < 0.3) return;
    ctx.beginPath(); ctx.arc(lm[i].x * W, lm[i].y * H, Math.max(4, W * 0.007), 0, Math.PI * 2); ctx.fill();
  });
}

export default function BodyScanner({ onClose, onApply }) {
  const videoRef = useRef(null);
  const overlayRef = useRef(null);
  const streamRef = useRef(null);
  const poseRef = useRef(null);

  const rafRef = useRef(0);
  const runningRef = useRef(false);
  const readySinceRef = useRef(null);
  const capturedRef = useRef(false);
  const lastDetectRef = useRef(0);
  const heightCmRef = useRef(null);
  const camTimeoutRef = useRef(0);

  const [phase, setPhase] = useState("intro"); // intro | camera | result
  const [unit, setUnit] = useState("cm");
  const [heightCm, setHeightCm] = useState("");
  const [ft, setFt] = useState(""); const [inch, setInch] = useState("");
  const [modelReady, setModelReady] = useState(false);
  const [camReady, setCamReady] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [hint, setHint] = useState("");
  const [err, setErr] = useState("");
  const [snapshot, setSnapshot] = useState(null);
  const [results, setResults] = useState(null);
  const [kinds, setKinds] = useState({});

  // load the pose model once, in VIDEO mode (GPU, fall back to CPU). Runs in
  // the background — the camera does NOT wait for this.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_URL);
        let lm;
        try {
          lm = await PoseLandmarker.createFromOptions(vision, { baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" }, runningMode: "VIDEO", numPoses: 1 });
        } catch {
          lm = await PoseLandmarker.createFromOptions(vision, { baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" }, runningMode: "VIDEO", numPoses: 1 });
        }
        if (cancelled) { lm.close?.(); return; }
        poseRef.current = lm;
        setModelReady(true);
      } catch {
        if (!cancelled) setErr("Couldn't load the measuring model. Check your connection and reopen.");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // release everything on unmount
  useEffect(() => () => {
    runningRef.current = false;
    cancelAnimationFrame(rafRef.current);
    clearTimeout(camTimeoutRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    poseRef.current?.close?.();
  }, []);

  // detection loop — starts as soon as the CAMERA is live; detection kicks in
  // once the model is ready (poseRef set in the background).
  useEffect(() => {
    if (phase !== "camera" || !camReady) return;
    runningRef.current = true;
    capturedRef.current = false;
    readySinceRef.current = null;
    lastDetectRef.current = 0;

    const drawOverlay = (lm) => {
      const cv = overlayRef.current, v = videoRef.current;
      if (!cv || !v || !v.videoWidth) return;
      if (cv.width !== v.videoWidth) cv.width = v.videoWidth;
      if (cv.height !== v.videoHeight) cv.height = v.videoHeight;
      const ctx = cv.getContext("2d");
      ctx.clearRect(0, 0, cv.width, cv.height);
      if (lm) drawSkeleton(ctx, lm, cv.width, cv.height);
    };

    const finishCapture = (lm) => {
      const v = videoRef.current;
      const W = v.videoWidth, H = v.videoHeight;
      const canvas = document.createElement("canvas");
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(v, 0, 0, W, H);
      drawSkeleton(ctx, lm, W, H);

      const m = measure(lm, W, H, heightCmRef.current);
      if (!m) {
        capturedRef.current = false; readySinceRef.current = null; setCountdown(null);
        rafRef.current = requestAnimationFrame(loop);
        return;
      }
      setSnapshot(canvas.toDataURL("image/jpeg", 0.9));
      const vals = {}, ks = {};
      Object.entries(m).forEach(([k, { v: val, kind }]) => { vals[k] = String(val); ks[k] = kind; });
      setResults(vals); setKinds(ks);
      setCountdown(null);
      setPhase("result");
      streamRef.current?.getTracks().forEach((t) => t.stop());
      setCamReady(false);
    };

    const loop = () => {
      if (!runningRef.current) return;
      const v = videoRef.current;
      const now = performance.now();

      if (!poseRef.current) {
        setHint("Getting ready…");            // camera is live; model still loading
      } else if (v && v.readyState >= 2 && now - lastDetectRef.current >= DETECT_EVERY_MS) {
        lastDetectRef.current = now;
        let res = null;
        try { res = poseRef.current.detectForVideo(v, now); } catch { res = null; }
        const lm = res?.landmarks?.[0] || null;
        drawOverlay(lm);

        if (framedWell(lm)) {
          if (!readySinceRef.current) readySinceRef.current = now;
          const held = now - readySinceRef.current;
          setCountdown(Math.max(1, Math.ceil((COUNTDOWN_MS - held) / 1000)));
          setHint("Hold still…");
          if (held >= COUNTDOWN_MS && !capturedRef.current) {
            capturedRef.current = true;
            runningRef.current = false;
            finishCapture(lm);
            return;
          }
        } else {
          readySinceRef.current = null;
          setCountdown(null);
          setHint(framedHint(lm));
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => { runningRef.current = false; cancelAnimationFrame(rafRef.current); };
  }, [phase, camReady]);

  const resolvedHeightCm = () => {
    if (unit === "cm") return parseFloat(heightCm);
    return ((parseFloat(ft) || 0) * 12 + (parseFloat(inch) || 0)) * 2.54;
  };
  const heightValid = () => { const h = resolvedHeightCm(); return h >= 120 && h <= 220; };

  const startCamera = async () => {
    setErr(""); setHint("Getting ready…"); setCountdown(null);
    capturedRef.current = false; readySinceRef.current = null;
    heightCmRef.current = resolvedHeightCm();
    streamRef.current?.getTracks().forEach((t) => t.stop());

    if (!navigator.mediaDevices?.getUserMedia) {
      setErr("Camera isn't available here. Open the app over HTTPS (or localhost) — not a plain http address.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false,
      });
      streamRef.current = stream;
      setCamReady(false);
      setPhase("camera");

      clearTimeout(camTimeoutRef.current);
      camTimeoutRef.current = setTimeout(() => {
        setErr("Camera is taking too long. Close other apps using it, then reopen.");
      }, CAM_TIMEOUT_MS);

      requestAnimationFrame(() => {
        const v = videoRef.current;
        if (!v) return;
        v.srcObject = stream;
        v.onloadedmetadata = () => {
          clearTimeout(camTimeoutRef.current);
          v.play().catch(() => {});
          setCamReady(true);
        };
      });
    } catch (e) {
      if (e?.name === "NotAllowedError" || e?.name === "SecurityError")
        setErr("Camera permission was denied. Allow camera access for this site, then try again.");
      else if (e?.name === "NotReadableError")
        setErr("The camera is busy. Close other apps/tabs using it and try again.");
      else setErr("Couldn't start the camera. Reload and try again.");
    }
  };

  const retake = () => { setResults(null); setSnapshot(null); setErr(""); startCamera(); };
  const apply = () => { onApply?.(results || {}); onClose?.(); };

  /* ── styles ── */
  const overlay = { position: "fixed", inset: 0, zIndex: 1000, background: C.ink, display: "flex", flexDirection: "column",
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", color: "#fff" };
  const topbar = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px",
    borderBottom: "1px solid rgba(255,255,255,.12)", flex: "0 0 auto" };
  const iconBtn = { width: 36, height: 36, borderRadius: 10, border: "none", background: "rgba(255,255,255,.14)",
    color: "#fff", display: "grid", placeItems: "center", cursor: "pointer" };
  const serif = { fontFamily: "'Fraunces', Georgia, serif", fontWeight: 600 };
  const primaryBtn = (disabled) => ({ width: "100%", border: "none", borderRadius: 14, padding: "15px 16px", fontWeight: 800,
    fontSize: 15, fontFamily: "inherit", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
    background: C.magenta, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 });
  const ghostBtn = { width: "100%", border: "1.5px solid rgba(255,255,255,.25)", borderRadius: 14, padding: "14px 16px",
    fontWeight: 700, fontSize: 14.5, fontFamily: "inherit", cursor: "pointer", background: "transparent", color: "#fff",
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 };
  const errInline = (
    err ? <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "rgba(194,24,91,.18)",
      border: "1px solid rgba(194,24,91,.4)", borderRadius: 12, padding: "11px 13px", fontSize: 13, lineHeight: 1.45, marginBottom: 12 }}>
      <AlertCircle size={17} style={{ flex: "0 0 auto", marginTop: 1 }} color={C.marigold} /> <span>{err}</span></div> : null
  );

  return (
    <div style={overlay}>
      <style>{`@keyframes bsspin{to{transform:rotate(360deg)}} @keyframes bspop{from{transform:scale(.6);opacity:.4}to{transform:scale(1);opacity:1}} .bs-input::placeholder{color:rgba(255,255,255,.4)}`}</style>

      <div style={topbar}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <Ruler size={20} color={C.marigold} />
          <b style={{ fontSize: 16 }}>Auto-measure</b>
        </div>
        <button onClick={onClose} aria-label="Close" style={iconBtn}><X size={19} /></button>
      </div>

      {/* ── INTRO ── */}
      {phase === "intro" && (
        <div style={{ flex: 1, overflowY: "auto", padding: "22px 18px 24px", display: "flex", flexDirection: "column" }}>
          <div style={{ ...serif, fontSize: 25, lineHeight: 1.15 }}>Measure with<br />your camera</div>
          <p style={{ fontSize: 13.5, color: "rgba(255,255,255,.7)", lineHeight: 1.55, margin: "10px 0 20px" }}>
            Prop the phone up and step back so your whole body is in frame, arms slightly away from your sides.
            It captures on its own once you're lined up. Fitted clothes give the best read.
          </p>

          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase", color: "rgba(255,255,255,.55)", marginBottom: 10 }}>Your height</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            {["cm", "ft·in"].map((u) => {
              const on = (unit === "cm") === (u === "cm");
              return (
                <button key={u} onClick={() => setUnit(u === "cm" ? "cm" : "ft")} style={{ flex: 1, border: "1.5px solid " + (on ? C.marigold : "rgba(255,255,255,.2)"),
                  background: on ? "rgba(244,163,0,.16)" : "transparent", color: "#fff", borderRadius: 11, padding: "10px 0",
                  fontWeight: 700, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit" }}>{u}</button>
              );
            })}
          </div>

          {unit === "cm" ? (
            <div style={{ display: "flex", alignItems: "center", border: "1.5px solid rgba(255,255,255,.2)", borderRadius: 12, padding: "0 14px", background: "rgba(255,255,255,.06)" }}>
              <input className="bs-input" value={heightCm} onChange={(e) => setHeightCm(e.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" placeholder="170"
                style={{ flex: 1, border: "none", outline: "none", background: "transparent", color: "#fff", fontSize: 16, padding: "13px 0", fontFamily: "inherit" }} />
              <span style={{ color: "rgba(255,255,255,.55)", fontSize: 14, fontWeight: 600 }}>cm</span>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 10 }}>
              {[["ft", ft, setFt, "5"], ["in", inch, setInch, "9"]].map(([lab, val, set, ph]) => (
                <div key={lab} style={{ flex: 1, display: "flex", alignItems: "center", border: "1.5px solid rgba(255,255,255,.2)", borderRadius: 12, padding: "0 14px", background: "rgba(255,255,255,.06)" }}>
                  <input className="bs-input" value={val} onChange={(e) => set(e.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" placeholder={ph}
                    style={{ flex: 1, border: "none", outline: "none", background: "transparent", color: "#fff", fontSize: 16, padding: "13px 0", fontFamily: "inherit" }} />
                  <span style={{ color: "rgba(255,255,255,.55)", fontSize: 14, fontWeight: 600 }}>{lab}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "18px 0 6px", color: "rgba(255,255,255,.6)", fontSize: 12.5 }}>
            <ShieldCheck size={16} color={C.teal} /> Processed on your device — no photos are uploaded.
          </div>

          <div style={{ flex: 1 }} />
          {errInline}
          <button style={primaryBtn(!heightValid())} disabled={!heightValid()} onClick={startCamera}>
            <Camera size={18} /> Start camera
          </button>
          {!modelReady && <div style={{ textAlign: "center", fontSize: 12, color: "rgba(255,255,255,.5)", marginTop: 10 }}>Measuring model loads in the background — camera opens right away.</div>}
        </div>
      )}

      {/* ── CAMERA ── */}
      {phase === "camera" && (
        <div style={{ flex: 1, position: "relative", overflow: "hidden", background: "#000" }}>
          <video ref={videoRef} playsInline muted autoPlay style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          <canvas ref={overlayRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none" }} />

          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", display: "grid", placeItems: "center" }}>
            <div style={{ width: "46%", height: "84%", border: `2px dashed ${countdown != null ? C.teal : "rgba(255,255,255,.55)"}`, borderRadius: 120, transition: "border-color .2s" }} />
          </div>

          <div style={{ position: "absolute", top: 14, left: 0, right: 0, textAlign: "center", pointerEvents: "none" }}>
            <span style={{ background: "rgba(61,26,43,.7)", padding: "7px 14px", borderRadius: 999, fontSize: 12.5, fontWeight: 600 }}>
              Auto-capturing · stand back, whole body in frame
            </span>
          </div>

          {countdown != null && (
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none" }}>
              <div key={countdown} style={{ width: 96, height: 96, borderRadius: "50%", background: "rgba(194,24,91,.92)",
                display: "grid", placeItems: "center", ...serif, fontSize: 46, color: "#fff", boxShadow: "0 8px 30px rgba(0,0,0,.45)", animation: "bspop .25s ease" }}>
                {countdown}
              </div>
            </div>
          )}

          {!camReady && (
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "rgba(0,0,0,.45)" }}>
              <Loader2 size={30} style={{ animation: "bsspin .8s linear infinite" }} />
            </div>
          )}

          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "18px 16px", textAlign: "center",
            background: "linear-gradient(to top, rgba(61,26,43,.92), rgba(61,26,43,0))" }}>
            {err
              ? <div style={{ fontSize: 13.5, color: C.marigold, fontWeight: 600 }}>{err}</div>
              : <div style={{ fontSize: 15, fontWeight: 700 }}>{hint || "Line up inside the frame"}</div>}
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.55)", marginTop: 4 }}>Photos never leave your device</div>
          </div>
        </div>
      )}

      {/* ── RESULT ── */}
      {phase === "result" && results && (
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 24px" }}>
          {snapshot && <img src={snapshot} alt="Pose detected" style={{ width: "100%", borderRadius: 16, marginBottom: 16, display: "block" }} />}
          <div style={{ ...serif, fontSize: 20, marginBottom: 4 }}>Your estimated measurements</div>
          <p style={{ fontSize: 12.5, color: "rgba(255,255,255,.6)", lineHeight: 1.5, marginBottom: 14 }}>
            Tap any value to fine-tune it. <span style={{ color: C.marigold }}>est.</span> values are inferred from a single
            view — your tailor confirms exact sizes at pickup.
          </p>

          <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
            {Object.keys(results).map((field) => (
              <div key={field} style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,.06)",
                border: "1px solid rgba(255,255,255,.12)", borderRadius: 12, padding: "10px 12px" }}>
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: kinds[field] === "measured" ? C.teal : C.marigold, flex: "0 0 auto" }} />
                  <span style={{ fontSize: 13.5 }}>{field}</span>
                  {kinds[field] === "estimated" && <span style={{ fontSize: 10.5, color: C.marigold, fontWeight: 700 }}>est.</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,.08)", borderRadius: 9, padding: "0 10px" }}>
                  <input value={results[field]} onChange={(e) => setResults((r) => ({ ...r, [field]: e.target.value.replace(/[^\d.]/g, "") }))}
                    inputMode="decimal" style={{ width: 44, border: "none", outline: "none", background: "transparent", color: "#fff",
                      fontSize: 15, fontWeight: 700, textAlign: "right", padding: "8px 0", fontFamily: "inherit" }} />
                  <span style={{ color: "rgba(255,255,255,.5)", fontSize: 12.5 }}>in</span>
                </div>
              </div>
            ))}
          </div>

          {errInline}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button style={primaryBtn(false)} onClick={apply}><Check size={18} /> Use these measurements</button>
            <button style={ghostBtn} onClick={retake}><RotateCcw size={16} /> Retake</button>
          </div>
        </div>
      )}
    </div>
  );
}
