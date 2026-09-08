# Verification

Verified locally in Chrome on macOS on 8 September 2026.

- The production build succeeds and includes `/app/sueno-del-celta` without changing the existing site's routes or navigation.
- All ten state and navigation tests pass. They cover the nine choices, recovery from corrupt saves, rejection of invalid progress, persistence, and a pathfinding regression around a palm beside the Amazon dock.
- A fresh browser completed all nine missions through the real movement, interaction and dialogue controls. The prison interlude and fixed historical epilogue were reached. Reloading retained the completed journey and all nine notebook entries. No uncaught page errors were recorded. A screenshot pixel-variance check also confirms the 3D scene is visible, guarding against a previously discovered empty HDR buffer.
- Mobile emulation at 390×844 and 844×390 verified touch joystick movement, the first mission, notebook, settings, and layouts without horizontal overflow. The browser reported 60 FPS during this test after loading.
- Desktop exploration reported 60 FPS. Switching from automatic HDR rendering to economy and then high quality produced no browser or shader errors. The portrait menu camera was checked separately to keep the full character in frame.
- The final independent `dream-loop` art review scored the live 1536×1024 render 8.0/10 against the approved concept. Shape, lighting and material gates passed; remaining differences concern fine cloth and reflection detail. This is an art review, not a claim of photographic equivalence.
- Keyboard focus is contained in open notebook, settings and dialogue panels. Escape closes the active overlay or pauses exploration.
- The generated material, foliage and sky files total approximately 2.3 MB before HTTP compression. Three.js and the game are loaded only for this route.

The performance result is from desktop Chrome with mobile viewport and touch emulation, not a physical iPhone or Android benchmark. Actual frame rate depends on the device. The renderer caps resolution, offers an economy setting, reduces resolution under load, and pauses rendering in background tabs. WebGL 2 is required. Saving is local to the browser; no cloud sync or offline installation is implemented.

Working screenshots, complete-playthrough results and temporary browser scripts are retained in the gitignored `.dream-loop/` folder.
