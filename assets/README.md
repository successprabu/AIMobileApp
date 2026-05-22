# App icons and brand assets

Icons are generated from the web **Account_UI** project logo:

- Source: `public/logo.png` (same file used in web `AppHeader`)

| File | Use |
|------|-----|
| `icon.png` | iOS / Android store icon (1024×1024) |
| `adaptive-icon.png` | Android adaptive icon foreground |
| `splash-icon.png` | Splash screen |
| `favicon.png` | Expo web favicon |
| `brand-logo.png` | Login screen and drawer header |

To regenerate after updating the web logo, copy `logo.png` into this folder as `logo-source.png` and run:

```bash
python3 scripts/generate-app-icons.py
```

(Or replace files manually with square 1024×1024 PNGs.)
