// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

event Create(
    bytes32 indexed hash,
    address indexed creator,
    string name,
    string description,
    uint256 timestamp
);

event MutateDescription(bytes32 indexed hash, string description, uint256 timestamp);

event Cease(bytes32 indexed hash, uint256 timestamp);

event Donate(
    bytes32 indexed hash,
    address indexed donator,
    address indexed receiver,
    uint256 amount,
    string message,
    uint256 timestamp
);

// 非法调用者
error IllegalCaller(address caller);

// 非法参数值
error IllegalArgumentString(string data);
error IllegalArgumentAddress(address data);
error IllegalArgumentUint26(uint256 data);

// struct Channel {
//     address creator;
//     string name;
//     uint256 timestamp;
//     uint256 totalReceived;
// }

contract RealDonation {
    mapping(bytes32 hash => address) private _created;

    function create(
        string calldata name,
        string calldata description
    ) external {
        bytes32 hash = keccak256(abi.encodePacked(msg.sender, name));
        _created[hash] = msg.sender;

        emit Create(hash, msg.sender, name, description, block.timestamp);
    }

    function mutateDescription(bytes32 hash, string calldata description) external {
        emit MutateDescription(hash, description, block.timestamp);
    }

    function cease(bytes32 hash) external {
        delete _created[hash];

        emit Cease(hash, block.timestamp);
    }

    function donate(bytes32 hash, string calldata message) external payable {
        address receiver = _created[hash];
        (bool success, ) = receiver.call{value: msg.value}("");
        require(success, "Call failed");

        emit Donate(hash, msg.sender, receiver, msg.value, message, block.timestamp);
    }
}
