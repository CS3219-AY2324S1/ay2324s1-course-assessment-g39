import { type ButtonHTMLAttributes } from "react";

export const StyledButton = ({ style, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) =>
<button
    className="self-start rounded-md whitespace-nowrap bg-white/10 flex-[1_0_0%] px-2 py-1 mt-2 font-bold text-white no-underline transition hover:bg-white/20"
    style={{
        ...style,
        opacity: props.disabled ? 0.3 : 1,
        backgroundColor: props.disabled ? 'var(--bg-2)' : style?.backgroundColor,
    }}
    {...props}
/>;
