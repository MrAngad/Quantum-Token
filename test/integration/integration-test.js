const { ethers } = require("hardhat");
const HRE = require('hardhat');
const { expect } = require("chai");
require("bignumber.js");
const { utils } = require("ethers");

const ADMIN_WALLET           = "0x69Ba7E86bbB074Cd5f72693DEb6ADc508D83A6bF";
const panCakeV2RouterAddress = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
const WETH_ADDRESS           = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
const FACTORY_ADDRESS        = "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73";

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

        rewardToken    = await ethers.getContractAt("IERC20", "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56");
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
        
    });

    describe('Deployment', () => {
        it("Scenario where user buy's 100 tokens and sells 100 tokens ", async() => {

            // set marketing wallet
            console.log("busd balance", await rewardToken.balanceOf(ADMIN_WALLET));
            await token.connect(admin).setMarketingWallet(users[2].address);
            expect(await token.MARKETING_WALLET()).to.equal(users[2].address);

            expect(await token.isAutomatedMarketMakerPair(pairAddress)).to.equal(true);

            // set lp recipient 
            await token.connect(admin).setLPRecipient(users[3].address);
            expect(await token.LP_recipient()).to.equal(users[3].address);

            console.log("transaction 1");
            await token.connect(admin).transfer(users[0].address, '10000' + DECIMAL_ZEROS);
            console.log("transaction 2");
            await token.connect(users[0]).approve(users[6].address, '9000' + DECIMAL_ZEROS);
            await token.connect(users[6]).transferFrom(users[0].address, users[1].address, '9000' + DECIMAL_ZEROS);
            console.log("transaction 3");
            await token.connect(admin).transfer(users[5].address, '10000' + DECIMAL_ZEROS);
            console.log("transaction 4");
            await token.connect(users[5]).transfer(users[6].address, '9000' + DECIMAL_ZEROS);
            console.log("---------------");
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
            console.log("After buy price and liquidity");
            console.log("busd balance", await rewardToken.balanceOf(ADMIN_WALLET));
            console.log("------------------------balance = ", await token.balanceOf(users[4].address));
            await panCakeRouter.connect(users[4]).swapExactETHForTokensSupportingFeeOnTransferTokens(
                0, // accept any amount of Tokens
                path.reverse(),
                users[4].address,
                new Date().getTime(), {
                    value: ethers.utils.parseEther((parseFloat(QCONEPrice)*3100).toString())
                }
            )
            console.log("------------------------balance = ", await token.balanceOf(users[4].address));

            await panCakeRouter.connect(users[5]).swapExactETHForTokensSupportingFeeOnTransferTokens(
                0, // accept any amount of Tokens
                path,
                users[5].address,
                new Date().getTime(), {
                    value: ethers.utils.parseEther((parseFloat(QCONEPrice)*3100).toString())
                }
            )
            console.log("busd balance", await rewardToken.balanceOf(ADMIN_WALLET));
            await panCakeRouter.connect(users[6]).swapExactETHForTokensSupportingFeeOnTransferTokens(
                0, // accept any amount of Tokens
                path,
                users[6].address,
                new Date().getTime(), {
                    value: ethers.utils.parseEther((parseFloat(QCONEPrice)*3100).toString())
                }
            )
            await panCakeRouter.connect(users[7]).swapExactETHForTokensSupportingFeeOnTransferTokens(
                0, // accept any amount of Tokens
                path,
                users[7].address,
                new Date().getTime(), {
                    value: ethers.utils.parseEther((parseFloat(QCONEPrice)*3100).toString())
                }
            )
            await panCakeRouter.connect(users[8]).swapExactETHForTokensSupportingFeeOnTransferTokens(
                0, // accept any amount of Tokens
                path,
                users[8].address,
                new Date().getTime(), {
                    value: ethers.utils.parseEther((parseFloat(QCONEPrice)*10000).toString())
                }
            )
            await panCakeRouter.connect(users[9]).swapExactETHForTokensSupportingFeeOnTransferTokens(
                0, // accept any amount of Tokens
                path,
                users[9].address,
                new Date().getTime(), {
                    value: ethers.utils.parseEther((parseFloat(QCONEPrice)*10000).toString())
                }
            )
            console.log("busd balance", await rewardToken.balanceOf(ADMIN_WALLET));
            reserves = await panCakePair.getReserves();
            QCONEReserve = reserves['reserve0']/formatDecimals;
            BNBReserve   = reserves['reserve1']/formatDecimals;

            QCONEPrice = ((await panCakeRouter.getAmountsOut(ethers.utils.parseEther('1'), path.reverse()))[1]) / formatDecimals;
            console.log("price for 1 ", QCONEPrice);

            printTable(QCONEReserve, BNBReserve, QCONEPrice);
            console.log("busd balance, address", await rewardToken.balanceOf(ADMIN_WALLET), ADMIN_WALLET);
            console.log("busd balance", await rewardToken.balanceOf(users[0].address), users[0].address);
            console.log("busd balance", await rewardToken.balanceOf(users[4].address), users[4].address);
            console.log("busd balance", await rewardToken.balanceOf(users[5].address), users[5].address);

            await panCakeRouter.connect(users[9]).swapExactETHForTokensSupportingFeeOnTransferTokens(
                0, // accept any amount of Tokens
                path.reverse(),
                users[9].address,
                new Date().getTime(), {
                    value: ethers.utils.parseEther((parseFloat(QCONEPrice)*1200).toString())
                }
            )
            console.log("busd balance", await rewardToken.balanceOf(ADMIN_WALLET));
            reserves = await panCakePair.getReserves();
            QCONEReserve = reserves['reserve0']/formatDecimals;
            BNBReserve   = reserves['reserve1']/formatDecimals;

            QCONEPrice = ((await panCakeRouter.getAmountsOut(ethers.utils.parseEther('1'), path.reverse()))[1]) / formatDecimals;
            printTable(QCONEReserve, BNBReserve, QCONEPrice);
            console.log("busd balance, address", await rewardToken.balanceOf(ADMIN_WALLET), ADMIN_WALLET);
            console.log("busd balance", await rewardToken.balanceOf(users[0].address), users[0].address);
            console.log("busd balance", await rewardToken.balanceOf(users[4].address), users[4].address);
            console.log("busd balance", await rewardToken.balanceOf(users[5].address), users[5].address);
        });
    });

    function printTable(QCONEReserve, BNBReserve, price) {
        console.table([
            ["LP QCONE", "LP WBNB Amount", "Price"],
            [QCONEReserve, BNBReserve, `${price} BNB/QCONE`]
        ]);
    }
});
