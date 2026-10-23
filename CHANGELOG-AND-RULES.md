# ROYAL CHESS - changelog and build rules

Live: https://svofficials9999-collab.github.io/sv-chess/

## v1.1.0 - 2026-10-23
- Rebranded to ROYAL CHESS per user master prompt: Royal Gold + Black Marble board themes,
  gold luxury palette, 5 AI levels (Beginner/Easy/Medium/Hard/Expert), Hint button.
  Fixed captured-tray phantom piece bug. Phase 2 (not in this build): true 3D pieces/camera,
  training mode, more themes, online multiplayer (no buttons shown until real).

## v1.0.0 - 2026-10-23
- First release. Two players on one phone, and vs computer with 8 levels
  (Beginner 1350 ELO to World Class 2850 ELO, Stockfish 10 via nmrugg stockfish.js, GPL).
- Clocks: none / 3 / 5 / 10 / 15+10s. Sounds, undo, resign, draw offers, promotion picker,
  move list, captured pieces, auto-flip option for 2-player.
- English first, Telugu toggle. Game guide in both languages. PWA installable, works offline.
- Created by D. Srinivas. Suggestion box mails svofficials9999@gmail.com.
- Piece artwork: Colin M. L. Burnett (CC BY-SA 3.0 / GFDL) via Wikimedia Commons.
- Rules library: chess.js (MIT). No ads, no sign-up, free forever.

## Rules for future edits (owner: D. Srinivas only)
1. Bump the cache name in sw.js and app-version meta on every change.
2. Re-test the live link at 360px and 414px before saying done.
3. Never remove the creator credit, guide, or Telugu toggle.
4. Free services only.

## v1.2.0 (2026-10-23)
- NEW: 3D board view (Three.js, vendored, free) - gold/obsidian 3D pieces, orbit + pinch camera, tap-to-move, glide/capture animations, check/last-move/legal-move highlights, auto shadow-off on slow phones. 2D stays the default and fallback (setup > Board view > 2D/3D).
- Fixed guide text: 5 levels up to Expert (was wrongly "8 levels ... World Class").
- Verified: engine levels genuinely differ (same position: Beginner a3 d10 / Medium Be2 d13 / Expert O-O-O d17). Draw rules automatic: 50-move, threefold, stalemate, insufficient material.
