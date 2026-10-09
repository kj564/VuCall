# VuCall — Deploy to GitHub Pages

VuCall is a static site (Next.js `output: export`). Signaling goes through a
**public MQTT broker over WebSocket** — no server process needed, so it runs on
GitHub Pages.

## Quick deploy

1. **Push to GitHub** — push this repo to a GitHub repository.
2. **Enable Pages** — repo → Settings → Pages → Source: **GitHub Actions**.
3. **Push to `main`** — the `Deploy to GitHub Pages` workflow builds + deploys.
4. **Open** — `https://<your-username>.github.io/<repo-name>/`

The `basePath` is auto-set to `/<repo-name>` in the workflow. For a **custom
domain** or a `user.github.io` repo, set `NEXT_PUBLIC_BASE_PATH=` (empty) in
the workflow env.

## Local build (test the export)

```bash
bun install
bun run build      # produces ./out
npx serve out       # preview locally
```

## Signaling

The app connects to `wss://broker.emqx.io:8084/mqtt` (public EMQX broker) for
signaling. For production, set `NEXT_PUBLIC_MQTT_URL` to your own broker
(e.g. EMQX/Mosquitto with WSS) for reliability + privacy.

## Notes

- The call is **P2P WebRTC** — media flows directly between the two browsers.
- The MQTT broker only relays the signaling (offer/answer/ICE) — tiny payload.
- Camera/mic require a **secure context** (HTTPS). GitHub Pages is HTTPS ✓.
- The `socket.io` mini-service in `mini-services/` is no longer used for
  signaling (kept for reference); MQTT replaced it for static hosting.
