import { forwardRef, type DetailedHTMLProps, type InputHTMLAttributes } from "react";

interface IProps {
  span?: number;
  highlight?: boolean;
}

export const StyledInput = ({ span, highlight, style, ...others }: IProps & DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>) => <input
  className="outline-none tb-border min-w-0 p-2"
  style={{
    flex: span ? `${span} ${span} 0%` : '1 1 0%',
    backgroundColor: highlight ? 'var(--bg-3)' : 'transparent',
    ...style
  }}
  {...others} />;

export const StyledTextarea = forwardRef<HTMLTextAreaElement, IProps & DetailedHTMLProps<InputHTMLAttributes<HTMLTextAreaElement>, HTMLTextAreaElement>>((props, ref) => {
  const { span, highlight, style, ...others } = props;
  return <textarea
    className="outline-none tb-border min-w-0 p-2 resize-none align-middle"
    style={{
      flex: span ? `${span} ${span} 0%` : '1 1 0%',
      backgroundColor: highlight ? 'var(--bg-3)' : 'transparent',
      ...style
    }}
    ref={ref}
    {...others}
  />
});

StyledTextarea.displayName = 'StyledTextarea';