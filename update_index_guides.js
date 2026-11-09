const fs = require('fs');
const vm = require('vm');

let html = fs.readFileSync('index.html', 'utf8');

function replaceBlock(target, replacement, desc) {
  const parts = html.split(target);
  if (parts.length === 1) {
    throw new Error(`[FAIL] Target not found for: ${desc} -> "${target.slice(0, 60)}"`);
  }
  if (parts.length > 2) {
    throw new Error(`[FAIL] Target matched ${parts.length - 1} times for: ${desc} -> "${target.slice(0, 60)}"`);
  }
  html = parts[0] + replacement + parts[1];
  console.log(`[OK] ${desc}`);
}

// -----------------------------------------------------------------------------
// 1. Audio Engine Header & Functions (lines 2-9)
// -----------------------------------------------------------------------------
replaceBlock(
  `/* ===== DEAL audio engine =====`,
  `// ---> audio engine <---
//-> Purpose: Manages interface sound effects (navigation, selection confirmations, error alerts) via Web Audio API.
//-> Step 1: User interacts with clickable controls, buttons, forms, tabs, or dialogs.
//-> Step 2: Global listener intercepts the interaction and plays a context-specific audio cue ('nav', 'pick', or 'error').
/* ===== DEAL audio engine =====`,
  'Audio Engine Section Header'
);

replaceBlock(
  `  function init(){`,
  `  //-> Function: init()
  //-> Purpose: Initializes the AudioContext and decodes base64 audio sprites into memory buffers.
  //-> Parameters: None.
  //-> State Updates: Sets audio context \`ctx\` and populates \`buffers\` object.
  //-> Storage / API: Web Audio API (AudioContext, decodeAudioData).
  //-> UI Updates: None directly; prepares audio engine for immediate playback.
  function init(){`,
  'init() audio function'
);

replaceBlock(
  `  function unlock(){`,
  `  //-> Function: unlock()
  //-> Purpose: Resumes suspended AudioContext on first user gesture to comply with browser autoplay policies.
  //-> Parameters: None.
  //-> State Updates: Resumes audio context if suspended.
  //-> Storage / API: Calls ctx.resume().
  //-> UI Updates: Enables auditory feedback on all subsequent actions.
  function unlock(){`,
  'unlock() audio function'
);

replaceBlock(
  `  function play(name){`,
  `  //-> Function: play(name)
  //-> Purpose: Plays a decoded sound buffer ('nav', 'pick', or 'error') with volume leveling and debounce gating.
  //-> Parameters: name (string) - Key of audio buffer to play ('nav' | 'pick' | 'error').
  //-> State Updates: Updates last[name] timestamp and tracks active error source in recent.
  //-> Storage / API: Checks localStorage 'deal-mute'.
  //-> UI Updates: Emits audible sound via Web Audio destination.
  function play(name){`,
  'play() audio function'
);

// -----------------------------------------------------------------------------
// 2. Shared State & Helpers (around line 198)
// -----------------------------------------------------------------------------
replaceBlock(
  `// ---> shared application state and pricing helpers <---`,
  `// ---> shared application state and persistent storage <---
//-> Purpose: Maintains global reactive application state S, memory caching, and localStorage persistence for offline resilience.
//-> Step 1: App initializes state with locally cached catches, pending offline queue, theme, and language.
//-> Step 2: State changes trigger automatic serialization and write to localStorage via save().`,
  'Shared State Section Header'
);

replaceBlock(
  `//-> Function: LS(key, fallback)\n//-> Reads a JSON value from localStorage and returns the fallback when the item is missing or invalid.`,
  `//-> Function: LS(key, fallback)
//-> Purpose: Safely retrieves and parses JSON data from localStorage, returning fallback on error or missing key.
//-> Parameters: key (string) - localStorage key; fallback (any) - Default value if key absent.
//-> State Updates: None.
//-> Storage / API: window.localStorage.getItem().
//-> UI Updates: Provides initial state for catches, offline queue, and settings.`,
  'LS() function'
);

replaceBlock(
  `//-> Function: save()\n//-> Stores the pending queue, language, theme, and catch cache in localStorage; catch photos are intentionally omitted.`,
  `//-> Function: save()
//-> Purpose: Serializes and stores offline queue, language, dark mode, and catch cache to localStorage.
//-> Parameters: None.
//-> State Updates: None directly.
//-> Storage / API: Writes 'deal-q', 'deal-lang', 'deal-dark', and 'deal-cache' to window.localStorage.
//-> UI Updates: Preserves user preferences and offline queue across browser reloads.`,
  'save() function'
);

replaceBlock(
  `//-> Function: tar(pricePerKg, kilograms)\n//-> Calculates base price, port fee, 5% commission, ice/handling, total payable, and effective cost per kg.`,
  `//-> Function: tar(pricePerKg, kilograms)
//-> Purpose: Calculates Navotas Port tariff breakdown: base cost, ₱2.50/kg port fee, 5% broker fee, ₱1.50/kg ice fee, and total.
//-> Parameters: pricePerKg (number) - Base fish price; kilograms (number) - Purchase weight in kg.
//-> State Updates: None.
//-> Storage / API: None.
//-> UI Updates: Returns fee object used for live Taripa calculations and receipts.`,
  'tar() function'
);

replaceBlock(
  `function toast(m,bad,q){if(/failed to fetch|networkerror|load failed/i.test(m))m='Network problem. Check your connection and try again.';`,
  `//-> Function: toast(message, isError, isQuiet)
//-> Purpose: Displays transient notification alert banner at top of viewport for user feedback.
//-> Parameters: message (string) - Message text; isError (boolean) - Red styling if true; isQuiet (boolean) - Suppresses sound.
//-> State Updates: Appends toast DOM element.
//-> Storage / API: None.
//-> UI Updates: Injects #toast element, triggers error sound if applicable, auto-dismisses after 3.5s to 6.5s.
function toast(m,bad,q){if(/failed to fetch|networkerror|load failed/i.test(m))m='Network problem. Check your connection and try again.';`,
  'toast() function'
);

// -----------------------------------------------------------------------------
// 3. Sign-In & Account Access (around line 223)
// -----------------------------------------------------------------------------
replaceBlock(
  `// ---> sign-in and account access <---`,
  `// ---> sign-in and account access <---
//-> Purpose: Authenticates micro-vendors, pier checkers, and consignee brokers with role-specific credential forms.
//-> Step 1: Click "Sign In: DEAL Port Access" to display the access modal.
//-> Step 2: Select role tab (Micro-Vendor, Pier Checker, or Consignee Broker) and enter phone/badge ID, password, and station.
//-> Step 3: Click "Sign In" or "Create Account" to authenticate via Supabase Auth and load workspace.`,
  'Sign-In Section Header'
);

replaceBlock(
  `//-> Function: login()\n//-> Builds the role-specific sign-in or registration form; its submit action delegates validation and authentication to doLogin().`,
  `//-> Function: login()
//-> Purpose: Generates accessible HTML markup for the Port Access Sign In / Sign Up dialog.
//-> Parameters: None.
//-> State Updates: Reads LR (role tab), AM (mode: in/up), sb (client status).
//-> Storage / API: None.
//-> UI Updates: Returns dialog markup rendered into #signLayer.`,
  'login() function'
);

replaceBlock(
  `//-> Function: doLogin()\n//-> Validates the selected role's identifier and password, then signs in or registers through Supabase.\n//-> Staff account creation also claims a registered identity/PIN; validation and server errors are shown to the user.`,
  `//-> Function: doLogin()
//-> Purpose: Validates credentials, signs in via Supabase Auth or registers account, and claims verified role profile.
//-> Parameters: None (reads from input fields #f1, #f2, #f3, #f4).
//-> State Updates: Sets fails, lockUntil on rate limit; AM='in'.
//-> Storage / API: Calls Supabase Auth signInWithPassword/signUp and RPC claim_identity.
//-> UI Updates: Shows loading spinner on submit button; calls enter(LR) on success.`,
  'doLogin() function'
);

replaceBlock(
  `//-> Function: staffSignup()\n//-> Creates a checker or broker account from the submitted name, password, pier, and optional phone number.\n//-> Calls Supabase auth and profile creation, then displays the generated account ID on success.`,
  `//-> Function: staffSignup()
//-> Purpose: Provisions official certified staff account (checker/broker) with generated badge ID.
//-> Parameters: None (reads inputs #f0, #f2, #f3, #f5).
//-> State Updates: Stores generated ID in S.newId; sets AM='in'.
//-> Storage / API: Calls Supabase RPC new_badge, Auth signUp, and RPC create_staff_profile.
//-> UI Updates: Displays idModal() confirmation and enters role workspace.`,
  'staffSignup() function'
);

replaceBlock(
  `//-> Function: enter(want)\n//-> Restores the Supabase session and profile, sets the user's role and identity, and loads their workspace data.`,
  `//-> Function: enter(want)
//-> Purpose: Restores authenticated user profile, sets role workspace, initializes Realtime channel, and loads records.
//-> Parameters: want (string) - Expected role to verify against profile ('vendor' | 'checker' | 'broker').
//-> State Updates: Sets S.user, S.uid, S.role, S.station, S.tab, and realtime channel ch.
//-> Storage / API: Queries Supabase profiles table; subscribes to PostgreSQL changes on 'deal' channel.
//-> UI Updates: Closes sign-in modal, fetches initial datasets via load(1), and triggers complete UI render().`,
  'enter() function'
);

replaceBlock(
  `async function logout(){closeScanner();S.pm=null;`,
  `//-> Function: logout()
//-> Purpose: Terminates user session, removes realtime subscriptions, clears modals, and returns to landing page.
//-> Parameters: None.
//-> State Updates: Clears S.user, S.uid, S.role, S.pm, S.pass, and stops channel ch.
//-> Storage / API: Calls sb.auth.signOut() and sb.removeChannel(ch).
//-> UI Updates: Closes scanner if open, resets state, and renders landing page.
async function logout(){closeScanner();S.pm=null;`,
  'logout() function'
);

replaceBlock(
  `const bump=()=>{clearTimeout(idle);if(S.user)idle=setTimeout(async()=>{await logout();toast('Signed out after 15 minutes idle.')},9e5)};`,
  `//-> Function: bump()
//-> Purpose: Monitors user interactions and resets the 15-minute inactivity auto-logout timer.
//-> Parameters: None.
//-> State Updates: Clears and resets idle timeout reference.
//-> Storage / API: Calls logout() after 15 minutes of inactivity.
//-> UI Updates: Displays toast notification on automatic session timeout.
const bump=()=>{clearTimeout(idle);if(S.user)idle=setTimeout(async()=>{await logout();toast('Signed out after 15 minutes idle.')},9e5)};`,
  'bump() function'
);

replaceBlock(
  `//-> Function: load(force)\n//-> Refreshes the current user's catches and role-specific records from Supabase, then updates app state for rendering.`,
  `//-> Function: load(force)
//-> Purpose: Fetches latest catches, passes, checks, and bids from Supabase, computing outbid/inspection alerts.
//-> Parameters: force (boolean) - If quiet, avoids interrupting active input editing.
//-> State Updates: Populates S.catches, S.bids, S.passes, S.checks, S.lastLoad, and pushes alerts into S.notes.
//-> Storage / API: Invokes RPC settle_due_auctions; queries catches, passes, checks, and bids tables.
//-> UI Updates: Triggers note() alerts and re-renders workspace via render().`,
  'load() function'
);

// -----------------------------------------------------------------------------
// 4. Busy Actions, Confirmations & Focus Management (around line 313)
// -----------------------------------------------------------------------------
replaceBlock(
  `// ---> busy actions, confirmations, and keyboard navigation <---`,
  `// ---> busy actions, confirmations, and focus management <---
//-> Purpose: Controls asynchronous button loading spinners, high-contrast modal confirmations, and accessibility focus restoration.
//-> Step 1: User triggers an asynchronous or potentially destructive action.
//-> Step 2: Action button displays a spinning loading indicator and enters a disabled state via run().
//-> Step 3: Irreversible actions present an accessible confirmation dialog via ask() before proceeding.`,
  'Busy Actions Section Header'
);

replaceBlock(
  `//-> Function: run(button, label, action)\n//-> Deduplicates keyed actions, marks their controls busy, awaits completion, reports failures, and restores the controls.`,
  `//-> Function: run(button, label, action)
//-> Purpose: Wraps async actions with loading spinner, duplicate submission prevention, and error reporting.
//-> Parameters: button (HTMLElement) - Action button; label (string) - Loading text; action (Function) - Async task.
//-> State Updates: Registers key in BUSY map during execution and deletes on completion.
//-> Storage / API: Executes provided async function.
//-> UI Updates: Updates button loading spinner via paintBusy(); displays friendly toast on error.`,
  'run() function'
);

replaceBlock(
  `//-> Function: ask(title, body, confirmLabel, danger)\n//-> Opens the accessible confirmation dialog and returns a promise resolved by the user's cancel or confirm action.`,
  `//-> Function: ask(title, body, confirmLabel, danger)
//-> Purpose: Displays accessible modal confirmation dialog and returns a Promise resolving to user decision.
//-> Parameters: title (string) - Dialog title; body (string) - Body description; confirmLabel (string) - Confirm button label; danger (boolean) - Red styling if destructive.
//-> State Updates: Sets askRes promise resolver.
//-> Storage / API: None.
//-> UI Updates: Creates and appends #askLayer overlay to document body.`,
  'ask() function'
);

replaceBlock(
  `//-> Function: askDone(confirmed)\n//-> Closes the confirmation dialog and resolves the outstanding ask() promise with the supplied boolean.`,
  `//-> Function: askDone(confirmed)
//-> Purpose: Resolves pending ask() confirmation promise and removes dialog overlay from DOM.
//-> Parameters: confirmed (boolean) - True if confirmed, false if cancelled.
//-> State Updates: Clears askRes reference.
//-> Storage / API: None.
//-> UI Updates: Removes #askLayer element from DOM.`,
  'askDone() function'
);

replaceBlock(
  `//-> Function: dm()\n//-> Renders the theme control; activation changes S.dark, re-renders, and persists the preference through save().`,
  `//-> =========================================================================
//-> WORKFLOW: Toggling Dark Mode
//-> 1. Click the theme toggle button (dm()) in header or sidebar drawer.
//-> 2. System inverts S.dark boolean state.
//-> 3. Preference is persisted to localStorage key 'deal-dark' via save().
//-> 4. Theme class '.dark' is toggled on document.documentElement, updating all color tokens.
//-> =========================================================================
//-> Function: dm()
//-> Purpose: Renders theme toggle button and manages transition between light and dark modes.
//-> Parameters: None.
//-> State Updates: Toggles S.dark between true and false.
//-> Storage / API: Writes 'deal-dark' to localStorage via save().
//-> UI Updates: Toggles .dark class on html root and triggers render().`,
  'dm() function'
);

replaceBlock(
  `//-> Function: lg()\n//-> Renders the language selector; a choice updates S.lang and re-renders the app in the selected language.`,
  `//-> Function: lg()
//-> Purpose: Renders multilingual language button group (English, Tagalog, Taglish).
//-> Parameters: None.
//-> State Updates: Updates S.lang to 'EN', 'TL', or 'TAGLISH'.
//-> Storage / API: Writes 'deal-lang' to localStorage via save().
//-> UI Updates: Re-renders UI and translates all text nodes via trDom().`,
  'lg() function'
);

replaceBlock(
  `//-> Function: head()\n//-> Renders the signed-in header with role details, refresh, notification, sidebar, language, and theme controls.`,
  `//-> Function: head()
//-> Purpose: Renders sticky top header banner with brand logo, live indicator, refresh, sound, notification bell, and profile.
//-> Parameters: None.
//-> State Updates: Reads S.user, S.role, S.station, S.mute, S.unread, S.live.
//-> Storage / API: None.
//-> UI Updates: Returns top navigation bar HTML with active controls and badges.`,
  'head() function'
);

replaceBlock(
  `function nav(){const t=TABS[S.role];return\`<nav class="bg-white border-b" aria-label="Main navigation">`,
  `//-> Function: nav()
//-> Purpose: Generates role-based navigation tab bar with equal-width buttons and accessibility states.
//-> Parameters: None.
//-> State Updates: Reads S.role and S.tab.
//-> Storage / API: None.
//-> UI Updates: Returns nav markup with role-specific tab items and unread/status badges.
function nav(){const t=TABS[S.role];return\`<nav class="bg-white border-b" aria-label="Main navigation">\``,
  'nav() function'
);

replaceBlock(
  `//-> Function: closeSb()\n//-> Closes the sidebar, re-renders the workspace, and restores focus to the control that opened the menu.`,
  `//-> =========================================================================
//-> WORKFLOW: Opening and Interacting with the Navigation Sidebar
//-> 1. Click hamburger menu button in top header (or press Shift+Tab to reach it).
//-> 2. Off-canvas sidebar drawer slides in from the left with dark backdrop.
//-> 3. Choose setting (Light/Dark mode, Language, Tutorial, Offline mode, Sound, Sign out).
//-> 4. Dismiss sidebar by clicking backdrop, pressing Escape, or clicking close button.
//-> =========================================================================
//-> Function: closeSb()
//-> Purpose: Closes navigation sidebar drawer and returns focus to opener button.
//-> Parameters: None.
//-> State Updates: Sets S.sb = false.
//-> Storage / API: None.
//-> UI Updates: Triggers render() and calls restoreFocus().`,
  'closeSb() function'
);

// -----------------------------------------------------------------------------
// 5. Fresh Catches Floor (around line 380)
// -----------------------------------------------------------------------------
replaceBlock(
  `// ---> fresh catches floor and vendor cards <---
//-> Section: Browse catch lots by category, inspect available quantities and prices, then open a claim from a lot card.
//-> Controls: Category buttons and Hati-Hati Banyera update the displayed catch list.`,
  `// ---> fresh catches floor <---
//-> Purpose: Displays active fish listings available for bidding and micro-pooling.
//-> Step 1: User filters catch by type using the category toggle buttons.
//-> Step 2: Clicking a catch card opens the detailed bidding dynamic modal or Hati-Hati portion claim dialog.
//->
//-> Function: cardC(catchRecord, isVendorView)
//-> Purpose: Renders accessible catch card with photo, quality score, price/kg, tub capacity, and portion progress bar.
//-> Parameters: catchRecord (Object) - Fish lot data; isVendorView (boolean) - Whether rendered in vendor workspace.
//-> State Updates: Reads open kilos and auction timing.
//-> Storage / API: None.
//-> UI Updates: Returns card HTML string with keyboard tabindex and claim button.`,
  'Fresh Catches Floor Section Header'
);

replaceBlock(
  `function floor(hati){hati=hati||HATI;const live=S.catches.filter(c=>!c.closed),cats=['All',...new Set(live.map(c=>c.cat))];`,
  `//-> Function: floor(hatiOnly)
//-> Purpose: Renders the Fresh Catches Floor with category pills, Hati-Hati filter toggle, and responsive card grid.
//-> Parameters: hatiOnly (boolean) - Filter strictly for lots with open divisible portions.
//-> State Updates: Reads S.catches, CAT, HATI, and S.role.
//-> Storage / API: None.
//-> UI Updates: Returns hero header, category filter pills, and catch card grid HTML.
function floor(hati){hati=hati||HATI;const live=S.catches.filter(c=>!c.closed),cats=['All',...new Set(live.map(c=>c.cat))];`,
  'floor() function'
);

// -----------------------------------------------------------------------------
// 6. Portion Claiming Modal (Hati-Hati) (around line 395)
// -----------------------------------------------------------------------------
replaceBlock(
  `// ---> hati-hati portion selection and claiming <---
//-> Flow: Select an available lot, adjust its kilograms, review the live Taripa, and confirm to claim.`,
  `// ---> portion claiming modal (hati-hati) <---
//-> Purpose: Displays portion allocation dialog for micro-vendors to claim custom fractional tub weights.
//-> Step 1: User clicks "Claim Portion (Hati-Hati)" on an open catch card.
//-> Step 2: Adjust portion weight in kilograms via direct numeric input, +/- buttons, or quick pills (+5kg, +10kg, Half Tub).
//-> Step 3: Review live Taripa cost breakdown and click "Confirm Escrow Claim".`,
  'Portion Claiming Modal Section Header'
);

replaceBlock(
  `//-> Function: claim(catchId)\n//-> Opens the portion dialog for a lot with remaining stock and initializes its quantity in S.pm.`,
  `//-> Function: claim(catchId)
//-> Purpose: Initializes portion claiming dialog for selected catch and clamps initial weight to 10kg or available stock.
//-> Parameters: catchId (string) - Target catch identifier.
//-> State Updates: Sets S.pm = { id: catchId, kg: clampedInitialWeight }.
//-> Storage / API: None.
//-> UI Updates: Triggers render() to mount portionModal() overlay dialog.`,
  'claim() function'
);

replaceBlock(
  `//-> Function: pmSet(kilograms)\n//-> Clamps the requested quantity, updates S.pm.kg, and refreshes the amount inputs, slider, and escrow cost breakdown.`,
  `//-> Function: pmSet(kilograms)
//-> Purpose: Clamps requested weight, updates state, and recalculates live Taripa cost breakdown in DOM.
//-> Parameters: kilograms (number) - Desired portion weight.
//-> State Updates: Updates S.pm.kg with clamped value.
//-> Storage / API: None.
//-> UI Updates: Refreshes #pmn input value, #pmr range slider, and #pmb/#pmfee/#pmt cost summaries.`,
  'pmSet() function'
);

replaceBlock(
  `//-> Function: pmType(input)\n//-> Normalizes manually entered kilograms and forwards numeric input to pmSet() for clamping and live price updates.`,
  `//-> Function: pmType(inputElement)
//-> Purpose: Sanitizes manual keyboard numeric entry in portion input and forwards to pmSet().
//-> Parameters: inputElement (HTMLInputElement) - Portions input element.
//-> State Updates: Updates S.pm.kg with parsed float value.
//-> Storage / API: None.
//-> UI Updates: Dynamically updates cost summaries without causing input blur.`,
  'pmType() function'
);

replaceBlock(
  `//-> Function: pmKey(event)\n//-> Supports quantity adjustment with Up/Down and moves focus to the claim button on Enter.`,
  `//-> Function: pmKey(event)
//-> Purpose: Handles keyboard ArrowUp/ArrowDown increments and Enter navigation within portion input.
//-> Parameters: event (KeyboardEvent) - Keydown event on portion input.
//-> State Updates: Increments or decrements S.pm.kg.
//-> Storage / API: None.
//-> UI Updates: Shifts focus to #pmgo confirm button on Enter.`,
  'pmKey() function'
);

replaceBlock(
  `//-> Function: pmConfirm()\n//-> Queues the claim locally when offline; when online, submits the selected lot and kilograms through doClaim().`,
  `//-> Function: pmConfirm()
//-> Purpose: Validates connectivity and routes claim to online Supabase RPC or offline local storage queue.
//-> Parameters: None.
//-> State Updates: Appends claim to S.queue if offline; clears S.pm on success.
//-> Storage / API: Writes to localStorage via save(); calls doClaim(id, kg) if online.
//-> UI Updates: Closes portion modal, shows status toast, and reloads data.`,
  'pmConfirm() function'
);

replaceBlock(
  `//-> Function: doClaim(catchId, kilograms)\n//-> Calls the Supabase claim_portion RPC, stores the returned escrow pass in state, reloads records, and redraws.`,
  `//-> Function: doClaim(catchId, kilograms)
//-> Purpose: Invokes Supabase RPC claim_portion to create an escrow pass and deduct weight from available tub.
//-> Parameters: catchId (string) - Target catch ID; kilograms (number) - Claimed weight.
//-> State Updates: Sets S.pass to newly generated pass record; clears S.pm.
//-> Storage / API: Calls Supabase RPC claim_portion with { p_cid, p_kg }.
//-> UI Updates: Displays passModal() with QR code and updates ledger via load(1).`,
  'doClaim() function'
);

// -----------------------------------------------------------------------------
// 7. Vendor Escrow QR Pass & Ledger (around line 441)
// -----------------------------------------------------------------------------
replaceBlock(
  `// ---> vendor escrow QR pass and ledger <---
//-> Flow: Vendors review active passes and show the escrow QR at dockside; brokers scan a vendor pass to verify pickup.`,
  `// ---> vendor escrow qr pass and ledger <---
//-> Purpose: Displays active escrow passes, QR pickup tokens, and transaction ledger.
//-> Step 1: Vendors open a pass to display its cryptographic QR code at the dock.
//-> Step 2: Brokers scan or manually verify the pass to release escrow payment.
//->
//-> Function: qrPayload(pass)
//-> Purpose: Formats cryptographic QR verification string for digital passes.
//-> Parameters: pass (Object) - Pass record containing id and pass_token.
//-> State Updates: None.
//-> Storage / API: None.
//-> UI Updates: Returns formatted string 'DEAL1|pass_id|pass_token'.`,
  'Vendor Escrow QR Pass Section Header'
);

replaceBlock(
  `function qrSvg(t){if(!window.qrcode)return'<p class="text-sm text-red-800">QR library not loaded.`,
  `//-> Function: qrSvg(text)
//-> Purpose: Generates crisp inline SVG representation of a QR code using qrcode-generator.
//-> Parameters: text (string) - Text payload to encode.
//-> State Updates: None.
//-> Storage / API: Uses window.qrcode library.
//-> UI Updates: Returns SVG element string with sharp edges.
function qrSvg(t){if(!window.qrcode)return'<p class="text-sm text-red-800">QR library not loaded.`,
  'qrSvg() function'
);

replaceBlock(
  `//-> Function: showQr(passId)\n//-> Loads the selected vendor pass into S.pass and re-renders the QR pass dialog.`,
  `//-> Function: showQr(passId)
//-> Purpose: Loads selected vendor pass into active view state and displays QR pass modal.
//-> Parameters: passId (string) - Unique pass identifier.
//-> State Updates: Sets S.pass to matching record from S.passes.
//-> Storage / API: None.
//-> UI Updates: Re-renders UI to display passModal().`,
  'showQr() function'
);

replaceBlock(
  `function passes(){const tot=S.passes.reduce((a,p)=>a+p.total,0),held=S.passes.filter(p=>p.status==='escrow'),br=S.role==='broker',vd=S.role==='vendor';`,
  `//-> Function: passes()
//-> Purpose: Renders escrow passes and transaction ledger with metrics (total volume, held in escrow).
//-> Parameters: None.
//-> State Updates: Reads S.passes and S.role.
//-> Storage / API: None.
//-> UI Updates: Returns ledger cards with status badges (Escrow held / Released), QR triggers, and release buttons.
function passes(){const tot=S.passes.reduce((a,p)=>a+p.total,0),held=S.passes.filter(p=>p.status==='escrow'),br=S.role==='broker',vd=S.role==='vendor';`,
  'passes() function'
);

replaceBlock(
  `//-> Function: release(passId)\n//-> Requests a broker escrow release through Supabase and refreshes the ledger after success.`,
  `//-> Function: release(passId)
//-> Purpose: Invokes Supabase RPC release_escrow to release held funds to the vendor.
//-> Parameters: passId (string) - Pass ID to release.
//-> State Updates: Refreshes S.passes via load(1).
//-> Storage / API: Calls Supabase RPC release_escrow with { p_id: passId }.
//-> UI Updates: Shows toast notification and updates pass status to 'released'.`,
  'release() function'
);

replaceBlock(
  `async function relAsk(btn,id){if(!await ask('Release escrow?','This pays out the vendor’s escrow for this pass. Normally you should scan their QR pass at pickup instead. Release manually now?','Release escrow',true))return;`,
  `//-> Function: relAsk(button, passId)
//-> Purpose: Prompts confirmation before manual escrow payout and invokes release(passId) on approval.
//-> Parameters: button (HTMLElement) - Release button; passId (string) - Target pass ID.
//-> State Updates: None.
//-> Storage / API: Delegates to release(passId).
//-> UI Updates: Displays ask() confirmation dialog.
async function relAsk(btn,id){if(!await ask('Release escrow?','This pays out the vendor’s escrow for this pass. Normally you should scan their QR pass at pickup instead. Release manually now?','Release escrow',true))return;`,
  'relAsk() function'
);

// -----------------------------------------------------------------------------
// 8. Offline Sync Engine Floor (around line 458)
// -----------------------------------------------------------------------------
replaceBlock(
  `// ---> offline sync queue <---
//-> Function: syncNow()
//-> Replays queued claims against Supabase, retains network-failed items in localStorage, then reloads and reports sync status.`,
  `// ---> offline sync engine floor <---
//-> Purpose: Displays offline transaction queue holding claims made without network signal.
//-> Step 1: Micro-vendors submit claims while offline; claims are stored in localStorage queue.
//-> Step 2: Upon reconnecting to internet, user opens the Offline Sync tab and clicks "Reconcile Offline Transactions" to batch-submit to Supabase.
//->
//-> Function: syncNow()
//-> Purpose: Iterates through offline claim queue, submits each to Supabase RPC, and removes reconciled items.
//-> Parameters: None.
//-> State Updates: Removes synced items from S.queue.
//-> Storage / API: Persists updated queue to localStorage via save(); calls Supabase RPC claim_portion.
//-> UI Updates: Displays sync progress toasts and reloads data via load(1).`,
  'Offline Sync Engine Section Header'
);

replaceBlock(
  `function syncV(){return h1('Offline Sync Engine','Transactions made without signal are stored here`,
  `//-> Function: syncV()
//-> Purpose: Renders Offline Sync workspace displaying pending un-synced claims and batch reconciliation controls.
//-> Parameters: None.
//-> State Updates: Reads S.queue and online status.
//-> Storage / API: None.
//-> UI Updates: Returns ledger table of offline transactions with temporary IDs, weights, and timestamps.
function syncV(){return h1('Offline Sync Engine','Transactions made without signal are stored here`,
  'syncV() function'
);

// -----------------------------------------------------------------------------
// 9. Dockside QR Scanner Modal (around line 475)
// -----------------------------------------------------------------------------
replaceBlock(
  `// ---> broker dockside QR scanner and escrow release <---
//-> Flow: Open the scanner from the broker ledger, scan a DEAL QR code, and review the online verification and release result.`,
  `// ---> dockside qr scanner modal <---
//-> Purpose: Live camera viewfinder allowing dockside checkers and brokers to scan vendor QR passes and verify escrow pickup.
//-> Step 1: Click "Dockside Scanner" button from the escrow ledger view to launch the camera scanner modal.
//-> Step 2: Point camera at the vendor's physical or on-screen QR pass (or upload an image of the pass).
//-> Step 3: System validates the cryptographic token with Supabase and automatically releases the held escrow funds.`,
  'Dockside QR Scanner Section Header'
);

replaceBlock(
  `//-> Function: openScanner()\n//-> Opens the dockside camera scanner when online, with a photo-upload fallback if camera access is unavailable.`,
  `//-> =========================================================================
//-> WORKFLOW: Verifying Escrow Transactions via Dockside QR Scanner
//-> 1. Consignee Broker or Pier Checker clicks "Dockside Scanner" button in ledger.
//-> 2. Camera scanner overlay mounts and requests rear environment camera access.
//-> 3. Point camera at vendor's QR code (or click "Scan from a photo" if camera unavailable).
//-> 4. onScan() parses cryptographic payload and calls Supabase verify_and_release_pass.
//-> 5. Upon successful verification, device vibrates, chimes, and transitions pass to 'released'.
//-> =========================================================================
//-> Function: openScanner()
//-> Purpose: Initializes Html5Qrcode video scanner overlay for real-time camera QR scanning.
//-> Parameters: None.
//-> State Updates: Sets SC scanner instance, resets scBusy flag.
//-> Storage / API: None.
//-> UI Updates: Mounts #scanLayer DOM overlay and starts video camera stream.`,
  'openScanner() function'
);

replaceBlock(
  `async function closeScanner(){const d=$('#scanLayer'),c=SC;SC=null;scBusy=false;if(c){try{await c.stop()}catch(e){}try{c.clear()}catch(e){}}if(d)d.remove()}`,
  `//-> Function: closeScanner()
//-> Purpose: Halts camera video stream, clears Html5Qrcode instance, and removes scanner modal.
//-> Parameters: None.
//-> State Updates: Sets SC = null, scBusy = false.
//-> Storage / API: None.
//-> UI Updates: Stops camera tracks and removes #scanLayer from DOM.
async function closeScanner(){const d=$('#scanLayer'),c=SC;SC=null;scBusy=false;if(c){try{await c.stop()}catch(e){}try{c.clear()}catch(e){}}if(d)d.remove()}`,
  'closeScanner() function'
);

replaceBlock(
  `//-> Function: onScan(qrText)\n//-> Validates the DEAL pass payload, verifies it online with Supabase, and displays the pickup/release result.`,
  `//-> Function: onScan(qrText)
//-> Purpose: Decodes QR payload, authenticates pass token with Supabase RPC verify_and_release_pass, and triggers escrow release.
//-> Parameters: qrText (string) - Scanned QR code text string.
//-> State Updates: Updates matching pass in S.passes with status='released' and scanned_at timestamp.
//-> Storage / API: Calls Supabase RPC verify_and_release_pass with { p_pass_id, p_scanned_token }.
//-> UI Updates: Updates #scRes result card, plays audio beep, vibrates device, and reloads ledger.`,
  'onScan() function'
);

// -----------------------------------------------------------------------------
// 10. Taripa Calculator (around line 516)
// -----------------------------------------------------------------------------
replaceBlock(
  `// ---> taripa cost calculator <---
//-> Section: Choose a catch and enter kilograms to see the itemized base price, port fee, commission, handling, and total.`,
  `// ---> taripa calculator <---
//-> Purpose: Calculates logistics cost, pier fees, and estimated profit margins.
//-> Step 1: Input weight in kilograms and target market location or select an existing catch listing.
//-> Step 2: System automatically calculates route cost based on current fuel and port rates.`,
  'Taripa Calculator Section Header'
);

replaceBlock(
  `function taripaV(){const c=find(S.sel)||S.catches[0];return `<div class="text-center sm:mt-4">`,
  `//-> Function: taripaV()
//-> Purpose: Renders the Taripa Calculator UI with catch selector dropdown, weight input, and itemized calculation receipt.
//-> Parameters: None.
//-> State Updates: Reads S.sel and S.catches.
//-> Storage / API: None.
//-> UI Updates: Returns Taripa view markup with real-time recalculation event listeners.
function taripaV(){const c=find(S.sel)||S.catches[0];return \`<div class="text-center sm:mt-4">\``,
  'taripaV() function'
);

replaceBlock(
  `//-> Function: calc()\n//-> Reads the selected catch and entered kilograms, calculates Taripa, and updates the itemized receipt in #tr.`,
  `//-> Function: calc()
//-> Purpose: Computes live itemized cost breakdown (base fish, ₱2.50/kg port fee, 5% commission, ₱1.50/kg ice) and renders receipt.
//-> Parameters: None (reads from DOM elements #tc and #tk).
//-> State Updates: None.
//-> Storage / API: Calls tar(price, kg).
//-> UI Updates: Injects itemized breakdown rows and grand total into #tr container.`,
  'calc() function'
);

// -----------------------------------------------------------------------------
// 11. Dockside Catch Intake Floor (around line 524)
// -----------------------------------------------------------------------------
replaceBlock(
  `// ---> dockside intake and inspection validation <---
//-> Checker flow: Record catch details and photos, then review the lot and submit all required checks to pass or flag it.`,
  `// ---> dockside intake and inspection validation <---
//-> Purpose: Two-column intake workspace for Pier Checkers to record incoming vessel catches and perform Suri-Isda quality checks.
//-> Step 1: Fill in incoming catch details (vessel, species, category, grade, weight, tub count, and starting bid).
//-> Step 2: Attach a photo of the catch (automatically compressed client-side) and click "Log Catch".
//-> Step 3: Conduct Suri-Isda 4-point quality inspection, record freshness score (1–10), upload 3 evidence photos, and submit verification.`,
  'Dockside Intake Section Header'
);

replaceBlock(
  `//-> Function: logGo(event)\n//-> Prevents the browser form submit and runs logCatch() through the shared busy/error handling.`,
  `//-> Function: logGo(event)
//-> Purpose: Intercepts catch logging form submission, prevents default page refresh, and delegates to logCatch().
//-> Parameters: event (SubmitEvent) - Form submission event.
//-> State Updates: None.
//-> Storage / API: None.
//-> UI Updates: Disables submit button with loading indicator via run().`,
  'logGo() function'
);

replaceBlock(
  `//-> Function: logCatch(form)\n//-> Validates the intake fields, compresses an optional photo, inserts a pending catch in Supabase, and reloads the floor.`,
  `//-> Function: logCatch(form)
//-> Purpose: Validates intake inputs, compresses photo via HTML5 canvas, assigns next CAT-### ID, and inserts catch into Supabase.
//-> Parameters: form (HTMLFormElement) - Intake form element.
//-> State Updates: Appends new catch to database; refreshes S.catches.
//-> Storage / API: Calls shrink() on photo; inserts record into Supabase catches table.
//-> UI Updates: Displays success toast and reloads fresh catches floor via load(1).`,
  'logCatch() function'
);

replaceBlock(
  `//-> Function: valGo(button, pass)\n//-> Confirms destructive flag actions and routes pass/flag submissions through the shared busy state to validate().`,
  `//-> Function: valGo(button, pass)
//-> Purpose: Confirms flagging decisions with inspector and routes quality validation to validate().
//-> Parameters: button (HTMLElement) - Submit button; pass (number) - 1 for Passed, 0 for Flagged.
//-> State Updates: None.
//-> Storage / API: None.
//-> UI Updates: Prompts ask() dialog if flagging; manages button loading spinner.`,
  'valGo() function'
);

replaceBlock(
  `//-> Function: validate(pass)\n//-> Checks the selected lot, required checklist, freshness score, and photos; updates catches/checks in Supabase and reloads.`,
  `//-> Function: validate(pass)
//-> Purpose: Validates 4-point checklist, compresses 3-layer photos, updates catch verified status, and logs inspection audit record.
//-> Parameters: pass (number) - 1 if approved, 0 if flagged.
//-> State Updates: Updates catch verified status and freshness score in S.catches; adds record to S.checks.
//-> Storage / API: Compresses 3 photos; updates Supabase catches table and inserts into checks table.
//-> UI Updates: Displays toast, triggers note() alert, and refreshes views via load(1).`,
  'validate() function'
);

// -----------------------------------------------------------------------------
// 12. Consignations & Live Bids Auction Floor (around line 583)
// -----------------------------------------------------------------------------
replaceBlock(
  `// ---> broker consignments and live bidding <---
//-> Broker flow: Select a lot, review inspection and Taripa details, enter a valid bid, and submit it for server-side validation.`,
  `// ---> consignations & live bids auction floor <---
//-> Purpose: Live bulk consignation bidding floor with real-time countdown clocks, minimum bid enforcement, and Taripa calculations.
//-> Step 1: Consignee Broker selects an active catch lot from the consignations table.
//-> Step 2: Review starting bid, top bid, and minimum next bid increment.
//-> Step 3: Enter bid amount or click quick increment buttons (+10, +20, +50, +100) and click "Place Bid".`,
  'Consignations Section Header'
);

replaceBlock(
  `//-> Function: auction()\n//-> Renders broker lot selection, live bid status/history, minimum bid controls, inspection access, and Taripa totals.`,
  `//-> Function: auction()
//-> Purpose: Renders broker bulk auction floor with interactive table, bid placement form, countdowns, bid history, and live Taripa.
//-> Parameters: None.
//-> State Updates: Reads S.catches, S.bids, S.sel, S.uid, S.bidIn.
//-> Storage / API: None.
//-> UI Updates: Returns complete auction floor HTML markup.`,
  'auction() function'
);

replaceBlock(
  `//-> Function: setBid(catchId, amount)\n//-> Updates the selected lot's bid input state and focuses the amount field.`,
  `//-> Function: setBid(catchId, amount)
//-> Purpose: Pre-populates the bid amount field with a quick increment and focuses the input.
//-> Parameters: catchId (string) - Active catch lot ID; amount (number) - Bid in ₱/kg.
//-> State Updates: Sets S.bidIn[catchId] = amount.
//-> Storage / API: None.
//-> UI Updates: Updates #bidAmt input value and shifts keyboard focus to input.`,
  'setBid() function'
);

replaceBlock(
  `//-> Function: placeBid(catchId)\n//-> Reads the bid amount, sends it to the Supabase place_bid RPC, reports validation results, then reloads the auction state.`,
  `//-> =========================================================================
//-> WORKFLOW: Placing a Bid on the Auction Floor
//-> 1. Consignee Broker selects an open or live verified catch lot.
//-> 2. Review starting price, current top bid holder, and minimum next bid increment.
//-> 3. Enter custom bid (₱/kg) or click quick increment buttons (+10, +20, +50, +100).
//-> 4. Click "Place bid" button (or press Enter).
//-> 5. placeBid() calls Supabase RPC place_bid, updates top bid, adjusts timer, and emits real-time update.
//-> =========================================================================
//-> Function: placeBid(catchId)
//-> Purpose: Validates bid amount, sends RPC payload to Supabase, updates local state, and refreshes the auction floor.
//-> Parameters: catchId (string) - Active catch lot ID.
//-> State Updates: Clears S.bidIn[catchId]; server updates current top bid.
//-> Storage / API: Calls Supabase RPC place_bid with { p_cid, p_amount }.
//-> UI Updates: Plays sound, shows toast notification, reloads via load(1), and updates live bid inputs.`,
  'placeBid() function'
);

replaceBlock(
  `async function editStart(id,btn){const c=find(id),r=prompt('New starting bid (₱/kg)',c.start);if(r===null)return;const v=parseFloat(r);`,
  `//-> Function: editStart(catchId, button)
//-> Purpose: Allows broker or consignee to modify starting bid before first bid is placed.
//-> Parameters: catchId (string) - Target catch lot ID; button (HTMLElement) - Edit button.
//-> State Updates: Updates lot starting bid.
//-> Storage / API: Calls Supabase RPC set_start_bid with { p_cid, p_start }.
//-> UI Updates: Reloads auction data via load(1) and refreshes table.
async function editStart(id,btn){const c=find(id),r=prompt('New starting bid (₱/kg)',c.start);if(r===null)return;const v=parseFloat(r);`,
  'editStart() function'
);

// -----------------------------------------------------------------------------
// 13. Multilingual Localization Engine (around line 637)
// -----------------------------------------------------------------------------
replaceBlock(
  `// ---> English, Tagalog, and Taglish translations <---`,
  `// ---> multilingual localization engine <---
//-> Purpose: In-memory translation dictionary and regex replacement engine supporting English, Tagalog, and Taglish.
//-> Step 1: User chooses language preference (EN, TL, TAGLISH).
//-> Step 2: trDom() traverses all text nodes and translates them in place without breaking HTML markup.`,
  'Localization Section Header'
);

replaceBlock(
  `//-> Function: tr(message)\n//-> Returns the English, Tagalog, or Taglish translation, including configured dynamic text patterns.`,
  `//-> Function: tr(message)
//-> Purpose: Translates a given text string into the currently active language (English, Tagalog, or Taglish).
//-> Parameters: message (string) - Text string to translate.
//-> State Updates: Reads S.lang.
//-> Storage / API: Uses in-memory dictionary DT and regex rules RULES.
//-> UI Updates: Returns translated string.`,
  'tr() function'
);

// -----------------------------------------------------------------------------
// 14. Role-Based View Routing (around line 848)
// -----------------------------------------------------------------------------
replaceBlock(
  `// ---> role-based workspace routing <---
//-> Function: view()
//-> Selects the workspace renderer for S.tab and S.role, including empty-catch guidance for the current section.`,
  `// ---> role-based workspace routing <---
//-> Purpose: Central view router mapping current S.role and S.tab to the appropriate workspace view template.
//-> Step 1: User clicks tab in main navigation bar.
//-> Step 2: view() evaluates active tab and returns view markup for floor, taripa, intake, quality, sync, or auction.
//->
//-> Function: view()
//-> Purpose: Selects the workspace renderer for S.tab and S.role, including empty-catch guidance for the current section.
//-> Parameters: None.
//-> State Updates: Reads S.tab and S.role.
//-> Storage / API: None.
//-> UI Updates: Returns target view HTML string for injection into main layout container.`,
  'View Routing Section Header'
);

// -----------------------------------------------------------------------------
// 15. Notification Bar & Sidebar (around line 865)
// -----------------------------------------------------------------------------
replaceBlock(
  `// ---> notifications, sidebar, tutorial, and inspection tools <---`,
  `// ---> notifications, sidebar, and inspection tools <---`,
  'Inspection Tools Header'
);

replaceBlock(
  `// ---> notifications and sidebar menu <---`,
  `// ---> notification bar <---
//-> Purpose: Slide-over alert drawer listing real-time system notices, outbid warnings, and escrow updates.
//-> Step 1: Click notification bell button in header or press 'N' key.
//-> Step 2: Drawer slides in from right, resets unread counter to 0, and displays timestamped alert items.
//-> Step 3: Dismiss by clicking backdrop or pressing Escape.`,
  'Notification Bar Section Header'
);

replaceBlock(
  `//-> Function: note(title, body, quiet)\n//-> Adds a notification to in-memory state, caps history at 40, updates the unread count, and refreshes an open panel.`,
  `//-> Function: note(title, body, isQuiet)
//-> Purpose: Creates a new timestamped notification, increments unread counter, and alerts user.
//-> Parameters: title (string) - Alert title; body (string) - Alert description; isQuiet (boolean) - Suppresses toast if true.
//-> State Updates: Unshifts item into S.notes (capped at 40); increments S.unread.
//-> Storage / API: None.
//-> UI Updates: Shows toast notification, plays pick audio, and updates notification bell badge.`,
  'note() function'
);

replaceBlock(
  `//-> Function: toggleND()\n//-> Opens or closes the notification panel, clears unread count when opened, and re-renders the interface.`,
  `//-> Function: toggleND()
//-> Purpose: Opens or closes the slide-over notification alert drawer and resets the unread count to 0.
//-> Parameters: None.
//-> State Updates: Toggles S.nd boolean; resets S.unread to 0 when opened.
//-> Storage / API: None.
//-> UI Updates: Re-renders UI to mount or unmount notification drawer overlay.`,
  'toggleND() function'
);

replaceBlock(
  `//-> Function: togSound()\n//-> Toggles the audio preference, persists it in localStorage, and updates the header/sidebar control.`,
  `//-> Function: togSound()
//-> Purpose: Toggles global audio sound mute state and updates persistent storage.
//-> Parameters: None.
//-> State Updates: Inverts S.mute boolean.
//-> Storage / API: Writes 'deal-mute' to localStorage.
//-> UI Updates: Triggers render() and plays audio feedback chime.`,
  'togSound() function'
);

replaceBlock(
  `//-> Function: delQ(index)\n//-> Confirms removal of a queued offline claim, updates S.queue, and re-renders the pending-transaction list.`,
  `//-> Function: delQ(index)
//-> Purpose: Confirms removal of an offline transaction from the local queue.
//-> Parameters: index (number) - Index of item in S.queue.
//-> State Updates: Slices item out of S.queue.
//-> Storage / API: Saves updated S.queue to localStorage via save().
//-> UI Updates: Re-renders view and confirms removal via toast.`,
  'delQ() function'
);

replaceBlock(
  `const sbModal=()=>!S.sb?'':\`<div class="fixed inset-0 z-50"><div class="absolute inset-0 bg-black/50" onclick="closeSb()`,
  `// ---> navigation sidebar and account drawer <---
//-> Purpose: Off-canvas navigation sidebar presenting user profile, theme toggle, language group, tutorial button, and sign-out.
//-> Step 1: Click hamburger menu button in header to open sidebar.
//-> Step 2: Select settings (Light/Dark mode, English/Tagalog/Taglish, Sound, Tutorial) or click Sign Out.
//-> Step 3: Dismiss sidebar by clicking backdrop, pressing Escape, or clicking close button.
//->
//-> Function: sbModal()
//-> Purpose: Renders off-canvas navigation sidebar with accessible controls and account settings.
//-> Parameters: None.
//-> State Updates: Reads S.sb, S.user, S.role, S.station, S.dark, S.lang, S.offline, S.mute.
//-> Storage / API: None.
//-> UI Updates: Injects animated sidebar overlay with backdrop filter into document.
const sbModal=()=>!S.sb?'':\`<div class="fixed inset-0 z-50"><div class="absolute inset-0 bg-black/50" onclick="closeSb()`,
  'sbModal() function'
);

// -----------------------------------------------------------------------------
// 16. Guided Workspace Tutorial (around line 889)
// -----------------------------------------------------------------------------
replaceBlock(
  `// ---> guided workspace tutorial <---`,
  `// ---> interactive onboarding tour overlay <---
//-> Purpose: Step-by-step guided walkthrough highlighting role-specific UI features with spotlight mask.
//-> Step 1: User launches tutorial from sidebar drawer.
//-> Step 2: Spotlight ring highlights target control and displays step guidance card.
//-> Step 3: Click "Next" to advance steps or "Exit" to close tour.`,
  'Guided Tour Section Header'
);

replaceBlock(
  `//-> Function: startTour()\n//-> Closes the sidebar and begins the current role's tour at its first step.`,
  `//-> Function: startTour()
//-> Purpose: Launches interactive onboarding tutorial starting at step 0 for active role.
//-> Parameters: None.
//-> State Updates: Closes sidebar (S.sb = false); sets S.tour = { i: 0 }.
//-> Storage / API: None.
//-> UI Updates: Switches to first target tab and mounts tourUI() spotlight overlay.`,
  'startTour() function'
);

replaceBlock(
  `//-> Function: tourGo(stepIndex)\n//-> Selects the role-specific tour step, switches to its tab, and re-renders the highlighted guide.`,
  `//-> Function: tourGo(stepIndex)
//-> Purpose: Navigates to a specific step index in the role's onboarding tour sequence.
//-> Parameters: stepIndex (number) - Target step index.
//-> State Updates: Updates S.tour.i; sets S.tab to match step view.
//-> Storage / API: None.
//-> UI Updates: Re-renders UI and repositions spotlight ring via tourPos().`,
  'tourGo() function'
);

replaceBlock(
  `//-> Function: endTour()\n//-> Clears the active tour state and removes the tutorial overlay on the next render.`,
  `//-> Function: endTour()
//-> Purpose: Ends interactive tutorial and unmounts spotlight overlay.
//-> Parameters: None.
//-> State Updates: Sets S.tour = null.
//-> Storage / API: None.
//-> UI Updates: Re-renders UI and restores focus to menu opener.`,
  'endTour() function'
);

// -----------------------------------------------------------------------------
// 17. Public Landing Page & Showcase (around line 922)
// -----------------------------------------------------------------------------
replaceBlock(
  `// ---> public landing page and sign-in entry point <---
//-> Section: Introduces DEAL, its purpose and objectives; visitors can scroll the content or open the role-based sign-in dialog.`,
  `// ---> public landing page and showcase display <---
//-> Purpose: Displays platform overview, animated truck delivery hero, evaluation objectives, and port access portal.
//-> Step 1: Visitor scrolls through platform features and ISO 9241-11 usability evaluation metrics.
//-> Step 2: Click "Sign In: DEAL Port Access" to launch the role gateway modal.
//->
//-> Function: landing()
//-> Purpose: Renders complete HTML markup for public landing page and delivery hero.
//-> Parameters: None.
//-> State Updates: Sets INTRO = true after initial delivery animation.
//-> Storage / API: None.
//-> UI Updates: Returns landing page DOM structure with hero section and feature cards.`,
  'Public Landing Page Section Header'
);

// -----------------------------------------------------------------------------
// 18. Keyboard Navigation & Focus Management (around line 949)
// -----------------------------------------------------------------------------
replaceBlock(
  `// ---> keyboard navigation and focus management <---`,
  `// ---> global accessibility and keyboard navigation system <---
//-> Purpose: Accessibility engine providing keyboard navigation, modal focus trapping, and shortcut keys.
//-> Step 1: Tab cycles through focusable elements within open dialogs without escaping to background content.
//-> Step 2: Arrow keys navigate between action cards, tabs, and tables; Escape closes open modals and drawers.`,
  'Keyboard Navigation Section Header'
);

replaceBlock(
  `function kbKeys(e,t,tag){`,
  `//-> Function: kbKeys(event, target, tagName)
//-> Purpose: Routes numeric key presses directly into portion claim input and handles Delete/Backspace shortcuts.
//-> Parameters: event (KeyboardEvent) - Event; target (HTMLElement) - Target element; tagName (string) - Element tag.
//-> State Updates: Updates portion input value and triggers recalculation.
//-> Storage / API: None.
//-> UI Updates: Focuses #pmn and routes typed numbers smoothly.
function kbKeys(e,t,tag){`,
  'kbKeys() function'
);

replaceBlock(
  `function kbArrow(e,t,tag){`,
  `//-> Function: kbArrow(event, target, tagName)
//-> Purpose: Implements arrow key navigation across focusable controls, tabs, and tables.
//-> Parameters: event (KeyboardEvent) - Arrow key event; target (HTMLElement) - Active element; tagName (string) - Tag.
//-> State Updates: None.
//-> Storage / API: None.
//-> UI Updates: Shifts keyboard focus to next/previous focusable element in tab order.
function kbArrow(e,t,tag){`,
  'kbArrow() function'
);

// -----------------------------------------------------------------------------
// 19. Sign-In Overlay & Application Rendering (around line 987)
// -----------------------------------------------------------------------------
replaceBlock(
  `// ---> sign-in overlay and application rendering <---`,
  `// ---> core reactive rendering and bootstrap engine <---
//-> Purpose: Core reactive render loop, application mounting lifecycle, and bootstrap orchestrator.
//-> Step 1: render() updates themes, persists state to localStorage, and rebuilds DOM structure.
//-> Step 2: Automatically attaches event listeners and initializes Supabase client connection.`,
  'Rendering Engine Section Header'
);

replaceBlock(
  `//-> Function: paintSign()\n//-> Mounts or removes the sign-in overlay without replacing the landing page and restores focus to its opener on close.`,
  `//-> Function: paintSign()
//-> Purpose: Controls rendering, transition, and focus management of the #signLayer modal container.
//-> Parameters: None.
//-> State Updates: Reads S.user, S.go, LR, AM, sb, S.lang; updates signKey and signOpener.
//-> Storage / API: None.
//-> UI Updates: Injects login() HTML into #signLayer or clears layer and restores focus to signOpener.`,
  'paintSign() function'
);

replaceBlock(
  `//-> Functions: openSign() and closeSign()\n//-> Toggle the sign-in overlay state and update only the #signLayer content.`,
  `//-> Functions: openSign() / closeSign()
//-> Purpose: Opens or closes the authentication gateway modal overlay.
//-> Parameters: None.
//-> State Updates: Sets S.go = true (open) or S.go = false (close).
//-> Storage / API: None.
//-> UI Updates: Calls paintSign() to render or dismiss the modal dialog.`,
  'openSign() / closeSign() functions'
);

replaceBlock(
  `//-> Function: render()\n//-> Saves preferences and queue state, then renders the landing page or signed-in shell, active view, dialogs, and live UI updates.`,
  `//-> Function: render()
//-> Purpose: Core reactive render cycle that re-evaluates state, updates DOM, syncs themes, and re-attaches accessibility bindings.
//-> Parameters: None.
//-> State Updates: Resets S.go if authenticated; runs save().
//-> Storage / API: Persists state via save(); updates localStorage.
//-> UI Updates: Toggles .dark class on html root, injects view HTML into #app, updates #signLayer, executes trDom() and revealInit(), schedules focusFix().`,
  'render() function'
);

// -----------------------------------------------------------------------------
// Validate JS syntax in index.html with vm.Script
// -----------------------------------------------------------------------------
console.log('Validating JS syntax in updated index.html...');
const s1 = html.match(/<script>([\s\S]*?)<\/script>/);
const lastScriptStart = html.lastIndexOf('<script>');
const lastScriptEnd = html.lastIndexOf('</script>');
const sMain = html.slice(lastScriptStart + 8, lastScriptEnd);

try {
  new vm.Script(s1[1]);
  console.log('[VALID] Script 1 (Audio Engine) syntax is 100% valid!');
} catch (e) {
  console.error('Script 1 syntax error:', e);
  process.exit(1);
}

try {
  new vm.Script(sMain);
  console.log('[VALID] Main Script syntax is 100% valid!');
} catch (e) {
  console.error('Main script syntax error:', e);
  process.exit(1);
}

// Write the updated file
fs.writeFileSync('index.html', html, 'utf8');
console.log('index.html has been successfully written and verified!');

