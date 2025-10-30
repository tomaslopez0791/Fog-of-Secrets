import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { type HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { FogOfSecretsGame, FogOfSecretsGame__factory } from "../types";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("FogOfSecretsGame")) as FogOfSecretsGame__factory;
  const contract = (await factory.deploy()) as FogOfSecretsGame;
  const contractAddress = await contract.getAddress();
  return { contract, contractAddress };
}

async function rollUntilZone(
  contract: FogOfSecretsGame,
  contractAddress: string,
  signer: HardhatEthersSigner,
  shouldBeEncrypted: boolean,
) {
  for (let attempt = 0; attempt < 60; attempt++) {
    const tx = await contract.connect(signer).startGame();
    await tx.wait();

    const info = await contract.getPlayerInfo(signer.address);
    const [, isEncrypted] = info;
    if (isEncrypted === shouldBeEncrypted) {
      return info;
    }
  }

  throw new Error(`Unable to roll ${shouldBeEncrypted ? "encrypted" : "public"} cell after multiple attempts`);
}

describe("FogOfSecretsGame", function () {
  let signers: Signers;
  let contract: FogOfSecretsGame;
  let contractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn("FogOfSecretsGame tests require the mock FHEVM environment");
      this.skip();
    }

    ({ contract, contractAddress } = await deployFixture());
  });

  it("assigns encrypted and public positions with correct permissions", async function () {
    const hasAliceBefore = await contract.hasPlayer(signers.alice.address);
    expect(hasAliceBefore).to.eq(false);

    const encryptedInfo = await rollUntilZone(contract, contractAddress, signers.alice, true);
    const [existsEncrypted, isEncrypted, encryptedPosition, publicPositionEncrypted] = encryptedInfo;

    expect(existsEncrypted).to.eq(true);
    expect(isEncrypted).to.eq(true);
    expect(encryptedPosition).to.not.eq(ethers.ZeroHash);
    expect(publicPositionEncrypted).to.eq(0);

    const decryptedPrivate = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      encryptedPosition,
      contractAddress,
      signers.alice,
    );
    expect(Number(decryptedPrivate)).to.be.greaterThan(0);
    expect(Number(decryptedPrivate)).to.be.at.most(50);

    const encryptedBob = await contract.hasPlayer(signers.bob.address);
    expect(encryptedBob).to.eq(false);

    const publicInfo = await rollUntilZone(contract, contractAddress, signers.bob, false);
    const [existsPublic, isPublicEncrypted, publicEncryptedPosition, publicPositionClear] = publicInfo;

    expect(existsPublic).to.eq(true);
    expect(isPublicEncrypted).to.eq(false);
    expect(publicPositionClear).to.be.greaterThan(50);

    const decryptedPublic = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      publicEncryptedPosition,
      contractAddress,
      signers.bob,
    );
    expect(Number(decryptedPublic)).to.eq(publicPositionClear);
  });

  it("tracks player roster without duplicates", async function () {
    await rollUntilZone(contract, contractAddress, signers.alice, true);
    await rollUntilZone(contract, contractAddress, signers.bob, false);

    let players = await contract.getAllPlayers();
    expect(players).to.deep.equal([signers.alice.address, signers.bob.address]);
    expect(await contract.playerCount()).to.eq(2);

    // Re-roll Alice several times; player list should not change.
    for (let i = 0; i < 5; i++) {
      const tx = await contract.connect(signers.alice).startGame();
      await tx.wait();
    }

    players = await contract.getAllPlayers();
    expect(players).to.deep.equal([signers.alice.address, signers.bob.address]);
    expect(await contract.playerCount()).to.eq(2);
  });
});
