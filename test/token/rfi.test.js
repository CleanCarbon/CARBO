const { accounts, contract } = require('@openzeppelin/test-environment');
const { ether, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');

const Token = contract.fromArtifact('CARBOToken');

const [deployer, owner, account1, account2 ] = accounts;

describe('CARBOToken', async function () {
  let token;

  beforeEach(async function () {
    token = await Token.new({from: deployer});
    await token.transferOwnership(owner, {from: deployer})
  });

  describe('excludeFromRFI', function () {
    describe('when called by non-owner', function () {
      it('should revert', async function () {
        await expectRevert(token.excludeFromRFI(deployer, {from: deployer}), "Ownable: caller is not the owner");
      });
    });
    describe('when called by owner', function () {
      it('should exclude address from RFI', async function () {
        await token.excludeFromRFI(deployer, {from: owner});
      });
      describe('when address already excluded', function () {
        it('should revert', async function () {
          await token.excludeFromRFI(deployer, {from: owner});
          await expectRevert(token.excludeFromRFI(deployer, {from: owner}), "CarboToken: account is already excluded");
        });
      })
    });
  });

  describe('includeInRFI', function () {
    describe('when called by non-owner', function () {
      it('should revert', async function () {
        await expectRevert(token.includeInRFI(deployer, {from: deployer}), "Ownable: caller is not the owner");
      });
    });
    describe('when called by owner', function () {
      it('should include address from RFI', async function () {
        await token.excludeFromRFI(deployer, {from: owner});
        await token.includeInRFI(deployer, {from: owner});
      });
      describe('when address already included', function () {
        it('should revert', async function () {
          await expectRevert(token.includeInRFI(deployer, {from: owner}), "CarboToken: account is already included");
        });
      })
    });
  });

  describe('reflect', function () {
    beforeEach(async function () {
      await token.transfer(account1, ether('12345'), {from: deployer});
      await token.transfer(account2, ether('23456'), {from: deployer});
    })
    it('should increase balance of usual account', async function() {
      const [balance1before, balance2before] = await Promise.all([account1, account2].map(address => token.balanceOf(address)));
      const amount = ether('123');
      await token.reflect(amount, {from: account1});
      const [balance1after, balance2after] = await Promise.all([account1, account2].map(address => token.balanceOf(address)));
      const diff1 = balance1after.add(amount).sub(balance1before);
      const diff2 = balance2after.sub(balance2before);
      const ratio1 = balance1after.div(diff1);
      const ratio2 = balance2after.div(diff2);
      expect(ratio1).to.be.bignumber.equal(ratio2);
    });
    it('should not increase balance of excluded account', async function() {
      const [balance1before, balance2before, balance3before] = await Promise.all([account1, account2, deployer].map(address => token.balanceOf(address)));
      const amount = ether('123');
      await token.excludeFromRFI(deployer, {from: owner});
      await token.reflect(amount, {from: account1});
      const [balance1after, balance2after, balance3after] = await Promise.all([account1, account2, deployer].map(address => token.balanceOf(address)));
      const diff1 = balance1after.add(amount).sub(balance1before);
      const diff2 = balance2after.sub(balance2before);
      const ratio1 = balance1after.div(diff1);
      const ratio2 = balance2after.div(diff2);
      expect(balance3after).to.be.bignumber.equal(balance3before);
      expect(ratio1).to.be.bignumber.equal(ratio2);
    });
  })

  describe('transfer', function () {
    const amount = ether('123');
    beforeEach(async function () {
      await token.transfer(account1, ether('12345'), {from: deployer});
      await token.transfer(account2, ether('23456'), {from: deployer});
    })
    describe('from ususal account to usual account', function () {
      it('should change sender\'s and recipient\'s balances by exactly the amount sent', async function () {
        const before = await Promise.all([account1, account2].map(account => token.balanceOf(account)));
        await token.transfer(account2, amount, {from: account1});
        const after = await Promise.all([account1, account2].map(account => token.balanceOf(account)));
        expect(after[0]).to.be.bignumber.equal(before[0].sub(amount));
        expect(after[1]).to.be.bignumber.equal(before[1].add(amount));
      })
    });
  });

  describe('burn', function () {
    beforeEach(async function () {
      await token.transfer(account1, ether('12345'), {from: deployer});
      await token.transfer(account2, ether('23456'), {from: deployer});
    })
    describe('from usual account', function () {
      it('should decrease user\'s balance', async function () {
        const amount = ether('123');
        const before = await token.balanceOf(account1);
        await token.burn(amount, {from: account1});
        const after = await token.balanceOf(account1);
        expect(after).to.be.bignumber.equal(before.sub(amount));
      })
      it('should decrease total supply', async function () {
        const amount = ether('123');
        const before = await token.totalSupply();
        await token.burn(amount, {from: account1});
        const after = await token.totalSupply();
        expect(after).to.be.bignumber.equal(before.sub(amount));
      })
      it('should not affect other balances', async function () {
        const amount = ether('123');
        const before = await token.balanceOf(account2);
        await token.burn(amount, {from: account1});
        const after = await token.balanceOf(account2);
        expect(after).to.be.bignumber.equal(before);
      })
    });
    describe('from excluded account', function () {
      beforeEach(async function () {
        await token.excludeFromRFI(account1, {from: owner});
      })
      it('should decrease user\'s balance', async function () {
        const amount = ether('123');
        const before = await token.balanceOf(account1);
        await token.burn(amount, {from: account1});
        const after = await token.balanceOf(account1);
        expect(after).to.be.bignumber.equal(before.sub(amount));
      })
      it('should decrease total supply', async function () {
        const amount = ether('123');
        const before = await token.totalSupply();
        await token.burn(amount, {from: account1});
        const after = await token.totalSupply();
        expect(after).to.be.bignumber.equal(before.sub(amount));
      })
      it('should not affect other balances', async function () {
        const amount = ether('123');
        const before = await token.balanceOf(account2);
        await token.burn(amount, {from: account1});
        const after = await token.balanceOf(account2);
        expect(after).to.be.bignumber.equal(before);
      })
      it('should not affect total supply after account included back in RFI', async function () {
        const amount = ether('123');
        await token.burn(amount, {from: account1});
        const before = await token.totalSupply();
        await token.includeInRFI(account1, {from: owner});
        const after = await token.totalSupply();
        expect(after).to.be.bignumber.equal(before);
      })
      it('should not affect other balances after account included back in RFI', async function () {
        const amount = ether('123');
        const before = await token.balanceOf(account2);
        await token.burn(amount, {from: account1});
        await token.includeInRFI(account1, {from: owner});
        const after = await token.balanceOf(account2);
        expect(after).to.be.bignumber.equal(before);
      })
    });
  });

  //--------------------------------------------------------------------------------------------------------------------
  // helpers
  //--------------------------------------------------------------------------------------------------------------------

});

