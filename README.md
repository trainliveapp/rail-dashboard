# React + Vite

## Website images

Keep original artwork in `src/assets`. Add new artwork to the asset list in
`scripts/optimize-images.mjs`, then run `npm run optimize:images`. This generates
the WebP files in `src/assets/optimized` and their dimensions and responsive
variants in `src/data/optimizedImages.js`. Commit the generated files together.

Use `SmoothImage` for content images, with appropriate `sizes` and width/height.
It lazy-loads and reveals decoded images; use `loading="eager"` for visible hero
images. `ImageBackground` retains the current artwork until its replacement
loads, and the advertisement carousel only preloads nearby slides.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
