"use client";

import { useState } from "react";
import PageWrapper from "@/components/layout/PageWrapper";
import ExpenseSidebar from "@/components/flow/expense/ExpenseSidebar";
import { Breadcrumb } from "@/shared/ui/headers/PageHeader";
import { DollarSign, Clock, CheckCircle, AlertTriangle, TrendingUp, Building2, User, Users } from "lucide-react";
import clsx from "clsx";

// Mock Data - TEAM VIEW
const MOCK_TEAM_SUMMARY = {
  totalExpense: 125000000,
  pendingApproval: 15500000,
  paidAmount: 98500000,
  pendingCount: 12,
};

const MOCK_TEAM_TOP_PROJECTS = [
  { name: "Rumah Pak Budi - Kemang", amount: 45000000, percentage: 36 },
  { name: "Renovasi Kantor ABC", amount: 32000000, percentage: 26 },
  { name: "Villa Puncak Project", amount: 28000000, percentage: 22 },
  { name: "Gudang Industri Cikarang", amount: 12000000, percentage: 10 },
  { name: "Other Projects", amount: 8000000, percentage: 6 },
];

const MOCK_TEAM_ALERTS = [
  { type: "warning", title: "Over Budget", message: "Rumah Pak Budi exceeded budget by 12%" },
  { type: "info", title: "Pending Too Long", message: "3 reimbursements pending for more than 7 days" },
  { type: "warning", title: "Large Expense", message: "Rp 25,000,000 purchase order awaiting approval" },
];

// Mock Data - PERSONAL VIEW
const MOCK_PERSONAL_SUMMARY = {
  totalExpense: 3500000,
  pendingApproval: 850000,
  paidAmount: 2650000,
  pendingCount: 2,
};

const MOCK_PERSONAL_EXPENSES = [
  { date: "2025-01-05", project: "Rumah Pak Budi", type: "Transport", amount: 150000, status: "Paid" },
  { date: "2025-01-04", project: "Villa Puncak", type: "Meals", amount: 85000, status: "Paid" },
  { date: "2025-01-03", project: "Rumah Pak Budi", type: "Materials", amount: 450000, status: "Pending" },
  { date: "2025-01-02", project: "Renovasi Kantor", type: "Transport", amount: 200000, status: "Pending" },
];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function SummaryCard({ icon, iconBg, label, value, subtext }: { icon: React.ReactNode; iconBg: string; label: string; value: string; subtext?: string }) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-5 hover:border-red-200 transition-colors group">
      <div className="flex items-start justify-between mb-3">
        <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center", iconBg)}>
          {icon}
        </div>
      </div>
      <div className="text-sm font-medium text-neutral-500 mb-1">{label}</div>
      <div className="text-2xl font-bold text-neutral-900 tracking-tight">{value}</div>
      {subtext && <div className="text-xs text-neutral-400 mt-1">{subtext}</div>}
    </div>
  );
}

function TopProjectRow({ name, amount, percentage, rank }: { name: string; amount: number; percentage: number; rank: number }) {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-neutral-100 last:border-0">
      <div className="w-6 h-6 rounded-full bg-neutral-100 text-neutral-600 text-xs font-bold flex items-center justify-center">
        {rank}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-neutral-900 truncate">{name}</div>
        <div className="text-sm text-neutral-500">{formatCurrency(amount)}</div>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-24 h-2 bg-neutral-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-red-500 rounded-full transition-all"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-sm font-medium text-neutral-600 w-10 text-right">{percentage}%</span>
      </div>
    </div>
  );
}

function AlertItem({ type, title, message }: { type: string; title: string; message: string }) {
  const isWarning = type === "warning";
  return (
    <div className={clsx(
      "flex items-start gap-3 p-4 rounded-xl border",
      isWarning ? "bg-orange-50 border-orange-200" : "bg-blue-50 border-blue-200"
    )}>
      <div className={clsx(
        "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
        isWarning ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-600"
      )}>
        <AlertTriangle className="w-4 h-4" />
      </div>
      <div>
        <div className={clsx("font-medium text-sm", isWarning ? "text-orange-900" : "text-blue-900")}>{title}</div>
        <div className={clsx("text-sm mt-0.5", isWarning ? "text-orange-700" : "text-blue-700")}>{message}</div>
      </div>
    </div>
  );
}

function PersonalExpenseRow({ date, project, type, amount, status }: { date: string; project: string; type: string; amount: number; status: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-neutral-100 last:border-0">
      <div className="flex-1">
        <div className="font-medium text-neutral-900">{type}</div>
        <div className="text-sm text-neutral-500">{project} · {date}</div>
      </div>
      <div className="text-right">
        <div className="font-medium text-neutral-900">{formatCurrency(amount)}</div>
        <span className={clsx(
          "text-xs font-medium px-2 py-0.5 rounded-full",
          status === "Paid" ? "bg-green-50 text-green-700" : "bg-orange-50 text-orange-700"
        )}>
          {status}
        </span>
      </div>
    </div>
  );
}

export default function ExpenseOverviewPage() {
  const [viewMode, setViewMode] = useState<"personal" | "team">("team");
  const currentMonth = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const summary = viewMode === "team" ? MOCK_TEAM_SUMMARY : MOCK_PERSONAL_SUMMARY;

  return (
    <div className="min-h-screen bg-neutral-50 p-6">
      <Breadcrumb
        items={[
          { label: "Flow" },
          { label: "Expense" },
          { label: "Overview" },
        ]}
      />

      <PageWrapper sidebar={<ExpenseSidebar />}>
        <div className="space-y-8 w-full animate-in fade-in duration-500">
          {/* HEADER */}
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-neutral-900">Expense Overview</h1>
                <p className="text-sm text-neutral-500 mt-1">Dashboard for expense monitoring, approvals, and global summaries.</p>
              </div>

              {/* VIEW MODE TOGGLE */}
              <div className="flex items-center bg-neutral-100 rounded-full p-1 self-start md:self-auto">
                <button
                  onClick={() => setViewMode("personal")}
                  className={clsx(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
                    viewMode === "personal" ? "bg-white shadow text-neutral-900" : "text-neutral-500 hover:text-neutral-700"
                  )}
                >
                  <User className="w-4 h-4" /> Personal
                </button>
                <button
                  onClick={() => setViewMode("team")}
                  className={clsx(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
                    viewMode === "team" ? "bg-white shadow text-neutral-900" : "text-neutral-500 hover:text-neutral-700"
                  )}
                >
                  <Users className="w-4 h-4" /> Team
                </button>
              </div>
            </div>
            <div className="border-b border-neutral-200" />
          </div>

          {/* SUMMARY CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard
              icon={<DollarSign className="w-5 h-5 text-red-600" />}
              iconBg="bg-red-50"
              label={viewMode === "team" ? "Total Expense" : "My Expenses"}
              value={formatCurrency(summary.totalExpense)}
              subtext={currentMonth}
            />
            <SummaryCard
              icon={<Clock className="w-5 h-5 text-orange-600" />}
              iconBg="bg-orange-50"
              label="Pending Approval"
              value={formatCurrency(summary.pendingApproval)}
              subtext={`${summary.pendingCount} items waiting`}
            />
            <SummaryCard
              icon={<CheckCircle className="w-5 h-5 text-green-600" />}
              iconBg="bg-green-50"
              label="Paid Amount"
              value={formatCurrency(summary.paidAmount)}
              subtext="Completed payments"
            />
            <SummaryCard
              icon={<TrendingUp className="w-5 h-5 text-blue-600" />}
              iconBg="bg-blue-50"
              label={viewMode === "team" ? "Budget Utilization" : "Monthly Limit"}
              value={viewMode === "team" ? "78%" : "35%"}
              subtext={viewMode === "team" ? "Of monthly budget" : "Of Rp 10,000,000"}
            />
          </div>

          {/* CONDITIONAL CONTENT */}
          {viewMode === "team" ? (
            /* TEAM VIEW */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* TOP SPENDING PROJECTS */}
              <div className="bg-white rounded-xl border border-neutral-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="w-5 h-5 text-neutral-400" />
                  <h3 className="font-semibold text-neutral-900">Top Spending Projects</h3>
                </div>
                <div>
                  {MOCK_TEAM_TOP_PROJECTS.map((project, idx) => (
                    <TopProjectRow
                      key={project.name}
                      name={project.name}
                      amount={project.amount}
                      percentage={project.percentage}
                      rank={idx + 1}
                    />
                  ))}
                </div>
              </div>

              {/* ALERTS */}
              <div className="bg-white rounded-xl border border-neutral-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-5 h-5 text-neutral-400" />
                  <h3 className="font-semibold text-neutral-900">Alerts</h3>
                  <span className="ml-auto text-xs font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                    {MOCK_TEAM_ALERTS.length} active
                  </span>
                </div>
                <div className="space-y-3">
                  {MOCK_TEAM_ALERTS.map((alert, idx) => (
                    <AlertItem
                      key={idx}
                      type={alert.type}
                      title={alert.title}
                      message={alert.message}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* PERSONAL VIEW */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* MY RECENT EXPENSES */}
              <div className="bg-white rounded-xl border border-neutral-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign className="w-5 h-5 text-neutral-400" />
                  <h3 className="font-semibold text-neutral-900">My Recent Expenses</h3>
                </div>
                <div>
                  {MOCK_PERSONAL_EXPENSES.map((expense, idx) => (
                    <PersonalExpenseRow
                      key={idx}
                      date={expense.date}
                      project={expense.project}
                      type={expense.type}
                      amount={expense.amount}
                      status={expense.status}
                    />
                  ))}
                </div>
              </div>

              {/* MONTHLY BREAKDOWN */}
              <div className="bg-white rounded-xl border border-neutral-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-neutral-400" />
                  <h3 className="font-semibold text-neutral-900">Monthly Breakdown</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-neutral-100">
                    <span className="text-neutral-600">Transport</span>
                    <span className="font-medium text-neutral-900">{formatCurrency(1200000)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-neutral-100">
                    <span className="text-neutral-600">Meals</span>
                    <span className="font-medium text-neutral-900">{formatCurrency(850000)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-neutral-100">
                    <span className="text-neutral-600">Materials</span>
                    <span className="font-medium text-neutral-900">{formatCurrency(1450000)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 font-semibold">
                    <span className="text-neutral-900">Total</span>
                    <span className="text-neutral-900">{formatCurrency(3500000)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </PageWrapper>
    </div>
  );
}
