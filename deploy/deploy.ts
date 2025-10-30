import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedGame = await deploy("FogOfSecretsGame", {
    from: deployer,
    log: true,
  });

  console.log(`FogOfSecretsGame contract: `, deployedGame.address);
};
export default func;
func.id = "deploy_fog_of_secrets"; // id required to prevent reexecution
func.tags = ["FogOfSecretsGame"];
