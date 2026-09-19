// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title IdentityRegistry
 * @author Person 2 (DID & Decentralized Identity Engineer)
 * @notice On-chain public key and Decentralized Identity (DID) registry.
 * @dev Manages the mapping of DIDs to public keys, controller addresses, and lifecycle statuses.
 * 
 * STRICT PRIVACY GUARANTEE:
 * This contract NEVER stores Personally Identifiable Information (PII) such as names,
 * emails, phone numbers, government IDs, or KYC documents. It stores solely cryptographic
 * public credentials, DIDs, status flags, and timestamps.
 */
contract IdentityRegistry is AccessControl, Pausable {
    // -------------------------------------------------------------------------
    // ROLES
    // -------------------------------------------------------------------------
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");

    // -------------------------------------------------------------------------
    // DATA TYPES
    // -------------------------------------------------------------------------
    
    /// @notice Lifecycle status of a decentralized identity
    enum IdentityStatus {
        None,       // 0: Unregistered / non-existent
        Active,     // 1: Verified, valid, and active
        Suspended,  // 2: Temporarily suspended (e.g., pending key review or audit)
        Revoked     // 3: Permanently invalidated (terminal state)
    }

    /// @notice On-chain identity metadata record
    struct IdentityRecord {
        string did;                 // Unique DID URI: did:assetchain:<id>
        bytes publicKey;            // Cryptographic public key (raw or encoded bytes)
        address controller;         // Blockchain address authorized to control this DID
        IdentityStatus status;      // Current identity status
        uint256 registeredAt;       // Timestamp when identity was registered
        uint256 updatedAt;          // Timestamp when identity was last modified
    }

    // -------------------------------------------------------------------------
    // STATE VARIABLES
    // -------------------------------------------------------------------------

    /// @dev DID string -> IdentityRecord
    mapping(string => IdentityRecord) private _identities;

    /// @dev Controller address -> DID string (1-to-1 reverse mapping)
    mapping(address => string) private _controllerToDid;

    /// @notice Total number of registered identities
    uint256 public totalIdentitiesCount;

    /// @notice Prefix required for all valid DIDs in this platform
    string public constant DID_PREFIX = "did:assetchain:";
    uint256 private constant DID_PREFIX_LENGTH = 15; // length of "did:assetchain:"

    // -------------------------------------------------------------------------
    // EVENTS
    // -------------------------------------------------------------------------

    event IdentityRegistered(
        string indexed didIndex,
        string did,
        address indexed controller,
        bytes publicKey,
        uint256 timestamp
    );

    event IdentityStatusUpdated(
        string indexed didIndex,
        string did,
        IdentityStatus previousStatus,
        IdentityStatus newStatus,
        address indexed updatedBy,
        uint256 timestamp
    );

    event PublicKeyUpdated(
        string indexed didIndex,
        string did,
        bytes oldPublicKey,
        bytes newPublicKey,
        address indexed updatedBy,
        uint256 timestamp
    );

    event ControllerUpdated(
        string indexed didIndex,
        string did,
        address indexed previousController,
        address indexed newController,
        uint256 timestamp
    );

    // -------------------------------------------------------------------------
    // CUSTOM ERRORS
    // -------------------------------------------------------------------------

    error InvalidDID(string reason);
    error InvalidPublicKey();
    error InvalidControllerAddress();
    error IdentityAlreadyExists(string did);
    error ControllerAlreadyBound(address controller, string existingDid);
    error IdentityNotFound(string did);
    error IdentityIsRevoked(string did);
    error IdentityNotActive(string did);
    error UnauthorizedCaller(address caller);
    error InvalidStatusTransition(IdentityStatus currentStatus, IdentityStatus newStatus);

    // -------------------------------------------------------------------------
    // CONSTRUCTOR
    // -------------------------------------------------------------------------

    /**
     * @notice Initializes the Identity Registry contract.
     * @param admin The default admin and initial registrar address.
     */
    constructor(address admin) {
        if (admin == address(0)) {
            revert InvalidControllerAddress();
        }

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(REGISTRAR_ROLE, admin);
    }

    // -------------------------------------------------------------------------
    // REGISTRATION
    // -------------------------------------------------------------------------

    /**
     * @notice Registers a new Decentralized Identity (DID) with its cryptographic public key and controller.
     * @dev Restricted to REGISTRAR_ROLE (e.g. KYC verification service / admin).
     * @param did The DID identifier (must start with "did:assetchain:")
     * @param publicKey Raw public key bytes
     * @param controller Ethereum address managing this identity
     */
    function registerIdentity(
        string calldata did,
        bytes calldata publicKey,
        address controller
    ) external onlyRole(REGISTRAR_ROLE) whenNotPaused {
        _validateDidFormat(did);

        if (publicKey.length == 0 || publicKey.length > 512) {
            revert InvalidPublicKey();
        }

        if (controller == address(0)) {
            revert InvalidControllerAddress();
        }

        if (_identities[did].status != IdentityStatus.None) {
            revert IdentityAlreadyExists(did);
        }

        if (bytes(_controllerToDid[controller]).length != 0) {
            revert ControllerAlreadyBound(controller, _controllerToDid[controller]);
        }

        // Store identity record
        _identities[did] = IdentityRecord({
            did: did,
            publicKey: publicKey,
            controller: controller,
            status: IdentityStatus.Active,
            registeredAt: block.timestamp,
            updatedAt: block.timestamp
        });

        // Store reverse lookup
        _controllerToDid[controller] = did;
        totalIdentitiesCount++;

        emit IdentityRegistered(
            did,
            did,
            controller,
            publicKey,
            block.timestamp
        );
    }

    // -------------------------------------------------------------------------
    // STATUS & KEY MANAGEMENT
    // -------------------------------------------------------------------------

    /**
     * @notice Updates the lifecycle status of an existing identity.
     * @dev Registrars or Admins can transition between Active, Suspended, and Revoked.
     *      Controllers may self-suspend or self-revoke their own identity in case of key compromise.
     * @param did The DID identifier
     * @param newStatus Target status
     */
    function updateIdentityStatus(
        string calldata did,
        IdentityStatus newStatus
    ) external whenNotPaused {
        IdentityRecord storage record = _identities[did];
        IdentityStatus currentStatus = record.status;

        if (currentStatus == IdentityStatus.None) {
            revert IdentityNotFound(did);
        }

        if (currentStatus == IdentityStatus.Revoked) {
            revert IdentityIsRevoked(did);
        }

        if (newStatus == IdentityStatus.None || newStatus == currentStatus) {
            revert InvalidStatusTransition(currentStatus, newStatus);
        }

        bool isRegistrarOrAdmin = hasRole(REGISTRAR_ROLE, msg.sender) || hasRole(DEFAULT_ADMIN_ROLE, msg.sender);
        bool isController = (msg.sender == record.controller);

        if (!isRegistrarOrAdmin && !isController) {
            revert UnauthorizedCaller(msg.sender);
        }

        // Controllers can only suspend or revoke (cannot re-activate themselves without registrar KYC/admin verification)
        if (isController && !isRegistrarOrAdmin && newStatus == IdentityStatus.Active) {
            revert UnauthorizedCaller(msg.sender);
        }

        record.status = newStatus;
        record.updatedAt = block.timestamp;

        emit IdentityStatusUpdated(
            did,
            did,
            currentStatus,
            newStatus,
            msg.sender,
            block.timestamp
        );
    }

    /**
     * @notice Updates the public key associated with an identity.
     * @dev Restricted to the identity's controller or an authorized registrar.
     *      Identity must be currently Active (cannot rotate keys on Suspended or Revoked identities).
     * @param did The DID identifier
     * @param newPublicKey New cryptographic public key bytes
     */
    function updatePublicKey(
        string calldata did,
        bytes calldata newPublicKey
    ) external whenNotPaused {
        IdentityRecord storage record = _identities[did];

        if (record.status == IdentityStatus.None) {
            revert IdentityNotFound(did);
        }

        if (record.status != IdentityStatus.Active) {
            revert IdentityNotActive(did);
        }

        if (newPublicKey.length == 0 || newPublicKey.length > 512) {
            revert InvalidPublicKey();
        }

        bool isAuthorized = (msg.sender == record.controller) ||
            hasRole(REGISTRAR_ROLE, msg.sender) ||
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender);

        if (!isAuthorized) {
            revert UnauthorizedCaller(msg.sender);
        }

        bytes memory oldKey = record.publicKey;
        record.publicKey = newPublicKey;
        record.updatedAt = block.timestamp;

        emit PublicKeyUpdated(
            did,
            did,
            oldKey,
            newPublicKey,
            msg.sender,
            block.timestamp
        );
    }

    /**
     * @notice Transfers DID controller representation to a new blockchain address.
     * @dev Restricted to the current controller or DEFAULT_ADMIN_ROLE.
     * @param did The DID identifier
     * @param newController New controller Ethereum address
     */
    function updateController(
        string calldata did,
        address newController
    ) external whenNotPaused {
        IdentityRecord storage record = _identities[did];

        if (record.status == IdentityStatus.None) {
            revert IdentityNotFound(did);
        }

        if (record.status != IdentityStatus.Active) {
            revert IdentityNotActive(did);
        }

        if (newController == address(0)) {
            revert InvalidControllerAddress();
        }

        if (newController == record.controller) {
            revert InvalidControllerAddress();
        }

        if (bytes(_controllerToDid[newController]).length != 0) {
            revert ControllerAlreadyBound(newController, _controllerToDid[newController]);
        }

        bool isAuthorized = (msg.sender == record.controller) || hasRole(DEFAULT_ADMIN_ROLE, msg.sender);
        if (!isAuthorized) {
            revert UnauthorizedCaller(msg.sender);
        }

        address previousController = record.controller;
        delete _controllerToDid[previousController];

        record.controller = newController;
        record.updatedAt = block.timestamp;
        _controllerToDid[newController] = did;

        emit ControllerUpdated(
            did,
            did,
            previousController,
            newController,
            block.timestamp
        );
    }

    // -------------------------------------------------------------------------
    // VIEW / QUERY FUNCTIONS
    // -------------------------------------------------------------------------

    /**
     * @notice Retrieves the full identity record for a given DID.
     * @param did The DID identifier
     * @return record The complete IdentityRecord struct
     */
    function getIdentity(string calldata did) external view returns (IdentityRecord memory record) {
        record = _identities[did];
        if (record.status == IdentityStatus.None) {
            revert IdentityNotFound(did);
        }
    }

    /**
     * @notice Retrieves the DID associated with a controller address.
     * @param controller Address of the controller
     * @return did The registered DID string
     */
    function getDidByController(address controller) external view returns (string memory did) {
        did = _controllerToDid[controller];
        if (bytes(did).length == 0) {
            revert IdentityNotFound("Controller not registered");
        }
    }

    /**
     * @notice Retrieves the cryptographic public key for a given DID.
     * @param did The DID identifier
     * @return publicKey Raw public key bytes
     */
    function getPublicKey(string calldata did) external view returns (bytes memory publicKey) {
        IdentityRecord storage record = _identities[did];
        if (record.status == IdentityStatus.None) {
            revert IdentityNotFound(did);
        }
        return record.publicKey;
    }

    /**
     * @notice Retrieves the lifecycle status of a given DID.
     * @param did The DID identifier
     * @return status Current IdentityStatus
     */
    function getIdentityStatus(string calldata did) external view returns (IdentityStatus status) {
        return _identities[did].status;
    }

    /**
     * @notice Checks if a DID is registered on-chain.
     * @param did The DID identifier
     * @return registered True if identity exists
     */
    function isIdentityRegistered(string calldata did) external view returns (bool registered) {
        return _identities[did].registeredAt != 0;
    }

    /**
     * @notice Checks if a DID is currently active.
     */
    function isIdentityActive(string calldata did) external view returns (bool active) {
        return _identities[did].status == IdentityStatus.Active;
    }

    /**
     * @notice Checks if an address controller has a registered DID.
     */
    function isIdentityRegistered(address controller) external view returns (bool) {
        string memory did = _controllerToDid[controller];
        return bytes(did).length > 0;
    }

    /**
     * @notice Checks if an address controller has an active DID.
     */
    function isIdentityActive(address controller) external view returns (bool) {
        string memory did = _controllerToDid[controller];
        if (bytes(did).length == 0) return false;
        return _identities[did].status == IdentityStatus.Active;
    }

    // -------------------------------------------------------------------------
    // EMERGENCY CONTROLS
    // -------------------------------------------------------------------------

    /**
     * @notice Pauses contract state modifications.
     * @dev Restricted to DEFAULT_ADMIN_ROLE.
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Unpauses contract state modifications.
     * @dev Restricted to DEFAULT_ADMIN_ROLE.
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // -------------------------------------------------------------------------
    // INTERNAL HELPERS
    // -------------------------------------------------------------------------

    /**
     * @dev Validates DID string prefix and length.
     */
    function _validateDidFormat(string calldata did) internal pure {
        bytes calldata didBytes = bytes(did);
        if (didBytes.length <= DID_PREFIX_LENGTH || didBytes.length > 128) {
            revert InvalidDID("Invalid DID length");
        }

        bytes memory prefixBytes = bytes(DID_PREFIX);
        for (uint256 i = 0; i < DID_PREFIX_LENGTH; i++) {
            if (didBytes[i] != prefixBytes[i]) {
                revert InvalidDID("DID must start with did:assetchain:");
            }
        }
    }
}
