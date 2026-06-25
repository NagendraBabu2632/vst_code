import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => (
  <Sonner
    theme="system"
    position="top-right"
    toastOptions={{
      style: {
        background: "var(--card)",
        color: "var(--card-foreground)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-md)",
      },
    }}
    {...props}
  />
);

export { Toaster };
