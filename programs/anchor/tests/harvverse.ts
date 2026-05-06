import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import {
  PublicKey,
  Keypair,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { expect } from "chai";
import { createHash } from "crypto";
import { Harvverse } from "../target/types/harvverse";

const sha256 = (input: string): Buffer =>
  createHash("sha256").update(input).digest();

describe("harvverse", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Harvverse as Program<Harvverse>;
  const authority = provider.wallet.publicKey;

  const farmer = Keypair.generate();
  const partner = Keypair.generate();
  const treasury = Keypair.generate().publicKey;

  const lotIdHash = sha256("HV-HN-ZAF-L02");
  const metadataHash = sha256("HV-HN-ZAF-L02:metadata");
  const planHash = sha256("HV-HN-ZAF-L02:plan");
  const mediaManifestHash = sha256("HV-HN-ZAF-L02:media");
  const sensorManifestHash = sha256("HV-HN-ZAF-L02:sensors");
  const termsHash = sha256("HV-HN-ZAF-L02:terms");
  const settlementHash = sha256("HV-HN-ZAF-L02:settlement");
  const farmerNameHash = sha256("Carlos Mendoza");
  const farmerMetaHash = sha256("ipfs://farmer-meta");
  const partnerNameHash = sha256("Tropico Coffee");
  const partnerMetaHash = sha256("ipfs://partner-meta");

  const findPda = (seeds: Array<Buffer | Uint8Array>): PublicKey =>
    PublicKey.findProgramAddressSync(seeds, program.programId)[0];

  const configPda = findPda([Buffer.from("config")]);
  const farmerRolePda = findPda([
    Buffer.from("role"),
    farmer.publicKey.toBuffer(),
  ]);
  const partnerRolePda = findPda([
    Buffer.from("role"),
    partner.publicKey.toBuffer(),
  ]);
  const farmerProfilePda = findPda([
    Buffer.from("farmer"),
    farmer.publicKey.toBuffer(),
  ]);
  const partnerProfilePda = findPda([
    Buffer.from("partner"),
    partner.publicKey.toBuffer(),
  ]);
  const lotPda = findPda([
    Buffer.from("lot"),
    farmer.publicKey.toBuffer(),
    lotIdHash,
  ]);
  const partnershipPda = findPda([
    Buffer.from("partnership"),
    lotPda.toBuffer(),
    partner.publicKey.toBuffer(),
  ]);
  const settlementPda = findPda([
    Buffer.from("settlement"),
    partnershipPda.toBuffer(),
  ]);
  const milestonePda = (index: number): PublicKey =>
    findPda([
      Buffer.from("milestone"),
      partnershipPda.toBuffer(),
      Buffer.from([index]),
    ]);

  before(async () => {
    for (const kp of [farmer, partner]) {
      const sig = await provider.connection.requestAirdrop(
        kp.publicKey,
        5 * LAMPORTS_PER_SOL,
      );
      await provider.connection.confirmTransaction(sig, "confirmed");
    }
  });

  it("1. initialize_config", async () => {
    await program.methods
      .initializeConfig(treasury)
      .accounts({
        config: configPda,
        authority,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const config = await program.account.programConfig.fetch(configPda);
    expect(config.authority.toBase58()).to.equal(authority.toBase58());
    expect(config.treasury.toBase58()).to.equal(treasury.toBase58());
    expect(config.roleRegistrationEnabled).to.equal(true);
    expect(config.bump).to.be.greaterThan(0);
  });

  it("2. register_role as Farmer (wallet A)", async () => {
    await program.methods
      .registerRole({ farmer: {} })
      .accounts({
        userRole: farmerRolePda,
        config: configPda,
        user: farmer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([farmer])
      .rpc();

    const role = await program.account.userRole.fetch(farmerRolePda);
    expect(role.wallet.toBase58()).to.equal(farmer.publicKey.toBase58());
    expect(role.role).to.deep.equal({ farmer: {} });
    expect(role.createdAt.toNumber()).to.be.greaterThan(0);
  });

  it("3. register_role as Partner (wallet B)", async () => {
    await program.methods
      .registerRole({ partner: {} })
      .accounts({
        userRole: partnerRolePda,
        config: configPda,
        user: partner.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([partner])
      .rpc();

    const role = await program.account.userRole.fetch(partnerRolePda);
    expect(role.wallet.toBase58()).to.equal(partner.publicKey.toBase58());
    expect(role.role).to.deep.equal({ partner: {} });
  });

  it("4. duplicate register_role for wallet A fails", async () => {
    let threw = false;
    try {
      await program.methods
        .registerRole({ farmer: {} })
        .accounts({
          userRole: farmerRolePda,
          config: configPda,
          user: farmer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([farmer])
        .rpc();
    } catch {
      threw = true;
    }
    expect(threw).to.equal(true);
  });

  it("5. create_farmer_profile", async () => {
    await program.methods
      .createFarmerProfile([...farmerNameHash], [...farmerMetaHash])
      .accounts({
        farmerProfile: farmerProfilePda,
        userRole: farmerRolePda,
        farmer: farmer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([farmer])
      .rpc();

    const profile = await program.account.farmerProfile.fetch(farmerProfilePda);
    expect(profile.farmer.toBase58()).to.equal(farmer.publicKey.toBase58());
    expect(Buffer.from(profile.displayNameHash).equals(farmerNameHash)).to.equal(
      true,
    );
    expect(Buffer.from(profile.metadataUriHash).equals(farmerMetaHash)).to.equal(
      true,
    );
  });

  it("6. create_partner_profile", async () => {
    await program.methods
      .createPartnerProfile([...partnerNameHash], [...partnerMetaHash])
      .accounts({
        partnerProfile: partnerProfilePda,
        userRole: partnerRolePda,
        partner: partner.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([partner])
      .rpc();

    const profile = await program.account.partnerProfile.fetch(partnerProfilePda);
    expect(profile.partner.toBase58()).to.equal(partner.publicKey.toBase58());
    expect(
      Buffer.from(profile.displayNameHash).equals(partnerNameHash),
    ).to.equal(true);
  });

  it("7. create_lot (Zafiro demo)", async () => {
    await program.methods
      .createLot(
        [...lotIdHash],
        [...metadataHash],
        [...planHash],
        [...mediaManifestHash],
        [...sensorManifestHash],
        new BN(342500),
        6000,
        4000,
      )
      .accounts({
        lot: lotPda,
        farmerProfile: farmerProfilePda,
        userRole: farmerRolePda,
        farmer: farmer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([farmer])
      .rpc();

    const lot = await program.account.lot.fetch(lotPda);
    expect(lot.farmer.toBase58()).to.equal(farmer.publicKey.toBase58());
    expect(Buffer.from(lot.lotIdHash).equals(lotIdHash)).to.equal(true);
    expect(lot.ticketUsdcCents.toNumber()).to.equal(342500);
    expect(lot.farmerShareBps).to.equal(6000);
    expect(lot.partnerShareBps).to.equal(4000);
    expect(lot.status).to.deep.equal({ draft: {} });
    expect(lot.createdAt.toNumber()).to.equal(lot.updatedAt.toNumber());
  });

  it("8. publish_lot", async () => {
    const before = await program.account.lot.fetch(lotPda);

    await program.methods
      .publishLot()
      .accounts({
        lot: lotPda,
        userRole: farmerRolePda,
        farmer: farmer.publicKey,
      })
      .signers([farmer])
      .rpc();

    const lot = await program.account.lot.fetch(lotPda);
    expect(lot.status).to.deep.equal({ published: {} });
    expect(lot.updatedAt.toNumber()).to.be.greaterThanOrEqual(
      before.updatedAt.toNumber(),
    );
  });

  it("9. reserve_partnership", async () => {
    await program.methods
      .reservePartnership([...termsHash])
      .accounts({
        partnership: partnershipPda,
        lot: lotPda,
        partnerProfile: partnerProfilePda,
        userRole: partnerRolePda,
        partner: partner.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([partner])
      .rpc();

    const partnership = await program.account.partnership.fetch(partnershipPda);
    expect(partnership.lot.toBase58()).to.equal(lotPda.toBase58());
    expect(partnership.farmer.toBase58()).to.equal(farmer.publicKey.toBase58());
    expect(partnership.partner.toBase58()).to.equal(
      partner.publicKey.toBase58(),
    );
    expect(Buffer.from(partnership.termsHash).equals(termsHash)).to.equal(true);
    expect(partnership.ticketUsdcCents.toNumber()).to.equal(342500);
    expect(partnership.status).to.deep.equal({ reserved: {} });

    const lot = await program.account.lot.fetch(lotPda);
    expect(lot.status).to.deep.equal({ reserved: {} });
  });

  it("10. record_milestone for indices 1 through 6", async () => {
    for (let i = 1; i <= 6; i++) {
      const proofHash = sha256(`zafiro-milestone-${i}`);

      await program.methods
        .recordMilestone(i, [...proofHash])
        .accounts({
          milestone: milestonePda(i),
          partnership: partnershipPda,
          signer: farmer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([farmer])
        .rpc();

      const milestone = await program.account.milestoneReceipt.fetch(
        milestonePda(i),
      );
      expect(milestone.partnership.toBase58()).to.equal(
        partnershipPda.toBase58(),
      );
      expect(milestone.milestoneIndex).to.equal(i);
      expect(Buffer.from(milestone.proofHash).equals(proofHash)).to.equal(true);
      expect(milestone.recordedBy.toBase58()).to.equal(
        farmer.publicKey.toBase58(),
      );
      expect(milestone.recordedAt.toNumber()).to.be.greaterThan(0);
    }
  });

  it("11. record_settlement (Zafiro demo math)", async () => {
    const yieldQq = 6;
    const pricePerLbCents = 350;
    const expectedRevenue = (yieldQq * 833 * pricePerLbCents) / 10; // 174930
    const cost = 149000;
    const expectedProfit = expectedRevenue - cost; // 25930
    const expectedFarmerShare = Math.floor((expectedProfit * 60) / 100); // 15558
    const expectedPartnerShare = expectedProfit - expectedFarmerShare; // 10372

    expect(expectedRevenue).to.equal(174930);
    expect(expectedProfit).to.equal(25930);
    expect(expectedFarmerShare).to.equal(15558);
    expect(expectedPartnerShare).to.equal(10372);

    await program.methods
      .recordSettlement(
        yieldQq,
        pricePerLbCents,
        new BN(expectedRevenue),
        new BN(cost),
        new BN(expectedProfit),
        new BN(expectedFarmerShare),
        new BN(expectedPartnerShare),
        [...settlementHash],
      )
      .accounts({
        settlement: settlementPda,
        partnership: partnershipPda,
        lot: lotPda,
        signer: farmer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([farmer])
      .rpc();

    const settlement = await program.account.settlementReceipt.fetch(
      settlementPda,
    );
    expect(settlement.partnership.toBase58()).to.equal(
      partnershipPda.toBase58(),
    );
    expect(settlement.yieldQq).to.equal(6);
    expect(settlement.pricePerLbCents).to.equal(350);
    expect(settlement.revenueUsdcCents.toNumber()).to.equal(174930);
    expect(settlement.costUsdcCents.toNumber()).to.equal(149000);
    expect(settlement.profitUsdcCents.toNumber()).to.equal(25930);
    expect(settlement.farmerShareUsdcCents.toNumber()).to.equal(15558);
    expect(settlement.partnerShareUsdcCents.toNumber()).to.equal(10372);
    expect(
      Buffer.from(settlement.settlementHash).equals(settlementHash),
    ).to.equal(true);

    const partnership = await program.account.partnership.fetch(partnershipPda);
    expect(partnership.status).to.deep.equal({ settled: {} });

    const lot = await program.account.lot.fetch(lotPda);
    expect(lot.status).to.deep.equal({ settled: {} });
  });
});
