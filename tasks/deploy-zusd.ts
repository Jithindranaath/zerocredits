import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { saveDeployment } from './utils'

task('deploy-zusd', 'Deploy the ZUSD token contract').setAction(async (_, hre: HardhatRuntimeEnvironment) => {
	const { ethers, network } = hre

	console.log(`Deploying ZUSD token to ${network.name}...`)

	const [deployer] = await ethers.getSigners()
	console.log(`Deploying with account: ${deployer.address}`)

	const ZUSD = await ethers.getContractFactory('ZUSD')
	const zusd = await ZUSD.deploy()
	await zusd.waitForDeployment()

	const zusdAddress = await zusd.getAddress()
	console.log(`ZUSD deployed to: ${zusdAddress}`)

	saveDeployment(network.name, 'ZUSD', zusdAddress)

	return { zusdAddress }
})
