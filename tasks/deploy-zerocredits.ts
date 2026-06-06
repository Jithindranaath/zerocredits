import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { saveDeployment } from './utils'

// Task to deploy the ZeroCredits Lending Protocol contracts
task('deploy-zerocredits', 'Deploy the ZeroCredits Lending Protocol contracts to the selected network').setAction(async (_, hre: HardhatRuntimeEnvironment) => {
	const { ethers, network } = hre

	console.log(`Deploying ZeroCredits Lending Protocol to ${network.name}...`)

	// Get the deployer account
	const [deployer] = await ethers.getSigners()
	console.log(`Deploying with account: ${deployer.address}`)

	// Deploy CreditEngine first
	const CreditEngine = await ethers.getContractFactory('CreditEngine')
	const creditEngine = await CreditEngine.deploy()
	await creditEngine.waitForDeployment()

	const creditEngineAddress = await creditEngine.getAddress()
	console.log(`CreditEngine deployed to: ${creditEngineAddress}`)

	// Deploy ZeroCreditLending with CreditEngine address as constructor arg
	const ZeroCreditLending = await ethers.getContractFactory('ZeroCreditLending')
	const zeroCreditLending = await ZeroCreditLending.deploy(creditEngineAddress)
	await zeroCreditLending.waitForDeployment()

	const zeroCreditLendingAddress = await zeroCreditLending.getAddress()
	console.log(`ZeroCreditLending deployed to: ${zeroCreditLendingAddress}`)

	// Save both deployments
	saveDeployment(network.name, 'CreditEngine', creditEngineAddress)
	saveDeployment(network.name, 'ZeroCreditLending', zeroCreditLendingAddress)

	return { creditEngineAddress, zeroCreditLendingAddress }
})
