const { ethers, getNamedAccounts } = require("hardhat")
const { getWeth, AMOUNT } = require("../scripts/getWeth")

async function main() {
  await getWeth()
  const { deployer } = await getNamedAccounts()
  const lendingPool = await getLendingPool(deployer)
  console.log(`Address: ${lendingPool.address}`)
  const wethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
  await approveERC20(wethAddress, lendingPool.address, AMOUNT, deployer)
  console.log("Depositing....")
  await lendingPool.deposit(wethAddress, AMOUNT, deployer, 0)
  console.log("Deposited")
  let { totalCollateralETH, totalDebtETH, availableBorrowsETH } =
    await getUserData(lendingPool, deployer)
  await getUserData(lendingPool, deployer)
  const daiPrice = await getDAIPrice()
  console.log(`The DAI/ETH price is : ${daiPrice}`)
  const amountDaiToBorow =
    availableBorrowsETH.toString() * 0.95 * (1 / daiPrice.toNumber())
  const amountDaiToBorowWei = ethers.utils.parseEther(
    amountDaiToBorow.toString()
  )
  const daiAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
  await borrowDai(daiAddress, lendingPool, amountDaiToBorowWei, deployer)
  await getUserData(lendingPool, deployer)
  await repay(amountDaiToBorowWei, daiAddress, lendingPool, deployer)
  await getUserData(lendingPool, deployer)
}

async function getLendingPool(account) {
  const lendingPoolAddressProvider = await ethers.getContractAt(
    "ILendingPoolAddressesProvider",
    "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5",
    account
  )
  const lendingPoolAddress = await lendingPoolAddressProvider.getLendingPool()
  const lendingPool = await ethers.getContractAt(
    "ILendingPool",
    lendingPoolAddress,
    account
  )
  return lendingPool
}

async function getUserData(lendingPool, account) {
  const { totalCollateralETH, totalDebtETH, availableBorrowsETH } =
    await lendingPool.getUserAccountData(account)
  console.log(`You have ${totalCollateralETH} deposited.`)
  console.log(`You have ${totalDebtETH} borrowed.`)
  console.log(`You can buy  ${availableBorrowsETH} more.`)
  return { totalCollateralETH, totalDebtETH, availableBorrowsETH }
}

async function approveERC20(
  erc20address,
  spenderAddress,
  amountSpent,
  account
) {
  const erc20Token = await ethers.getContractAt("IERC20", erc20address, account)
  const tx = await erc20Token.approve(spenderAddress, amountSpent)
  await tx.wait(1)
}

async function getDAIPrice() {
  const daiPriceFeed = await ethers.getContractAt(
    "AggregatorV3Interface",
    "0x8fffffd4afb6115b954bd326cbe7b4ba576818f6"
  )
  const price = (await daiPriceFeed.latestRoundData())[1]
  return price
}

async function borrowDai(daiAddress, lendingPool, amountDaiToBorrow, account) {
  const borrowTx = await lendingPool.borrow(
    daiAddress,
    amountDaiToBorrow,
    1,
    0,
    account
  )
  await borrowTx.wait(1)
  console.log("You've borrowed!")
}

async function repay(amount, daiAddress, lendingPool, account) {
  await approveERC20(daiAddress, lendingPool.address, amount, account)
  const repayTx = await lendingPool.repay(daiAddress, amount, 1, account)
  await repayTx.wait(1)
  console.log("Repaid!")
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
