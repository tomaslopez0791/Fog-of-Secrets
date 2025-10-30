import { FhevmType } from "@fhevm/hardhat-plugin";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("task:address", "Prints the FogOfSecretsGame address").setAction(async (_taskArguments: TaskArguments, hre) => {
  const deployment = await hre.deployments.get("FogOfSecretsGame");
  console.log("FogOfSecretsGame address is " + deployment.address);
});

task("task:start-game", "Calls startGame() on FogOfSecretsGame")
  .addOptionalParam("contract", "Optionally specify the contract address to use")
  .setAction(async (taskArguments: TaskArguments, hre) => {
    const { ethers, deployments } = hre;

    const deployment = taskArguments.contract
      ? { address: taskArguments.contract as string }
      : await deployments.get("FogOfSecretsGame");

    const signer = (await ethers.getSigners())[0];
    const contract = await ethers.getContractAt("FogOfSecretsGame", deployment.address);

    const tx = await contract.connect(signer).startGame();
    console.log(`Sent startGame transaction: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`startGame confirmed in block ${receipt?.blockNumber ?? "unknown"}`);
  });

task("task:list-players", "Lists all players who joined the game")
  .addOptionalParam("contract", "Optionally specify the contract address to use")
  .setAction(async (taskArguments: TaskArguments, hre) => {
    const { deployments, ethers } = hre;
    const deployment = taskArguments.contract
      ? { address: taskArguments.contract as string }
      : await deployments.get("FogOfSecretsGame");

    const contract = await ethers.getContractAt("FogOfSecretsGame", deployment.address);
    const players = await contract.getAllPlayers();

    if (!players.length) {
      console.log("No players have joined yet.");
      return;
    }

    console.log("Players:");
    players.forEach((player: string, index: number) => {
      console.log(`${index + 1}. ${player}`);
    });
  });

task("task:player-info", "Shows a player's stored position information")
  .addParam("player", "Player address to inspect")
  .addFlag("decrypt", "Attempt to decrypt the encrypted position with the local signer")
  .addOptionalParam("contract", "Optionally specify the contract address to use")
  .setAction(async (taskArguments: TaskArguments, hre) => {
    const { deployments, ethers, fhevm } = hre;
    const deployment = taskArguments.contract
      ? { address: taskArguments.contract as string }
      : await deployments.get("FogOfSecretsGame");

    const contract = await ethers.getContractAt("FogOfSecretsGame", deployment.address);
    const [exists, isEncrypted, encryptedPosition, publicPosition] = await contract.getPlayerInfo(
      taskArguments.player as string,
    );

    console.log(`Contract     : ${deployment.address}`);
    console.log(`Player       : ${taskArguments.player}`);
    console.log(`Exists       : ${exists}`);
    console.log(`Encrypted    : ${isEncrypted}`);
    console.log(`Ciphertext   : ${encryptedPosition}`);
    console.log(`Public cell  : ${publicPosition}`);

    if (taskArguments.decrypt && isEncrypted && encryptedPosition !== ethers.ZeroHash) {
      await fhevm.initializeCLIApi();

      const signer = (await ethers.getSigners())[0];
      try {
        const decrypted = await fhevm.userDecryptEuint(
          FhevmType.euint8,
          encryptedPosition,
          deployment.address,
          signer,
        );
        console.log(`Decrypted cell: ${decrypted}`);
      } catch (error) {
        console.error("Failed to decrypt position:", error);
      }
    }
  });
