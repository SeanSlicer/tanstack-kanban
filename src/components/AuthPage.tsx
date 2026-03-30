import React, { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "./ui/card";
import { useAuth } from "../hooks/useAuth";

const AuthPage: React.FC = () => {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const switchMode = (newMode: "signin" | "signup") => {
    setMode(newMode);
    setError(null);
    setSuccess(null);
    setFullName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
  };

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) return;
    setError(null);
    setSuccess(null);

    if (mode === "signup") {
      if (!fullName.trim()) {
        setError("Please enter your full name");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }
      if (password.length < 6) {
        setError("Password must be at least 6 characters");
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === "signin") {
        await signIn(email, password);
        navigate({ to: "/" });
      } else {
        await signUp(email, password, fullName.trim());
        setSuccess(
          "Check your email to confirm your account before signing in.",
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          {mode === "signup" && (
            <button
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2 w-fit"
              onClick={() => switchMode("signin")}
            >
              ← Back to sign in
            </button>
          )}
          <CardTitle className="text-2xl font-bold">
            {mode === "signin" ? "Welcome back" : "Create an account"}
          </CardTitle>
          <CardDescription>
            {mode === "signin"
              ? "Sign in to access your boards"
              : "Fill in your details to get started"}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {mode === "signup" && (
            <Input
              type="text"
              placeholder="Full name"
              value={fullName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFullName(e.target.value)
              }
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === "Enter") handleSubmit();
              }}
            />
          )}
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setEmail(e.target.value)
            }
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
              if (e.key === "Enter") handleSubmit();
            }}
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setPassword(e.target.value)
            }
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
              if (e.key === "Enter") handleSubmit();
            }}
          />

          {mode === "signup" && (
            <Input
              type="password"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setConfirmPassword(e.target.value)
              }
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === "Enter") handleSubmit();
              }}
            />
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-green-500">{success}</p>}

          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading
              ? "Loading..."
              : mode === "signin"
                ? "Sign In"
                : "Create Account"}
          </Button>

          {mode === "signin" && (
            <p className="text-sm text-center text-muted-foreground">
              Don't have an account?{" "}
              <button
                className="text-primary underline hover:no-underline"
                onClick={() => switchMode("signup")}
              >
                Sign up
              </button>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthPage;
