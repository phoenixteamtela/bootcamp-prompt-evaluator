# Lessons Learned

## UI/UX Patterns

### No browser-default dialogs
- NEVER use `window.confirm()`, `window.alert()`, or `window.prompt()` — they produce unstyled browser-default popups that violate our branding.
- Always build custom styled modals using our theme (colors, gradients, border-radius 12-16px, Sofia Pro font).
- Destructive confirmation modals should have: icon in a colored circle, clear title, descriptive message, Cancel + action button pair.
