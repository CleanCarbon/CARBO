const { accounts, contract } = require('@openzeppelin/test-environment');
const { BN, ether, expectEvent, expectRevert, constants } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');

const Token = contract.fromArtifact('CARBOToken');

const [deployer, owner ] = accounts;

describe('CARBOToken', async function () {
  let token;

  beforeEach(async function () {
    token = await Token.new({from: deployer});
    await token.transferOwnership(owner, {from: deployer})
  });

  describe('pause', function () {
    describe('when called by non-owner', function () {
      it('should revert', async function () {
        await expectRevert(token.pause({from: deployer}), "Ownable: caller is not the owner");
      });
    });
    describe('when called by owner', function () {
      beforeEach(async function () {
        await token.pause({from: owner})
      });
      it('should forbid transfer tokens', async function () {
        await expectRevert(token.transfer(owner, ether('1'), {from: deployer}), "Pausable: paused");
        await token.approve(owner, ether('1'), {from: deployer});
        await expectRevert(token.transferFrom(deployer, owner, ether('1'), {from: owner}), "Pausable: paused");
      });
      it('should forbid burn tokens', async function () {
        await expectRevert(token.burn(ether('1'), {from: deployer}), "Pausable: paused");
        await token.approve(owner, ether('1'), {from: deployer});
        await expectRevert(token.burnFrom(deployer, ether('1'), {from: owner}), "Pausable: paused");
      });
      it('should forbid reflect tokens', async function () {
        await expectRevert(token.reflect(ether('1'), {from: deployer}), "Pausable: paused");
      });
    });
  });
  describe('pause', function () {
    beforeEach(async function () {
      await token.pause({from: owner})
    });
    describe('when called by non-owner', function () {
      it('should revert', async function () {
        await expectRevert(token.unpause({from: deployer}), "Ownable: caller is not the owner");
      });
    });
    describe('when called by owner', function () {
      it('should allow transfer tokens', async function () {
        await token.unpause({from: owner})
        const value = ether('1');
        const before = await token.balanceOf(owner);
        await token.transfer(owner, value, {from: deployer});
        const after = await token.balanceOf(owner);
        expect(after).to.be.bignumber.equal(before.add(value));
      });
      it('should allow burn tokens', async function () {
        await token.unpause({from: owner})
        const value = ether('1');
        const before = await token.totalSupply();
        await token.burn(value, {from: deployer});
        const after = await token.totalSupply();
        expect(after).to.be.bignumber.equal(before.sub(value));
      });
      it('should allow reflect tokens', async function () {
        await token.unpause({from: owner})
        await token.transfer(owner, (await token.balanceOf(deployer)).divn(2), {from: deployer});
        const value = ether('1');
        const before = await token.balanceOf(deployer);
        await token.reflect(value, {from: deployer});
        const after = await token.balanceOf(deployer);
        expect(after).to.be.bignumber.lt(before);
      });
    });
  });

});

