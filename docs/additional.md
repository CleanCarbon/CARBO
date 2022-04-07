# Additional information about CARBO smart contracts

### Содежрание
* [Functionality of CARBO Token](#carbotoken)
* [Functionality of CrowdSale](#crowdsale)
* [VestingWallet functionality](#vestingwallet)

## <a name="carbotoken"></a>Functionality of CARBO Token
The CARBO contract has a functionality that allows the `owner` to withdraw tokens from the contract address, and `BNB` sent to it by mistake.
To do this, use the `retrieveTokens` and `retrieveETH` methods, respectively.
The `retrieveTokens` method takes two parameters: the address to send the tokens to and the smart contract address of the token.
The `retrieveETH` method only needs one parameter: the address to send the `BNB` to.

## <a name="crowdsale"></a>Functionality of CrowdSale
CrowdSale is a `pausable` contract. In case of unforeseen situations, the purchase of tokens can be suspended.
As with the token contract, the CrowdSale contract provides methods for withdrawing tokens and `BNB`. `BNB` withdrawal will most likely not be required (the contract only accepts funds during the sale). Using the `retreiveTokens` method, the administrator can withdraw other tokens sent by mistake from the contract.

### Sale stages
In general, the sale is carried out in several stages. 
The stage is described using an object:
```
struct Stage {
    uint256 start;
    uint256 end;
    uint256 bonus;
    uint256 minInvestmentLimit;
    uint256 invested;
    uint256 tokensSold;
    uint256 hardcapInTokens;
    uint8 vestingSchedule;
}
```
* `id` - stage ID
* `start` - stage start date in `unixtie` format
* `end` - stage end date in `unixtime` format
* `bonus` - bonus as a percentage of the purchase amount, which is awarded to the user for the purchase of tokens at this stage
* `minInvestmentLimit` - minimum purchase amount in `wei`
* `invested` - the amount of attracted investments at this stage in `wei`
* `tokensSold` - the number of sold tokens at this stage
* `hardcapInTokens` - hardcap for this stage
* `vestingSchedule` - vesting schedule `id`

Every time a user sends BNB to a smart contract address, a search is made for an active stage of the sale. If no suitable step is found, an error is returned to the user.
The contract has a `setStage` method to change the parameters of the stages.
Using this method, the `owner` can set the basic parameters of any stage.
General rules for interacting with a smart contract can be found in the [instructions for the administrator](manager.md)  


> We recommend using the `config` tab in the `CARBO` table, which allows you to convert human-readable values to the internal representation of the smart contract.
> Just in case, before making changes, consult with the developer.

### Vesting rules
Vesting rules can be applied to any stage of the sale. 
At the time of this writing, the sale is being run in a single stage, which uses a vesting schedule with id 0. Vesting means that tokens purchased during the corresponding stage of the sale are not transferred to the address of the buyer, but are sent to the address of the vesting contract.
In order to withdraw tokens, the user will need to call the `withdraw` method of the vesting contract.

* If the vesting conditions are met and tokens are available for withdrawal, the contract will transfer the estimated amount to the user's address.
* If there are no tokens available for withdrawal on the user's balance, the smart contract will return an error.

The user can save his money and not complete the transaction, because. Metamask recognizes transactions that return errors in advance and displays a notification before sending.
Vesting parameters are described using the `VestingSchedule` object.


## <a name="vestingwallet"></a>VestingWallet functionality
### Access rights
The `VestingWallet` contract works with two user groups:

* `owner`. This user can configure the contract and call utility methods to withdraw tokens and funds sent to it by mistake.
* `beneficiary`. This user is the end user of this contract and has the right to withdraw tokens from it in accordance with the vesting schedule.

### Payout Schedules
The contract stores a list of payment schedules. Each payout schedule is described using a `VestingSchedule` object:

```
VestingSchedule {
    uint256 id;
    uint256 start;
    uint256 duration;
    uint256 interval;
}
```
* `id` - chart identifier. User balances use this identifier to receive information about the next payout
* `start` - the date from which the countdown starts, in `unixtime` format
* `duration` - the total duration of the installment payment in seconds
* `interval` - the duration of the time interval between payments in seconds

To set vesting parameters, the owner should use the `setVestingSchedule` method.

### User balances
The contract keeps a list of user balances. The balance is described using the `Balance` object:
```
struct Balance {
    uint256 schedule;
    address beneficiary;
    uint256 initial;
    uint256 withdrawn;
}
```
* `schedule` - payout schedule `id`. Corresponds to the `id` of the `VestingSchedule` object
* `beneficiary` - user address
* `initial` - initial amount of tokens on the balance
* `withdrawn` - amount of withdrawn tokens

To get information about the account status, you need to use the `getAccountInfo` method.
The method takes the user's address as a parameter and returns three values:
* `initial` - the initial number of tokens frozen on the smart contract
* `withdrawn` - number of tokens drawn
* `vested` - the number of tokens available for extraction


