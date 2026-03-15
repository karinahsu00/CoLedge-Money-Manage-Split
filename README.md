# CoLedge-Money-Manage-Split
Collaborate, Track, Settle — Smarter Together.  The shared expense and splitting app designed for couples, family, and friends. Say goodbye to basic budgeting, and hello to simple, collaborative financial management.

---

## UI Theme

CoLedge uses a **Warm Earthy / Muted Natural + Ocean Accent** design language. All colors, spacing, typography, and shadow values are defined as CSS custom properties (variables) in a single file:

```
client/src/styles/theme.css
```

This file is imported globally in `client/src/index.js` **before** `index.css`, so every component automatically has access to the design tokens.

### Key Design Tokens

| Token | Default Value | Purpose |
|---|---|---|
| `--bg-page` | `#f5ebe0` | Page background (warm cream) |
| `--bg-surface` | `#ffffff` | Card / panel surface |
| `--bg-surface-alt` | `#edede9` | Alternate rows, muted surfaces |
| `--bg-nav` | `#344e41` | Navigation bar background (forest green) |
| `--text-primary` | `#283618` | Body text, headings |
| `--text-secondary` | `#588157` | Sub-headings, labels |
| `--text-muted` | `#a68a64` | Hints, meta text, captions |
| `--text-on-dark` | `#e9edc9` | Text on dark/colored backgrounds |
| `--primary` | `#588157` | Buttons, active states, links |
| `--primary-dark` | `#3a5a40` | Button hover, darker variant |
| `--accent` | `#219ebc` | Ocean teal accent (call-to-action) |
| `--border` | `#dad7cd` | Default border color |
| `--success` | `#81b29a` | Success / income states |
| `--danger` | `#bf4342` | Danger / expense / delete states |
| `--warning` | `#e07a5f` | Warning / caution states |
| `--info` | `#669bbc` | Info / transfer states |

### How to Adjust Colors

1. Open `client/src/styles/theme.css`
2. Locate the **Design Tokens** section (below the Raw Palette)
3. Change any `--token` value to a new color from the palette (or any valid CSS color)
4. All components update automatically — no component-level changes needed

### Amount Display

Transaction amounts are shown in a two-part format:
- **Left**: local amount with local currency (e.g., `48.00 CAD`)
- **Right** (smaller, muted): USD equivalent (e.g., `35.52 USD`) — only shown when the local currency differs from USD

Fields used per transaction type:
| Type | Local amount field | Local currency field | USD amount field |
|---|---|---|---|
| `income` / `expense` | `amount` | `currency` (fallback: account currency) | `usdAmount` (or computed via `fxRateToUSD`) |
| `transfer` (source account) | `fromAmount` → `amount` | `fromCurrency` | `usdAmount` |
| `transfer` (destination account) | `toAmount` → `amount` | `toCurrency` | `usdAmount` |

