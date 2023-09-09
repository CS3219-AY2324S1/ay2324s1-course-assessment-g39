import { type ButtonHTMLAttributes } from "react";

export const StyledButton = (props: ButtonHTMLAttributes<HTMLButtonElement>) => <button className="self-start rounded-md al bg-white/10 flex-[2_0_0%] py-1 mt-2 font-bold text-white no-underline transition hover:bg-white/20" style={{ opacity: props.disabled ? 0.3 : 1 }} value="Add Question" {...props} />;
