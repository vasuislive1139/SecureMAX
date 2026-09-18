const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AssetNFT", function () {
    let AssetNFT, assetNFT, MockRBAC, mockRBAC;
    let owner, admin, manager, user1, user2;

    const ADMIN_ROLE = ethers.id("ADMIN_ROLE");
    const MANAGER_ROLE = ethers.id("MANAGER_ROLE");

    beforeEach(async function () {
        [owner, admin, manager, user1, user2] = await ethers.getSigners();

        MockRBAC = await ethers.getContractFactory("MockRBAC");
        mockRBAC = await MockRBAC.deploy();

        // Assign roles
        await mockRBAC.grantRole(ADMIN_ROLE, admin.address);
        await mockRBAC.grantRole(MANAGER_ROLE, manager.address);

        AssetNFT = await ethers.getContractFactory("AssetNFT");
        assetNFT = await AssetNFT.deploy(await mockRBAC.getAddress());
    });

    describe("Deployment", function () {
        it("Should set the right RBAC address", async function () {
            expect(await assetNFT.rbac()).to.equal(await mockRBAC.getAddress());
        });
    });

    describe("Minting", function () {
        it("Should allow manager to mint asset and emit event", async function () {
            const tx = await assetNFT.connect(manager).mintAsset("Laptop", "SN-12345", "ipfs://meta1");
            const receipt = await tx.wait();
            
            // wait() in ethers v6 doesn't have receipt.logs.length directly easily tested without event matchers,
            // but we can use chai matchers now!
            await expect(tx).to.emit(assetNFT, "AssetMinted")
                .withArgs(1n, 1n, "Laptop");
            
            const asset = await assetNFT.getAsset(1);
            expect(asset.assetId).to.equal(1n);
            expect(asset.assetType).to.equal("Laptop");
            expect(asset.assetReference).to.equal("SN-12345");
            expect(asset.status).to.equal("Registered");
            expect(await assetNFT.ownerOf(1)).to.equal(manager.address);
        });

        it("Should allow admin to mint asset", async function () {
            await expect(assetNFT.connect(admin).mintAsset("Server", "SRV-99", "ipfs://meta2"))
                .to.emit(assetNFT, "AssetMinted")
                .withArgs(1n, 1n, "Server");
        });

        it("Should reject unauthorized mint", async function () {
            await expect(
                assetNFT.connect(user1).mintAsset("Phone", "PH-001", "ipfs://meta3")
            ).to.be.revertedWith("Caller is not admin or manager");
        });

        it("Should ensure NFT uniqueness (incremental IDs)", async function () {
            await assetNFT.connect(manager).mintAsset("Item1", "REF-1", "meta");
            await assetNFT.connect(manager).mintAsset("Item2", "REF-2", "meta");

            const asset1 = await assetNFT.getAsset(1);
            const asset2 = await assetNFT.getAsset(2);

            expect(asset1.assetId).to.equal(1n);
            expect(asset2.assetId).to.equal(2n);
        });
    });

    describe("Allocation", function () {
        beforeEach(async function () {
            await assetNFT.connect(manager).mintAsset("Laptop", "SN-12345", "ipfs://meta1");
        });

        it("Should allow manager to allocate asset and emit event", async function () {
            const did = "did:securemax:user1";
            await expect(assetNFT.connect(manager).allocateAsset(1, user1.address, did))
                .to.emit(assetNFT, "AssetAllocated")
                .withArgs(1n, user1.address, did);

            const asset = await assetNFT.getAsset(1);
            expect(asset.ownerIdentityReference).to.equal(did);
            expect(asset.status).to.equal("Allocated");
            expect(await assetNFT.ownerOf(1)).to.equal(user1.address);
        });

        it("Should reject unauthorized allocation", async function () {
            const did = "did:securemax:user2";
            await expect(
                assetNFT.connect(user2).allocateAsset(1, user2.address, did)
            ).to.be.revertedWith("Caller is not admin or manager");
        });

        it("Should reject allocation of invalid token", async function () {
            // ERC721NonexistentToken is a custom error in OpenZeppelin v5
            await expect(
                assetNFT.connect(manager).allocateAsset(999, user1.address, "did:securemax:user1")
            ).to.be.reverted; 
        });
    });

    describe("Transfer", function () {
        beforeEach(async function () {
            await assetNFT.connect(manager).mintAsset("Laptop", "SN-12345", "ipfs://meta1");
            await assetNFT.connect(manager).allocateAsset(1, user1.address, "did:securemax:user1");
        });

        it("Should allow admin/manager to transfer asset and emit event", async function () {
            const newDid = "did:securemax:user2";
            await expect(assetNFT.connect(admin).transferAsset(1, user2.address, newDid))
                .to.emit(assetNFT, "AssetTransferred")
                .withArgs(1n, user1.address, user2.address);

            const asset = await assetNFT.getAsset(1);
            expect(asset.ownerIdentityReference).to.equal(newDid);
            expect(asset.status).to.equal("Transferred");
            expect(await assetNFT.ownerOf(1)).to.equal(user2.address);
        });

        it("Should reject unauthorized transfer by regular user", async function () {
            await expect(
                assetNFT.connect(user1).transferAsset(1, user2.address, "did:securemax:user2")
            ).to.be.revertedWith("Caller is not admin or manager");
            
            await expect(
                assetNFT.connect(user1).transferFrom(user1.address, user2.address, 1)
            ).to.be.revertedWith("Transfers are restricted to admin/manager");
        });
    });

    describe("Ownership Verification", function () {
        beforeEach(async function () {
            await assetNFT.connect(manager).mintAsset("Desktop", "DK-999", "meta");
            await assetNFT.connect(manager).allocateAsset(1, user1.address, "did:securemax:user1");
        });

        it("Should return true for correct ownership", async function () {
            const result = await assetNFT.verifyOwnership(1, user1.address, "did:securemax:user1");
            expect(result).to.be.true;
        });

        it("Should return false for incorrect address", async function () {
            const result = await assetNFT.verifyOwnership(1, user2.address, "did:securemax:user1");
            expect(result).to.be.false;
        });

        it("Should return false for incorrect DID", async function () {
            const result = await assetNFT.verifyOwnership(1, user1.address, "did:securemax:wrong");
            expect(result).to.be.false;
        });
    });
});
