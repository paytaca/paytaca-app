export const sep20Abi = [
  'function name() external view returns (string)',
  'function symbol() external view returns (string)',
  'function decimals() external view returns (uint8)',
  'function totalSupply() external view returns (uint256)',
  'function balanceOf(address _owner) external view returns (uint256 balance)',
  'function owner() external view returns (address)',
  'function transfer(address _to, uint256 _value) external returns (bool success)',
  'function transferFrom(address _from, address _to, uint256 _value) external returns (bool success)',
  'function approve(address _spender, uint256 _value) external returns (bool success)',
  'function allowance(address _owner, address _spender) external view returns (uint256 remaining)',
  'function decreaseAllowance(address _spender, uint256 _delta) external returns (bool success)',

  'event Transfer(address indexed _from, address indexed _to, uint256 _value)',
  'event Approval(address indexed _owner, address indexed _spender, uint256 _value)'
]

export const erc721Abi = [
  // erc721
  'function balanceOf(address _owner) external view returns (uint256)',
  'function ownerOf(uint256 _tokenId) external view returns (address)',
  'function safeTransferFrom(address _from, address _to, uint256 _tokenId) external payable',

  // erc721 metadata
  'function name() external view returns (string)',
  'function symbol() external view returns (string)',
  'function tokenURI(uint256 _tokenId) external view returns (string)',

  // erc721 enumerable
  'function totalSupply() external view returns (uint256)',
  'function tokenByIndex(uint256 _index) external view returns (uint256)',
  'function tokenOfOwnerByIndex(address _owner, uint256 _index) external view returns (uint256)'
]
