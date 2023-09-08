import { type Config } from "tailwindcss";
import colors from 'tailwindcss/colors';

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {},
    colors: {
      primary: colors.blue,
      ...colors
    }
  },
  plugins: [],
} satisfies Config;
