const CrescendoNFTToken = artifacts.require("CrescendoNFTToken");

module.exports = function (deployer) {
  deployer.deploy(CrescendoNFTToken);
};