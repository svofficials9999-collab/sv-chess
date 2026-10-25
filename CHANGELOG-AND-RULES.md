# ROYAL CHESS - changelog and build rules

Live: https://svofficials9999-collab.github.io/sv-chess/

## v1.4.0 (2026-10-23)
- REVIEW FIX (main rejected the v1.3.1 overhead look: converging sides + pieces as round
  tops): replaced the perspective camera with an OBLIQUE orthographic projection (top camera
  + shear matrix, camera-height-compensated). The board grid is now a mathematically perfect
  rectangle - opposite edges parallel, zero perspective convergence, gold rim flush to all
  four sides of the full-width square canvas - while every piece stands upright showing its
  full physical Staunton profile (king cross, queen coronet, bishop mitre, rook battlements,
  knight head). Straight frame AND recognizable pieces, both, no tradeoff.
- One-finger drag no longer tilts the board (user: not even slight slant); pinch zoom and
  double-tap zoom reset kept. Orientation flip now rotates the board/piece/highlight/fx
  groups (was camera theta), with orientation-aware tap mapping and world-space projection.
- Tap raycast uses exact rays for the sheared projection (manual unproject), verified:
  e2-e4 and e7-e5 land via real pointer events in both normal and flipped orientation;
  zero JS errors; 32 pieces, shadows on.
- v1.3.1 changes kept: wood-grain pieces (oak vs ebony) and maple/walnut board, calmer
  antique-gold rim, grounded shadows, 40-segment lathes.

## v1.3.1 (2026-10-23)
- User-driven redesign (voice 18:31 + annotated screenshot 18:34): board is now STRAIGHT
  (near-top-down camera, phi 0.78 -> 0.10; no more tilted slate/trapezoid look) and fills the
  total phone frame - square full-width canvas, camera fits the gold rim edge to edge, dark
  trapezoid corners gone.
- Ultra-realistic materials pass: procedural wood-grain (canvas texture + bump) on pieces
  (light oak vs ebony) and on the maple/walnut board; calmer antique-gold rim; grounded
  shadows (2048px) + soft fill light; smoother 40-segment piece lathes; knight head tilted
  back so the horse face reads from the straight top view.
- Colours changed per user permission. Orbit/pinch camera preserved (double-tap resets to
  the straight view). No rules, modes, effects, netplay or control changes.
- Verified headless at 390x844: 32 pieces render, r==need exact frame fit, real tap pipeline
  (pointer -> raycast) e2-e4 and e7-e5 both land, zero JS errors.

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

## v1.2.1 (2026-10-23)
- 3D view: wider default framing (whole board + frame visible), brighter obsidian pieces + stronger lighting for contrast, orbit tilt clamped so the board never leaves the view.
- Draw rules now follow FIDE claim/automatic split: 50-move and threefold repetition are CLAIMABLE (Draw button claims when available, still offers agreement otherwise); 75-move and fivefold are AUTOMATIC. Previously 50-move/threefold ended the game automatically (app-specific behavior) - fixed.

## v1.3.0 (2026-10-23)
- NEW (beta): Two Phones mode - play a friend on another phone with WebRTC phone-to-phone moves. No account, no game server: game codes are copied by the players themselves. Same Wi-Fi needs no helper; different networks can opt into the free Google STUN helper (off by default; Google sees only the phone IP for connecting). Some mobile networks can still block direct play. Moves/resign/draw offers sync both ways; draw claims follow the same rules as local play.

## v1.4.0 (2026-10-23)
- Capture blast effect: 💥 burst on the captured square (2D) + golden particle burst (3D), with a stronger capture sound (low thump + snap). Sound still fully controlled by the existing sound toggle.
- Win celebration: full-screen confetti rain above the game-over dialog (2D + 3D); existing win/lose jingles unchanged.
- 3D view straightened and enlarged per user request: camera now near-overhead (phi 0.15), canvas square again, board fills ~80-84% of the canvas (was ~74% in 4:3 tilted view). Drag still allows tilt 0.08-1.25 rad; double-tap resets to the overhead view.
- No rules, features, layout or netplay changes. Verified on 390x844: capture blast pixels present, confetti visible above modal, 3D blast particles live (fxCount=16), zero JS errors, 25-28fps on SwiftShader software rendering (real GPUs are faster).

## v1.5.0 (2026-10-23)
- Single realistic view per user request: the 2D/3D choice is removed from setup and the game screen. The app always shows the realistic 3D physical chess set; a simple 2D board remains only as a silent automatic fallback on devices without WebGL.
- Bigger board: 3D fit tightened so the board fills ~90% of the canvas (was ~80%), larger finger targets.
- Tap accuracy: tapping a piece's body now selects that piece (piece-first raycast), not whatever square the plane projection lands on.
- Capture blast, win confetti, rules, modes, netplay unchanged.

## v2.0.0 (2026-10-24)
- Larger pieces: physical geometry +20% width/depth, +14% height for standard styling. Straight orthographic board and exact raycast kept; normal/flipped legal pointer drags tested.
- Six actual 3D material palettes, three silhouette-preserving piece styles, environment colour palettes, lighting and glide-speed choices. Manual choice, no talent inference/locks. Backgrounds are graphic palettes, not modelled photographic rooms.
- Interactive starter training: piece movement, seven-half-move opening/castling exercise, knight fork, mate-in-one, legal move hints and explanations. A starter set, not a complete chess curriculum.
- Device-local PGN/FEN save/resume for local/CPU games. Restores paused; no network-match persistence/reconnect promise. Menu/background pauses local clocks; explicit Pause/Resume. Native fullscreen where browser permits.
- Independent effects/music volume and master mute; original generated ambient chord off by default. Lightweight2D choice and sustained-low-FPS automatic fallback. No physical budget-phone certification.
- King/queen selection rings, promotion burst, straight-view finish emphasis; no angled checkmate camera, preserving the user's later straight-board override.
- Service worker activation now retires only sv-chess-* caches, preserving sibling apps. No stored games removed.
- Optional original online platform (matchmaking/accounts/profiles/ratings/server reconnection) not implemented; existing manual-code WebRTC beta and cross-network caveat unchanged. No services/accounts/spending added.

## v2.1.0 (2026-10-24)
- Bounded foundation course: 18 interactive studies covering all six pieces, en passant and promotion, three opening lines, fork/pin/skewer, three mate-in-one patterns, and a free movement laboratory. Explanations in English/Telugu, device-local completion checks. A defined introductory course, not exhaustive chess education.
- Three original modelled lightweight 3D environments (columned hall, furnished room, arched arena) replace palette-only backgrounds. Static rendering avoids an extra continuous animation loop. Scene preview in settings; straight full-width board and exact tap geometry untouched.
- Original generated studio reflection texture for physical piece materials. Lighting settings now applied on first renderer initialization.
- Ambient audio starts at zero gain, removing an unintended loud initial transient; existing shared chord and opt-in volume unchanged.
- Menu fade transitions respect reduced motion; non-game navigation stops the board render loop. Top/game controls meet a 44px minimum. Storage failure cannot stop appearance application. Completed lesson hints no longer show undefined next moves.
- Existing CPU/local saves, themes, larger pieces, online beta and sibling storage/cache preservation retained. No new accounts, servers, analytics, paid dependencies or external assets.
- Optional advanced online platform remains outside this local release; physical-device performance/network coverage and listening audition are not certified by mobile browser emulation.

## v2.1.1 (2026-10-24)
- Upgrade integration test exposed an old worker finishing a background asset fetch after cache retirement and recreating its old cache. Global cache lookup could then serve stale HTML. Fetch lookup and offline fallback now read only the current named chess cache. Old/sibling caches cannot win request matching. Verified through a real old-worker-to-new-worker saved-game/offline upgrade.

## v2.2.0 (2026-10-24)
- Owner selected option3 from the real-track audition: Solace by Scott Buckley. Replaced the rejected synthesized ambient chord with the full selected recording, bundled locally as a96kbps MP3 (about4.1MB), no external streaming or tracking.
- Visible title/author/source/CCBY4 licence and compression-only change notice in English/Telugu music settings; source provenance retained in audio/SOURCES.txt. Free commercial software use with credit verified from the composer's own pages. No paid licences/accounts created.
- Separate music play/stop, gentle starting volume0.12, adjustable volume, master mute and background pause. Off for new users until chosen; browser autoplay restrictions respected. Full track repeats only while enabled. Existing effects volume unchanged.
- Real audio decoding/time advancement/play-stop/mute verified, not a claim of listening audition. All prior local-phase release caveats remain.

## v2.2.1 (2026-10-24)
- Nonbackend integrity audit: serialize engine/hint searches so one response cannot replace another callback. Bound unresponsive worker recovery and ignore callbacks for a different game/FEN/promotion context. Correct fallback negamax mate score.
- Disable unsynchronised Undo and assisted Hint during two-phone matches; both remain available locally. Verify incoming peer move ownership, square/promotion shape, legal result and draw claims; reject unsolicited draw acceptance. These protect normal peer consistency, not server-authoritative anti-cheat or reconnection.
- Captured trays now use actual capture history, fixing false captured pawns after promotion. Timeout against a bare king is a draw. Stale draw/resign modal callbacks cannot finish a replacement game.
- Correct Telugu pawn/en-passant/guide mistranslations and describe castling/draw claim rules precisely. Larger pieces/straight board/themes/training/local saves/Solace unchanged. Hosted Cloudflare phase explicitly deferred by owner, not deployed or completed.

##2.2.2 -25October2026
- User-requested visual correction: thinking status is a19px-high edge pill, with no full-board dimming, large panel, pulse or glow. Piece sizes and engine behaviour unchanged.
- Home hero uses original realistic golden horse artwork instead of flat knight icon. Install icon unchanged.
- Cachev43 includes home artwork. Saved-game/settings keys and music untouched.

##2.2.3 -25October2026 realistic Royal Chess icon
- Replaced flat knight branding with original realistic golden horse sculpture across favicon,Apple touchicon,PNG192/512install icons,maskable512andmatchinghomehero.Legacyicon.svgembedsthesamePNG.
- Androidmaskablehasextrasafemargin.Installedlaunchericonrefreshiscontrolledbybrowser/OS;newmanifestassetsdonotproveanexistingphoneiconhaschanged.
- Boardpiececode/assets,SVPRIMEcreatorlogo,engine,settingsandsavesunchanged.CPUHardlegalreply,savedreload/resume,tinythinkingstatus320/393/430regressionpassed. Cachev44,app2.2.3.
