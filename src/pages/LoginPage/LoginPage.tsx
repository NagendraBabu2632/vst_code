import './LoginPage.css';
import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/redux/hooks/reduxHooks";
import { loginAsync } from "@/redux/slices/authSlice";
import vstLogo from "@/assets/vst-factory-logo.jfif";
import { motion } from "framer-motion";

const LoginPage = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  if (isAuthenticated) return <Navigate to="/" replace />;

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }
    if (!password.trim()) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      await dispatch(loginAsync({ email, password })).unwrap();
      toast.success("Welcome to Digital Factory System");
      navigate("/");
    } catch {
      toast.error("Invalid credentials. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const emailInputClass = `login-input${errors.email ? " login-input--error" : ""}`;
  const passwordInputClass = `login-input login-input--has-toggle${errors.password ? " login-input--error" : ""}`;

  return (
    <div className="login-page">
      <div className="login-pattern" />
      <div className="login-glow login-glow--left" />
      <div className="login-glow login-glow--right" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="login-shell"
      >
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo">
              <img src={vstLogo} alt="VST Industries Logo" />
            </div>
            <h1 className="login-title">Digital Factory System</h1>
            <p className="login-subtitle">Sign in to your account</p>
          </div>

          <form onSubmit={handleLogin} className="login-form">
            <div className="login-field">
              <label className="login-label">Email</label>
              <div className="login-input-wrap">
                <Mail className="login-input-icon" />
                <Input
                  type="text"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: undefined })); }}
                  className={emailInputClass}
                />
              </div>
              {errors.email && <p className="login-error">{errors.email}</p>}
            </div>

            <div className="login-field">
              <label className="login-label">Password</label>
              <div className="login-input-wrap">
                <Lock className="login-input-icon" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: undefined })); }}
                  className={passwordInputClass}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="login-pass-toggle"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
              {errors.password && <p className="login-error">{errors.password}</p>}
            </div>

            <div className="login-row">
              <div className="login-remember">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(c) => setRememberMe(c === true)}
                />
                <label htmlFor="remember">Remember me</label>
              </div>
              <button type="button" className="login-forgot">Forgot Password?</button>
            </div>

            <Button type="submit" className="login-submit" disabled={isLoading}>
              {isLoading ? (
                <span className="login-submit-loading">
                  <span className="login-spinner" />
                  Signing in...
                </span>
              ) : "Sign In"}
            </Button>
          </form>

          <p className="login-footer">
            © {new Date().getFullYear()} VST Industries Ltd. All rights reserved.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
