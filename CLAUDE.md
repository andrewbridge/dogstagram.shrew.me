# Dogstagram

A virtual pet web application (tamagotchi-style) where users care for a customizable dachshund, earn coins through mini-games, and monitor dog happiness and hunger levels.

## Tech Stack

- **Vue 3** (loaded from CDN via import map, no build step)
- **Goober** - CSS-in-JS for dynamic styling and keyframe animations
- **Howler** - Audio playback
- **Route Parser** - Hash-based client-side routing
- **Phaser 3** - Imported but not actively used
- All dependencies loaded from CDN; no bundler or compilation required

## Development Commands

```bash
npm run dev    # Live-reload dev server at http://localhost:8080
npm run serve  # Static file server at http://localhost:8080
```

No build step needed. Source files in `src/` are served directly.

## Project Structure

```
src/
├── index.html            # Entry point; defines import map for CDN modules
├── index.mjs             # Vue app bootstrap
├── constants.mjs         # Dog variants, states
├── models.mjs            # Data models
├── components/           # Reusable UI components (.mjs)
├── pages/                # Route-level page components
│   ├── SplashScreen.mjs  # Initial load screen
│   ├── Setup.mjs         # Dog customization
│   ├── Home.mjs          # Main care interface
│   └── Feed.mjs          # Photo feed mini-game
├── services/
│   ├── data.mjs          # Global reactive state (Vue refs + localStorage)
│   ├── routes.mjs        # Route definitions and navigation
│   └── games/
│       └── BejeweledGame.mjs  # Match-3 game logic
├── utilities/            # Shared helpers (EventBus, persistRef, clamp, etc.)
└── assets/               # PNG sprite sheets, feed photos, audio (MP3)
```

## Architecture

### Routing
Hash-based routing defined in `services/routes.mjs`:
- `/` → SplashScreen
- `/setup` → Setup
- `/home` → Home
- `/feed` → Feed

### State Management
No Vuex/Pinia. Global state lives in `services/data.mjs` using Vue refs with localStorage persistence via custom `persistRef()` and `clampedRef()` utilities from `utilities/vue.mjs`.

Key state keys in localStorage:
- `DOGSTAGRAM_ACCOUNT_BALANCE`
- `DOGSTAGRAM_DOG_NAME`
- `DOGSTAGRAM_DOG_VARIANT`
- `DOGSTAGRAM_DOG_HAPPINESS`
- `DOGSTAGRAM_DOG_HUNGER`
- `DOGSTAGRAM_LAST_PET`
- `DOGSTAGRAM_LAST_FED`

### Components
All components use Vue 3 template-literal syntax (no `.vue` SFC files, no compiler). Components are plain `.mjs` ES modules using `defineComponent` with `template` strings.

CSS is applied via Goober's `css()` and `keyframes()` functions. The retro aesthetic uses the "Press Start 2P" Google Font.

### Dog Sprites
5 color variants × 8 animation states = 40 PNG sprite sheets in `src/assets/dogs/`. The `DogSprite.mjs` component cycles frames via CSS-in-JS animation.

## No Tests or Linters

There is no test framework, linting, or formatting tooling configured.

## Deployment

GitHub Actions (`.github/workflows/publish.yml`) deploys `src/` to GitHub Pages on push to `main`. The live site is at https://dogstagram.shrew.me.
