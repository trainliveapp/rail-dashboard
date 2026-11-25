import { useEffect, useRef, useState } from "react";

const TURNSTILE_SCRIPT_ID = "stationlive-turnstile-script";
let turnstileScriptPromise;

function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (turnstileScriptPromise) return turnstileScriptPromise;

  turnstileScriptPromise = new Promise((resolve, reject) => {
    let script = document.getElementById(TURNSTILE_SCRIPT_ID);
    if (script?.dataset.loaded === "true" && !window.turnstile) {
      script.remove();
      script = null;
    }
    const shouldAppend = !script;
    if (!script) {
      script = document.createElement("script");
      script.id = TURNSTILE_SCRIPT_ID;
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
    }

    script.addEventListener("load", () => {
      if (window.turnstile) {
        script.dataset.loaded = "true";
        resolve(window.turnstile);
      }
      else reject(new Error("CAPTCHA could not be loaded."));
    }, { once: true });
    script.addEventListener("error", () => {
      script.remove();
      reject(new Error("CAPTCHA could not be loaded."));
    }, { once: true });
    if (shouldAppend) document.head.appendChild(script);
  }).catch((error) => {
    turnstileScriptPromise = null;
    throw error;
  });

  return turnstileScriptPromise;
}

export default function ChatTurnstile({ siteKey, onToken }) {
  const containerRef = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!siteKey) return undefined;
    let active = true;
    let widgetId;

    loadTurnstile()
      .then((turnstile) => {
        if (!active || !containerRef.current) return;
        widgetId = turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme: "auto",
          callback: (token) => onToken(token),
          "expired-callback": () => onToken(""),
          "error-callback": () => {
            setError("CAPTCHA verification failed. Please try again.");
            onToken("");
          },
        });
        setError("");
      })
      .catch((loadError) => {
        if (active) setError(loadError.message);
      });

    return () => {
      active = false;
      onToken("");
      if (widgetId !== undefined) window.turnstile?.remove(widgetId);
    };
  }, [siteKey, onToken]);

  if (!siteKey) return null;
  return (
    <div className="flex flex-col items-center gap-1">
      <div ref={containerRef} />
      {error && <p role="alert" className="text-center text-xs text-amber-200">{error}</p>}
    </div>
  );
}
