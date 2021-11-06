const CrescendoMarketContract = artifacts.require("CrescendoMarketContract");

module.exports = function (deployer) {
    deployer.deploy(CrescendoMarketContract);
  };