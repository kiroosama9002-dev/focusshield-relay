# FocusShield Relay (optional, free)

Lets your phone reach your PC from any network (mobile data, another Wi-Fi). The PC app and the phone both connect OUT to this small server, which only passes messages between them. Your PIN rules and pairing code are still checked by the PC app.

## Host it free on Render
1. Create a GitHub repo (public) and upload these 3 files: `server.js`, `package.json`, `render.yaml`.
2. Sign up at render.com with GitHub. Click **New → Web Service**, pick the repo.
3. Runtime **Node**, Build command `npm install`, Start command `node server.js`, Instance type **Free**. Create.
4. Wait for "Live". Copy the address, for example `https://focusshield-relay.onrender.com`. Opening it should show "FocusShield relay OK".

## Connect
1. PC app → Settings → Phone companion → turn on → paste the relay address under "Use it from anywhere" → Save.
2. Copy the **internet link** that appears and paste it into the Android app (it replaces the Wi-Fi link).
3. The PC app must be running and online. The free Render plan sleeps after idle time; the PC app pings it to keep it awake, and the first connection after a sleep can take up to a minute.
