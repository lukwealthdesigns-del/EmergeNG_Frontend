/** Colours are CSS variables defined in src/index.css so light, dark and system modes share one set of utility classes. */
const c = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: c("bg"),
        surface: { DEFAULT: c("surface"), 2: c("surface-2"), 3: c("surface-3") },
        line: c("line"),
        ink: { DEFAULT: c("ink"), 2: c("ink-2"), 3: c("ink-3") },
        primary: { DEFAULT: c("primary"), fg: c("primary-fg") },
        cream: c("cream"),
        radar: c("radar"),
        danger: { DEFAULT: c("danger"), soft: c("danger-soft") },
        warn: { DEFAULT: c("warn"), soft: c("warn-soft") },
        ok: { DEFAULT: c("ok"), soft: c("ok-soft") },
        info: { DEFAULT: c("info"), soft: c("info-soft") },
      },
      borderRadius: { xl: "14px", "2xl": "20px", "3xl": "28px", "4xl": "36px" },
      fontFamily: {
        sans: ['"Inter"', "ui-sans-serif", "system-ui", "-apple-system", '"Segoe UI"', "Roboto", "sans-serif"],
        serif: ['"Newsreader"', "Georgia", "serif"],
      },
      boxShadow: {
        soft: "0 1px 2px rgb(var(--shadow) / .05), 0 10px 28px -14px rgb(var(--shadow) / .22)",
        float: "0 18px 50px -16px rgb(var(--shadow) / .4)",
      },
      keyframes: {
        shimmer: { "100%": { transform: "translateX(100%)" } },
        rise: { from: { opacity: 0, transform: "translateY(10px)" }, to: { opacity: 1, transform: "none" } },
        sweep: { to: { transform: "rotate(360deg)" } },
        ping2: { "0%": { transform: "scale(.5)", opacity: ".9" }, "80%,100%": { transform: "scale(2.6)", opacity: "0" } },
        pop: { "0%": { transform: "scale(.96)", opacity: 0 }, "100%": { transform: "scale(1)", opacity: 1 } },
      },
      animation: { rise: "rise .35s ease-out both", pop: "pop .2s ease-out both" },
    },
  },
  plugins: [],
};
