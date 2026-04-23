import { useState } from "react";
import type { AuthUser } from "../utils/auth";
import { signInWithEmail, signOut, signUpWithEmail } from "../utils/auth";

type Props = {
  user: AuthUser | null;
  onAuthChange: (user: AuthUser | null) => void;
};

export default function AuthPanel({ user, onAuthChange }: Props) {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");

  const handleSubmit = async () => {
    try {
      setStatus(mode === "sign-in" ? "Signing in..." : "Creating account...");
      if (mode === "sign-up" && !displayName.trim()) {
        setStatus("Display name is required.");
        return;
      }

      const nextUser =
        mode === "sign-in"
          ? await signInWithEmail(email.trim(), password)
          : await signUpWithEmail(email.trim(), password, displayName.trim());

      onAuthChange(nextUser);
      setStatus(
        nextUser
          ? "Signed in."
          : "Check your email to confirm your account, then sign in.",
      );
      setPassword("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Authentication failed.");
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      onAuthChange(null);
      setStatus("Signed out.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to sign out.");
    }
  };

  if (user) {
    return (
      <div className="card auth-card">
        <div>
          <h2>Account</h2>
          <p>{user.email ?? "Signed in"}</p>
        </div>
        <button type="button" onClick={handleSignOut}>
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>{mode === "sign-in" ? "Sign in" : "Create account"}</h2>
      {mode === "sign-up" && (
        <>
          <label htmlFor="auth-display-name">Display name</label>
          <input
            id="auth-display-name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Jake"
          />
        </>
      )}
      <label htmlFor="auth-email">Email</label>
      <input
        id="auth-email"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@example.com"
      />
      <label htmlFor="auth-password">Password</label>
      <input
        id="auth-password"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="Password"
      />
      <div className="draft-actions">
        <button type="button" onClick={handleSubmit}>
          {mode === "sign-in" ? "Sign In" : "Create Account"}
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={() =>
            setMode((currentMode) =>
              currentMode === "sign-in" ? "sign-up" : "sign-in",
            )
          }
        >
          {mode === "sign-in" ? "Need an account?" : "Have an account?"}
        </button>
      </div>
      {status && <p>{status}</p>}
    </div>
  );
}
