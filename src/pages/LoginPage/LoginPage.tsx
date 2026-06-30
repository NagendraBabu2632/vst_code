import './LoginPage.css';
import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/redux/hooks/reduxHooks";
import { loginAsync, changePasswordAsync, resetChangePassword } from "@/redux/slices/authSlice";
import vstLogo from "@/assets/vst-factory-logo.jfif";
import { motion, AnimatePresence } from "framer-motion";

// ─── Change Password Modal ────────────────────────────────────────────────────
const ChangePasswordModal = ({
  userId,
  onSuccess,
}: {
  userId: number;
  onSuccess: () => void;
}) => {
  const dispatch = useAppDispatch();
  const { changePasswordLoading, changePasswordError } = useAppSelector((s) => ({
    changePasswordLoading: s.auth.changePasswordLoading,
    changePasswordError:   s.auth.changePasswordError,
  }));

  const [oldPassword,     setOldPassword]     = useState("");
  const [newPassword,     setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOld,         setShowOld]         = useState(false);
  const [showNew,         setShowNew]         = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);
  const [errors, setErrors] = useState<{ old?: string; new?: string; confirm?: string }>({});

  const validate = () => {
    const e: typeof errors = {};
    if (!oldPassword.trim())       e.old     = "Current password is required";
    if (!newPassword.trim())       e.new     = "New password is required";
    else if (newPassword.length < 6) e.new   = "New password must be at least 6 characters";
    if (!confirmPassword.trim())   e.confirm = "Please confirm your new password";
    else if (newPassword !== confirmPassword) e.confirm = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    try {
      await dispatch(changePasswordAsync({ userId, oldPassword, newPassword })).unwrap();
      toast.success("Password changed successfully", {
        description: "Please sign in with your new password.",
      });
      onSuccess();
    } catch {
      // error shown from Redux state
    }
  };

  return (
    <motion.div
      className="login-modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="login-card login-modal-card"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.25 }}
      >
        <div className="login-header">
          <div className="login-modal-icon">
            <KeyRound size={28} />
          </div>
          <h1 className="login-title">Change Your Password</h1>
          <p className="login-subtitle">
            This is your first login. Please set a new password to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {/* Current Password */}
          <div className="login-field">
            <label className="login-label">Current Password</label>
            <div className="login-input-wrap">
              <Lock className="login-input-icon" />
              <Input
                type={showOld ? "text" : "password"}
                placeholder="••••••••"
                value={oldPassword}
                onChange={(e) => { setOldPassword(e.target.value); setErrors((p) => ({ ...p, old: undefined })); }}
                className={`login-input login-input--has-toggle${errors.old ? " login-input--error" : ""}`}
              />
              <button type="button" className="login-pass-toggle" onClick={() => setShowOld(!showOld)}
                aria-label={showOld ? "Hide password" : "Show password"}>
                {showOld ? <EyeOff /> : <Eye />}
              </button>
            </div>
            {errors.old && <p className="login-error">{errors.old}</p>}
          </div>

          {/* New Password */}
          <div className="login-field">
            <label className="login-label">New Password</label>
            <div className="login-input-wrap">
              <Lock className="login-input-icon" />
              <Input
                type={showNew ? "text" : "password"}
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setErrors((p) => ({ ...p, new: undefined })); }}
                className={`login-input login-input--has-toggle${errors.new ? " login-input--error" : ""}`}
              />
              <button type="button" className="login-pass-toggle" onClick={() => setShowNew(!showNew)}
                aria-label={showNew ? "Hide password" : "Show password"}>
                {showNew ? <EyeOff /> : <Eye />}
              </button>
            </div>
            {errors.new && <p className="login-error">{errors.new}</p>}
          </div>

          {/* Confirm New Password */}
          <div className="login-field">
            <label className="login-label">Confirm New Password</label>
            <div className="login-input-wrap">
              <Lock className="login-input-icon" />
              <Input
                type={showConfirm ? "text" : "password"}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setErrors((p) => ({ ...p, confirm: undefined })); }}
                className={`login-input login-input--has-toggle${errors.confirm ? " login-input--error" : ""}`}
              />
              <button type="button" className="login-pass-toggle" onClick={() => setShowConfirm(!showConfirm)}
                aria-label={showConfirm ? "Hide password" : "Show password"}>
                {showConfirm ? <EyeOff /> : <Eye />}
              </button>
            </div>
            {errors.confirm && <p className="login-error">{errors.confirm}</p>}
          </div>

          {/* Server error */}
          {changePasswordError && (
            <p className="login-error login-error--server">{changePasswordError}</p>
          )}

          <Button type="submit" className="login-submit" disabled={changePasswordLoading}>
            {changePasswordLoading ? (
              <span className="login-submit-loading">
                <span className="login-spinner" />
                Changing password...
              </span>
            ) : "Change Password"}
          </Button>
        </form>
      </motion.div>
    </motion.div>
  );
};

// ─── Login Page ───────────────────────────────────────────────────────────────
const LoginPage = () => {
  const navigate  = useNavigate();
  const dispatch  = useAppDispatch();
  const { isAuthenticated, loading, mustChangePassword, pendingUserId } = useAppSelector((s) => ({
    isAuthenticated:    s.auth.isAuthenticated,
    loading:            s.auth.loading,
    mustChangePassword: s.auth.mustChangePassword,
    pendingUserId:      s.auth.pendingUserId,
  }));

  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe,   setRememberMe]   = useState(false);
  const [errors,       setErrors]       = useState<{ email?: string; password?: string }>({});
  const [serverError,  setServerError]  = useState<string | null>(null);

  if (isAuthenticated) return <Navigate to="/" replace />;

  const validate = () => {
    const e: { email?: string; password?: string } = {};
    if (!email.trim()) {
      e.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      e.email = "Please enter a valid email address";
    }
    if (!password.trim()) {
      e.password = "Password is required";
    } else if (password.length < 6) {
      e.password = "Password must be at least 6 characters";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setServerError(null);
    try {
      await dispatch(loginAsync({ email, password })).unwrap();
      // mustChangePassword handled by Redux state → modal appears
      // Normal login → isAuthenticated becomes true → Navigate to "/"
    } catch (err: any) {
      setServerError(typeof err === "string" ? err : "Invalid credentials. Please try again.");
    }
  };

  const handleChangePasswordSuccess = () => {
    dispatch(resetChangePassword());
    setPassword("");
    setServerError(null);
    toast.info("Please sign in with your new password.");
  };

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
                  onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: undefined })); setServerError(null); }}
                  className={`login-input${errors.email ? " login-input--error" : ""}`}
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
                  onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: undefined })); setServerError(null); }}
                  className={`login-input login-input--has-toggle${errors.password ? " login-input--error" : ""}`}
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

            {serverError && (
              <p className="login-error login-error--server">{serverError}</p>
            )}

            <Button type="submit" className="login-submit" disabled={loading}>
              {loading ? (
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

      {/* Change Password modal — renders over the login page */}
      <AnimatePresence>
        {mustChangePassword && pendingUserId !== null && (
          <ChangePasswordModal
            userId={pendingUserId}
            onSuccess={handleChangePasswordSuccess}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default LoginPage;
