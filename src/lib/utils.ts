import { createCn } from "cn/config"

// Teach the merger our DESIGN.md type scale. Without this, `text-caption` and
// friends look like colors and get dropped next to `text-ash` and the like.
export const cn = createCn({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "caption",
            "body-sm",
            "body",
            "subheading",
            "heading",
            "heading-lg",
            "display",
          ],
        },
      ],
    },
  },
})
