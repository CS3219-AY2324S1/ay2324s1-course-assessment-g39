import { type DetailedHTMLProps, type InputHTMLAttributes } from "react";

export const StyledInput = ({ span, highlight, ...others }: {
  span?: number;
  highlight?: boolean;
} & DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>) => <input
    className="outline-none tb-border min-w-0 p-2"
    style={{
      flex: span ? `${span} ${span} 0%` : '1 1 0%',
      backgroundColor: highlight ? 'var(--bg-3)' : 'transparent',
      ...others.style
    }}
    {...others} />;
