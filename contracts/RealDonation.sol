// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

// -------------------- Event --------------------
event Create(
    bytes32 indexed projectHash, /** 项目哈希 */
    address indexed creator,     /** 创建者 */
    string projectName,          /** 项目名称 */
    string projectDescription,   /** 项目描述 */
    uint256 createTime           /** 创建时间 */
);

event ModifyDescription(
    bytes32 indexed projectHash, /** 项目哈希 */
    string projectDescription,   /** 项目描述 */
    uint256 modifyTime           /** 修改时间 */
);

event Cease(
    bytes32 indexed projectHash, /** 项目哈希 */
    uint256 ceaseTime            /** 终止时间 */
);

event Donate(
    bytes32 indexed projectHash, /** 项目哈希 */
    address indexed donator,     /** 捐赠者 */
    address indexed receiver,    /** 接收者 */
    string projectName,          /** 项目名称 */
    uint256 amount,              /** 捐赠金额 */
    string message,              /** 捐赠留言 */
    uint256 donateTime           /** 捐赠时间 */
);

// -------------------- Error --------------------
// 非法调用者
error IllegalCaller(address caller);

// 非法参数值
error IllegalArgumentString(string data);
error IllegalArgumentAddress(address data);
error IllegalArgumentUint26(uint256 data);


// -------------------- Contract --------------------
contract RealDonation {
    // -------------------- Modifier --------------------
    // 调用者必须是项目创建者
    modifier onlyCreator(bytes32 hash) {
        require(_project[hash].creator == msg.sender, "IllegalCaller");
        _;
    }

    // 调用者不能是项目创建者
    modifier notCreator(address creator) {
        require(creator != msg.sender, "IllegalCaller");
        _;
    }

    // 项目必须存在
    modifier projectExist(bytes32 hash) {
        require(_project[hash].creator != address(0), "IllegalArgument");
        _;
    }

    // 字符串长度限制
    modifier validString(string calldata data, uint256 min, uint256 max) {
        require(bytes(data).length >= min && bytes(data).length <= max, "IllegalArgument");
        _;
    }

    // 捐赠金额必须大于 0
    modifier validAmount(uint256 data) {
        require(data > 0, "IllegalArgument");
        _;
    }

    // -------------------- Struct --------------------
    /**
     * @dev 项目数据，通过 `Create` 方法创建，数据不可修改
     * 1、项目哈希：由创建者地址、项目名称、创建时间生成
     * 2、创建者地址：调用 `Create` 方法的地址，捐赠金额将直接转到该地址
     * 3、项目名称：项目的名称
     * 4、创建时间：调用 `Create` 方法的区块时间戳
     * @notice 创建项目时，还可以添加项目描述，项目描述保存于日志中，还可以可通过 `modifyDescription` 修改
     */
    struct Project {
        bytes32 hash;
        address creator;
        string name;
        uint256 createTime;
    }

    // -------------------- Storage --------------------
    /**
     * @dev 私有映射变量：项目哈希 => 项目
     */
    mapping(bytes32 hash => Project) private _project;

    /**
     * @dev 私有映射变量：捐赠者 => 项目哈希 => 捐赠金额
     */
    mapping(address donator => mapping(bytes32 hash => uint256)) _donated;

    // -------------------- Function --------------------
    /**
     * @dev 私有方法，设置项目数据
     * @param hash 项目哈希
     * @param creator 创建者地址
     * @param name 项目名称
     */
    function _setProject(bytes32 hash, address creator, string memory name) private {
        _project[hash] = Project({
            hash: hash,
            creator: creator,
            name: name,
            createTime: block.timestamp
        });
    }

    /**
     * @dev 私有方法，设置捐赠者对某个项目的捐赠总金额
     * @param donator 捐赠者地址
     * @param hash 项目哈希
     * @param amount 捐赠金额
     */
    function _setDonated(address donator, bytes32 hash, uint256 amount) private {
        _donated[donator][hash] += amount;
    }

    /**
     * @dev 获取项目数据
     * @param hash 项目哈希
     */
    function getProject(bytes32 hash) external view returns (Project memory) {
        return _project[hash];
    }

    /**
     * @dev 获取捐赠者对某个项目的捐赠总金额
     * @param donator 捐赠者地址
     * @param hash 项目哈希
     */
    function getDonated(address donator, bytes32 hash) external view returns (uint256) {
        return _donated[donator][hash];
    }

    /**
     * @dev 创建项目
     * @param name 项目名称，长度限制 1-64 Byte
     * @param description 项目描述，长度限制 0-1024 Byte
     *
     * @custom:event `Create`
     * @custom:verify 项目名称长度需要符合要求
     * @custom:verify 项目描述长度需要符合要求
     */
    function create(
        string calldata name,
        string calldata description
    ) external {
        bytes32 hash = keccak256(abi.encode(msg.sender, name, block.timestamp));
        _setProject(hash, msg.sender, name);

        emit Create(hash, msg.sender, name, description, block.timestamp);
    }

    /**
     * @dev 修改项目描述
     * @param hash 项目哈希
     * @param description 项目描述，长度限制 0-1024 Byte
     *
     * @custom:event `ModifyDescription`
     * @custom:verify 调用者必须是项目创建者
     * @custom:verify 描述长度需要符合要求
     */
    function modifyDescription(bytes32 hash, string calldata description) external {
        emit ModifyDescription(hash, description, block.timestamp);
    }

    /**
     * @dev 终止项目
     * @param hash 项目哈希
     *
     * @custom:event `Cease`
     * @custom:verify 调用者必须是项目创建者
     */
    function cease(bytes32 hash) external {
        delete _project[hash];

        emit Cease(hash, block.timestamp);
    }

    /**
     * @dev `payable`方法，为项目捐赠金额
     * @param hash 项目哈希
     * @param message 捐赠留言，长度限制 0-256 Byte
     *
     * @custom:event `Donate`
     * @custom:verify 项目必须存在
     * @custom:verify 捐赠金额必须大于 0
     * @custom:verify 捐赠留言长度需要符合要求
     * @custom:verify 捐赠者地址不能为项目创建者地址
     */
    function donate(bytes32 hash, string calldata message) external payable {
        Project memory project = _project[hash];
        address receiver = project.creator;
        string memory projectName = project.name;

        (bool success, ) = receiver.call{value: msg.value}("");
        require(success, "Call failed");

        _setDonated(msg.sender, hash, msg.value);

        emit Donate(hash, msg.sender, receiver, projectName, msg.value, message, block.timestamp);
    }
}
