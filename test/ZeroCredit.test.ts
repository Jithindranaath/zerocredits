import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import hre from "hardhat";
import { Encryptable, FheTypes } from "@cofhe/sdk";
import { expect } from "chai";

const TASK_COFHE_MOCKS_DEPLOY = "task:cofhe-mocks:deploy";

describe("ZeroCredit", function () {
  async function deployZeroCreditFixture() {
    await hre.run(TASK_COFHE_MOCKS_DEPLOY);

    const [signer, bob] = await hre.ethers.getSigners();

    // Deploy CreditEngine first
    const CreditEngine = await hre.ethers.getContractFactory("CreditEngine");
    const creditEngine = await CreditEngine.connect(bob).deploy();

    // Deploy ZeroCreditLending with CreditEngine address
    const ZeroCreditLending =
      await hre.ethers.getContractFactory("ZeroCreditLending");
    const lending = await ZeroCreditLending.connect(bob).deploy(
      await creditEngine.getAddress(),
    );

    // Deploy CreditEngineHelper for test 4
    const CreditEngineHelper =
      await hre.ethers.getContractFactory("CreditEngineHelper");
    const creditEngineHelper = await CreditEngineHelper.connect(bob).deploy(
      await creditEngine.getAddress(),
    );

    const client = await hre.cofhe.createClientWithBatteries(bob);

    return { creditEngine, lending, creditEngineHelper, signer, bob, client };
  }

  describe("Loan Origination", function () {
    it("Should originate a loan and set debt to the encrypted amount", async function () {
      const { lending, bob, client } = await loadFixture(
        deployZeroCreditFixture,
      );

      const loanAmount = 1000n;
      const encrypted = await client
        .encryptInputs([Encryptable.uint32(loanAmount)])
        .execute();

      await lending.connect(bob).originateLoan(encrypted[0]);

      // Deposit collateral so getHealthFactor produces a valid result
      const collateralEncrypted = await client
        .encryptInputs([Encryptable.uint32(2000n)])
        .execute();
      await lending.connect(bob).depositCollateral(collateralEncrypted[0]);

      // Execute getHealthFactor to persist FHE operations, then use staticCall for handle
      await lending.connect(bob).getHealthFactor(bob.address);
      const healthFactor = await lending
        .connect(bob)
        .getHealthFactor.staticCall(bob.address);

      // Use mocks to check the plaintext behind the handle
      const plaintext = await hre.cofhe.mocks.getPlaintext(healthFactor);
      expect(plaintext).to.equal(2n); // 2000 / 1000 = 2
    });
  });

  describe("Repayment", function () {
    it("Should repay debt and reduce the encrypted debt amount", async function () {
      const { lending, bob, client } = await loadFixture(
        deployZeroCreditFixture,
      );

      // First originate a loan of 1000
      const loanEncrypted = await client
        .encryptInputs([Encryptable.uint32(1000n)])
        .execute();
      await lending.connect(bob).originateLoan(loanEncrypted[0]);

      // Repay 400, leaving debt = 600
      const repayEncrypted = await client
        .encryptInputs([Encryptable.uint32(400n)])
        .execute();
      await lending.connect(bob).repay(repayEncrypted[0]);

      // Deposit collateral = 1800, health factor = 1800 / 600 = 3
      const collateralEncrypted = await client
        .encryptInputs([Encryptable.uint32(1800n)])
        .execute();
      await lending.connect(bob).depositCollateral(collateralEncrypted[0]);

      await lending.connect(bob).getHealthFactor(bob.address);
      const healthFactor = await lending
        .connect(bob)
        .getHealthFactor.staticCall(bob.address);

      const plaintext = await hre.cofhe.mocks.getPlaintext(healthFactor);
      expect(plaintext).to.equal(3n); // 1800 / 600 = 3
    });
  });

  describe("Health Factor", function () {
    it("Should return valid encrypted health factor after deposit and loan", async function () {
      const { lending, bob, client } = await loadFixture(
        deployZeroCreditFixture,
      );

      // Deposit collateral of 5000
      const collateralEncrypted = await client
        .encryptInputs([Encryptable.uint32(5000n)])
        .execute();
      await lending.connect(bob).depositCollateral(collateralEncrypted[0]);

      // Originate loan of 1000
      const loanEncrypted = await client
        .encryptInputs([Encryptable.uint32(1000n)])
        .execute();
      await lending.connect(bob).originateLoan(loanEncrypted[0]);

      // Health factor: 5000 / 1000 = 5
      await lending.connect(bob).getHealthFactor(bob.address);
      const healthFactor = await lending
        .connect(bob)
        .getHealthFactor.staticCall(bob.address);

      const plaintext = await hre.cofhe.mocks.getPlaintext(healthFactor);
      expect(plaintext).to.equal(5n);
    });
  });

  describe("Credit Line Computation", function () {
    it("Should compute credit line matching ((r*3)+(c*2)+a)/6 formula", async function () {
      const { creditEngineHelper, bob, client } = await loadFixture(
        deployZeroCreditFixture,
      );

      const repaymentScore = 90n;
      const collateralRatio = 60n;
      const activityScore = 30n;

      // Expected: ((90*3) + (60*2) + 30) / 6 = (270 + 120 + 30) / 6 = 420 / 6 = 70
      const expectedCreditLine =
        (repaymentScore * 3n + collateralRatio * 2n + activityScore) / 6n;

      const encrypted = await client
        .encryptInputs([
          Encryptable.uint32(repaymentScore),
          Encryptable.uint32(collateralRatio),
          Encryptable.uint32(activityScore),
        ])
        .execute();

      // Execute to persist state, then staticCall for handle
      await creditEngineHelper
        .connect(bob)
        .computeCreditLine(encrypted[0], encrypted[1], encrypted[2]);
      const creditLine = await creditEngineHelper
        .connect(bob)
        .computeCreditLine.staticCall(encrypted[0], encrypted[1], encrypted[2]);

      const plaintext = await hre.cofhe.mocks.getPlaintext(creditLine);
      expect(plaintext).to.equal(expectedCreditLine);
    });
  });
});
