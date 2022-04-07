const { contract, web3 } = require('@openzeppelin/test-environment');
const { BN, balance, constants, ether, expectEvent, expectRevert, send } = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = constants;
const { expect } = require('chai');

const CallbackContract = contract.fromArtifact('CallbackContractMock');

function shouldBehaveLikeWithCallback (owner, tokenHolder, anotherAccount) {
  
  describe('WithCallback', function () {
    let callbackContract;
    

    beforeEach(async function() {
      callbackContract = await CallbackContract.new({from: owner});
    })
    
    describe('registerCallback', function() {
      it('should allow the owner to register a contract as a callback', async function () {
        await this.token.registerCallback(callbackContract.address, {from: owner});
        expect(await this.token.registeredCallback()).to.be.equal(callbackContract.address);
      });

      it('should not allow non-owners to register a contract as a callback', async function () {
        expectRevert(this.token.registerCallback(callbackContract.address, {from: anotherAccount}), "Ownable: caller is not the owner")
      });
    })

    describe('unregisterCallback', function() {
      it('should allow the owner to remove a callback contract', async function () {
        await this.token.unregisterCallback({from: owner});
        expect(await this.token.registeredCallback()).to.be.equal(ZERO_ADDRESS);
      });

      it('should not allow non-owners to remove a callback contract', async function () {
        expectRevert(this.token.unregisterCallback({from: anotherAccount}), "Ownable: caller is not the owner")
      });
    })

    describe('burnCallback', function() {
      beforeEach(async function() {
        await this.token.registerCallback(callbackContract.address, {from: owner});
      });
      
      it('should be called each time tokens burned', async function () {
        const value1 = ether('123');
        const value2 = ether('321');
        
        this.token.burn(value1, {from: tokenHolder});
        expect(await callbackContract.burnCallbackAccount()).to.be.equal(tokenHolder);
        expect(await callbackContract.burnCallbackAmount()).to.be.bignumber.equal(value1);
        
        await this.token.burn(value2, {from: tokenHolder});
        expect(await callbackContract.burnCallbackAccount()).to.be.equal(tokenHolder);
        expect(await callbackContract.burnCallbackAmount()).to.be.bignumber.equal(value2);

        await this.token.increaseAllowance(anotherAccount, value1, {from: tokenHolder});
        await this.token.burnFrom(tokenHolder, value1, {from: anotherAccount});
        expect(await callbackContract.burnCallbackAccount()).to.be.equal(tokenHolder);
        expect(await callbackContract.burnCallbackAmount()).to.be.bignumber.equal(value1);
      });
      
      it('should not be called after unregistering callback', async function () {
        const value1 = ether('123');
        const value2 = ether('321');
        
        await this.token.burn(value1, {from: tokenHolder});
        expect(await callbackContract.burnCallbackAccount()).to.be.equal(tokenHolder);
        expect(await callbackContract.burnCallbackAmount()).to.be.bignumber.equal(value1);

        await this.token.unregisterCallback({from: owner}); 

        await this.token.burn(value2, {from: tokenHolder});
        expect(await callbackContract.burnCallbackAccount()).to.be.equal(tokenHolder);
        expect(await callbackContract.burnCallbackAmount()).to.be.bignumber.equal(value1);
      });
    })

    describe('transferCallback', function() {
      beforeEach(async function() {
        await this.token.registerCallback(callbackContract.address, {from: owner});
      });

      it('should be called each time tokens transfered', async function () {
        const value1 = ether('321');
        const value2 = ether('123');

        await this.token.transfer(anotherAccount, value1, {from: tokenHolder});
        expect(await callbackContract.transferCallbackSender()).to.be.equal(tokenHolder);
        expect(await callbackContract.transferCallbackRecipient()).to.be.equal(anotherAccount);
        expect(await callbackContract.transferCallbackAmount()).to.be.bignumber.equal(value1);

        await this.token.transfer(tokenHolder, value2, {from: anotherAccount});
        expect(await callbackContract.transferCallbackSender()).to.be.equal(anotherAccount);
        expect(await callbackContract.transferCallbackRecipient()).to.be.equal(tokenHolder);
        expect(await callbackContract.transferCallbackAmount()).to.be.bignumber.equal(value2);

        await this.token.increaseAllowance(anotherAccount, value1, {from: tokenHolder});
        await this.token.transferFrom(tokenHolder, anotherAccount, value1, {from: anotherAccount});
        expect(await callbackContract.transferCallbackSender()).to.be.equal(tokenHolder);
        expect(await callbackContract.transferCallbackRecipient()).to.be.equal(anotherAccount);
        expect(await callbackContract.transferCallbackAmount()).to.be.bignumber.equal(value1);
      });

      it('should not be called after unregistering callback', async function () {
        const value1 = ether('321');
        const value2 = ether('123');

        await this.token.transfer(anotherAccount, value1, {from: tokenHolder});
        expect(await callbackContract.transferCallbackSender()).to.be.equal(tokenHolder);
        expect(await callbackContract.transferCallbackRecipient()).to.be.equal(anotherAccount);
        expect(await callbackContract.transferCallbackAmount()).to.be.bignumber.equal(value1);

        await this.token.unregisterCallback({from: owner});

        await this.token.transfer(tokenHolder, value2, {from: anotherAccount});
        expect(await callbackContract.transferCallbackSender()).to.be.equal(tokenHolder);
        expect(await callbackContract.transferCallbackRecipient()).to.be.equal(anotherAccount);
        expect(await callbackContract.transferCallbackAmount()).to.be.bignumber.equal(value1);
      });
    })
  });
  
}

module.exports = {
  shouldBehaveLikeWithCallback
};
