const { ethers } = require("hardhat");
const HRE = require('hardhat');
const { expect } = require("chai");
require("bignumber.js");
const { utils } = require("ethers");

const ADMIN_WALLET           = "0x69Ba7E86bbB074Cd5f72693DEb6ADc508D83A6bF";
const panCakeV2RouterAddress = "0xD99D1c33F9fC3444f8101754aBC46c52416550D1";
const WETH_ADDRESS           = "0xae13d989dac2f0debff460ac112a837c89baa7cd";
const FACTORY_ADDRESS        = "0x6725f303b657a9451d8ba641348b6761a6cc7a17";

const DECIMAL_ZEROS   = "000000000000000000"; // 18 zeros
const formatDecimals  = 1000000000000000000;

const totalSupply     = 21000000;

describe("Quantum Token Scenario", function() {
    let token, admin, users, panCakeRouter, panCakeFactory, pairAddress, panCakePair, funds;

    beforeEach(async function() {
        funds = ethers.utils.parseEther('9000');

        await HRE.network.provider.request({method: 'hardhat_impersonateAccount', params: [ADMIN_WALLET]});
        admin = await ethers.provider.getSigner(ADMIN_WALLET);
        
        const QuantumToken = await HRE.ethers.getContractFactory("Quantum");
        token              = await QuantumToken.deploy();
        await token.deployed();

        panCakeRouter  = await ethers.getContractAt("IPancakeV2Router02", panCakeV2RouterAddress);
        panCakeFactory = await ethers.getContractAt("IPancakeV2Factory", FACTORY_ADDRESS);
        pairAddress = await panCakeFactory.getPair(WETH_ADDRESS, token.address);
        panCakePair = await HRE.ethers.getContractAt("IPancakeV2Pair", pairAddress);

        users = await ethers.getSigners();
        //await users[0].sendTransaction({to: ADMIN_WALLET, value: funds}); // Send some funds to admin wallet
        await users[1].sendTransaction({to: ADMIN_WALLET, value: funds}); // Send some funds to admin wallet
        await users[2].sendTransaction({to: ADMIN_WALLET, value: funds}); // Send some funds to admin wallet

        await token.connect(admin).approve(panCakeV2RouterAddress, '40000000' + DECIMAL_ZEROS); // 40M to pancake router
        await panCakeRouter.connect(admin).addLiquidityETH(token.address, '100000' + DECIMAL_ZEROS, 0, 0, ADMIN_WALLET, (Date.now() + 100000), 
        {value: ethers.utils.parseEther('1000')}); // provide 1000 BNB + 100000 token liquidity to pancakeswap

        await token.connect(admin).transfer(users[0].address, '10000' + DECIMAL_ZEROS);
    });

    describe('Deployment', () => {
        it("Scenario where user buy's 100 tokens and sells 100 tokens ", async() => {
            // set marketing wallet
            await token.connect(admin).setMarketingWallet(users[2].address);
            expect(await token.MARKETING_WALLET()).to.equal(users[2].address);

            expect(await token.isAutomatedMarketMakerPair(pairAddress)).to.equal(true);

            // set lp recipient 
            await token.connect(admin).setLPRecipient(users[3].address);
            expect(await token.LP_recipient()).to.equal(users[3].address);

            let QCONEPrice, BNBReserve, QCONEReserve;
            const path = [token.address, WETH_ADDRESS];
            console.log("Initial price and liquidity");
            let reserves = await panCakePair.getReserves();
            QCONEReserve = reserves['reserve0']/formatDecimals;
            BNBReserve   = reserves['reserve1']/formatDecimals;

            QCONEPrice = ((await panCakeRouter.getAmountsOut(ethers.utils.parseEther('1'), path))[1]) / formatDecimals;
            printTable(QCONEReserve, BNBReserve, QCONEPrice);

            //////////////////////////////////
            console.log("After sale price and liquidity");
            await token.connect(users[0]).approve(panCakeV2RouterAddress, '800' + DECIMAL_ZEROS);
            await panCakeRouter.connect(users[0]).swapExactTokensForETHSupportingFeeOnTransferTokens(
                '800' + DECIMAL_ZEROS,
                0, // accept any amount of ETH
                path,
                users[0].address,
                new Date().getTime()
            )

            reserves = await panCakePair.getReserves();
            QCONEReserve = reserves['reserve0']/formatDecimals;
            BNBReserve   = reserves['reserve1']/formatDecimals;

            QCONEPrice = ((await panCakeRouter.getAmountsOut(ethers.utils.parseEther('1'), path))[1]) / formatDecimals;
            printTable(QCONEReserve, BNBReserve, QCONEPrice);
            let marketingFee = (await token.balanceOf(users[2].address)) / formatDecimals; 
            let contractBalance = (await token.balanceOf(token.address)) / formatDecimals; 

            //////////////////////////////////
            console.log("After sale price and liquidity");
            await token.connect(users[0]).approve(panCakeV2RouterAddress, '100' + DECIMAL_ZEROS);
            console.log("initial balance", await token.balanceOf(users[0].address));
            await panCakeRouter.connect(users[0]).swapExactTokensForETHSupportingFeeOnTransferTokens(
                '100' + DECIMAL_ZEROS,
                0, // accept any amount of ETH
                path,
                users[0].address,
                new Date().getTime()
            )
            console.log("final balance--", await token.balanceOf(users[0].address));
            reserves = await panCakePair.getReserves();
            QCONEReserve = reserves['reserve0']/formatDecimals;
            BNBReserve   = reserves['reserve1']/formatDecimals;

            QCONEPrice = ((await panCakeRouter.getAmountsOut(ethers.utils.parseEther('1'), path))[1]) / formatDecimals;
            printTable(QCONEReserve, BNBReserve, QCONEPrice);
            marketingFee = (await token.balanceOf(users[2].address)) / formatDecimals; 
            contractBalance = (await token.balanceOf(token.address)) / formatDecimals; 

            //////////////////////////////////
            console.log("After buy price and liquidity");
            console.log("initial balance", await token.balanceOf(users[0].address));

            const tx = await panCakeRouter.connect(users[0]).swapExactETHForTokensSupportingFeeOnTransferTokens(
                0, // accept any amount of Tokens
                path.reverse(),
                users[0].address,
                new Date().getTime(), {
                    value: ethers.utils.parseEther((parseFloat(QCONEPrice)*100).toString())
                }
            )

            console.log("final balance--", await token.balanceOf(users[0].address));

            reserves = await panCakePair.getReserves();
            QCONEReserve = reserves['reserve0']/formatDecimals;
            BNBReserve   = reserves['reserve1']/formatDecimals;

            QCONEPrice = ((await panCakeRouter.getAmountsOut(ethers.utils.parseEther('1'), path.reverse()))[1]) / formatDecimals;
            printTable(QCONEReserve, BNBReserve, QCONEPrice);
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