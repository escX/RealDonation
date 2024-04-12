const { expect, assert } = require("chai")
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers")
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs")
const { watchActionAsync } = require("./helper")

const strLen0 = ''
const strLen65 = 'a'.repeat(65)
const strLen257 = 'a'.repeat(257)
const strLen1025 = 'a'.repeat(1025)

const strName = 'Project Name'
const strDescription = 'Project Description'
const strDescriptionModified = 'Project Description Modified'
const strMessage = 'Donator Message'

const AmountZero = 0

const donateAmount1 = 100
const donateAmount2 = 200

async function deployFixture() {
  const [deployer, creator, donator, ...others] = await ethers.getSigners()
  const contract = await ethers.deployContract("RealDonation", [], deployer)

  return { contract, creator, donator, others }
}

async function createFixtrue() {
  const { contract, creator, donator, others } = await loadFixture(deployFixture)

  const listener = async function (resolve) {
    await contract.once("Create", function (...data) {
      resolve(data[0])
    })
  }

  const action = async function () {
    await contract.connect(creator).create(strName, strDescription)
  }

  const [projectHash] = await watchActionAsync([listener], action)

  return { contract, creator, donator, others, projectHash }
}

describe("RealDonation Contract", function () {
  describe("getProject", function () {
    it("根据项目哈希，获取正确的项目名称和创建者", async function () {
      const { contract, creator, projectHash } = await loadFixture(createFixtrue)

      const project = await contract.getProject(projectHash)

      assert.equal(project[1], creator.address)
      assert.equal(project[2], strName)
    })
  })

  describe("getDonated", function () {
    it("对同一个项目进行两次捐赠，获取到捐赠总额等于两次捐赠之和", async function () {
      const { contract, donator, projectHash } = await loadFixture(createFixtrue)

      await contract.connect(donator).donate(projectHash, strMessage, { value: donateAmount1 })
      await contract.connect(donator).donate(projectHash, strMessage, { value: donateAmount2 })

      expect(await contract.getDonated(donator.address, projectHash))
        .to.be.equal(donateAmount1 + donateAmount2)
    })
  })

  describe("create", function () {
    it("校验项目名称长度1-64字节", async function () {
      const { contract, creator } = await loadFixture(deployFixture)

      await expect(contract.connect(creator).create(strLen0, strDescription))
        .to.be.revertedWithCustomError(contract, "IncorrectStringFormat")
        .withArgs(strLen0)

      await expect(contract.connect(creator).create(strLen65, strDescription))
        .to.be.revertedWithCustomError(contract, "IncorrectStringFormat")
        .withArgs(strLen65)
    })

    it("校验项目描述长度0-1024字节", async function () {
      const { contract, creator } = await loadFixture(deployFixture)

      await expect(contract.connect(creator).create(strName, strLen1025))
        .to.be.revertedWithCustomError(contract, "IncorrectStringFormat")
        .withArgs(strLen1025)
    })

    it("触发事件`Create`", async function () {
      const { contract, creator } = await loadFixture(deployFixture)

      await expect(contract.connect(creator).create(strName, strDescription))
        .to.emit(contract, "Create")
        .withArgs(anyValue, creator.address, strName, strDescription, anyValue)
    })
  })

  describe("modifyDescription", function () {
    it("校验调用者应该是项目创建者", async function () {
      const { contract, others, projectHash } = await loadFixture(createFixtrue)

      await expect(contract.connect(others[0]).modifyDescription(projectHash, strDescriptionModified))
        .to.be.revertedWithCustomError(contract, "IllegalCaller")
        .withArgs(others[0].address)
    })

    it("校验项目描述长度0-1024字节", async function () {
      const { contract, creator, projectHash } = await loadFixture(createFixtrue)

      await expect(contract.connect(creator).modifyDescription(projectHash, strLen1025))
        .to.be.revertedWithCustomError(contract, "IncorrectStringFormat")
        .withArgs(strLen1025)
    })

    it("触发事件`ModifyDescription`", async function () {
      const { contract, creator, projectHash } = await loadFixture(createFixtrue)

      await expect(contract.connect(creator).modifyDescription(projectHash, strDescriptionModified))
        .to.emit(contract, "ModifyDescription")
        .withArgs(projectHash, strDescriptionModified, anyValue)
    })
  })

  describe("cease", function () {
    it("校验调用者应该是项目创建者", async function () {
      const { contract, others, projectHash } = await loadFixture(createFixtrue)

      await expect(contract.connect(others[0]).cease(projectHash))
        .to.be.revertedWithCustomError(contract, "IllegalCaller")
        .withArgs(others[0].address)
    })

    it("终止项目后，项目数据应被清空", async function () {
      const { contract, creator, projectHash } = await loadFixture(createFixtrue)

      await contract.connect(creator).cease(projectHash)

      expect(await contract.getProject(projectHash))
        .to.deep.equal([ethers.ZeroHash, ethers.ZeroAddress, "", 0])
    })

    it("触发事件`Cease`", async function () {
      const { contract, creator, projectHash } = await loadFixture(createFixtrue)

      await expect(contract.connect(creator).cease(projectHash))
        .to.emit(contract, "Cease")
        .withArgs(projectHash, anyValue)
    })
  })

  describe("donate", function () {
    it("校验项目存在", async function () {
      const { contract, donator } = await loadFixture(createFixtrue)

      await expect(contract.connect(donator).donate(ethers.ZeroHash, strMessage, { value: donateAmount1 }))
        .to.be.revertedWithCustomError(contract, "ProjectExisted")
        .withArgs(ethers.ZeroHash)
    })

    it("校验捐赠者不是项目创建者", async function () {
      const { contract, creator, projectHash } = await loadFixture(createFixtrue)

      await expect(contract.connect(creator).donate(projectHash, strMessage, { value: donateAmount1 }))
        .to.be.revertedWithCustomError(contract, "IllegalCaller")
        .withArgs(creator.address)
    })

    it("校验捐赠金额大于0", async function () {
      const { contract, donator, projectHash } = await loadFixture(createFixtrue)

      await expect(contract.connect(donator).donate(projectHash, strMessage, { value: AmountZero }))
        .to.be.revertedWithCustomError(contract, "InsufficientFunds")
        .withArgs(AmountZero)
    })

    it("校验留言长度0-256字节", async function () {
      const { contract, donator, projectHash } = await loadFixture(createFixtrue)

      await expect(contract.connect(donator).donate(projectHash, strLen257, { value: donateAmount1 }))
        .to.be.revertedWithCustomError(contract, "IncorrectStringFormat")
        .withArgs(strLen257)
    })

    it("捐赠后项目创建者余额增加", async function () {
      const { contract, creator, donator, projectHash } = await loadFixture(createFixtrue)

      await expect(contract.connect(donator).donate(projectHash, strMessage, { value: donateAmount1 }))
        .to.changeEtherBalances([donator.address, creator.address], [-donateAmount1, donateAmount1])
    })

    it("触发事件`Donate`", async function () {
      const { contract, donator, projectHash } = await loadFixture(createFixtrue)
      const project = await contract.getProject(projectHash)

      await expect(contract.connect(donator).donate(projectHash, strMessage, { value: donateAmount1 }))
        .to.emit(contract, "Donate")
        .withArgs(projectHash, donator.address, project[1], project[2], donateAmount1, strMessage, anyValue)
    })
  })
})
