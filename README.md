# e-Conner_Web
for Client B (Apayao State University)

## App structure

The app is a regular mobile web guide to Conner, Apayao. AR is one feature inside it, not the entry point.

| Route | Screen |
| --- | --- |
| `/` | Home — hero, search, category menu, nearby/featured rails, map preview |
| `/places` | Browsable list with search, category filters and distance / A–Z sorting (`?q=`, `?category=`, `?sort=`) |
| `/map` | Full-screen map of every destination with clickable pins and a card overlay (`?category=`, `?place=`) |
| `/place/:slug` | Place detail — full-screen photo/video viewer, hours, contact, mini map, directions |
| `/ar` | The AR camera experience (lazy-loaded, so three.js / AR.js only download here) |
| `/downloads` | PWA install page |

### Where things live

- `src/ui/theme.css` — design tokens and the generic component classes (buttons, chips, cards, sheets, map, media viewer)
- `src/components/ui/` — shared UI: `AppShell`, `MapCanvas`, `MediaViewer`, `PlaceCard`, `CategoryChips`, `Icons`
- `src/hooks/` — `PlacesProvider` (loads the catalog once, adds live distances), `LocationProvider` (opt-in geolocation)
- `src/lib/places.js` — formatting and derivation helpers shared with the AR feature
- `src/components/ar/` — the AR feature, unchanged

Map tiles come from OpenStreetMap (`TILE_URL` in `src/components/ui/MapCanvas.jsx`). Swap in a commercial provider if
traffic outgrows the OSM tile policy; the attribution has to stay visible either way.


## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev -- --host 
```
Make sure to use Desktop's IP when checking for mobile
✅ Check if both are connected to same Internet

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Run Unit Tests with [Vitest](https://vitest.dev/)

```sh
npm run test:unit
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```

### Installed dependencies
```
Vue PWA
```
