# NutriTrack AI — calorie & protein tracker

A small React + Vite nutrition tracker with a Groq-powered food estimator. Daily entries and goals are stored in the browser's local storage on the device. The backend keeps a separate JSON audit log of successful AI estimates.

## 1. Add your Groq API key (backend only)

1. Create an API key at https://console.groq.com/keys.
2. Copy the project-root `.env.example` file to a new project-root file named `.env`.
3. Put the key in that project-root `.env` file:

   ```env
   GROQ_API_KEY=gsk_your_real_key_here
   GROQ_MODEL=openai/gpt-oss-20b
   PORT=3001
   ```

4. Never paste the key into `src/`, `VITE_*` variables, the APK, GitHub, or a public frontend. The backend reads it from the environment and calls Groq.

## 2. Run locally on your computer

Requires Node.js 20+ and an internet connection for dependency installation.

```bash
npm install
cp .env.example .env
# Edit .env and paste your Groq key
npm run dev
```

In a second terminal:

```bash
npm run server
```

Open http://localhost:5173. Vite proxies `/api` to `http://localhost:3001` (see below).

## 3. Build Android APK

This project uses Capacitor. Android APK compilation requires Android Studio, Android SDK, and a JDK installed on your computer.

```bash
npm install
npm run build
npx cap add android       # only the first time
npx cap sync android
npx cap open android
```

In Android Studio choose **Build → Build Bundle(s) / APK(s) → Build APK(s)**. The debug APK is normally created at `android/app/build/outputs/apk/debug/app-debug.apk`.

### Connect the Android app to your backend

The APK must call a reachable HTTPS backend. Deploy the `server/` API to a host such as Render, Railway, or your own server. Set the backend's `GROQ_API_KEY` environment variable in that host's dashboard. If you deploy the included Express server and frontend together, the same host serves both. Then create a project-root `.env.production` file before building the Android bundle:

```env
VITE_API_URL=https://YOUR-BACKEND-HOST
```

Rebuild and sync:

```bash
npm run build
npx cap sync android
```

Do not use `localhost` as the API URL in an installed APK: on the phone it points to the phone itself, not your computer. Keep the Groq key only in the backend environment.

For Android Emulator testing against the backend running on this computer, use
`VITE_API_URL=http://10.0.2.2:3001` instead. For a physical device, use the
computer's LAN IP (for example `http://192.168.1.20:3001`), make sure the
backend listens on the network, and allow the port through the firewall. A
deployed HTTPS backend is recommended for production.

## 4. Deploy the backend and web app on Railway

1. Push this project to a GitHub repository. Do not commit `.env`; it is
   already excluded by `.gitignore`.
2. In Railway, create a new project and choose **Deploy from GitHub repo**.
3. Select this repository. Railway detects the Node.js project automatically.
   The build command is `npm run build` and the start command is `npm start`.
4. In the Railway service's **Variables** section, add:

   ```env
   GROQ_API_KEY=your_real_groq_key
   GROQ_MODEL=llama-3.3-70b-versatile
   ```

   Do not add `VITE_API_URL` to Railway for this single-service deployment.
5. In **Settings**, generate a public domain for the service.
6. Open `https://YOUR-RAILWAY-DOMAIN/api/health`. It should return JSON with
   `"ok":true` and `"configured":true`.

The Railway domain is the production API URL for the Android build. Create a
project-root `.env.production` file locally containing:

```env
VITE_API_URL=https://YOUR-RAILWAY-DOMAIN
```

Then build the release you install or distribute:

```bash
npm run build
npx cap sync android
```

The Railway filesystem is not a permanent database. The included JSON audit
log is suitable for a prototype, but use a Railway volume or a database before
relying on server-side history in production. The app's daily history remains
stored locally on each device.

## Notes

- Goals default to 2,500 kcal and 90 g protein. Change them using the target icon in the app.
- Daily food entries and history are stored locally in that browser/app installation. Clearing app storage removes local history; back it up before clearing data.
- The backend JSON log is a simple prototype store, not a production database. For multi-device sync, authentication, backups and long-term use, replace it with a database such as PostgreSQL/Supabase.
- Nutrition results are estimates. Portion size, oil, recipes and cooking methods affect accuracy.
