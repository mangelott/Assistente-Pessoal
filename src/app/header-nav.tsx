"use client";

import { useRouter } from "next/navigation";

export function HeaderNav({ email }: { email: string }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
      <span className="font-semibold">Assistente Pessoal</span>
      <div className="flex items-center gap-3 text-sm text-gray-600">
        <span>{email}</span>
        <button
          onClick={handleLogout}
          className="rounded-md border border-gray-300 px-3 py-1 hover:bg-gray-100"
        >
          Sair
        </button>
      </div>
    </header>
  );
}
