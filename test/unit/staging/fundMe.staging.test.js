const { ethers, deployments, getNamedAccounts }=require("hardhat")
const { assert,expect } = require("chai")

const {devlopmentChains} = require("../../../helper-hardhat-config")


const helpers = require("@nomicfoundation/hardhat-network-helpers")

devlopmentChains.includes(network.name)//使用三元运算符用来判断网络是本地网络还是sepolia测试网
? describe.skip//如果是真，则运行该代码跳过
//如果是假的，则运行下面的代码
:describe("test fundme contract", async function(){

    let fundMe
    let firstAccount//第一个账户

    beforeEach(async function(){
        await deployments.fixture(["all"])
        firstAccount=(await getNamedAccounts()).firstAccount
        const fundMeDeployment= await deployments.get("FundMe")
        fundMe=await ethers.getContractAt("FundMe",fundMeDeployment.address)
       
    })

    it("fund and getFund successfully",
        async function(){
            await fundMe.fund({value:ethers.parseEther("0.5")})
            await new Promise(resolve => setTimeout(resolve,181 * 1000))
            
            const getFundTx = await fundMe.getFund()
            const getFundReceipt = await getFundTx.wait()

            await expect (fundMe.getFund())
                .to.be.emit(fundMe,"FundWithdrawByOwner")
                .withArgs(ethers.parseEther("0.5"))
        }
    )

    it("fund and reFund successfully",
        async function(){
            await fundMe.fund({value:ethers.parseEther("0.01")})
            await new Promise(resolve => setTimeout(resolve,181 * 1000))
            
            const getFundTx = await fundMe.getFund()
            const getFundReceipt = await getFundTx.wait()

            await expect (fundMe.getFund())
                .to.be.emit(fundMe,"RefundByFunder")
                .withArgs(firstAccount,ethers.parseEther("0.5"))
        }
    )

   

})