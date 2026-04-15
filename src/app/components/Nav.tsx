"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Capture" },
  { href: "/hints", label: "Hints" },
  { href: "/debug", label: "Debug" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-neutral-200 dark:border-neutral-800 px-6 py-3 flex gap-6 items-center bg-white dark:bg-neutral-950">
      <span className="font-semibold text-sm tracking-tight mr-4">
        Personal Assistant
      </span>
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`text-sm transition-colors ${
            pathname === link.href
              ? "text-foreground font-medium"
              : "text-neutral-500 hover:text-foreground"
          }`}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
