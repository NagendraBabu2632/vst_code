import "./Loader.css";

interface LoaderProps {
  fullScreen?: boolean;
  size?: "sm" | "md" | "lg";
  message?: string;
}

const Loader = ({ fullScreen = false, size = "md", message }: LoaderProps) => {
  const spinnerClass = [
    "loader__spinner",
    size === "sm" ? "loader__spinner--sm" : "",
    size === "lg" ? "loader__spinner--lg" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const wrapClass = fullScreen
    ? "loader-fullscreen"
    : message
    ? "loader-page"
    : "loader-inline";

  return (
    <div className={wrapClass}>
      <div className="loader__inner">
        <div className={spinnerClass} role="status" aria-label="Loading" />
        {message && <p className="loader__message">{message}</p>}
      </div>
    </div>
  );
};

export default Loader;
