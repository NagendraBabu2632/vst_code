import "./NotFound.css";
import { useNavigate } from "react-router-dom";

const NotFound = () => {
  const navigate = useNavigate();
  return (
    <div className="notfound">
      <div className="notfound__content">
        <h1 className="notfound__code">404</h1>
        <h2 className="notfound__title">Page not found</h2>
        <p className="notfound__desc">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <button className="notfound__btn" onClick={() => navigate("/")}>
          Go home
        </button>
      </div>
    </div>
  );
};

export default NotFound;
