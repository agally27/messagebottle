import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/config/site";

export const alt = `${siteConfig.name} — ${siteConfig.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Social preview for the marketing pages. Recipient links are never indexed and use the default. */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "linear-gradient(135deg, #0f2a3f 0%, #1b4a5e 60%, #2c5f8a 100%)", color: "#f4efe4", fontFamily: "Georgia, serif", position: "relative" }}>
        <div style={{ position: "absolute", right: 120, top: 90, width: 420, height: 420, borderRadius: 999, background: "radial-gradient(circle, rgba(255,217,138,0.55) 0%, rgba(240,180,94,0.15) 55%, rgba(0,0,0,0) 75%)" }} />
        <div style={{ position: "absolute", right: 250, top: 150, width: 150, height: 330, borderRadius: 60, border: "6px solid rgba(255,255,255,0.75)", background: "rgba(255,217,138,0.25)", display: "flex" }} />
        <div style={{ position: "absolute", right: 285, top: 118, width: 80, height: 40, borderRadius: 8, background: "#c9a961", display: "flex" }} />
        <div style={{ position: "absolute", right: 300, top: 240, width: 52, height: 150, borderRadius: 12, background: "#f7ead3", transform: "rotate(-12deg)", display: "flex" }} />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 90px", maxWidth: 720 }}>
          <div style={{ fontSize: 22, letterSpacing: 6, textTransform: "uppercase", color: "#9fe3d8", fontFamily: "sans-serif" }}>Message in a Bottle</div>
          <div style={{ fontSize: 84, lineHeight: 1.02, marginTop: 24 }}>A feeling, in a bottle.</div>
          <div style={{ fontSize: 30, marginTop: 28, color: "#b9c2cf", fontFamily: "sans-serif" }}>{siteConfig.tagline}</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
