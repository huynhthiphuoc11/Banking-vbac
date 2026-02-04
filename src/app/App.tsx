import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LoginPage } from "./pages/login-page";
import { DashboardPage } from "./pages/dashboard-page";
import { ChatPage } from "./pages/chat-page";
import { PlaceholderPage } from "./pages/placeholder-page";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route
          path="/transactions"
          element={<PlaceholderPage title="Transactions" description="Coming soon." />}
        />
        <Route
          path="/card-activities"
          element={<PlaceholderPage title="Card Activities" description="Coming soon." />}
        />
        <Route
          path="/wallet"
          element={<PlaceholderPage title="My Wallet" description="Coming soon." />}
        />
        <Route
          path="/notifications"
          element={<PlaceholderPage title="Notifications" description="Coming soon." />}
        />
        <Route
          path="/privacy"
          element={<PlaceholderPage title="Privacy" description="Coming soon." />}
        />
        <Route
          path="/support"
          element={<PlaceholderPage title="Support" description="Coming soon." />}
        />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
