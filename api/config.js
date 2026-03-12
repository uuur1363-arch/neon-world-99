export const runtime = "nodejs";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({
        ok: false,
        error: "GET only"
      });
    }

    const treasuryWallet = String(process.env.TREASURY_WALLET || "").trim();
    const entrySol = Number(process.env.ENTRY_SOL || 0.01);
    const passHours = Number(process.env.PASS_HOURS || 24);

    if (!treasuryWallet) {
      return res.status(500).json({
        ok: false,
        error: "TREASURY_WALLET missing"
      });
    }

    return res.status(200).json({
      ok: true,
      treasury_wallet: treasuryWallet,
      entry_sol: entrySol,
      pass_hours: passHours
    });

  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: String(e?.message || e)
    });
  }
}
