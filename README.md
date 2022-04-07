![CARBO](logo.png "CleanCarbon")

# CleanCarbon CARBO smart contracts

* _Standart_        : [BEP20](https://github.com/binance-chain/BEPs/blob/master/BEP20.md)
* _[Name](https://github.com/binance-chain/BEPs/blob/master/BEP20.md#5111-name)_            : CLEANCARBON
* _[Ticker](https://github.com/binance-chain/BEPs/blob/master/BEP20.md#5112-symbol)_          : CARBO
* _[Decimals](https://github.com/binance-chain/BEPs/blob/master/BEP20.md#5113-decimals)_        : 18
* _Emission_        : One-time, 500 000 000 tokens
* _Fiat dependency_ : No
* _Token locks_     : Yes

## Smart contracts description

CleanCarbon CARBO smart contract

### Contracts
1. _CARBOToken_ - Token contract - 0xa52262dA176186105199a597aC8Cf094FF71b0C5
2. _DividendManager_ - Contract for managing dividends - 0xc30B883084Db5758E05e286d395c16C418b14d9A
3. _FeeManager_ - Contract to simplify work with commissions - 0x8612d987c20E4A5bc4B9842c7792d809771C83b1
4. _CrowdSale_ - Contract for public sale - 0x93cC557760341839fC23aFa2B3ce28E272C68787
5. _VestingWallet_ - Wallet for token locking - 0x3d10dFb6c1F4331978Aad87718FEcA9a20e21572



## Main network configuration (BSC Mainnet)

### Contracts deployed
* [CARBOToken](https://bscscan.com/token/0xa52262dA176186105199a597aC8Cf094FF71b0C5)
* [DividendManager](https://bscscan.com/address/0xc30B883084Db5758E05e286d395c16C418b14d9A)
* [FeeManager](https://bscscan.com/address/0x8612d987c20E4A5bc4B9842c7792d809771C83b1)
* [CrowdSale](https://bscscan.com/address/0x93cC557760341839fC23aFa2B3ce28E272C68787)
* [VestingWallet](https://bscscan.com/address/0x3d10dFb6c1F4331978Aad87718FEcA9a20e21572)
* [PancakePair](https://bscscan.com/address/0x6831281c4B4De049fafB288041f395AEda8a5d6C)
### Third-party contracts used
* [BUSD](https://bscscan.com/token/0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56)
* [PancakeRouter](https://bscscan.com/address/0x10ED43C718714eb63d5aA57B78B54704E256024E)


You can find log [here](docs/report.main.md)

## Test configuration (BSC Mainnet)
### Contracts deployed
* [CARBOToken](https://bscscan.com/token/0x974a5666f371195672968d55954e05FbE586089d)
* [DividendManager](https://bscscan.com/address/0x074Cb27e5D5Bf86442Dc31ea19cf302F7B5c8AD5)
* [FeeManager](https://bscscan.com/address/0xaC7EB7A8fF44FDbF70CeFF0238376B8656fA7F0c)
* [CrowdSale](https://bscscan.com/address/0xffd9b83ea5a4196eff283adfbd551683f8d8e7a0)
* [VestingWallet](https://bscscan.com/address/0xA2c8ac0953c2753471B2bD780f8e2910376Fc6AB)
* [PancakePair](https://bscscan.com/address/0x630D9D56643777f38E1Cf04dddf2E1c9b8EB6d67)
### Third-party contracts used
* [BUSD](https://bscscan.com/token/0xe9e7cea3dedca5984780bafc599bd69add087d56)
* [PancakeRouter](https://bscscan.com/address/0x10ED43C718714eb63d5aA57B78B54704E256024E)

You can find test log [here](docs/report.test.md)

## User's guide
You can find the user guide for end-users [here](docs/user.md)

## Manager's guide
Our manager's guide can be found [here](docs/manager.md)  
Additional info about smart contract's capabilities [here](docs/additional.md)
