/** @type import('hardhat/config').HardhatUserConfig */
require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-chai-matchers");
require("@nomicfoundation/hardhat-ignition-ethers");
require("@nomicfoundation/hardhat-verify");
require("hardhat-gas-reporter");
require('solidity-coverage');
require("dotenv").config();

const { REPORT_GAS } = process.env;

module.exports = {
  solidity: "0.8.24",
  network: {},
  gasReporter: {
    enabled: REPORT_GAS === "1" ? true : false
  },
  mocha: {
    timeout: 10000
  }
};
