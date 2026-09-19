// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../interfaces/IRBACRegistry.sol";
import "../interfaces/IIdentityRegistry.sol";

/**
 * @title AssetNFT
 * @author Person 4 (NFT + Asset Management Engineer)
 * @notice ERC-721 tokenized representation of organizational assets with lifecycle and RBAC enforcement.
 * @dev Consumes the RBAC interface provided by Person 3 for role verification.
 * 
 * IMPORTANT ARCHITECTURAL & AUTHENTICITY NOTE:
 * An NFT serves as a verifiable blockchain representation of an organizational asset and its
 * ownership/allocation history. It does NOT automatically prove that a real-world physical object
 * is genuine; real-world verification is conducted through authorized off-chain registration.
 * 
 * PRIVACY GUARANTEE:
 * No sensitive PII (names, email, government IDs, etc.) is stored in this contract. Only public
 * token IDs, organizational asset IDs, asset types, metadata references, and DID references are recorded.
 */
contract AssetNFT is ERC721URIStorage, Pausable, ReentrancyGuard {
    // -------------------------------------------------------------------------
    // CONSTANTS & ROLES
    // -------------------------------------------------------------------------
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");

    // -------------------------------------------------------------------------
    // DATA TYPES
    // -------------------------------------------------------------------------

    /// @notice Lifecycle status of an organizational asset
    enum AssetStatus {
        None,           // 0: Unregistered / non-existent
        Registered,     // 1: Minted and registered in system
        Allocated,      // 2: Allocated to an active custodian/user
        InMaintenance,  // 3: Temporarily locked for maintenance or audit
        Decommissioned  // 4: Permanently retired / decommissioned (terminal state)
    }

    /// @notice On-chain asset metadata record
    struct AssetRecord {
        uint256 tokenId;                // ERC-721 token ID
        string assetId;                 // Unique organization asset code (e.g., "AST-HW-2026-001")
        string assetType;               // Classification (e.g., "HARDWARE", "LICENSE", "EQUIPMENT")
        string assetReference;          // Off-chain document digest or specification reference
        string metadataURI;             // Metadata URI
        address currentOwner;           // Current wallet holder
        string ownerDid;                // DID string of current owner
        AssetStatus status;             // Current lifecycle status
        uint256 createdAt;              // Mint timestamp
        uint256 updatedAt;              // Last status or transfer timestamp
    }

    // -------------------------------------------------------------------------
    // STATE VARIABLES
    // -------------------------------------------------------------------------

    /// @notice Interface to external RBAC Registry (Person 3)
    IRBACRegistry public rbacRegistry;
    
    /// @notice Interface to external Identity Registry
    IIdentityRegistry public immutable identityRegistry;

    /// @dev Initial contract deployer / fallback admin
    address public contractOwner;

    /// @dev Counter for auto-incrementing token IDs
    uint256 private _nextTokenId = 1;

    /// @dev Total active asset count
    uint256 public totalAssetsCount;

    /// @dev Token ID -> AssetRecord
    mapping(uint256 => AssetRecord) private _assetsByTokenId;

    /// @dev Asset ID string -> Token ID
    mapping(string => uint256) private _tokenIdByAssetId;

    /// @dev Asset ID string -> exists boolean
    mapping(string => bool) private _assetIdExists;

    // -------------------------------------------------------------------------
    // EVENTS
    // -------------------------------------------------------------------------

    event AssetMinted(
        uint256 indexed tokenId,
        string indexed assetIdHash,
        string assetId,
        string assetType,
        address indexed owner,
        string ownerDid,
        uint256 timestamp
    );

    event AssetAllocated(
        uint256 indexed tokenId,
        string assetId,
        address indexed previousOwner,
        address indexed newOwner,
        string newOwnerDid,
        uint256 timestamp
    );

    event AssetTransferred(
        uint256 indexed tokenId,
        string assetId,
        address indexed from,
        address indexed to,
        string toDid,
        address operator,
        uint256 timestamp
    );

    event AssetStatusUpdated(
        uint256 indexed tokenId,
        string assetId,
        AssetStatus previousStatus,
        AssetStatus newStatus,
        address indexed updatedBy,
        uint256 timestamp
    );

    event RBACRegistryUpdated(
        address indexed previousRegistry,
        address indexed newRegistry,
        uint256 timestamp
    );

    event AssetMetadataUpdated(
        uint256 indexed tokenId,
        string previousURI,
        string newURI,
        address indexed updatedBy,
        uint256 timestamp
    );

    // -------------------------------------------------------------------------
    // CUSTOM ERRORS
    // -------------------------------------------------------------------------

    error UnauthorizedAccess(address caller);
    error AssetAlreadyExists(string assetId);
    error AssetNotFound(uint256 tokenId);
    error AssetDecommissioned(uint256 tokenId);
    error AssetInMaintenance(uint256 tokenId);
    error InvalidRecipientAddress();
    error InvalidAssetData(string reason);
    error InvalidStatusTransition(AssetStatus currentStatus, AssetStatus newStatus);
    error ZeroAddressNotAllowed();
    error IdentityNotRegistered(address controller);
    error IdentityNotActive(address controller);
    error DIDMismatch(address controller, string providedDid);

    // -------------------------------------------------------------------------
    // MODIFIERS
    // -------------------------------------------------------------------------

    modifier onlyAdmin() {
        if (!_isAdmin(msg.sender)) {
            revert UnauthorizedAccess(msg.sender);
        }
        _;
    }

    modifier onlyAdminOrManager() {
        if (!_isAdminOrManager(msg.sender)) {
            revert UnauthorizedAccess(msg.sender);
        }
        _;
    }

    // -------------------------------------------------------------------------
    // INTERNAL IDENTITY HELPERS
    // -------------------------------------------------------------------------

    function _requireActiveIdentity(address controller) internal view {
        if (!identityRegistry.isIdentityRegistered(controller)) {
            revert IdentityNotRegistered(controller);
        }
        if (!identityRegistry.isIdentityActive(controller)) {
            revert IdentityNotActive(controller);
        }
    }

    function _requireMatchingDid(address controller, string calldata did) internal view {
        string memory registeredDid = identityRegistry.getDidByController(controller);
        if (keccak256(bytes(registeredDid)) != keccak256(bytes(did))) {
            revert DIDMismatch(controller, did);
        }
    }

    // -------------------------------------------------------------------------
    // CONSTRUCTOR
    // -------------------------------------------------------------------------

    constructor(
        string memory _name,
        string memory _symbol,
        address _rbacRegistry,
        address _identityRegistry
    ) ERC721(_name, _symbol) {
        if (_rbacRegistry == address(0) || _identityRegistry == address(0)) {
            revert ZeroAddressNotAllowed();
        }
        contractOwner = msg.sender;
        rbacRegistry = IRBACRegistry(_rbacRegistry);
        identityRegistry = IIdentityRegistry(_identityRegistry);
    }

    // -------------------------------------------------------------------------
    // ASSET MINTING & REGISTRATION
    // -------------------------------------------------------------------------

    function mintAsset(
        string calldata assetId,
        string calldata assetType,
        string calldata assetReference,
        string calldata metadataURI,
        address initialRecipient,
        string calldata recipientDid
    ) external onlyAdminOrManager whenNotPaused nonReentrant returns (uint256 tokenId) {
        if (bytes(assetId).length == 0 || bytes(assetId).length > 64) {
            revert InvalidAssetData("Invalid assetId length");
        }
        if (bytes(assetType).length == 0 || bytes(assetType).length > 64) {
            revert InvalidAssetData("Invalid assetType length");
        }
        if (initialRecipient == address(0)) {
            revert InvalidRecipientAddress();
        }
        if (_assetIdExists[assetId]) {
            revert AssetAlreadyExists(assetId);
        }

        tokenId = _nextTokenId++;
        _assetIdExists[assetId] = true;
        _tokenIdByAssetId[assetId] = tokenId;

        _assetsByTokenId[tokenId] = AssetRecord({
            tokenId: tokenId,
            assetId: assetId,
            assetType: assetType,
            assetReference: assetReference,
            metadataURI: metadataURI,
            currentOwner: initialRecipient,
            ownerDid: recipientDid,
            status: AssetStatus.Registered,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });

        totalAssetsCount++;

        _safeMint(initialRecipient, tokenId);
        _setTokenURI(tokenId, metadataURI);

        emit AssetMinted(
            tokenId,
            assetId,
            assetId,
            assetType,
            initialRecipient,
            recipientDid,
            block.timestamp
        );
    }

    // -------------------------------------------------------------------------
    // ASSET ALLOCATION & TRANSFERS
    // -------------------------------------------------------------------------

    function allocateAsset(
        uint256 tokenId,
        address newOwner,
        string calldata newOwnerDid
    ) external onlyAdminOrManager whenNotPaused nonReentrant {
        AssetRecord storage asset = _assetsByTokenId[tokenId];

        if (asset.status == AssetStatus.None) {
            revert AssetNotFound(tokenId);
        }
        if (asset.status == AssetStatus.Decommissioned) {
            revert AssetDecommissioned(tokenId);
        }
        if (asset.status == AssetStatus.InMaintenance) {
            revert AssetInMaintenance(tokenId);
        }
        if (newOwner == address(0)) {
            revert InvalidRecipientAddress();
        }

        _requireActiveIdentity(newOwner);
        _requireMatchingDid(newOwner, newOwnerDid);

        address previousOwner = asset.currentOwner;

        asset.currentOwner = newOwner;
        asset.ownerDid = newOwnerDid;
        asset.status = AssetStatus.Allocated;
        asset.updatedAt = block.timestamp;

        if (previousOwner != newOwner) {
            _transfer(previousOwner, newOwner, tokenId);
        }

        emit AssetAllocated(
            tokenId,
            asset.assetId,
            previousOwner,
            newOwner,
            newOwnerDid,
            block.timestamp
        );
    }

    function transferAsset(
        uint256 tokenId,
        address to,
        string calldata toDid
    ) external whenNotPaused nonReentrant {
        AssetRecord storage asset = _assetsByTokenId[tokenId];

        if (asset.status == AssetStatus.None) {
            revert AssetNotFound(tokenId);
        }
        if (asset.status == AssetStatus.Decommissioned) {
            revert AssetDecommissioned(tokenId);
        }
        if (asset.status == AssetStatus.InMaintenance) {
            revert AssetInMaintenance(tokenId);
        }
        if (to == address(0)) {
            revert InvalidRecipientAddress();
        }

        _requireActiveIdentity(msg.sender);
        _requireActiveIdentity(to);
        _requireMatchingDid(to, toDid);

        address from = asset.currentOwner;

        bool isAuthorized = _isAdminOrManager(msg.sender) ||
            msg.sender == from ||
            isApprovedForAll(from, msg.sender) ||
            getApproved(tokenId) == msg.sender;

        if (!isAuthorized) {
            revert UnauthorizedAccess(msg.sender);
        }

        asset.currentOwner = to;
        asset.ownerDid = toDid;
        asset.updatedAt = block.timestamp;

        _transfer(from, to, tokenId);

        emit AssetTransferred(
            tokenId,
            asset.assetId,
            from,
            to,
            toDid,
            msg.sender,
            block.timestamp
        );
    }

    // -------------------------------------------------------------------------
    // LIFECYCLE STATUS & METADATA MANAGEMENT
    // -------------------------------------------------------------------------

    function updateAssetStatus(
        uint256 tokenId,
        AssetStatus newStatus
    ) external onlyAdminOrManager whenNotPaused {
        AssetRecord storage asset = _assetsByTokenId[tokenId];
        AssetStatus currentStatus = asset.status;

        if (currentStatus == AssetStatus.None) {
            revert AssetNotFound(tokenId);
        }
        if (currentStatus == AssetStatus.Decommissioned) {
            revert AssetDecommissioned(tokenId);
        }
        if (newStatus == AssetStatus.None || newStatus == currentStatus) {
            revert InvalidStatusTransition(currentStatus, newStatus);
        }

        asset.status = newStatus;
        asset.updatedAt = block.timestamp;

        emit AssetStatusUpdated(
            tokenId,
            asset.assetId,
            currentStatus,
            newStatus,
            msg.sender,
            block.timestamp
        );
    }

    function updateMetadataURI(
        uint256 tokenId,
        string calldata newURI
    ) external onlyAdminOrManager whenNotPaused {
        AssetRecord storage asset = _assetsByTokenId[tokenId];

        if (asset.status == AssetStatus.None) {
            revert AssetNotFound(tokenId);
        }
        if (asset.status == AssetStatus.Decommissioned) {
            revert AssetDecommissioned(tokenId);
        }

        string memory oldURI = asset.metadataURI;
        asset.metadataURI = newURI;
        asset.updatedAt = block.timestamp;
        _setTokenURI(tokenId, newURI);

        emit AssetMetadataUpdated(
            tokenId,
            oldURI,
            newURI,
            msg.sender,
            block.timestamp
        );
    }

    // -------------------------------------------------------------------------
    // VIEW & QUERY FUNCTIONS
    // -------------------------------------------------------------------------

    function getAsset(uint256 tokenId) external view returns (AssetRecord memory record) {
        record = _assetsByTokenId[tokenId];
        if (record.status == AssetStatus.None) {
            revert AssetNotFound(tokenId);
        }
    }

    function getAssetByAssetId(string calldata assetId) external view returns (AssetRecord memory record) {
        if (!_assetIdExists[assetId]) {
            revert InvalidAssetData("Asset ID does not exist");
        }
        uint256 tokenId = _tokenIdByAssetId[assetId];
        return _assetsByTokenId[tokenId];
    }

    function verifyOwnership(
        uint256 tokenId,
        address claimant,
        string calldata claimantDid
    ) external view returns (bool isOwner, bool isDidMatch, AssetStatus status) {
        AssetRecord storage asset = _assetsByTokenId[tokenId];
        if (asset.status == AssetStatus.None) {
            return (false, false, AssetStatus.None);
        }

        isOwner = (asset.currentOwner == claimant);
        isDidMatch = (keccak256(bytes(asset.ownerDid)) == keccak256(bytes(claimantDid)));
        status = asset.status;
    }

    // -------------------------------------------------------------------------
    // CONFIGURATION & EMERGENCY CONTROLS
    // -------------------------------------------------------------------------

    function setRBACRegistry(address newRbacRegistry) external onlyAdmin {
        if (newRbacRegistry == address(0)) {
            revert ZeroAddressNotAllowed();
        }
        address oldRegistry = address(rbacRegistry);
        rbacRegistry = IRBACRegistry(newRbacRegistry);

        emit RBACRegistryUpdated(oldRegistry, newRbacRegistry, block.timestamp);
    }

    function pause() external onlyAdmin {
        _pause();
    }

    function unpause() external onlyAdmin {
        _unpause();
    }

    // -------------------------------------------------------------------------
    // INTERNAL RBAC HELPERS
    // -------------------------------------------------------------------------

    function _isAdmin(address account) internal view returns (bool) {
        if (account == contractOwner) return true;
        if (address(rbacRegistry) != address(0)) {
            try rbacRegistry.hasRole(ADMIN_ROLE, account) returns (bool hasAdmin) {
                if (hasAdmin) return true;
            } catch {}
            try rbacRegistry.isAdmin(account) returns (bool isAdminVal) {
                if (isAdminVal) return true;
            } catch {}
        }
        return false;
    }

    function _isAdminOrManager(address account) internal view returns (bool) {
        if (_isAdmin(account)) return true;
        if (address(rbacRegistry) != address(0)) {
            try rbacRegistry.hasRole(MANAGER_ROLE, account) returns (bool hasMgr) {
                if (hasMgr) return true;
            } catch {}
            try rbacRegistry.isManager(account) returns (bool isMgrVal) {
                if (isMgrVal) return true;
            } catch {}
        }
        return false;
    }
}
