import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  CreditCard,
  Grid2X2,
  HelpCircle,
  LogOut,
  MessageSquare,
  Settings,
  Shield,
  Wallet,
} from "lucide-react";

import { cn } from "../ui/utils";
import { Switch } from "../ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

type NavItem = {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", path: "/dashboard", icon: Grid2X2 },
  { label: "Transactions", path: "/transactions", icon: CreditCard },
  { label: "Card Activities", path: "/card-activities", icon: Wallet },
  { label: "AI Consultant", path: "/chat", icon: MessageSquare },
  { label: "Notifications", path: "/notifications", icon: Bell },
];

const PREF_ITEMS: NavItem[] = [{ label: "Privacy", path: "/privacy", icon: Shield }];

function SparkleLogo() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[#6D8CFF] to-[#57D1B9] shadow-sm">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M18.7 7.2c-1.6-2-4.6-2.9-7.1-1.7C9.7 6.3 9.2 7.9 9.8 9c.6 1.2 2.2 1.4 3.7 1.7 2.2.4 4.6 1.1 4.8 3.6.2 2.5-2 4.4-5 4.8-2.7.4-5.4-.5-7-2.2"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div className="text-lg font-bold tracking-tight text-[#1F2937]">
        VBAC
      </div>
    </div>
  );
}

function SidebarNavButton({ item, active }: { item: NavItem; active: boolean }) {
  const navigate = useNavigate();
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={() => navigate(item.path)}
      className={cn(
        "group relative flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors",
        active ? "bg-[#F3FFFB]" : "hover:bg-[#F7F9FF]",
      )}
    >
      {/* active bar */}
      <span
        className={cn(
          "absolute left-2 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full transition-opacity",
          active ? "bg-[#39D6B0] opacity-100" : "opacity-0",
        )}
      />
      <Icon
        className={cn(
          "h-5 w-5 transition-colors",
          active ? "text-[#39D6B0]" : "text-[#A0A7B4] group-hover:text-[#6B7383]",
        )}
      />
      <span
        className={cn(
          "text-[14px] font-medium transition-colors",
          active ? "text-[#39D6B0]" : "text-[#A0A7B4] group-hover:text-[#6B7383]",
        )}
      >
        {item.label}
      </span>
    </button>
  );
}

export function SparkleShell({
  greeting,
  children,
}: {
  greeting: React.ReactNode;
  children: React.ReactNode;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = React.useState(false);

  return (
    <div className="min-h-screen bg-[#EAF1FF] p-6 md:p-10">
      <div className="mx-auto w-full max-w-screen-2xl overflow-hidden rounded-[28px] bg-white shadow-[0_22px_70px_rgba(25,55,99,0.16)]">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr]">
          {/* Sidebar */}
          <aside className="hidden lg:flex min-h-[calc(100vh-80px)] flex-col border-r border-[#EEF1F6] bg-white">
            <div className="px-6 py-6">
              <SparkleLogo />
            </div>

            <div className="px-3">
              <div className="space-y-1">
                {NAV_ITEMS.map((item) => (
                  <SidebarNavButton
                    key={item.path}
                    item={item}
                    active={location.pathname === item.path}
                  />
                ))}
              </div>

              <div className="mt-8 px-4 text-[15px] font-semibold text-[#1C2433]">
                Preferences
              </div>

              <div className="mt-3 space-y-1">
                <div className="flex items-center justify-between rounded-xl px-4 py-3 text-[#A0A7B4]">
                  <div className="flex items-center gap-3">
                    <span className="grid h-5 w-5 place-items-center">
                      <span className="h-4 w-4 rounded-full border border-[#C9CFDA]" />
                    </span>
                    <span className="text-[14px] font-medium">Dark Mode</span>
                  </div>
                  <Switch
                    checked={darkMode}
                    onCheckedChange={(v) => setDarkMode(Boolean(v))}
                    className="data-[state=checked]:bg-[#39D6B0]"
                  />
                </div>

                {PREF_ITEMS.map((item) => (
                  <SidebarNavButton
                    key={item.path}
                    item={item}
                    active={location.pathname === item.path}
                  />
                ))}
              </div>
            </div>

            <div className="mt-auto border-t border-[#EEF1F6] px-3 py-4">
              <button
                type="button"
                onClick={() => navigate("/support")}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-[#A0A7B4] hover:bg-[#F7F9FF] hover:text-[#6B7383] transition-colors"
              >
                <HelpCircle className="h-5 w-5" />
                <span className="text-[14px] font-medium">Support</span>
              </button>
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-[#A0A7B4] hover:bg-[#F7F9FF] hover:text-[#6B7383] transition-colors"
              >
                <LogOut className="h-5 w-5" />
                <span className="text-[14px] font-medium">Log out</span>
              </button>

              <div className="mt-4 flex items-center gap-3 rounded-xl px-4 py-3">
                <div className="h-9 w-9 overflow-hidden rounded-full bg-[#EEF1F6]" />
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-semibold text-[#1C2433]">
                    Julie 
                  </div>
                  <div className="truncate text-[11px] text-[#A0A7B4]">
                    juliehuynh@gmail.com
                  </div>
                </div>
                <button
                  type="button"
                  className="ml-auto grid h-8 w-8 place-items-center rounded-lg hover:bg-[#F7F9FF]"
                  aria-label="Settings"
                >
                  <Settings className="h-4 w-4 text-[#A0A7B4]" />
                </button>
              </div>
            </div>
          </aside>

          {/* Main */}
          <main className="min-h-[calc(100vh-80px)] bg-white">
            <header className="border-b border-[#EEF1F6] px-6 py-6 md:px-10">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="text-[28px] font-bold tracking-tight text-[#111827]">
                  {greeting}
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative w-full md:w-[260px]">
                    <input
                      placeholder="Search"
                      className="h-10 w-full rounded-xl border border-[#EEF1F6] bg-white px-10 text-sm text-[#1C2433] placeholder:text-[#A0A7B4] outline-none focus:ring-2 focus:ring-[#39D6B0]/20"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A0A7B4]">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path
                          d="M21 21l-4.3-4.3m1.3-5.2a7.5 7.5 0 11-15 0 7.5 7.5 0 0115 0z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>
                  </div>

                  <Select defaultValue="eng">
                    <SelectTrigger className="h-10 w-[92px] rounded-xl border-[#EEF1F6] bg-white text-sm text-[#6B7383] shadow-none">
                      <SelectValue placeholder="Lang" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="eng">Eng</SelectItem>
                      <SelectItem value="vi">Vi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </header>

            <div className="px-6 py-6 md:px-10 md:py-8">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}


