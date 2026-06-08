import "./Loader.css";

interface LoaderProps {
  fullScreen?: boolean;
  size?: "sm" | "md" | "lg";
}

const Loader = ({ fullScreen = false, size = "md" }: LoaderProps) => {
  const spinnerClass = [
    "loader__spinner",
    size === "sm" ? "loader__spinner--sm" : "",
    size === "lg" ? "loader__spinner--lg" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={fullScreen ? "loader-fullscreen" : "loader-inline"}>
      <div className={spinnerClass} role="status" aria-label="Loading" />
    </div>
  );
};

export default Loader;
