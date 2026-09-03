/*
 * Puppy Park — Data Layer
 * -----------------------
 * The single source of truth for every level. The engine (app.js) reads this
 * array and knows nothing hard-coded about the levels themselves.
 *
 * Each level object:
 *   id          - level number (1-based)
 *   title       - short Hebrew title shown in the header badge
 *   instruction - the task text, always visible to the player
 *   itemCount   - how many dogs / kennels to render
 *   controls[]  - the <select> controls the player can change:
 *                   property - the CSS property this select drives
 *                   label    - the visible label (the CSS property name)
 *                   options  - allowed values (includes believable wrong ones)
 *                   default  - the starting value (also used by "reset")
 *   solution    - map of property -> the exact value required to win
 *   hint        - a nudge shown when the player asks for a hint
 */

const LEVELS = [
  {
    id: 1,
    title: "הציר הראשי",
    instruction:
      "השמש שוקעת בחצר! סדרו את הכלבים בקצה השמאלי/סוף השורה, בצל המלונות.",
    itemCount: 2,
    controls: [
      {
        property: "justify-content",
        label: "justify-content",
        options: ["flex-start", "flex-end", "center", "space-between", "space-around"],
        default: "flex-start",
      },
    ],
    solution: { "justify-content": "flex-end" },
    hint:
      "כברירת מחדל, הכלבים מסודרים בשורה (Row). המאפיין ששולט במיקום על הציר האופקי הראשי הוא justify-content. נסו להזיז אותם לסוף השורה (end).",
  },

  {
    id: 2,
    title: "בול במרכז",
    instruction:
      "הכלבים רוצים לעמוד בדיוק באמצע החצר. מרכזו אותם על הציר האופקי!",
    itemCount: 2,
    controls: [
      {
        property: "justify-content",
        label: "justify-content",
        options: ["flex-start", "flex-end", "center", "space-between", "space-around"],
        default: "flex-start",
      },
    ],
    solution: { "justify-content": "center" },
    hint:
      "כדי לדחוף את כל הכלבים למרכז הציר הראשי, חפשו את הערך של justify-content שממקם אותם בדיוק באמצע (center).",
  },

  {
    id: 3,
    title: "פזרו אותם",
    instruction:
      "הכלבלבים צריכים מרחב מחיה. פזרו אותם לאורך כל החצר במרחק שווה מקצה לקצה!",
    itemCount: 3,
    controls: [
      {
        property: "justify-content",
        label: "justify-content",
        options: ["flex-start", "flex-end", "center", "space-between", "space-around"],
        default: "flex-start",
      },
    ],
    solution: { "justify-content": "space-between" },
    hint:
      "רוצים רווח שווה בין הכלבים, כשהראשון והאחרון צמודים לקצוות החצר? חפשו את הערך של justify-content שמכיל את המילה between.",
  },

  {
    id: 4,
    title: "הציר המשני",
    instruction:
      "המלונות ממוקמים בתחתית החצר. הורידו את כל הכלבים למטה!",
    itemCount: 3,
    controls: [
      {
        property: "align-items",
        label: "align-items",
        options: ["flex-start", "flex-end", "center", "stretch"],
        default: "flex-start",
      },
    ],
    solution: { "align-items": "flex-end" },
    hint:
      "הכלבים צריכים לרדת בציר האנכי (הציר המשני). המאפיין שאחראי על כך בשורות הוא align-items. כיוון שהם צריכים לרדת לסוף הקונטיינר, בחרו בערך הסיומת (end).",
  },

  {
    id: 5,
    title: "מרכוז מושלם",
    instruction:
      "שעת משחק! הביאו את הכלבים בדיוק למרכז החצר — גם אופקית וגם אנכית.",
    itemCount: 2,
    controls: [
      {
        property: "justify-content",
        label: "justify-content",
        options: ["flex-start", "flex-end", "center", "space-between", "space-around"],
        default: "flex-start",
      },
      {
        property: "align-items",
        label: "align-items",
        options: ["flex-start", "flex-end", "center", "stretch"],
        default: "flex-start",
      },
    ],
    solution: { "justify-content": "center", "align-items": "center" },
    hint:
      "כדי למרכז אלמנט מכל הכיוונים ב-Flexbox צריך לאחד שני כוחות: מרכזו את הציר האופקי באמצעות justify-content ואת הציר האנכי באמצעות align-items.",
  },

  {
    id: 6,
    title: "היפוך צירים",
    instruction:
      "השביל צר! סדרו את הכלבים בטור (מלמעלה למטה) והצמידו אותם לצד השני של החצר.",
    itemCount: 3,
    controls: [
      {
        property: "flex-direction",
        label: "flex-direction",
        options: ["row", "row-reverse", "column", "column-reverse"],
        default: "row",
      },
      {
        property: "align-items",
        label: "align-items",
        options: ["flex-start", "flex-end", "center", "stretch"],
        default: "flex-start",
      },
    ],
    solution: { "flex-direction": "column", "align-items": "flex-end" },
    hint:
      "שנו את כיוון הצירים ל-column, הצירים מתהפכים! הציר המשני הופך לאופקי, ולכן הזזה לצדדים מתבצעת כעת בעזרת align-items ולא justify-content.",
  },

  {
    id: 7,
    title: "גלישת שורות",
    instruction:
      "הגיע המון כלבלבים חדשים! אפשרו להם לגלוש לשורה הבאה כדי שלא יימעכו, ומרכזו אותם בחצר.",
    itemCount: 6,
    controls: [
      {
        property: "flex-wrap",
        label: "flex-wrap",
        options: ["nowrap", "wrap", "wrap-reverse"],
        default: "nowrap",
      },
      {
        property: "justify-content",
        label: "justify-content",
        options: ["flex-start", "flex-end", "center", "space-between", "space-around"],
        default: "flex-start",
      },
    ],
    solution: { "flex-wrap": "wrap", "justify-content": "center" },
    hint:
      "כשיש יותר מדי פריטים, flex-wrap: wrap מונע כיווץ ומאפשר להם לעבור שורה. לאחר מכן, מרכזו את השורות בציר האופקי באמצעות justify-content: center.",
  },
];

// Expose to the engine (no modules / no build step — plain global, per spec).
window.LEVELS = LEVELS;
