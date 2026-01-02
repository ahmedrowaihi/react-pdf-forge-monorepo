import * as React from 'react';

export type BodyProps = Readonly<React.HtmlHTMLAttributes<HTMLBodyElement>>;

export const Body = React.forwardRef<HTMLBodyElement, BodyProps>(
  ({ children, ...props }, ref) => (
    <body {...props} ref={ref}>
      {children}
    </body>
  ),
);

Body.displayName = 'Body';
