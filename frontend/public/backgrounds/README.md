# Site-wide background artwork

These are the decorative layer painted behind every route. They are wired up in
`src/app/globals.css` (the `body::before` rule) and preloaded per breakpoint in
`src/app/layout.tsx`.

| File               | Used at          | Source          | Notes                                              |
| ------------------ | ---------------- | --------------- | -------------------------------------------------- |
| `mobile_bg.webp`   | viewport < 768px | 941 × 1672 PNG  | Arch + temple spires at top, lotus band at bottom  |
| `desktop_bg.webp`  | viewport ≥ 768px | 1672 × 941 PNG  | Centre mandala, temples left/right, corner lotuses |

`mobile_bg.png` / `desktop_bg.png` are the originals, kept for re-encoding. They are
not referenced by the app — anything in `public/` ships to production, so delete them
if you would rather not serve 3.2 MB of unused source.

## Re-encoding

The artwork is smooth gradients over fine gold linework, so it compresses far better
than its PNG size suggests — q92 lands at 95 KB / 64 KB, high enough that the linework
shows no ringing.

```sh
cwebp -q 92 -m 6 mobile_bg.png  -o mobile_bg.webp
cwebp -q 92 -m 6 desktop_bg.png -o desktop_bg.webp
```

Keep both under ~150 KB — they are preloaded, so weight lands directly on LCP.

## Moving to the CDN

The paths are indirected through CSS custom properties, so switching to the
DigitalOcean Spaces bucket used by the rest of the site is a two-line edit in
`globals.css`:

```css
:root {
  --site-bg-mobile: url("https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/…/mobile_bg.webp");
  --site-bg-desktop: url("https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/…/desktop_bg.webp");
}
```

Update the two `<link rel="preload">` hrefs in `src/app/layout.tsx` to match.

## Why the layer is a fixed pseudo-element

`background-attachment: fixed` on `<body>` is re-rasterised on every scroll frame by
iOS Safari, which makes long pages stutter. A `position: fixed` pseudo-element at
`z-index: -1` pins the artwork to the viewport with no scroll cost. `<body>` must stay
`background-color: transparent` or it paints over the layer.

`--site-bg-fallback` (`#fef8f3`) is sampled from the centre of the desktop artwork. It
paints before the image decodes and fills any sliver `cover` leaves on unusual aspect
ratios.
