// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/ICallbackContract.sol";

/**
 * @dev Allows the owner to register a callback contract that will be called after every call of the transfer or burn function
 */
contract WithCallback is Ownable {

    ICallbackContract public callback;

    enum CallbackType {
        REFLECT_INTERNAL,
        REFLECT_EXTERNAL,
        INCREASE_BALANCE,
        DECREASE_BALANCE,
        DECREASE_TOTAL_SUPPLY,
        TRANSFER,
        BURN
    }

    mapping(CallbackType => bool) internal _callbacks;

    function setCallbackContract(address _callback) external onlyOwner {
        callback = ICallbackContract(_callback);
    }

    function setCallbackFunction(CallbackType callbackFunction, bool isActive) external onlyOwner {
        require(_callbacks[callbackFunction] != isActive, "WithCallback: already set");
        _callbacks[callbackFunction] = isActive;
    }

    function _reflectCallback(uint256 tAmount, uint256 rAmount) internal {
        if (_callbacks[CallbackType.REFLECT_INTERNAL]) {
            try callback.reflectCallback(tAmount, rAmount) {} catch {}
        }
    }

    function _reflectCallback(address account, uint256 tAmount, uint256 rAmount) internal {
        if (_callbacks[CallbackType.REFLECT_EXTERNAL]) {
            try callback.reflectCallback(account, tAmount, rAmount) {} catch {}
        }
    }

    function _increaseBalanceCallback(address account, uint256 tAmount, uint256 rAmount) internal {
        if (_callbacks[CallbackType.INCREASE_BALANCE]) {
            try callback.increaseBalanceCallback(account, tAmount, rAmount) {} catch {}
        }
    }

    function _decreaseBalanceCallback(address account, uint256 tAmount, uint256 rAmount) internal {
        if (_callbacks[CallbackType.DECREASE_BALANCE]) {
            try callback.decreaseBalanceCallback(account, tAmount, rAmount) {} catch {}
        }
    }

    function _decreaseTotalSupplyCallback(uint256 tAmount, uint256 rAmount) internal {
        if (_callbacks[CallbackType.DECREASE_TOTAL_SUPPLY]) {
            try callback.decreaseTotalSupplyCallback(tAmount, rAmount) {} catch {}
        }
    }

    function _transferCallback(address from, address to, uint256 tFromAmount, uint256 rFromAmount, uint256 tToAmount, uint256 rToAmount) internal {
        if (_callbacks[CallbackType.TRANSFER]) {
            try callback.transferCallback(from, to, tFromAmount, rFromAmount, tToAmount, rToAmount) {} catch {}
        }
    }

    function _burnCallback(address account, uint256 tAmount, uint256 rAmount) internal {
        if (_callbacks[CallbackType.BURN]) {
            try callback.burnCallback(account, tAmount, rAmount) {} catch {}
        }
    }

}

