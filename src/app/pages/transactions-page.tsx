import React from "react";

import { SparkleShell } from "../components/layout/sparkle-shell";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { cn } from "../components/ui/utils";
import type { DashboardTransaction } from "../services/api";

const USER_ID = "00017496858921195E5A";

const mockTransactions: DashboardTransaction[] = [
  {
    id: "TX-1001",
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
    id: "TX-1002",
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
    id: "TX-1003",
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
    id: "TX-1004",
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
    id: "TX-1005",
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
    id: "TX-1006",
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
    id: "TX-1007",
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
  {
    id: "TX-1008",
    user_id: USER_ID,
    posted_at: "2025-03-15",
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
    id: "TX-1009",
    user_id: USER_ID,
    posted_at: "2025-03-18",
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
    id: "TX-1010",
    user_id: USER_ID,
    posted_at: "2025-03-22",
    direction: "credit",
    amount: 120,
    currency: "EUR",
    merchant_name: "Tax Refund",
    channel: "Transfer",
    category: "Refund",
    mcc: 9311,
    isin: "ISIN0030",
    installment: null,
  },
];

function formatMoney(n: number, currency: string = "EUR") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);
}

export function TransactionsPage() {
  const [monthFilter, setMonthFilter] = React.useState<string>("all");
  const [typeFilter, setTypeFilter] = React.useState<string>("all");

  const rows = React.useMemo(() => {
    return mockTransactions.filter((t) => {
      const month = t.posted_at.slice(0, 7); // YYYY-MM
      if (monthFilter !== "all" && month !== monthFilter) return false;
      if (typeFilter === "income" && t.direction !== "credit") return false;
      if (typeFilter === "expense" && t.direction !== "debit") return false;
      return true;
    });
  }, [monthFilter, typeFilter]);

  return (
    <SparkleShell greeting="Transactions">
      <Card className="border-[#EEF1F6] shadow-none">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-xl font-bold tracking-tight text-[#111827]">Transactions</div>
              <div className="text-sm text-[#6B7383]">
                Recent account activity for the last few months (mock data).
              </div>
            </div>
            <div className="flex gap-3">
              <Select value={monthFilter} onValueChange={setMonthFilter}>
                <SelectTrigger className="h-9 w-[130px] rounded-xl border-[#EEF1F6] bg-white text-xs text-[#6B7383] shadow-none">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All months</SelectItem>
                  <SelectItem value="2025-03">Mar 2025</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-9 w-[140px] rounded-xl border-[#EEF1F6] bg-white text-xs text-[#6B7383] shadow-none">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expenses</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[#A0A7B4]">Date</TableHead>
                <TableHead className="text-[#A0A7B4]">Description</TableHead>
                <TableHead className="text-[#A0A7B4]">Category</TableHead>
                <TableHead className="text-[#A0A7B4]">Channel</TableHead>
                <TableHead className="text-right text-[#A0A7B4]">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((t) => {
                const dateText = new Date(t.posted_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "2-digit",
                  year: "numeric",
                });
                const isCredit = t.direction === "credit";
                return (
                  <TableRow key={t.id} className="hover:bg-[#F7F9FF]/60">
                    <TableCell className="text-[#6B7383]">{dateText}</TableCell>
                    <TableCell className="font-medium text-[#1C2433]">
                      {t.merchant_name || "Transaction"}
                    </TableCell>
                    <TableCell className="text-[#6B7383]">{t.category}</TableCell>
                    <TableCell className="text-[#6B7383]">{t.channel}</TableCell>
                    <TableCell
                      className={cn(
                        "text-right text-sm font-semibold",
                        isCredit ? "text-[#3AD6B0]" : "text-[#FF6B6B]",
                      )}
                    >
                      {formatMoney(Math.abs(t.amount), t.currency)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </SparkleShell>
  );
}


