import { Form, useNavigation, useActionData } from "react-router";
import { useState, useEffect, useRef } from "react";
import { IcyCard, IcyCardBody, IcyCardHeader } from "~/components/IcyCard";
import { Button } from "~/components/Button";
import { FlashMessage } from "~/components/FlashMessage";
import { fmtTime, durHours } from "~/lib/format";

export interface PunchPanelProps {
  today: string;
  todayRecord: {
    punch_in_at?: string | null;
    punch_out_at?: string | null;
  } | null;
  gpsRequired: boolean;
}

export function PunchPanel({ todayRecord, gpsRequired }: PunchPanelProps) {
  const navigation = useNavigation();
  const actionData = useActionData<{ error?: string | null; success?: string | null }>();

  const [gpsStatus, setGpsStatus] = useState<"idle" | "acquiring" | "locked" | "error">("idle");
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number; addr: string | null } | null>(
    null
  );

  const formRef = useRef<HTMLFormElement>(null);
  const isSubmitting = navigation.state === "submitting";

  const punchedIn = !!todayRecord?.punch_in_at;
  const punchedOut = !!todayRecord?.punch_out_at;
  const canPunchIn = !punchedIn;
  const canPunchOut = punchedIn && !punchedOut;

  async function acquireGPS() {
    setGpsStatus("acquiring");
    setGpsError(null);
    try {
      const { getCurrentPosition } = await import("~/lib/geolocation.client");
      const result = await getCurrentPosition();
      setCoords(result);
      setGpsStatus("locked");
    } catch (err: unknown) {
      const { geoErrorMessage } = await import("~/lib/geolocation.client");
      const msg = err instanceof Error ? geoErrorMessage(err.message) : "Location error";
      setGpsError(msg);
      setGpsStatus("error");
    }
  }

  const gpsReady = !gpsRequired || gpsStatus === "locked";
  const submitDisabled = isSubmitting || !gpsReady;

  const [clock, setClock] = useState(() => {
    const now = new Date();
    return now.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  });

  useEffect(() => {
    const id = setInterval(() => {
      setClock(
        new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <IcyCard className="hard-shadow">
      <IcyCardHeader>
        <h2 className="eyebrow">PUNCH IN / OUT</h2>
      </IcyCardHeader>
      <IcyCardBody>
        <p className="display text-5xl text-ink tnum mb-1">{clock}</p>
        <p className="eyebrow mb-6">
          {new Date()
            .toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })
            .toUpperCase()}
        </p>

        <div className="flex flex-wrap gap-3 mb-6">
          <div className="bevel-sunken px-4 py-3 min-w-28">
            <p className="eyebrow mb-1">PUNCH IN</p>
            <p className="tnum font-mono text-ink font-bold">
              {fmtTime(todayRecord?.punch_in_at ?? null)}
            </p>
          </div>
          <div className="bevel-sunken px-4 py-3 min-w-28">
            <p className="eyebrow mb-1">PUNCH OUT</p>
            <p className="tnum font-mono text-ink font-bold">
              {fmtTime(todayRecord?.punch_out_at ?? null)}
            </p>
          </div>
          {todayRecord?.punch_in_at && todayRecord?.punch_out_at && (
            <div className="bevel-sunken px-4 py-3 min-w-28">
              <p className="eyebrow mb-1">DURATION</p>
              <p className="tnum font-mono text-ink font-bold">
                {durHours(todayRecord.punch_in_at, todayRecord.punch_out_at)}
              </p>
            </div>
          )}
        </div>

        {gpsRequired && (
          <div className="mb-4">
            {gpsStatus === "idle" && (
              <button
                type="button"
                onClick={acquireGPS}
                className="bevel bevel-press px-4 py-2 font-mono font-bold uppercase tracking-[0.08em] text-xs text-ink"
              >
                ◎ ACQUIRE GPS LOCK
              </button>
            )}
            {gpsStatus === "acquiring" && (
              <span className="chip eyebrow">
                <span className="inline-block w-2.5 h-2.5 border-2 border-current border-t-transparent animate-spin mr-1.5" />
                ACQUIRING GPS...
              </span>
            )}
            {gpsStatus === "locked" && coords && (
              <span className="chip" style={{ backgroundColor: "var(--ok)", color: "#fff" }}>
                ✓ GPS LOCK · {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
              </span>
            )}
            {gpsStatus === "error" && (
              <div
                className="bevel-sunken px-4 py-2.5 border-l-4"
                style={{ borderLeftColor: "var(--err)" }}
              >
                <p className="text-xs font-mono" style={{ color: "var(--err)" }}>
                  {gpsError}
                </p>
                <button type="button" onClick={acquireGPS} className="eyebrow mt-1 underline">
                  RETRY
                </button>
              </div>
            )}
          </div>
        )}

        {!gpsRequired && (
          <div className="mb-4">
            <span className="chip eyebrow">GPS OFF — LOCATION NOT REQUIRED</span>
          </div>
        )}

        <FlashMessage message={actionData?.error} variant="error" />
        <FlashMessage message={actionData?.success} variant="success" />

        <Form method="post" ref={formRef}>
          <input type="hidden" name="lat" value={coords?.lat ?? ""} />
          <input type="hidden" name="lng" value={coords?.lng ?? ""} />
          <input type="hidden" name="addr" value={coords?.addr ?? ""} />
          <div className="flex flex-wrap gap-3">
            {canPunchIn && (
              <Button
                type="submit"
                name="intent"
                value="punch_in"
                size="lg"
                disabled={submitDisabled}
                loading={isSubmitting && navigation.formData?.get("intent") === "punch_in"}
              >
                PUNCH IN
              </Button>
            )}
            {canPunchOut && (
              <Button
                type="submit"
                name="intent"
                value="punch_out"
                variant="secondary"
                size="lg"
                disabled={submitDisabled}
                loading={isSubmitting && navigation.formData?.get("intent") === "punch_out"}
              >
                PUNCH OUT
              </Button>
            )}
            {punchedIn && punchedOut && (
              <span className="bevel px-6 py-3 font-mono font-bold uppercase tracking-[0.08em] text-sm text-ink eyebrow">
                ✓ COMPLETE FOR TODAY
              </span>
            )}
          </div>
        </Form>
      </IcyCardBody>
    </IcyCard>
  );
}
