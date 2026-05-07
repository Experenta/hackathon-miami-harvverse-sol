// Debug script to check PDA generation
const { deriveLotPda } = require('./packages/solana-client/src/harvverse/pda');
const { computeManifestHash } = require('./packages/solana-client/src/harvverse/manifest');

async function debugPDA() {
  // Test values - replace with your actual values
  const farmerWallet = "YOUR_WALLET_ADDRESS_HERE"; // Replace with actual wallet
  const lotCode = "YOUR_LOT_CODE_HERE"; // Replace with actual lot code
  
  console.log("=== PDA Debug ===");
  console.log("Farmer wallet:", farmerWallet);
  console.log("Lot code:", lotCode);
  
  // Generate lot ID hash
  const lotIdHash = await computeManifestHash({
    lotCode: lotCode,
  });
  
  console.log("Lot ID hash:", Buffer.from(lotIdHash).toString('hex'));
  
  // Derive PDA
  const [lotPda, bump] = await deriveLotPda(farmerWallet, lotIdHash);
  
  console.log("Generated PDA:", lotPda);
  console.log("Bump:", bump);
  
  // Show seeds for verification
  console.log("\n=== Seeds ===");
  console.log("1. 'lot' (as bytes):", [108, 111, 116]);
  console.log("2. Farmer wallet (as Address):", farmerWallet);
  console.log("3. Lot ID hash (as bytes):", Array.from(lotIdHash));
}

debugPDA().catch(console.error);