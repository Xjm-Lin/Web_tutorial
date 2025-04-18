 //使用ethers.js部署hardhat合约的步骤：
 //1、导入ethers.js的包
 //2、创建一个main()函数
 //3、执行main()函数

 //1、导入ethers.js的包
 const { ethers } = require("hardhat") 


 //2、创建一个main()函数，使用async关键字将该函数定义为异步函数
async function main(){

    //1、创建合约工厂
    //使用await关键字将该操作进行挂起，意思是这句代码执行完毕之后，才能执行后续的操作
    const fundMeFactory = await ethers.getContractFactory("FundMe")
    
    //输出信息
    console.log("contract deploying");
    
    //2、部署合约
    const fundMe = await fundMeFactory.deploy(300);
    

    //3、合约部署完成之后，等待将该合约发送到区块链上
    await fundMe.waitForDeployment();
    

    //4、记录日志
    //使用1左边的符号可以使用(${变量})的方式进行访问，类似与python中的f'{变量}'格式化字符串
    console.log(`contract has been deployed successfully,contract address is ${fundMe.target}`)

    //判断是不是sepolia网络，而且判断etherscanApi为true的时候，则执行对应的代码
    if(hre.network.config.chainId==11155111 && process.env.ETHERSCAN_API_KEY){

        console.log("waiting for 5 confirmations")
        //将合约挂起等待5个区块之后再进行执行
        await fundMe.deploymentTransaction().wait(5);
        await verifyFundMe(fundMe.target,[300])
    }else{
        console.log("verification skipped..")
    }

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

     

}


//验证部署合约的函数
async function verifyFundMe(fundMeAddr,args){
 
    //验证合约
    await hre.run("verify:verify", {
        address: fundMeAddr,//传入合约的地址
        constructorArguments: args,//合约的构造函数的入参
      });

}

//执行上面写的main()函数
//js语言的一个特性就是可以将一个函数作为参数传入到另外一个函数中去
//如果报错的话捕获错误并退出
main().then().catch((error)=>{
    //捕获错误
    console.error(error);
    //退出进程
    process.exit(0);
});
