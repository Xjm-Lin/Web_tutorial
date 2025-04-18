const {task} = require("hardhat/config")

task("interact-fundme","interact and verify fundme contract")
    .addParam("addr","fundme contract address")
    .setAction(async (taskArgs,hre)=>{

        //初始化合约，不然在这里不能调用合约中的函数
        const fundMeFactory=await ethers.getContractFactory("FundMe")
        const fundMe=fundMeFactory.attach(taskArgs.addr)

        //使用2个账号对合约进行操作，使用一个账户对另一个账户进行转账操作
        // 账户的私钥已经部署到env-enc的文件中，然后再hardhat.config.js中进行访问
        //1、首先需要初始化账户,通过ethers的getSigners()函数获取到两个账户的信息
        const [firstAccount,secondAccount]= await ethers.getSigners();
    
    
        //2、转账操作,调用fundMe合约的fund函数进行转账操作,因为fund函数是payable修饰的，所以需要传入转账的ETH的数量
        //因为solidity中是没有小数的，所以需要用ethers的parseEther()函数进行转换,并且将该操作赋值给常量fundTx
        const fundTx = await fundMe.fund({value:ethers.parseEther("0.001")})
        await fundTx.wait() 
    
        console.log(`2 accounts are ${firstAccount.address} and ${secondAccount.address}`)
    
        //3、查看合约账户的balance
        //使用ethers.provider.getBalance(fundMe.target)函数获取到合约的balance，并且赋值给变量balanceOfContract
        const balanceOfContract = await ethers.provider.getBalance(fundMe.target)
        console.log(`Balance of the contract is ${balanceOfContract}`)
    
    
        //4、使用另外一个账户调用fundMe合约的fund函数进行转账操作
        //这里的connect(secondAccount)是将账户切换到secondAccount，不写的话会默认选择第一个
        const fundTxWithSecondAccount = await fundMe.connect(secondAccount).fund({value:ethers.parseEther("0.001")})
        await fundTxWithSecondAccount.wait()
    
    
    
        //5、查看第二个账户的balance
        const balanceOfContractAfterSecondFund = await ethers.provider.getBalance(fundMe.target)
        console.log(`Balance of the contract is ${balanceOfContractAfterSecondFund}`)
    
    
    
        //6、查看fundMe合约中的fundersToAmount的值，因为是个mapping映射，所以需要根据key获取value
        const firstAccountBalanceInFundMe = await fundMe.fundersToAmount(firstAccount.address)
        const secondAccountBalanceInFundMe = await fundMe.fundersToAmount(secondAccount.address)
    
        //打印输出获取到的值
        console.log(`Balance of first account ${firstAccount.address} is ${firstAccountBalanceInFundMe}`)
        console.log(`Balance of second account ${secondAccount.address} is ${secondAccountBalanceInFundMe}`)
    
})

module.exports={}