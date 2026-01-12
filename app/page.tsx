import Link from "next/link";
import Image from "next/image";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center p-6 relative overflow-hidden">

      {/* Background Decoration (Subtle) */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-neutral-50 to-transparent" />
      </div>

      <div className="relative z-10 flex flex-col items-center max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in duration-700">

        {/* Logo */}
        <div className="relative w-48 h-16 md:w-56 md:h-20">
          <Image
            src="/logo-adidaya-red.svg"
            alt="Adidaya Logo"
            fill
            className="object-contain"
            priority
          />
        </div>

        {/* Text */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl sr-only">
            Adidaya Studio
          </h1>
          <p className="text-neutral-900 font-semibold tracking-tight text-lg md:text-xl">
            from: adidayastudio
          </p>
          <p className="text-neutral-500 font-medium tracking-widest uppercase text-[10px] md:text-xs">
            Operational Intelligence System
          </p>
        </div>

        {/* Login Button */}
        <div className="pt-4 w-full flex justify-center">
          <Link
            href="/login"
            className="group relative inline-flex items-center justify-center px-8 py-3 font-semibold text-white transition-all duration-200 bg-red-600 rounded-full hover:bg-red-700 hover:shadow-lg hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-600 w-full sm:w-auto"
          >
            <span className="mr-2">Login to System</span>
            <svg
              className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Footer / Copyright */}
      <div className="absolute bottom-6 text-center">
        <p className="text-[10px] text-neutral-400">
          © {new Date().getFullYear()} Adidaya Studio. All rights reserved.
        </p>
      </div>
    </main>
  );
}
