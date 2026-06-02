import * as fs from 'fs';
import * as path from 'path';

// ─── Mount map (mirrors apps/backend/src/app.ts) ──────────────────────────────
const MOUNT_MAP: Record<string, string> = {
  'auth.routes.ts':         '/api/auth',
  'patient.routes.ts':      '/api/patient',
  'doctor.routes.ts':       '/api/doctor',
  'nurse.routes.ts':        '/api/nurse',
  'receptionist.routes.ts': '/api/receptionist',
  'pharmacist.routes.ts':   '/api/pharmacy',
  'inventory.routes.ts':    '/api/inventory',
  'lab.routes.ts':          '/api/lab',
  'radiology.routes.ts':    '/api/radiology',
  'cashier.routes.ts':      '/api/cashier',
  'admin.routes.ts':        '/api/admin',
  'notification.routes.ts': '/api/notifications',
  'upload.routes.ts':       '/api/upload',
  'settings.routes.ts':     '/api/settings',
};

interface RouteEntry {
  method: string;
  path: string;
  source: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function normalizePath(p: string): string {
  return p
    .replace(/\?.*$/, '')                               // strip query string
    .replace(/:[a-zA-Z_][a-zA-Z0-9_]*/g, ':param')     // normalize :id → :param
    .replace(/\/+$/, '')                                // strip trailing slash
    .replace(/\/+/g, '/');                              // collapse duplicate slashes
}

function shouldIgnore(fullPath: string): boolean {
  if (fullPath === '/api/auth/google' || fullPath === '/api/auth/google/callback') return true;
  if (fullPath.endsWith('/instructions-pdf')) return true;
  if (fullPath.includes('/export/')) return true;
  // staff.service.ts dispatches GET/PUT /${role}/profile via a roleToPath lookup table.
  // The script sees /:param/profile because the role variable can't be statically resolved,
  // but every role route (doctor, nurse, cashier, etc.) has its own /profile endpoint in BE.
  if (/^\/api\/:param\/profile$/.test(fullPath)) return true;
  return false;
}

// ─── Backend extraction ────────────────────────────────────────────────────────
function extractBackendRoutes(routesDir: string): RouteEntry[] {
  const routes: RouteEntry[] = [];
  const files = fs.readdirSync(routesDir).filter((f) => f.endsWith('.routes.ts'));

  for (const file of files) {
    const prefix = MOUNT_MAP[file];
    if (!prefix) {
      process.stderr.write(`  [WARN] No mount prefix for ${file} — skipping\n`);
      continue;
    }
    const content = fs.readFileSync(path.join(routesDir, file), 'utf-8');
    const re = /router\.(get|post|put|patch|delete)\s*\(\s*['"]([^'"]+)['"]/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      const method = m[1].toLowerCase();
      const full = normalizePath(prefix + m[2]);
      if (!shouldIgnore(full)) {
        routes.push({ method, path: full, source: file });
      }
    }
  }
  return routes;
}

// ─── Frontend extraction ───────────────────────────────────────────────────────
function extractFrontendCalls(servicesDir: string): { parsed: RouteEntry[]; unparseable: string[] } {
  const parsed: RouteEntry[] = [];
  const unparseable: string[] = [];

  const files = fs.readdirSync(servicesDir).filter(
    (f) => f.endsWith('.service.ts') && f !== 'api.client.ts' && f !== 'socket.client.ts',
  );

  for (const file of files) {
    const content = fs.readFileSync(path.join(servicesDir, file), 'utf-8');

    // ── String literal paths ──────────────────────────────────────────────────
    // Handles optional generic type params between method name and opening paren
    const strRe = /apiClient\.(get|post|put|patch|delete)[^(\n]*\(\s*['"]([^'"]+)['"]/g;
    let m: RegExpExecArray | null;
    while ((m = strRe.exec(content)) !== null) {
      const method = m[1].toLowerCase();
      const full = normalizePath('/api' + m[2]);
      if (!shouldIgnore(full)) {
        parsed.push({ method, path: full, source: file });
      }
    }

    // ── Template literal paths ────────────────────────────────────────────────
    // [^`]+ stops at first inner backtick (nested template literal guard)
    const tmplRe = /apiClient\.(get|post|put|patch|delete)[^(\n]*\(\s*`([^`]+)`/g;
    while ((m = tmplRe.exec(content)) !== null) {
      const method = m[1].toLowerCase();
      const raw = m[2];

      // Replace /${expr} (slash-prefixed = path segment) with /:param
      let normalized = raw.replace(/\/\$\{[^`}]*\}/g, '/:param');
      // Remove ${expr} without leading slash (query string or suffix variable)
      normalized = normalized.replace(/\$\{[^`}]*\}/g, '');
      // Strip query string
      normalized = normalized.split('?')[0];

      if (normalized.includes('${')) {
        // Complex expression (e.g. ternary, nested template) — extract static prefix
        const prefix = normalized.split('${')[0];
        unparseable.push(`${file}: ${method.toUpperCase()} \`${raw.substring(0, 80)}\``);
        if (prefix.length > 1) {
          const full = normalizePath('/api' + prefix);
          if (!shouldIgnore(full)) {
            parsed.push({ method, path: full, source: `${file} [partial]` });
          }
        }
      } else {
        const full = normalizePath('/api' + normalized);
        if (!shouldIgnore(full)) {
          parsed.push({ method, path: full, source: file });
        }
      }
    }
  }

  return { parsed, unparseable };
}

// ─── Main ──────────────────────────────────────────────────────────────────────
function main(): void {
  const rootDir     = path.resolve(__dirname, '..', '..', '..');
  const routesDir   = path.join(rootDir, 'apps', 'backend',  'src', 'routes');
  const servicesDir = path.join(rootDir, 'apps', 'frontend', 'src', 'services');
  const outputPath  = path.join(rootDir, '.claude', 'route-diff-report.txt');

  process.stdout.write('🔍 Extracting backend routes...\n');
  const backendRoutes = extractBackendRoutes(routesDir);
  process.stdout.write(`   Found ${backendRoutes.length} routes\n`);

  process.stdout.write('🔍 Extracting frontend service calls...\n');
  const { parsed: frontendCalls, unparseable } = extractFrontendCalls(servicesDir);
  process.stdout.write(`   Found ${frontendCalls.length} calls (${unparseable.length} unparseable)\n\n`);

  // ── Build lookup maps ──────────────────────────────────────────────────────
  const backendMap = new Map<string, RouteEntry>();
  for (const r of backendRoutes) {
    backendMap.set(`${r.method}:${r.path}`, r);
  }

  const frontendMap = new Map<string, RouteEntry>();
  for (const r of frontendCalls) {
    const key = `${r.method}:${r.path}`;
    if (!frontendMap.has(key)) frontendMap.set(key, r); // first occurrence wins
  }

  // ── Diff ───────────────────────────────────────────────────────────────────
  const matched: Array<{ key: string; fe: RouteEntry; be: RouteEntry }> = [];
  const feOnly:  RouteEntry[] = [];
  const beOnly:  RouteEntry[] = [];

  for (const [key, fe] of frontendMap) {
    if (backendMap.has(key)) {
      matched.push({ key, fe, be: backendMap.get(key)! });
    } else {
      feOnly.push(fe);
    }
  }
  for (const [key, be] of backendMap) {
    if (!frontendMap.has(key)) beOnly.push(be);
  }

  // ── Report ─────────────────────────────────────────────────────────────────
  const hr = '─'.repeat(64);
  const lines: string[] = [];

  lines.push(`Route-Diff Report — ${new Date().toISOString()}`);
  lines.push(hr);
  lines.push(`Backend routes:  ${backendRoutes.length}`);
  lines.push(`Frontend calls:  ${frontendCalls.length} parsed, ${unparseable.length} unparseable`);
  lines.push('');

  if (feOnly.length > 0) {
    lines.push(`❌  FE CALLS WITH NO MATCHING BACKEND ROUTE  (${feOnly.length})`);
    lines.push(hr);
    for (const r of feOnly.sort((a, b) => `${a.method}${a.path}`.localeCompare(`${b.method}${b.path}`))) {
      lines.push(`  ${r.method.toUpperCase().padEnd(7)} ${r.path}  [${r.source}]`);
    }
    lines.push('');
  } else {
    lines.push('❌  FE CALLS WITH NO MATCHING BACKEND ROUTE — none ✓');
    lines.push('');
  }

  if (beOnly.length > 0) {
    lines.push(`⚠️   BACKEND ROUTES NOTHING CALLS  (${beOnly.length})`);
    lines.push(hr);
    for (const r of beOnly.sort((a, b) => `${a.method}${a.path}`.localeCompare(`${b.method}${b.path}`))) {
      lines.push(`  ${r.method.toUpperCase().padEnd(7)} ${r.path}  [${r.source}]`);
    }
    lines.push('');
  }

  lines.push(`✅  MATCHED  (${matched.length})`);
  lines.push(hr);
  for (const { key } of matched.sort((a, b) => a.key.localeCompare(b.key))) {
    const colonIdx = key.indexOf(':');
    const method = key.substring(0, colonIdx);
    const p = key.substring(colonIdx + 1);
    lines.push(`  ${method.toUpperCase().padEnd(7)} ${p}`);
  }
  lines.push('');

  if (unparseable.length > 0) {
    lines.push(`⚠️   UNPARSEABLE TEMPLATE LITERALS  (${unparseable.length})`);
    lines.push(hr);
    for (const u of unparseable) {
      lines.push(`  ${u}`);
    }
    lines.push('');
  }

  const report = lines.join('\n');
  process.stdout.write(report + '\n');

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, report, 'utf-8');
  process.stdout.write(`📄 Report saved to: ${outputPath}\n`);
}

main();
