const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("local", (m) => {
  const RealDonation = m.contract("RealDonation");

  return { RealDonation };
});
