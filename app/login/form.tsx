"use client";

import { useState } from "react";

export default function FormLogin() {
  const [pin, setPin] = useState("");
  const [info, setInfo] = useState("");

  async function masuk(e: React.FormEvent) {
    e.preventDefault();
    setInfo("memeriksa…");
    const r = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    if (r.ok) {
      window.location.href = "/keuangan";
    } else {
      const j = await r.json().catch(() => ({ error: "gagal" }));
      setInfo(j.error);
      setPin("");
    }
  }

  return (
    <form onSubmit={masuk}>
      <input
        type="password"
        inputMode="numeric"
        placeholder="PIN"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        style={{ padding: 8, marginRight: 8 }}
        autoFocus
      />
      <button type="submit">Masuk</button>
      <p>{info}</p>
    </form>
  );
}
