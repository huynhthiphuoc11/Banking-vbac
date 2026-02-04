import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
const loginIllustration = new URL(
  /* @vite-ignore */ "../../public/login.png",
  import.meta.url,
).href;

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-[#EAF1FF] flex items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-6xl overflow-hidden rounded-[28px] bg-white shadow-[0_20px_60px_rgba(25,55,99,0.18)]">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Left: Illustration */}
          <div className="relative bg-[#F4F9FF] p-10 md:p-12">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#5AA9FF]/10 blur-3xl" />
              <div className="absolute -bottom-40 -right-40 h-[520px] w-[520px] rounded-full bg-[#58D2B8]/15 blur-3xl" />
            </div>

            <div className="relative flex h-full flex-col">
              {/* Logo */}
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-[#6D8CFF] to-[#57D1B9] shadow-sm">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M18.7 7.2c-1.6-2-4.6-2.9-7.1-1.7C9.7 6.3 9.2 7.9 9.8 9c.6 1.2 2.2 1.4 3.7 1.7 2.2.4 4.6 1.1 4.8 3.6.2 2.5-2 4.4-5 4.8-2.7.4-5.4-.5-7-2.2"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
            </div>
                <div className="text-2xl font-semibold tracking-tight text-[#2E3A55]">
                  VCAB
          </div>
        </div>

              {/* Illustration */}
              <div className="flex flex-1 items-center justify-center py-10 md:py-14">
                <div className="relative w-full max-w-[520px]">
                  {/* Background to blend the illustration edges */}
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#F4F9FF] via-[#F4F9FF] to-[#E9F7F4]" />
                  <img
                    src={loginIllustration}
                    alt="Smart personal finance illustration"
                    className="relative max-h-[340px] w-full object-contain opacity-[0.985] [mask-image:radial-gradient(ellipse_at_center,rgba(0,0,0,1)_56%,rgba(0,0,0,0.92)_70%,rgba(0,0,0,0)_96%)] [-webkit-mask-image:radial-gradient(ellipse_at_center,rgba(0,0,0,1)_56%,rgba(0,0,0,0.92)_70%,rgba(0,0,0,0)_96%)] [mask-repeat:no-repeat] [-webkit-mask-repeat:no-repeat] [mask-size:100%_100%] [-webkit-mask-size:100%_100%] [mask-position:center] [-webkit-mask-position:center] [filter:contrast(0.99)_saturate(0.98)]"
                    draggable={false}
                  />
                  {/* Extra feathering to fully blend edges into the background */}
                  <div className="pointer-events-none absolute inset-0 rounded-3xl [background:radial-gradient(ellipse_at_center,transparent_58%,rgba(244,249,255,0.72)_82%,rgba(233,247,244,0.92)_100%)]" />
                </div>
              </div>

              {/* Tagline */}
              <div className="pt-4 text-center text-[28px] font-medium text-[#3D4A66] md:text-[32px]">
                Smart personal finance
              </div>
            </div>
          </div>

          {/* Right: Form */}
          <div className="p-10 md:p-14">
            <div className="mx-auto w-full max-w-md">
              <h1 className="text-4xl font-semibold tracking-tight text-[#1C2433] md:text-[44px]">
                Welcome back
              </h1>

              <form onSubmit={handleLogin} className="mt-10 space-y-6">
              <div className="space-y-2">
                  <Label htmlFor="email" className="text-[15px] text-[#1C2433]">
                  Email
                </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 rounded-xl border-[#E6E9F0] bg-white px-4 text-[15px] shadow-none focus-visible:ring-[#60D3BB]/30"
                    required
                    autoComplete="email"
                  />
              </div>

              <div className="space-y-2">
                  <Label htmlFor="password" className="text-[15px] text-[#1C2433]">
                    Password
                </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 rounded-xl border-[#E6E9F0] bg-white px-4 text-[15px] shadow-none focus-visible:ring-[#60D3BB]/30"
                    required
                    autoComplete="current-password"
                  />
              </div>

              <Button 
                type="submit" 
                  className="h-12 w-full rounded-xl bg-gradient-to-r from-[#45C7B1] to-[#3DBAA5] text-[16px] font-semibold text-white shadow-[0_12px_28px_rgba(61,186,165,0.30)] hover:opacity-95"
              >
                  Sign in
              </Button>

                <div className="text-center">
                  <a
                    href="#"
                    className="text-sm text-[#9AA3B2] hover:text-[#5A6475] transition-colors"
                  >
                    Forgot password?
                  </a>
                </div>

                <div className="pt-4">
                  <div className="h-px w-full bg-[#EEF1F6]" />
              </div>

                <div className="pt-3 text-center text-sm text-[#9AA3B2]">
                  Don&apos;t have an account?{" "}
                  <a
                    href="#"
                    className="font-semibold text-[#3DBAA5] hover:text-[#2E9B8A] transition-colors"
                  >
                    Sign up
                  </a>
              </div>
            </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}