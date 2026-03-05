export default async function handler(req, res) {
  res.status(200).json({
    ok: true,
    hasUrl: !!process.env.SUPABASE_URL,
    urlStart: (process.env.SUPABASE_URL || "").slice(0, 20),
    keyLen: (process.env.SUPABASE_SERVICE_ROLE_KEY || "").length
  });
}
