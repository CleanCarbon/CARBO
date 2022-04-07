// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;

/**
 * @dev Interface of WithCallback contract.
 */
interface IWithCallback {

    enum CallbackType {
        REFLECT_INTERNAL,
        REFLECT_EXTERNAL,
        INCREASE_BALANCE,
        DECREASE_BALANCE,
        DECREASE_TOTAL_SUPPLY,
        TRANSFER,
        BURN
    }

    function setCallbackContract(address _callback) external;
    function setCallbackFunction(CallbackType callbackFunction, bool isActive) external;

}
