//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import '@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

import "./PancakeSwap/IPancakeV2Factory.sol";
import "./PancakeSwap/IPancakeV2Pair.sol";
import "./PancakeSwap/IPancakeV2Router01.sol";
import "./PancakeSwap/IPancakeV2Router02.sol";

import "hardhat/console.sol";

contract Quantum is ERC20, Ownable, ERC20Burnable {
    using SafeMath for uint256;

/////////////////////////////
    uint256 public totalDividendsDistributed;
    uint256 private constant TOTAL_SUPPLY = 21000000;

    IPancakeV2Router02 public pancakeV2Router;
    address public pancakeV2Pair;
    address public rewardToken;

    uint256 public swapTokensAtAmount;
    uint256 public gasForProcessing;

    // How the contract balance needs to be allocated
    uint256 private totalReflection_fee;
    uint256 private totalLP_fee;
    uint256 marketing_fee;
    
    address public constant ADMIN_WALLET = 0x69Ba7E86bbB074Cd5f72693DEb6ADc508D83A6bF;
    address public LP_recipient          = 0x69Ba7E86bbB074Cd5f72693DEb6ADc508D83A6bF;
    address public MARKETING_WALLET      = 0x69Ba7E86bbB074Cd5f72693DEb6ADc508D83A6bF;
    address public WBNB;

    bool public inSwapAndLiquify = false;

    struct feeRatesStruct {
      uint256 reflections;
      uint256 marketingWallet;
      uint256 LP;
      uint256 totalFee;
    }
    
    feeRatesStruct public buyFees = feeRatesStruct(
    { reflections: 500,     //5%
      marketingWallet: 100, //1%
      LP: 100,              //1%
      totalFee: 700         //7%
    });

    feeRatesStruct public sellFees = feeRatesStruct(
    { reflections: 600,     //6%
      marketingWallet: 100, //1%
      LP: 200,              //2%
      totalFee: 900         //9%
    });

    uint public PERCENTAGE_MULTIPLIER = 10000;

    //mapping(address => uint256) private _balances;
    mapping (address => bool) public isAutomatedMarketMakerPair;
    mapping (address => bool) public isExcludedFromTxFees;

    constructor() ERC20("Quantum 1", "QCONE") {
        uint256 _cap = TOTAL_SUPPLY.mul(10**decimals());
        swapTokensAtAmount = TOTAL_SUPPLY.mul(2).div(10**6); // 0.002%

        IPancakeV2Router02 _pancakeV2Router = IPancakeV2Router02(0xD99D1c33F9fC3444f8101754aBC46c52416550D1); // testnet 
        WBNB = _pancakeV2Router.WETH();

        // Create a pancakeswap pair for this new token
        pancakeV2Pair = IPancakeV2Factory(_pancakeV2Router.factory())
        .createPair(address(this), WBNB);

        // set the rest of the contract variables
        pancakeV2Router = _pancakeV2Router; 

        _setAutomatedMarketMakerPair(pancakeV2Pair, true);

        isExcludedFromTxFees[address(this)] = true;
        isExcludedFromTxFees[MARKETING_WALLET] = true;
        isExcludedFromTxFees[ADMIN_WALLET] = true;

        // use by default 300,000 gas to process auto-claiming dividends
        gasForProcessing = 300000;

        transferOwnership(ADMIN_WALLET);    
        _mint(ADMIN_WALLET, _cap);
    }
    
    function setSwapTokensAtAmount(uint256 amount) external onlyOwner {
        swapTokensAtAmount = amount;
    }

    function calcPercent(uint amount, uint percentBP) internal view returns (uint){
        return amount.mul(percentBP).div(PERCENTAGE_MULTIPLIER);
    }

    function _transfer(address sender, address recipient, uint256 amount) internal virtual override {
        require(sender    != address(0), "BEP20: transfer from the zero address");
        require(recipient != address(0), "BEP20: transfer to the zero address");

        require(balanceOf(sender) >= amount, "BEP20: transfer amount exceeds balance");
        
        if (amount == 0) {
            super._transfer(sender, recipient, 0);
            return;
        }

        uint256 contractTokenBalance = balanceOf(address(this));
        bool canSwap = contractTokenBalance >= swapTokensAtAmount;

        if (
            canSwap &&
            !inSwapAndLiquify &&
            !isAutomatedMarketMakerPair[sender] &&
            sender != owner() &&
            recipient != owner()
        ) {
            inSwapAndLiquify = true;

            //swapAndLiquify(totalLP_fee);
            totalLP_fee = 0;

            super._transfer(sender, MARKETING_WALLET, marketing_fee);
            marketing_fee = 0;
            //uint256 sellTokens = balanceOf(address(this));
            //swapAndSendDividends(sellTokens);
            totalReflection_fee = 0;
            

            inSwapAndLiquify = false;
        }
        
        uint256 totalContractFee = 0;

        if(!isExcludedFromTxFees[sender] && !isExcludedFromTxFees[recipient]) {
            
            feeRatesStruct memory appliedFee;


            if(isAutomatedMarketMakerPair[sender]) {
                appliedFee = buyFees;
                console.log("buy");
            }
            
            else {   
                appliedFee = sellFees;
            }

            marketing_fee       += calcPercent(amount, appliedFee.marketingWallet);
            totalReflection_fee += calcPercent(amount, appliedFee.reflections);
            totalLP_fee         += calcPercent(amount, appliedFee.LP);
            totalContractFee     = calcPercent(amount, appliedFee.totalFee);
            
            console.log(amount);
            console.log(totalContractFee);

            super._transfer(sender, address(this), totalContractFee);
        }

        uint256 sendToRecipient = amount.sub(totalContractFee);
        super._transfer(sender, recipient, sendToRecipient);
        console.log("here");
    }

    function swapAndLiquify(uint256 amount) private {
        // split the contract balance into halves
        uint256 half = amount.div(2);
        uint256 otherHalf = amount.sub(half);

        // capture the contract's current BNB balance.
        // this is so that we can capture exactly the amount of BNB that the
        // swap creates, and not make the liquidity event include any BNB that
        // has been manually sent to the contract
        uint256 initialBalance = address(this).balance;

        // swap tokens for BNB
        swapTokensForEth(half); // <- this breaks the BNB -> QCONE swap when swap+liquify is triggered

        // how much BNB did we just swap into?
        uint256 newBalance = address(this).balance.sub(initialBalance);

        // add liquidity to uniswap
        addLiquidity(otherHalf, newBalance);

    }

    function swapTokensForEth(uint256 tokenAmount) private {
        // generate the pancakeswap pair path of token -> weth
        address[] memory path = new address[](2);
        path[0] = address(this);
        path[1] = pancakeV2Router.WETH();

        _approve(address(this), address(pancakeV2Router), tokenAmount);

        // make the swap
        pancakeV2Router.swapExactTokensForETHSupportingFeeOnTransferTokens(
            tokenAmount,
            0, // accept any amount of ETH
            path,
            address(this),
            block.timestamp
        );
    }

    function addLiquidity(uint256 tokenAmount, uint256 ethAmount) private {
        // approve token transfer to cover all possible scenarios
        _approve(address(this), address(pancakeV2Router), tokenAmount);

        // add the liquidity
        pancakeV2Router.addLiquidityETH{value: ethAmount}(
            address(this),
            tokenAmount,
            0, // slippage is unavoidable
            0, // slippage is unavoidable
            LP_recipient,
            block.timestamp
        );
    }

    function swapTokensForCake(uint256 tokenAmount) private {
        address[] memory path = new address[](3);
        path[0] = address(this);
        path[1] = pancakeV2Router.WETH();
        path[2] = rewardToken;

        _approve(address(this), address(pancakeV2Router), tokenAmount);

        // make the swap
        pancakeV2Router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
            tokenAmount,
            0,
            path,
            address(this),
            block.timestamp
        );
    }

    function setAutomatedMarketMakerPair(address pair, bool value) public onlyOwner {
        require(pair != pancakeV2Pair, "QCONE: The PancakeSwap pair cannot be removed from automatedMarketMakerPairs");
        _setAutomatedMarketMakerPair(pair, value);
    }

    function _setAutomatedMarketMakerPair(address pair, bool value) private {
        require(isAutomatedMarketMakerPair[pair] != value, "BABYTOKEN: Automated market maker pair is already set to that value");
        isAutomatedMarketMakerPair[pair] = value;

/*         if (value) {
            dividendTracker.excludeFromDividends(pair);
        } */
    }

    function updateGasForProcessing(uint256 newValue) public onlyOwner {
        require(
            newValue >= 200000 && newValue <= 500000,
            "QCONE: gasForProcessing must be between 200,000 and 500,000"
        );
        require(
            newValue != gasForProcessing,
            "QCONE: Cannot update gasForProcessing to same value"
        );
        gasForProcessing = newValue;
    }

    function setSellFee(uint256 _reflections, uint256 _marketingWallet, uint256 _LP) external onlyOwner{
        sellFees.reflections     = _reflections.mul(100);
        sellFees.marketingWallet = _marketingWallet.mul(100);
        sellFees.LP              = _LP.mul(100);
        sellFees.totalFee        = _reflections.add(_marketingWallet).add(_LP).mul(100);
    }

    function setBuyFee(uint256 _reflections, uint256 _marketingWallet, uint256 _LP) external onlyOwner{
        buyFees.reflections     = _reflections.mul(100);
        buyFees.marketingWallet = _marketingWallet.mul(100);
        buyFees.LP              = _LP.mul(100);
        buyFees.totalFee        = _reflections.add(_marketingWallet).add(_LP).mul(100);
    }

    function setMarketingWallet(address _marketingWallet) external onlyOwner {
        MARKETING_WALLET = _marketingWallet;
    }

    function setLPRecipient(address _LP_recipient) external onlyOwner {
        LP_recipient = _LP_recipient;
    }

    function excludeFromFees(address _address) external onlyOwner {
        require(!isExcludedFromTxFees[_address], "already excluded");
        isExcludedFromTxFees[_address] = true;
    }

    function includeInFees(address _address) external onlyOwner {
        require(isExcludedFromTxFees[_address], "already included");
        isExcludedFromTxFees[_address] = false;
    }
    
    //to receive BNB from uniswapV2Router when swapping
    receive() external payable {}

}