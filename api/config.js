export const runtime = "nodejs";

export default async function handler(req, res) {
  try {
    const treasuryWallet = String(process.env.TREASURY_WALLET || "").trim();

    if (!treasuryWallet) {
      return res.status(500).json({
        ok: false,
        error: "TREASURY_WALLET missing"
      });
    }

    return res.status(200).json({
      ok: true,
      treasury_wallet: treasuryWallet
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: String(e?.message || e)
    });
  }
}
