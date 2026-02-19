// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AgentPassport
 * @notice On-chain registry for AI agent identities and permissions.
 *         Each wallet can register agents with granular permission scopes.
 *         Designed for immutable, publicly verifiable agent identity on Base Sepolia.
 */
contract AgentPassport {
    // ─── Structs ─────────────────────────────────────────────────────────────

    struct Agent {
        string name;
        string description;
        bool active;
        address owner;
        uint256 createdAt;
    }

    struct Permission {
        string scope;
        bool exists;
        bool granted;
        uint256 createdAt;
    }

    // ─── Storage ──────────────────────────────────────────────────────────────

    /// @dev agentId => Agent data
    mapping(uint256 => Agent) private _agents;

    /// @dev agentId => scope => Permission data
    mapping(uint256 => mapping(string => Permission)) private _permissions;

    /// @dev agentId => ordered list of all scopes ever touched
    mapping(uint256 => string[]) private _agentScopes;

    /// @dev agentId => scope => already in _agentScopes list
    mapping(uint256 => mapping(string => bool)) private _scopeTracked;

    /// @dev owner => list of agentIds they own
    mapping(address => uint256[]) private _ownerAgents;

    uint256 private _nextAgentId = 1;

    // ─── Events ───────────────────────────────────────────────────────────────

    event AgentCreated(uint256 indexed agentId, address indexed owner, string name);
    event PermissionGranted(uint256 indexed agentId, address indexed owner, string scope);
    event PermissionRevoked(uint256 indexed agentId, address indexed owner, string scope);
    event AgentDeactivated(uint256 indexed agentId, address indexed owner);

    // ─── Errors ───────────────────────────────────────────────────────────────

    error AgentNotFound(uint256 agentId);
    error NotAgentOwner(uint256 agentId, address caller);
    error AgentAlreadyInactive(uint256 agentId);

    // ─── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyAgentOwner(uint256 agentId) {
        if (_agents[agentId].owner == address(0)) revert AgentNotFound(agentId);
        if (_agents[agentId].owner != msg.sender) revert NotAgentOwner(agentId, msg.sender);
        _;
    }

    // ─── Write Functions ──────────────────────────────────────────────────────

    /**
     * @notice Register a new agent passport.
     * @param name       Display name of the agent.
     * @param description Short description of what the agent does.
     * @return agentId   The on-chain numeric ID of the new agent.
     */
    function createAgent(string calldata name, string calldata description)
        external
        returns (uint256 agentId)
    {
        agentId = _nextAgentId++;
        _agents[agentId] = Agent({
            name: name,
            description: description,
            active: true,
            owner: msg.sender,
            createdAt: block.timestamp
        });
        _ownerAgents[msg.sender].push(agentId);
        emit AgentCreated(agentId, msg.sender, name);
    }

    /**
     * @notice Grant a permission scope to an agent.
     * @param agentId The agent's on-chain ID.
     * @param scope   Permission scope string, e.g. "email:read".
     */
    function grantPermission(uint256 agentId, string calldata scope)
        external
        onlyAgentOwner(agentId)
    {
        _trackScope(agentId, scope);
        uint256 ts = _permissions[agentId][scope].exists
            ? _permissions[agentId][scope].createdAt
            : block.timestamp;
        _permissions[agentId][scope] = Permission({
            scope: scope,
            exists: true,
            granted: true,
            createdAt: ts
        });
        emit PermissionGranted(agentId, msg.sender, scope);
    }

    /**
     * @notice Revoke a permission scope from an agent.
     * @param agentId The agent's on-chain ID.
     * @param scope   Permission scope string.
     */
    function revokePermission(uint256 agentId, string calldata scope)
        external
        onlyAgentOwner(agentId)
    {
        _trackScope(agentId, scope);
        uint256 ts = _permissions[agentId][scope].exists
            ? _permissions[agentId][scope].createdAt
            : block.timestamp;
        _permissions[agentId][scope] = Permission({
            scope: scope,
            exists: true,
            granted: false,
            createdAt: ts
        });
        emit PermissionRevoked(agentId, msg.sender, scope);
    }

    /**
     * @notice Deactivate an agent (irreversible via this function).
     * @param agentId The agent's on-chain ID.
     */
    function deactivateAgent(uint256 agentId) external onlyAgentOwner(agentId) {
        if (!_agents[agentId].active) revert AgentAlreadyInactive(agentId);
        _agents[agentId].active = false;
        emit AgentDeactivated(agentId, msg.sender);
    }

    // ─── View Functions ───────────────────────────────────────────────────────

    /**
     * @notice Quick permission check — used by external services.
     * @param agentId The agent's on-chain ID.
     * @param scope   Permission scope string.
     * @return True if agent is active and scope is explicitly granted.
     */
    function verifyPermission(uint256 agentId, string calldata scope)
        external
        view
        returns (bool)
    {
        if (!_agents[agentId].active) return false;
        Permission storage p = _permissions[agentId][scope];
        return p.exists && p.granted;
    }

    /**
     * @notice Get full permission details for a specific scope.
     */
    function getPermission(uint256 agentId, string calldata scope)
        external
        view
        returns (Permission memory)
    {
        return _permissions[agentId][scope];
    }

    /**
     * @notice Get all permissions ever set for an agent.
     * @dev Returns permissions with their current granted status.
     */
    function getPermissions(uint256 agentId)
        external
        view
        returns (Permission[] memory)
    {
        string[] storage scopes = _agentScopes[agentId];
        Permission[] memory perms = new Permission[](scopes.length);
        for (uint256 i = 0; i < scopes.length; i++) {
            perms[i] = _permissions[agentId][scopes[i]];
        }
        return perms;
    }

    /**
     * @notice Get agent data by ID. Returns empty struct for non-existent agents.
     */
    function getAgent(uint256 agentId) external view returns (Agent memory) {
        return _agents[agentId];
    }

    /**
     * @notice Get all agent IDs owned by the caller.
     */
    function getMyAgents() external view returns (uint256[] memory) {
        return _ownerAgents[msg.sender];
    }

    /**
     * @notice Get all agent IDs owned by a specific address.
     * @param owner The address to query.
     */
    function getAgentsByOwner(address owner) external view returns (uint256[] memory) {
        return _ownerAgents[owner];
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    function _trackScope(uint256 agentId, string calldata scope) internal {
        if (!_scopeTracked[agentId][scope]) {
            _agentScopes[agentId].push(scope);
            _scopeTracked[agentId][scope] = true;
        }
    }
}
