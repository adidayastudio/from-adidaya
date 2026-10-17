"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCcw, Home } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/dashboard";
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-900 p-6">
          <div className="max-w-md w-full bg-white dark:bg-neutral-800 rounded-[32px] p-8 shadow-2xl border border-neutral-200 dark:border-neutral-700 text-center space-y-6 animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-red-50 dark:bg-red-500/10 rounded-full flex items-center justify-center text-red-600 mx-auto shadow-sm border border-red-100 dark:border-red-500/20">
              <AlertCircle size={40} />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Application Error</h1>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                Something went wrong while rendering this page. This might be a temporary issue.
              </p>
            </div>

            {this.state.error && (
              <div className="p-4 bg-neutral-50 dark:bg-neutral-900/50 rounded-2xl border border-neutral-100 dark:border-neutral-700/50">
                <p className="text-[10px] font-mono text-neutral-400 break-all line-clamp-3">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-3 pt-2">
              <Button
                onClick={this.handleReset}
                className="w-full !rounded-2xl h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold"
                icon={<RefreshCcw size={18} />}
              >
                Reload Application
              </Button>
              <Button
                variant="secondary"
                onClick={this.handleGoHome}
                className="w-full !rounded-2xl h-12 font-bold"
                icon={<Home size={18} />}
              >
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
