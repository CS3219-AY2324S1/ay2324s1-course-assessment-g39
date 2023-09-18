import { useCallback, type DetailedHTMLProps, type InputHTMLAttributes } from "react";

export const StyledCheckbox = ({ indeterminate, ...others }: { indeterminate?: boolean; } & DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>) => {
  const setInd = useCallback((el: HTMLInputElement) => {
    if (el) {
      el.indeterminate = indeterminate ?? false;
    }
  }, [indeterminate]);
  return <div className="checkbox tb-border">
    <input type="checkbox" ref={setInd} {...others} />
    <span className="checkmark" />
  </div>;
};
