//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import '@openzeppelin/contracts/access/Ownable.sol';
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

import "./PancakeSwap/IPancakeV2Factory.sol";
import "./PancakeSwap/IPancakeV2Pair.sol";
import "./PancakeSwap/IPancakeV2Router01.sol";
import "./PancakeSwap/IPancakeV2Router02.sol";

contract BUSDtest is ERC20, Ownable {
    using SafeMath for uint256;

    uint256 private constant TOTAL_SUPPLY = 21000000;
    IPancakeV2Router02 public pancakeV2Router;
    address public pancakeV2Pair;

    address public constant ADMIN_WALLET = 0xc1cCE69161Ebf6837f4F07c7d95a4badF30a7d41;
    address public LP_recipient          = 0xc1cCE69161Ebf6837f4F07c7d95a4badF30a7d41;
    address public WBNB;

    constructor() ERC20("BUSDTest", "BUSDT") {
        uint256 _cap = TOTAL_SUPPLY.mul(10**decimals());

        //address _router = 0x10ED43C718714eb63d5aA57B78B54704E256024E; // mainnet 
        address _router = 0xD99D1c33F9fC3444f8101754aBC46c52416550D1;

        IPancakeV2Router02 _pancakeV2Router = IPancakeV2Router02(_router); 
        WBNB = _pancakeV2Router.WETH();

        // Create a pancakeswap pair for this new token
        pancakeV2Pair = IPancakeV2Factory(_pancakeV2Router.factory())
        .createPair(address(this), WBNB);

        // set the rest of the contract variables
        pancakeV2Router = _pancakeV2Router; 
 
        _mint(msg.sender, _cap);
    }
}