Place small flag icons here (SVG preferred, PNG also works), named however you
like — e.g. `ua.svg`, `de.svg`, `sk.svg`.

To use one, set a Quick Info item's `icon` to its path in `data/members.ts`:

  { icon: "/images/flags/ua.svg", label: "Вінниця" }

The profile page detects image paths automatically by file extension — no
other change needed. Anything that isn't a path to an image file (e.g. "🎂")
is still rendered as a plain emoji/glyph, exactly as before.
