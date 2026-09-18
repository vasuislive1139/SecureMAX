// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "../interfaces/IRBAC.sol";

contract AssetNFT is ERC721 {
    uint256 private _nextTokenId;
    IRBAC public rbac;
    
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    struct Asset {
        uint256 assetId;
        string assetType;
        string assetReference;
        string metadataReference;
        uint256 nftTokenId;
        string ownerIdentityReference;
        string status;
    }

    mapping(uint256 => Asset) public assets;

    event AssetMinted(uint256 indexed assetId, uint256 indexed nftTokenId, string assetType);
    event AssetAllocated(uint256 indexed assetId, address indexed to, string ownerIdentityReference);
    event AssetTransferred(uint256 indexed assetId, address indexed from, address indexed to);

    constructor(address _rbacAddress) ERC721("SecureMaxAsset", "SMA") {
        require(_rbacAddress != address(0), "Invalid RBAC address");
        rbac = IRBAC(_rbacAddress);
        _nextTokenId = 1;
    }
    
    modifier onlyAdminOrManager() {
        require(
            rbac.hasRole(ADMIN_ROLE, msg.sender) || rbac.hasRole(MANAGER_ROLE, msg.sender),
            "Caller is not admin or manager"
        );
        _;
    }

    /**
     * @dev Restrict standard ERC721 transfers.
     * Only Admin or Manager can execute transfers (either via direct ERC721 methods or custom functions).
     */
    function _update(address to, uint256 tokenId, address auth) internal virtual override returns (address) {
        address from = _ownerOf(tokenId);
        
        // If it's a transfer (not minting or burning)
        if (from != address(0) && to != address(0)) {
            require(
                rbac.hasRole(ADMIN_ROLE, msg.sender) || rbac.hasRole(MANAGER_ROLE, msg.sender),
                "Transfers are restricted to admin/manager"
            );
        }
        
        return super._update(to, tokenId, auth);
    }

    /**
     * @dev Mint a new organizational asset.
     */
    function mintAsset(
        string calldata assetType,
        string calldata assetReference,
        string calldata metadataReference
    ) external onlyAdminOrManager returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        
        _safeMint(msg.sender, tokenId);
        
        assets[tokenId] = Asset({
            assetId: tokenId,
            assetType: assetType,
            assetReference: assetReference,
            metadataReference: metadataReference,
            nftTokenId: tokenId,
            ownerIdentityReference: "", 
            status: "Registered"
        });
        
        emit AssetMinted(tokenId, tokenId, assetType);
        return tokenId;
    }
    
    /**
     * @dev Allocate a minted asset to a user (DID).
     */
    function allocateAsset(
        uint256 assetId,
        address to,
        string calldata ownerIdentityReference
    ) external onlyAdminOrManager {
        require(_ownerOf(assetId) != address(0), "Asset does not exist");
        require(to != address(0), "Cannot allocate to zero address");
        
        address currentOwner = _ownerOf(assetId);
        
        // Transfer to new owner
        if (currentOwner != to) {
            _transfer(currentOwner, to, assetId);
        }
        
        assets[assetId].ownerIdentityReference = ownerIdentityReference;
        assets[assetId].status = "Allocated";
        
        emit AssetAllocated(assetId, to, ownerIdentityReference);
    }
    
    /**
     * @dev Transfer an already allocated asset to a new owner (DID).
     */
    function transferAsset(
        uint256 assetId,
        address to,
        string calldata newOwnerIdentityReference
    ) external onlyAdminOrManager {
        require(_ownerOf(assetId) != address(0), "Asset does not exist");
        require(to != address(0), "Cannot transfer to zero address");
        
        address currentOwner = _ownerOf(assetId);
        require(currentOwner != to, "Already owned by recipient");
        
        _transfer(currentOwner, to, assetId);
        
        assets[assetId].ownerIdentityReference = newOwnerIdentityReference;
        assets[assetId].status = "Transferred";
        
        emit AssetTransferred(assetId, currentOwner, to);
    }
    
    /**
     * @dev Retrieve full asset details.
     */
    function getAsset(uint256 assetId) external view returns (Asset memory) {
        require(_ownerOf(assetId) != address(0), "Asset does not exist");
        return assets[assetId];
    }
    
    /**
     * @dev Verify if a given address and identity reference are the current owner.
     */
    function verifyOwnership(uint256 assetId, address expectedOwner, string calldata expectedIdentityReference) external view returns (bool) {
        if (_ownerOf(assetId) != expectedOwner) {
            return false;
        }
        if (keccak256(bytes(assets[assetId].ownerIdentityReference)) != keccak256(bytes(expectedIdentityReference))) {
            return false;
        }
        return true;
    }
}
