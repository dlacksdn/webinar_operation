type ConfigShape = {
  supabaseUrl: string | null;
  supabaseAnonKey: string | null;
  adminSecret: string | null;
  appUrl: string;
};

export const config: ConfigShape = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? null,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? null,
  adminSecret: process.env.ADMIN_SECRET ?? null,
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
};

export const isConfigured = (): boolean =>
  Boolean(config.supabaseUrl && config.supabaseAnonKey);

export const verifyAdminSecret = (provided: string | undefined): boolean => {
  if (!config.adminSecret || !provided) return false;
  return provided === config.adminSecret;
};
