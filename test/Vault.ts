import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Vault", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployVaultFixture() {
    // Contracts are deployed using the first signer/account by default
    const [owner, user1, user2, user3, user4, user5] =
      await ethers.getSigners();

    const AnyToken = await ethers.getContractFactory("AnyToken");
    const anyToken = await AnyToken.deploy();

    const Vault = await ethers.getContractFactory("Vault");
    const vault = await Vault.deploy(anyToken.address);

    await anyToken.mint(user1.address, 3000);
    await anyToken.mint(user2.address, 5000);
    await anyToken.mint(user3.address, 8000);
    await anyToken.mint(user4.address, 13000);
    await anyToken.mint(user5.address, 21000);

    await anyToken.connect(user1).approve(vault.address, 3000);
    await anyToken.connect(user2).approve(vault.address, 5000);
    await anyToken.connect(user3).approve(vault.address, 8000);
    await anyToken.connect(user4).approve(vault.address, 13000);
    await anyToken.connect(user5).approve(vault.address, 21000);

    return { vault, anyToken, owner, user1, user2, user3, user4, user5 };
  }

  describe("Deposit function", function () {
    it("Check if deposit function works well", async function () {
      const { vault, anyToken, user1, user2 } = await loadFixture(
        deployVaultFixture
      );

      await vault.connect(user1).deposit(1000);
      expect(await anyToken.balanceOf(vault.address)).to.equal(1000);
      expect(await anyToken.balanceOf(user1.address)).to.equal(2000);

      await vault.connect(user2).deposit(3000);
      expect(await anyToken.balanceOf(vault.address)).to.equal(4000);
      expect(await anyToken.balanceOf(user2.address)).to.equal(2000);
    });
  });

  describe("Withdraw Function", function () {
    it("Revert if user never deposited till now", async function () {
      const { vault, user1, user2, user3 } = await loadFixture(
        deployVaultFixture
      );
      await vault.connect(user1).deposit(1000);
      await vault.connect(user2).deposit(1000);
      await expect(vault.connect(user3).withdraw(1000)).to.be.revertedWith(
        "user doesn't exist"
      );
    });

    it("Revert if user doesn't have enough balance", async function () {
      const { vault, user1 } = await loadFixture(deployVaultFixture);
      await vault.connect(user1).deposit(1000);
      await expect(vault.connect(user1).withdraw(2000)).to.be.revertedWith(
        "Can't withdraw that much"
      );
    });

    it("Check if withdraw works", async function () {
      const { vault, anyToken, user1, user2, user5 } = await loadFixture(
        deployVaultFixture
      );
      await vault.connect(user1).deposit(1000);
      await vault.connect(user2).deposit(2000);

      await vault.connect(user1).withdraw(300);
      expect(await anyToken.balanceOf(vault.address)).to.equal(2700);

      await vault.connect(user2).withdraw(500);
      expect(await anyToken.balanceOf(vault.address)).to.equal(2200);
      expect(await anyToken.balanceOf(user1.address)).to.equal(2300);
      expect(await anyToken.balanceOf(user2.address)).to.equal(3500);

      await vault.connect(user5).deposit(20000);
      await vault.connect(user5).withdraw(15000);
      expect(await anyToken.balanceOf(user5.address)).to.equal(16000);
      expect(await anyToken.balanceOf(vault.address)).to.equal(7200);
    });
  });

  describe("Chceck twoWhales function", function () {
    it("Revert if less than two users", async function () {
      const { vault, user1 } = await loadFixture(deployVaultFixture);
      await vault.connect(user1).deposit(1000);
      await expect(vault.twoWhales()).to.be.revertedWith("Less than two users");
    });

    it("Return two whales", async function () {
      const { vault, user1, user2, user3, user4, user5 } = await loadFixture(
        deployVaultFixture
      );
      await vault.connect(user1).deposit(2000);
      await vault.connect(user2).deposit(1000);
      await vault.connect(user3).deposit(3000);
      await vault.connect(user4).deposit(5000);
      await vault.connect(user5).deposit(8000);

      let [whale1, whale2] = await vault.twoWhales();
      expect(whale1).to.equal(user5.address);
      expect(whale2).to.equal(user4.address);

      await vault.connect(user4).withdraw(3001);
      await vault.connect(user5).withdraw(6001);
      [whale1, whale2] = await vault.twoWhales();
      expect(whale1).to.equal(user3.address);
      expect(whale2).to.equal(user1.address);

      await vault.connect(user3).withdraw(1001);
      [whale1, whale2] = await vault.twoWhales();
      expect(whale1).to.equal(user1.address);
      expect(whale2).to.equal(user3.address);
    });
  });
});
