const { ethers } = require("hardhat");
const HRE = require('hardhat');
const { expect } = require("chai");
require("bignumber.js");
const { utils } = require("ethers");

const ADMIN_WALLET           = "0x69Ba7E86bbB074Cd5f72693DEb6ADc508D83A6bF";
const panCakeV2RouterAddress = "0xd99d1c33f9fc3444f8101754abc46c52416550d1";
const WETH_ADDRESS           = "0xae13d989dac2f0debff460ac112a837c89baa7cd ";
const FACTORY_ADDRESS        = "0x6725f303b657a9451d8ba641348b6761a6cc7a17";

const DECIMAL_ZEROS   = "000000000000000000"; // 18 zeros
const formatDecimals  = 1000000000000000000;

const totalSupply     = 21000000;

describe("Quantum Token Scenario", function() {
    let token, rewardToken, admin, users, panCakeRouter, panCakeFactory, pairAddress, panCakePair, funds;
    beforeEach(async function() {
        funds = ethers.utils.parseEther('9000');

        await HRE.network.provider.request({method: 'hardhat_impersonateAccount', params: [ADMIN_WALLET]});
        admin = await ethers.provider.getSigner(ADMIN_WALLET);
        
        const QuantumToken = await HRE.ethers.getContractFactory("Quantum");
        token              = await QuantumToken.deploy();
        await token.deployed();

        rewardToken    = await ethers.getContractAt("IERC20", "0xC7a7C693586EA12B09fc4613cC398B47A96517F9");
        panCakeRouter  = await ethers.getContractAt("IPancakeV2Router02", panCakeV2RouterAddress);
        panCakeFactory = await ethers.getContractAt("IPancakeV2Factory", FACTORY_ADDRESS);
        console.log({
            WETH: WETH_ADDRESS,
            token: token.address,
            panCakeFactory,
        })
        pairAddress = await panCakeFactory.getPair.call(WETH_ADDRESS, token.address);
/*         panCakePair = await HRE.ethers.getContractAt("IPancakeV2Pair", pairAddress);

        users = await ethers.getSigners();
        //await users[0].sendTransaction({to: ADMIN_WALLET, value: funds}); // Send some funds to admin wallet
        await users[1].sendTransaction({to: ADMIN_WALLET, value: funds}); // Send some funds to admin wallet
        await users[2].sendTransaction({to: ADMIN_WALLET, value: funds}); // Send some funds to admin wallet

        await token.connect(admin).approve(panCakeV2RouterAddress, '40000000' + DECIMAL_ZEROS); // 40M to pancake router
        await panCakeRouter.connect(admin).addLiquidityETH(token.address, '100000' + DECIMAL_ZEROS, 0, 0, ADMIN_WALLET, (Date.now() + 100000), 
        {value: ethers.utils.parseEther('1000')}); // provide 1000 BNB + 100000 token liquidity to pancakeswap */
      
    });

    describe('Deployment', () => {
        it("Scenario where user buy's 100 tokens and sells 100 tokens ", async() => {

            // set marketing wallet
            console.log("busd balance", await rewardToken.balanceOf(ADMIN_WALLET));
        });
    });

    function printTable(QCONEReserve, BNBReserve, price) {
        console.table([
            ["LP QCONE", "LP WBNB Amount", "Price"],
            [QCONEReserve, BNBReserve, `${price} BNB/QCONE`]
        ]);
    }
});

// command to check eth balance
// why does it crash on changing 