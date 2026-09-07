// infra/github — satu-satunya pintu ke GitHub API.
// Semua baca/tulis repo lewat sini (Contents API + fetch native, tanpa dep).

export const VAULT_REPO = process.env.GITHUB_REPO || "leonatoni372-gif/alter-brain";
export const APP_REPO = process.env.APP_REPO || "leonatoni372-gif/agen-keuangan";
const TOKEN = () => process.env.GITHUB_TOKEN || "";
export const tokenGithub = () => TOKEN();
export const adaTokenGithub = () => TOKEN() !== "";

const urlIsi = (repo: string, p: string) =>
  `https://api.github.com/repos/${repo}/contents/${encodeURIComponent(p).replace(/%2F/g, "/")}`;

const head = () => ({
  Authorization: `Bearer ${TOKEN()}`,
  Accept: "application/vnd.github+json",
});

export async function githubGet(
  pathInRepo: string,
  repo = VAULT_REPO,
  ref?: string
): Promise<{ sha: string; content: string } | null> {
  const r = await fetch(urlIsi(repo, pathInRepo) + (ref ? `?ref=${ref}` : ""), { headers: head() });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`github GET ${r.status}`);
  const j = (await r.json()) as { sha: string; content?: string };
  const content = j.content ? Buffer.from(j.content.replace(/\n/g, ""), "base64").toString("utf8") : "";
  return { sha: j.sha, content };
}

export async function pushKeGithub(
  pathInRepo: string,
  content: string,
  message: string,
  repo = VAULT_REPO
): Promise<"created" | "updated"> {
  const cur = await githubGet(pathInRepo, repo).catch(() => null);
  const body: Record<string, unknown> = {
    message,
    content: Buffer.from(content, "utf8").toString("base64"),
    ...(cur ? { sha: cur.sha } : {}),
  };
  const r = await fetch(urlIsi(repo, pathInRepo), {
    method: "PUT",
    headers: { ...head(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`github PUT ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return cur ? "updated" : "created";
}

// Tulis baca-ubah-tulis + 1x retry kalau sha basi (tulis barengan).
// branch opsional: dibuat otomatis saat belum ada (mis. "log" khusus data).
export async function ubahGithub<T>(
  repo: string,
  pathInRepo: string,
  message: string,
  fn: (cur: T | null) => T,
  branch?: string
): Promise<T> {
  for (let i = 0; i < 2; i++) {
    const cur = await githubGet(pathInRepo, repo, branch).catch(() => null);
    const next = fn(cur ? (JSON.parse(cur.content) as T) : null);
    try {
      const body: Record<string, unknown> = {
        message,
        content: Buffer.from(JSON.stringify(next), "utf8").toString("base64"),
        ...(cur ? { sha: cur.sha } : {}),
        ...(branch ? { branch } : {}),
      };
      const r = await fetch(urlIsi(repo, pathInRepo), {
        method: "PUT",
        headers: { ...head(), "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (r.status === 409 || r.status === 422) continue; // sha basi, coba sekali lagi
      if (!r.ok) throw new Error(`github PUT ${r.status}`);
      return next;
    } catch (e) {
      if (i === 1) throw e;
    }
  }
  throw new Error("github tulis gagal setelah retry");
}

// Daftar file .md langsung di dalam folder repo (tanpa rekursi).
export async function daftarMd(repo: string, dir: string): Promise<string[]> {
  const r = await fetch(urlIsi(repo, dir), { headers: head() });
  if (!r.ok) return [];
  const j = (await r.json()) as { name: string; type: string }[] | { message: string };
  if (!Array.isArray(j)) return [];
  return j.filter((x) => x.type === "file" && x.name.endsWith(".md")).map((x) => `${dir}/${x.name}`);
}
