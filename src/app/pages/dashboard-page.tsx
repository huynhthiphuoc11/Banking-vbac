import React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Calendar, ChevronDown, Plus, Droplets, Dumbbell, CarFront, Home, PiggyBank } from "lucide-react";

import { SparkleShell } from "../components/layout/sparkle-shell";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { cn } from "../components/ui/utils";
import { DashboardInsightsRes, DashboardRecommendationsRes, DashboardSummaryRes, DashboardTransaction } from "../services/api";

export function DashboardPage() {
  const USER_ID = "00017496858921195E5A";

  const [summaryApi, setSummaryApi] = React.useState<DashboardSummaryRes | null>(null);
  const [txApi, setTxApi] = React.useState<DashboardTransaction[]>([]);
  const [insightsApi, setInsightsApi] = React.useState<DashboardInsightsRes | null>(null);
  const [recsApi, setRecsApi] = React.useState<DashboardRecommendationsRes | null>(null);

  // Use fixed mock data for local UI demo (no backend required)
  React.useEffect(() => {
    const mockSummary: DashboardSummaryRes = {
      user_id: USER_ID,
      window_days: 90,
      spend_total: 18450.25,
      income_total: 32500,
      tx_count: 68,
      installment_ratio: 0.36,
      top_categories: [
        { category: "Shopping", total: 7200 },
        { category: "Travel", total: 4200 },
        { category: "Groceries", total: 2800 },
        { category: "Bills & Utilities", total: 1800 },
        { category: "Dining", total: 1450.25 },
      ],
    };

    const mockTx: DashboardTransaction[] = [
      // January – income and fixed expenses
      {
        id: "TX-1001",
        user_id: USER_ID,
        posted_at: "2025-01-01",
        direction: "credit",
        amount: 3200,
        currency: "EUR",
        merchant_name: "January Salary",
        channel: "Transfer",
        category: "Income",
        mcc: 6012,
        isin: "ISIN0001",
        installment: null,
      },
      {
        id: "TX-1002",
        user_id: USER_ID,
        posted_at: "2025-01-02",
        direction: "debit",
        amount: -980,
        currency: "EUR",
        merchant_name: "City Apartments",
        channel: "Transfer",
        category: "Housing",
        mcc: 6513,
        isin: "ISIN0002",
        installment: null,
      },
      {
        id: "TX-1003",
        user_id: USER_ID,
        posted_at: "2025-01-03",
        direction: "debit",
        amount: -86.4,
        currency: "EUR",
        merchant_name: "Supermarket",
        channel: "POS",
        category: "Groceries",
        mcc: 5411,
        isin: "ISIN0003",
        installment: null,
      },
      {
        id: "TX-1004",
        user_id: USER_ID,
        posted_at: "2025-01-04",
        direction: "debit",
        amount: -45.9,
        currency: "EUR",
        merchant_name: "Electricity Bill",
        channel: "Online",
        category: "Bills & Utilities",
        mcc: 4900,
        isin: "ISIN0004",
        installment: null,
      },
      {
        id: "TX-1005",
        user_id: USER_ID,
        posted_at: "2025-01-05",
        direction: "debit",
        amount: -19.99,
        currency: "EUR",
        merchant_name: "Spotify",
        channel: "Card on file",
        category: "Entertainment",
        mcc: 4899,
        isin: "ISIN0005",
        installment: null,
      },
      {
        id: "TX-1006",
        user_id: USER_ID,
        posted_at: "2025-01-06",
        direction: "debit",
        amount: -560.75,
        currency: "EUR",
        merchant_name: "Airline Ticket",
        channel: "Online",
        category: "Travel",
        mcc: 4511,
        isin: "ISIN0006",
        installment: {
          is_installment: true,
          months: 6,
          monthly_amount: 95,
        },
      },
      {
        id: "TX-1007",
        user_id: USER_ID,
        posted_at: "2025-01-08",
        direction: "debit",
        amount: -32.15,
        currency: "EUR",
        merchant_name: "Coffee Shop",
        channel: "POS",
        category: "Dining",
        mcc: 5812,
        isin: "ISIN0007",
        installment: null,
      },
      {
        id: "TX-1008",
        user_id: USER_ID,
        posted_at: "2025-01-10",
        direction: "debit",
        amount: -240.3,
        currency: "EUR",
        merchant_name: "Zara",
        channel: "POS",
        category: "Shopping",
        mcc: 5651,
        isin: "ISIN0008",
        installment: null,
      },
      // Mid‑month transfers & savings
      {
        id: "TX-1009",
        user_id: USER_ID,
        posted_at: "2025-01-15",
        direction: "debit",
        amount: -300,
        currency: "EUR",
        merchant_name: "Auto Savings",
        channel: "Transfer",
        category: "Savings",
        mcc: 6011,
        isin: "ISIN0009",
        installment: null,
      },
      {
        id: "TX-1010",
        user_id: USER_ID,
        posted_at: "2025-01-18",
        direction: "credit",
        amount: 150,
        currency: "EUR",
        merchant_name: "Refund - Airline",
        channel: "Transfer",
        category: "Refund",
        mcc: 4511,
        isin: "ISIN0010",
        installment: null,
      },
      // February – repeat salary & expenses
      {
        id: "TX-1011",
        user_id: USER_ID,
        posted_at: "2025-02-01",
        direction: "credit",
        amount: 3220,
        currency: "EUR",
        merchant_name: "February Salary",
        channel: "Transfer",
        category: "Income",
        mcc: 6012,
        isin: "ISIN0011",
        installment: null,
      },
      {
        id: "TX-1012",
        user_id: USER_ID,
        posted_at: "2025-02-02",
        direction: "debit",
        amount: -980,
        currency: "EUR",
        merchant_name: "City Apartments",
        channel: "Transfer",
        category: "Housing",
        mcc: 6513,
        isin: "ISIN0012",
        installment: null,
      },
      {
        id: "TX-1013",
        user_id: USER_ID,
        posted_at: "2025-02-03",
        direction: "debit",
        amount: -92.3,
        currency: "EUR",
        merchant_name: "Supermarket",
        channel: "POS",
        category: "Groceries",
        mcc: 5411,
        isin: "ISIN0013",
        installment: null,
      },
      {
        id: "TX-1014",
        user_id: USER_ID,
        posted_at: "2025-02-05",
        direction: "debit",
        amount: -48.7,
        currency: "EUR",
        merchant_name: "Gas & Heating",
        channel: "Online",
        category: "Bills & Utilities",
        mcc: 4900,
        isin: "ISIN0014",
        installment: null,
      },
      {
        id: "TX-1015",
        user_id: USER_ID,
        posted_at: "2025-02-07",
        direction: "debit",
        amount: -27.5,
        currency: "EUR",
        merchant_name: "Gym Membership",
        channel: "Card on file",
        category: "Health & Fitness",
        mcc: 7997,
        isin: "ISIN0015",
        installment: null,
      },
      {
        id: "TX-1016",
        user_id: USER_ID,
        posted_at: "2025-02-10",
        direction: "debit",
        amount: -210.9,
        currency: "EUR",
        merchant_name: "IKEA",
        channel: "POS",
        category: "Shopping",
        mcc: 5712,
        isin: "ISIN0016",
        installment: null,
      },
      {
        id: "TX-1017",
        user_id: USER_ID,
        posted_at: "2025-02-14",
        direction: "debit",
        amount: -65.2,
        currency: "EUR",
        merchant_name: "Restaurant Date",
        channel: "POS",
        category: "Dining",
        mcc: 5812,
        isin: "ISIN0017",
        installment: null,
      },
      {
        id: "TX-1018",
        user_id: USER_ID,
        posted_at: "2025-02-20",
        direction: "debit",
        amount: -300,
        currency: "EUR",
        merchant_name: "Auto Savings",
        channel: "Transfer",
        category: "Savings",
        mcc: 6011,
        isin: "ISIN0018",
        installment: null,
      },
      // March – more everyday spend
      {
        id: "TX-1019",
        user_id: USER_ID,
        posted_at: "2025-03-01",
        direction: "credit",
        amount: 3250,
        currency: "EUR",
        merchant_name: "March Salary",
        channel: "Transfer",
        category: "Income",
        mcc: 6012,
        isin: "ISIN0019",
        installment: null,
      },
      {
        id: "TX-1020",
        user_id: USER_ID,
        posted_at: "2025-03-02",
        direction: "debit",
        amount: -980,
        currency: "EUR",
        merchant_name: "City Apartments",
        channel: "Transfer",
        category: "Housing",
        mcc: 6513,
        isin: "ISIN0020",
        installment: null,
      },
      {
        id: "TX-1021",
        user_id: USER_ID,
        posted_at: "2025-03-03",
        direction: "debit",
        amount: -102.6,
        currency: "EUR",
        merchant_name: "Supermarket",
        channel: "POS",
        category: "Groceries",
        mcc: 5411,
        isin: "ISIN0021",
        installment: null,
      },
      {
        id: "TX-1022",
        user_id: USER_ID,
        posted_at: "2025-03-05",
        direction: "debit",
        amount: -39.4,
        currency: "EUR",
        merchant_name: "Water Bill",
        channel: "Online",
        category: "Bills & Utilities",
        mcc: 4900,
        isin: "ISIN0022",
        installment: null,
      },
      {
        id: "TX-1023",
        user_id: USER_ID,
        posted_at: "2025-03-08",
        direction: "debit",
        amount: -55.9,
        currency: "EUR",
        merchant_name: "Gas Station",
        channel: "POS",
        category: "Transport",
        mcc: 5541,
        isin: "ISIN0023",
        installment: null,
      },
      {
        id: "TX-1024",
        user_id: USER_ID,
        posted_at: "2025-03-10",
        direction: "debit",
        amount: -300,
        currency: "EUR",
        merchant_name: "Auto Savings",
        channel: "Transfer",
        category: "Savings",
        mcc: 6011,
        isin: "ISIN0024",
        installment: null,
      },
      {
        id: "TX-1025",
        user_id: USER_ID,
        posted_at: "2025-03-12",
        direction: "debit",
        amount: -88.3,
        currency: "EUR",
        merchant_name: "Online Shopping",
        channel: "Online",
        category: "Shopping",
        mcc: 5311,
        isin: "ISIN0025",
        installment: null,
      },
    ];

    const mockInsights: DashboardInsightsRes = {
      user_id: USER_ID,
      window_days: 90,
      insights: [
        {
          level: "high",
          title: "Spend concentration detected",
          description: "Your spend is concentrated in **Shopping** over the last 90 days.",
          impact: "Consider setting a category budget for Shopping.",
          why: ["High share in Shopping", "Consistent pattern in recent transactions"],
        },
        {
          level: "warning",
          title: "High installment usage",
          description: "Installment ratio is **32%** of your spending.",
          impact: "Try to reduce installments below 30% for healthier cashflow.",
          why: ["Multiple installment transactions"],
        },
        {
          level: "stable",
          title: "Healthy income to spend ratio",
          description: "You keep more than 40% of your income after expenses.",
          impact: "You have room to increase savings or investments.",
          why: ["Positive net cashflow in the last 3 months"],
        },
      ],
    };

    const mockRecs: DashboardRecommendationsRes = {
      user_id: USER_ID,
      window_days: 90,
      recommendations: [
        {
          product: "Rewards Credit Card",
          type: "credit_card",
          match: 0.86,
          why: ["High spend in Shopping", "Better cashback on e‑commerce"],
          explanation: "Maximize rewards on your dominant spend category.",
        },
        {
          product: "Smart Saver Plan",
          type: "saving",
          match: 0.75,
          why: ["Stable income", "Room to automate monthly savings"],
          explanation: "Automated saving helps build a safety buffer.",
        },
      ],
    };

    setSummaryApi(mockSummary);
    setTxApi(mockTx);
    setInsightsApi(mockInsights);
    setRecsApi(mockRecs);
  }, [USER_ID]);

  const formatMoney = (n: number, currency: string = "EUR") =>
    new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);

  const summary = [
    {
      label: "Total Spent (90d)",
      value: summaryApi ? formatMoney(summaryApi.spend_total) : "$—",
      change: summaryApi ? `${summaryApi.tx_count} tx` : "",
      changeHint: "in last 90 days",
      tone: "bad" as const,
    },
    {
      label: "Total Income (90d)",
      value: summaryApi ? formatMoney(summaryApi.income_total) : "$—",
      change: "",
      changeHint: "in last 90 days",
      tone: "good" as const,
    },
    {
      label: "Installment Ratio",
      value: summaryApi
        ? `${Math.round(summaryApi.installment_ratio * 100)}%`
        : "—",
      change: "",
      changeHint: "of spending",
      tone: (summaryApi?.installment_ratio ?? 0) >= 0.3 ? ("bad" as const) : ("good" as const),
    },
  ];

  const stats = React.useMemo(() => {
    const byDate = new Map<string, { deposit: number; spent: number }>();
    txApi.slice(0, 600).forEach((t) => {
      const key = t.posted_at;
      const cur = byDate.get(key) || { deposit: 0, spent: 0 };
      if (t.direction === "credit") cur.deposit += t.amount;
      else cur.spent += Math.abs(t.amount);
      byDate.set(key, cur);
    });
    const rows = Array.from(byDate.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .slice(-30)
      .map(([d, v]) => ({
        x: new Date(d).toLocaleDateString("en-US", { month: "short", day: "2-digit" }),
        deposit: Number(v.deposit.toFixed(2)),
        spent: Number(v.spent.toFixed(2)),
      }));
    return rows.length ? rows : [{ x: "—", deposit: 0, spent: 0 }];
  }, [txApi]);

  const activities = [
    {
      name: "Water Bill",
      amount: "-$226",
      tone: "bad" as const,
      icon: <Droplets className="h-4 w-4 text-[#4C6FFF]" />,
    },
    {
      name: "Gym & Fitness",
      amount: "-$50",
      tone: "bad" as const,
      icon: <Dumbbell className="h-4 w-4 text-[#FF6B6B]" />,
    },
    {
      name: "Car Purchase",
      amount: "-$196,632",
      tone: "bad" as const,
      icon: <CarFront className="h-4 w-4 text-[#F97316]" />,
    },
    {
      name: "Home Rent",
      amount: "-$50",
      tone: "bad" as const,
      icon: <Home className="h-4 w-4 text-[#A855F7]" />,
    },
    {
      name: "Bank Deposit",
      amount: "+$995,9074",
      tone: "good" as const,
      icon: <PiggyBank className="h-4 w-4 text-[#16A34A]" />,
    },
  ];

  const transactions = React.useMemo(() => {
    if (!txApi.length) {
      return [
        {
          name: "—",
          date: "—",
          id: "—",
          quantity: "—",
          status: "—",
          statusTone: "warn" as const,
        },
      ];
    }
    return txApi.slice(0, 10).map((t) => {
      const status = t.direction === "credit" ? "Received" : "Sending";
      const statusTone = t.direction === "credit" ? ("good" as const) : ("warn" as const);
      const name = t.merchant_name || t.category || "Transaction";
      const dateText = new Date(t.posted_at).toLocaleString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      });
      const quantity = formatMoney(Math.abs(t.amount), t.currency);
      return { name, date: dateText, id: t.id, quantity, status, statusTone };
    });
  }, [txApi]);

  const revenue = [
    { name: "Deposit", value: 40, color: "#3AD6B0" },
    { name: "Spent", value: 7, color: "#FF6B6B" },
    { name: "Spent ", value: 7, color: "#4C6FFF" },
  ];

  const insights = insightsApi?.insights ?? [];
  const products = (recsApi?.recommendations ?? []).map((r) => ({
    name: r.product,
    category: r.type,
    match: Math.round((r.match || 0) * 100),
    why: r.why,
    explanation: r.explanation,
  }));

  return (
    <SparkleShell greeting="Good Evening Julie.">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
        {/* Left column */}
        <div className="space-y-6">
          {/* Financial Record header */}
          <div className="flex items-center justify-between">
            <div className="text-xl font-bold tracking-tight text-[#111827]">
              Financial Record
            </div>
            <Select defaultValue="last30">
              <SelectTrigger className="h-10 w-[150px] rounded-xl border-[#EEF1F6] bg-white text-sm text-[#6B7383] shadow-none">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[#A0A7B4]" />
                  <SelectValue placeholder="Range" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last7">Last 7 days</SelectItem>
                <SelectItem value="last30">Last 30 days</SelectItem>
                <SelectItem value="last90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
                </div>

          {/* Summary cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {summary.map((s) => (
              <Card key={s.label} className="border-[#EEF1F6] shadow-none">
                <CardContent className="p-5">
                  <div className="text-sm text-[#A0A7B4]">{s.label}</div>
                  <div className="mt-2 text-2xl font-bold tracking-tight text-[#111827]">
                    {s.value}
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-sm whitespace-nowrap">
                    <span
                      className={cn(
                        "font-semibold",
                        s.tone === "good" ? "text-[#3AD6B0]" : "text-[#FF6B6B]",
                      )}
                    >
                      {s.change}
                    </span>
                    <span className="text-[#A0A7B4]">{s.changeHint}</span>
                </div>
              </CardContent>
            </Card>
            ))}
          </div>

          {/* Statistics */}
          <Card className="border-[#EEF1F6] shadow-none">
            <CardHeader className="pb-2">
              <div className="text-lg font-bold tracking-tight text-[#111827]">
                Statistics
                </div>
              </CardHeader>
            <CardContent className="pt-2">
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats} margin={{ left: 6, right: 6, top: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="depositFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3AD6B0" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#3AD6B0" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#EEF1F6" strokeDasharray="4 4" />
                    <XAxis
                      dataKey="x"
                      tick={{ fill: "#A0A7B4", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#A0A7B4", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: 12,
                        border: "1px solid #EEF1F6",
                        boxShadow: "0 12px 30px rgba(25,55,99,0.10)",
                      }} 
                    />
                    <Area
                      type="monotone"
                      dataKey="deposit"
                      stroke="#3AD6B0"
                      strokeWidth={2}
                      fill="url(#depositFill)"
                      dot={{ r: 3, fill: "#3AD6B0", strokeWidth: 2, stroke: "white" }}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="spent"
                      stroke="#FF6B6B"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              </CardContent>
            </Card>

          {/* Transaction History */}
          <Card className="border-[#EEF1F6] shadow-none">
            <CardHeader className="pb-2">
              <div className="text-lg font-bold tracking-tight text-[#111827]">
                Transaction History
              </div>
              <div className="text-sm text-[#A0A7B4]">History of last 3 months</div>
              </CardHeader>
            <CardContent className="pt-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-[#A0A7B4]">Name</TableHead>
                    <TableHead className="text-[#A0A7B4]">Date</TableHead>
                    <TableHead className="text-[#A0A7B4]">Transaction ID</TableHead>
                    <TableHead className="text-[#A0A7B4]">Quantity</TableHead>
                    <TableHead className="text-right text-[#A0A7B4]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((t) => (
                    <TableRow key={t.id} className="hover:bg-[#F7F9FF]/60">
                      <TableCell className="font-medium text-[#1C2433]">{t.name}</TableCell>
                      <TableCell className="text-[#A0A7B4]">{t.date}</TableCell>
                      <TableCell className="text-[#A0A7B4]">{t.id}</TableCell>
                      <TableCell className="text-[#A0A7B4]">{t.quantity}</TableCell>
                      <TableCell className="text-right">
                        <span
                          className={cn(
                            "text-sm font-semibold",
                            t.statusTone === "good"
                              ? "text-[#3AD6B0]"
                              : "text-[#F5A524]",
                          )}
                        >
                          {t.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </CardContent>
            </Card>
          </div>

        {/* Right column */}
        <div className="space-y-6">
          <Card className="border-[#EEF1F6] shadow-none">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  className="flex items-center gap-2 text-lg font-bold tracking-tight text-[#111827]"
                >
                  My Wallet <ChevronDown className="h-4 w-4 text-[#A0A7B4]" />
                </button>
                <Button
                  variant="outline"
                  className="h-9 rounded-xl border-[#EEF1F6] text-[#A0A7B4] shadow-none"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Card
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#145B53] via-[#0B2C2B] to-[#161616] p-5 text-white">
                <div className="absolute inset-0 opacity-30">
                  <div className="absolute -left-20 -top-20 h-52 w-52 rounded-full bg-[#3AD6B0]/30 blur-2xl" />
                  <div className="absolute -bottom-20 -right-16 h-60 w-60 rounded-full bg-[#4C6FFF]/25 blur-2xl" />
                </div>
                <div className="relative">
                  <div className="text-sm opacity-90">Julie Huynh</div>
                  <div className="mt-8 text-lg font-semibold tracking-widest">
                    6582 3654 2197 ....
                  </div>
                  <div className="mt-6 flex items-end justify-between">
                    <div className="text-xs opacity-80">
                      <div>Exp</div>
                      <div className="text-sm font-semibold">06/30</div>
                        </div>
                    <div className="flex items-center gap-1">
                      <span className="h-6 w-6 rounded-full bg-[#FF6B6B]" />
                      <span className="-ml-2 h-6 w-6 rounded-full bg-[#FFB84D]" />
                            </div>
                          </div>
                          </div>
                        </div>

              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <div className="text-lg font-bold tracking-tight text-[#111827]">
                    Card Activities
                  </div>
                  <Button
                    variant="outline"
                    className="h-8 rounded-xl border-[#39D6B0]/40 bg-[#F3FFFB] px-3 text-xs font-semibold text-[#39D6B0] shadow-none hover:bg-[#F3FFFB]"
                  >
                    See All
                  </Button>
                </div>

                <div className="mt-3 divide-y divide-[#EEF1F6] rounded-2xl border border-[#EEF1F6]">
                  {activities.map((a) => (
                    <div key={a.name} className="flex items-center gap-3 px-4 py-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F7F9FF]">
                        {a.icon}
                      </div>
                      <div className="flex-1 text-sm font-medium text-[#6B7383]">
                        {a.name}
                      </div>
                      <div
                        className={cn(
                          "text-sm font-semibold",
                          a.tone === "good" ? "text-[#3AD6B0]" : "text-[#FF6B6B]",
                        )}
                      >
                        {a.amount}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#EEF1F6] shadow-none">
            <CardHeader className="pb-2">
              <div className="text-lg font-bold tracking-tight text-[#111827]">
                Account Revenue
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-start justify-between">
                <div className="relative h-[200px] w-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={revenue}
                        dataKey="value"
                        innerRadius={62}
                        outerRadius={88}
                        stroke="white"
                        strokeWidth={6}
                        startAngle={90}
                        endAngle={-270}
                      >
                        {revenue.map((r) => (
                          <Cell key={r.name} fill={r.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 grid place-items-center">
                    <div className="text-center">
                      <div className="text-xs text-[#A0A7B4]">Out of</div>
                      <div className="text-2xl font-semibold text-[#1C2433]">
                        100%
                      </div>
                    </div>
                        </div>
                    </div>
                <div className="pt-3 text-right text-sm text-[#A0A7B4]">
                  {revenue.map((r) => (
                    <div key={r.name} className="flex items-center justify-end gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: r.color }} />
                      <span>{r.name}</span>
                      <span className="w-10 text-right">{r.value}k</span>
                    </div>
                  ))}
                  </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Full-width sections */}
      <div className="mt-6 space-y-6">
        {/* Insights */}
        <Card className="border-[#EEF1F6] shadow-none">
          <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
              <div className="text-lg font-bold tracking-tight text-[#111827]">AI Insights</div>
              <Badge className="border-0 bg-[#F7F9FF] text-[#6B7383]">explainable</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.map((i) => (
              <div
                key={i.title}
                className="rounded-2xl border border-[#EEF1F6] bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="text-sm font-bold text-[#111827]">{i.title}</div>
                    <div className="mt-1 text-sm text-[#6B7383]">{i.description}</div>
                  </div>
                  <Badge
                    className={cn(
                      "border-0",
                      i.level === "high"
                        ? "bg-[#FFF5F5] text-[#FF6B6B]"
                        : i.level === "warning"
                          ? "bg-[#FFF8E8] text-[#F5A524]"
                          : "bg-[#F3FFFB] text-[#3AD6B0]",
                    )}
                  >
                    {i.level}
                  </Badge>
                </div>

                <div className="mt-3 rounded-xl bg-[#F7F9FF]/60 p-3 text-sm text-[#1C2433]">
                  <div className="font-semibold">Impact</div>
                  <div className="text-[#6B7383]">{i.impact}</div>
                </div>

                <div className="mt-3 text-xs text-[#A0A7B4]">
                  Why: {i.why.join(" • ")}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Product recommendations */}
        <Card className="border-[#EEF1F6] shadow-none">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="text-lg font-bold tracking-tight text-[#111827]">
                Recommended products
              </div>
              <Button
                variant="outline"
                className="h-9 rounded-xl border-[#EEF1F6] text-[#6B7383] shadow-none"
              >
                View all
                </Button>
            </div>
            <div className="text-sm text-[#A0A7B4]">
              Suggestions are based on spend trend + intent signals. Each item includes rationale.
              </div>
            </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {products.map((p) => (
              <div
                key={p.name}
                className="group flex h-full min-h-[360px] flex-col rounded-2xl border border-[#EEF1F6] bg-white p-5 transition-shadow hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold leading-snug text-[#1C2433]">
                      {p.name}
                    </div>
                    <div className="mt-0.5 text-xs text-[#A0A7B4]">
                      {p.category}
                    </div>
                  </div>
                  <Badge className="shrink-0 rounded-full border-0 bg-[#F3FFFB] px-3 py-1 text-xs font-semibold text-[#3AD6B0]">
                    {p.match}% match
                          </Badge>
                </div>

                <div className="mt-4 flex-1 space-y-4">
                  <div className="text-sm leading-relaxed text-[#6B7383]">
                    {p.explanation}
                  </div>

                  <div className="rounded-2xl border border-[#EEF1F6] bg-[#F7F9FF]/60 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-[#A0A7B4]">
                      Why this fits
                    </div>
                    <ul className="mt-3 space-y-2 text-sm text-[#6B7383]">
                      {p.why.map((w) => (
                        <li key={w} className="flex gap-2">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#3AD6B0]" />
                          <span>{w}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <Button className="h-11 rounded-xl bg-[#3AD6B0] text-white hover:bg-[#33C9A6]">
                    Apply
                  </Button>
                  <Button
                    variant="outline"
                    className="h-11 rounded-xl border-[#EEF1F6] text-[#6B7383] shadow-none hover:bg-[#F7F9FF]"
                  >
                    Ask AI
                  </Button>
                </div>
              </div>
            ))}
            </CardContent>
          </Card>
        </div>
    </SparkleShell>
  );
}
