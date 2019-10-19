pragma solidity ^0.4.25;

// It's important to avoid vulnerabilities due to numeric overflow bugs
// OpenZeppelin's SafeMath library, when used correctly, protects agains such bugs
// More info: https://www.nccgroup.trust/us/about-us/newsroom-and-events/blog/2018/november/smart-contract-insecurity-bad-arithmetic/

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./FlightSuretyData.sol";

/************************************************** */
/* FlightSurety Smart Contract                      */
/************************************************** */
contract FlightSuretyApp {
    FlightSuretyData dataContract;

    using SafeMath for uint256; // Allow SafeMath functions to be called for all uint256 types (similar to "prototype" in Javascript)

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/
    // Airline Register
    uint8 private constant AIRLINE_REGISTER_CONSENSUS_NUM_CONDITION = 4;

    // Flight status codees
    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ON_TIME = 10;
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
    uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 private constant STATUS_CODE_LATE_OTHER = 50;

    address private contractOwner;          // Account used to deploy contract

    struct Flight {
        bool isRegistered;
        uint8 statusCode;
        uint256 timestamp;
        address airline;
        string flight;
    }

    mapping(bytes32 => Flight) private flights;

    uint256 public constant MAX_INSURANCE = 1 ether;

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in 
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational()
    {
        // Modify to call data contract's status
        require(dataContract.isOperational(), "Contract is currently not operational");
        _;
        // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    /********************************************************************************************/
    /*                                       CONSTRUCTOR                                        */
    /********************************************************************************************/

    /**
    * @dev Contract constructor
    *
    */
    constructor(
                    address wallet
               ) 
                public
    {
        contractOwner = msg.sender;
        dataContract = FlightSuretyData(wallet);
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    function isOperational() 
                            public 
                            view 
                            returns (bool)
    {
        return dataContract.isOperational();
        // Modify to call data contract's status
    }

    function getContractBalance() 
                                external 
                                view 
                                requireIsOperational 
                                returns (uint256 balance)
    {
        return dataContract.getContractBalance();
    }

    function getAirlineFund
                            (
                                address wallet
                            ) 
                            external 
                            returns (uint256 balance)
    {
        return dataContract.getAirlineFund(wallet);
    }

    function getPassengerCredits
                                (
                                    address passenger
                                ) 
                                external 
                                view 
                                requireIsOperational 
                                returns (uint256 amount)
    {
        return dataContract.getPassengerCredits(passenger);
    }

    function isFlightRegistered
                                (
                                    address wallet,
                                    string flightCode,
                                    uint256 timestamp
                                )
                                external
                                view
                                requireIsOperational
                                returns (bool isRegistered)
    {
        bytes32 key = getFlightKey(wallet, flightCode, timestamp);
        return flights[key].isRegistered;

    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    /**
     * @dev Add an airline to the registration queue
     *
     */
    function registerAirline
                            (
                                address wallet
                            ) 
                            external 
                            requireIsOperational 
                            returns (bool success, uint256 votes)
    {
        bool isRegistered = dataContract.isAirlineRegistered(msg.sender);
        require(isRegistered, "Caller is not a registered airline");
        uint256 airlineBalance = dataContract.getAirlineFund(msg.sender);
        require(airlineBalance > 0, "Airline is not funded");

        isRegistered = dataContract.isAirlineRegistered(wallet);
        require(!isRegistered, "Airline is already a registered airline");

        uint number = dataContract.getAirlineNum();
        //check consensus
        if (number >= AIRLINE_REGISTER_CONSENSUS_NUM_CONDITION) {
            bool isDuplicate = false;
            for (uint c = 0; c < dataContract.multiCallsLength(); c++) {
                if (dataContract.getMultiCallsItem(c) == msg.sender) {
                    isDuplicate = true;
                    break;
                }
            }
            require(!isDuplicate, "Caller has already called this function.");

            dataContract.putMultiCallsItem(msg.sender);

            if (dataContract.multiCallsLength() >= number.div(2)) {// 50%
                dataContract.clearMultiCalls();
                dataContract.registerAirline(wallet);
            }
        } else {
            dataContract.registerAirline(wallet);
        }

        return (success, 0);
    }

    function fundAirline
                        (
                            address wallet
                        ) 
                        external 
                        payable 
                        requireIsOperational
    {
        dataContract.fund(msg.value, wallet);
    }

    /**
     * @dev Register a future flight for insuring.
     *
     */
    function registerFlight
                            (
                                address wallet, 
                                string flightCode, 
                                uint256 timestamp
                            ) 
                            external 
                            requireIsOperational
    {
        bytes32 key = getFlightKey(wallet, flightCode, timestamp);
        require(flights[key].isRegistered == false, "This flight is already registered");

        flights[key] = Flight({
                                isRegistered : true, 
                                statusCode : STATUS_CODE_UNKNOWN, 
                                timestamp : timestamp, 
                                airline : wallet, 
                                flight : flightCode
                                });
    }

    function processFlightStatus
                                (
                                    address airline, 
                                    string flight, 
                                    uint256 timestamp, 
                                    uint8 statusCode
                                ) 
                                external 
                                requireIsOperational
    {
        _processFlightStatus(airline, flight, timestamp, statusCode);
    }


    /**
     * @dev Called after oracle has updated flight status
     *
     */
    function _processFlightStatus
                                (
                                    address airline, 
                                    string memory flight, 
                                    uint256 timestamp, 
                                    uint8 statusCode
                                ) 
                                internal 
                                requireIsOperational
    {
        if (statusCode == STATUS_CODE_LATE_AIRLINE) {
            address[] memory passengers = dataContract.getPassengersInsured(flight);
            uint amount = 0;
            address passenger;
            uint index;

            for (uint i = 0; i < passengers.length; i++) {
                passenger = passengers[i];
                amount = dataContract.getInsuredAmount(flight, passenger);
                amount = amount.mul(15).div(10);
                dataContract.setInsuredAmount(flight, passenger, amount);
            }
        }
    }


    // Generate a request for oracles to fetch flight information
    function fetchFlightStatus
                                (
                                    address airline, 
                                    string flight, 
                                    uint256 timestamp
                                ) 
                                external
    {
        uint8 index = getRandomIndex(msg.sender);

        // Generate a unique key for storing the request
        bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp));
        oracleResponses[key] = ResponseInfo({requester : msg.sender, isOpen : true});

        emit OracleRequest(index, airline, flight, timestamp);
    }


    function buyInsurancePassenger
                                    (   
                                        string flightCode, 
                                        uint256 timestamp, 
                                        address airline
                                    ) 
                                    external 
                                    payable 
                                    requireIsOperational
    {
        require(msg.value <= MAX_INSURANCE, "Passengers may pay up to 1 ETH");
        dataContract.buy(flightCode, timestamp, airline, msg.sender, msg.value);
    }

    function withdrawPayout() 
                            external
    {
        dataContract.withdraw(msg.sender);
    }





    // region ORACLE MANAGEMENT

    // Incremented to add pseudo-randomness at various points
    uint8 private nonce = 0;

    // Fee to be paid when registering oracle
    uint256 public constant REGISTRATION_FEE = 1 ether;

    // Number of oracles that must respond for valid status
    uint256 private constant MIN_RESPONSES = 3;


    struct Oracle {
        bool isRegistered;
        uint8[3] indexes;
    }

    // Track all registered oracles
    mapping(address => Oracle) private oracles;

    // Model for responses from oracles
    struct ResponseInfo {
        address requester;                              // Account that requested status
        bool isOpen;                                    // If open, oracle responses are accepted
        mapping(uint8 => address[]) responses;          // Mapping key is the status code reported
        // This lets us group responses and identify
        // the response that majority of the oracles
    }

    // Track all oracle responses
    // Key = hash(index, flight, timestamp)
    mapping(bytes32 => ResponseInfo) private oracleResponses;

    // Event fired each time an oracle submits a response
    event FlightStatusInfo(address airline, string flight, uint256 timestamp, uint8 status);

    event OracleReport(address airline, string flight, uint256 timestamp, uint8 status);

    // Event fired when flight status request is submitted
    // Oracles track this and if they have a matching index
    // they fetch data and submit a response
    event OracleRequest(uint8 index, address airline, string flight, uint256 timestamp);


    // Register an oracle with the contract
    function registerOracle() external payable
    {
        // Require registration fee
        require(msg.value >= REGISTRATION_FEE, "Registration fee is required");

        uint8[3] memory indexes = generateIndexes(msg.sender);

        oracles[msg.sender] = Oracle({isRegistered : true, indexes : indexes});
    }

    function getMyIndexes() view external returns (uint8[3])
    {
        require(oracles[msg.sender].isRegistered, "Not registered as an oracle");
        return oracles[msg.sender].indexes;
    }

    // Called by oracle when a response is available to an outstanding request
    // For the response to be accepted, there must be a pending request that is open
    // and matches one of the three Indexes randomly assigned to the oracle at the
    // time of registration (i.e. uninvited oracles are not welcome)
    function submitOracleResponse(uint8 index, address airline, string flight, uint256 timestamp, uint8 statusCode) external
    {
        require((oracles[msg.sender].indexes[0] == index) || (oracles[msg.sender].indexes[1] == index) || (oracles[msg.sender].indexes[2] == index), "Index does not match oracle request");


        bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp));
        require(oracleResponses[key].isOpen, "Flight or timestamp do not match oracle request");

        oracleResponses[key].responses[statusCode].push(msg.sender);

        // Information isn't considered verified until at least MIN_RESPONSES
        // oracles respond with the *** same *** information
        emit OracleReport(airline, flight, timestamp, statusCode);
        if (oracleResponses[key].responses[statusCode].length >= MIN_RESPONSES) {

            emit FlightStatusInfo(airline, flight, timestamp, statusCode);

            // Handle flight status as appropriate
            _processFlightStatus(airline, flight, timestamp, statusCode);
        }
    }


    function getFlightKey(address airline, string flight, uint256 timestamp) pure internal returns (bytes32)
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    // Returns array of three non-duplicating integers from 0-9
    function generateIndexes(address account) internal returns (uint8[3])
    {
        uint8[3] memory indexes;
        indexes[0] = getRandomIndex(account);

        indexes[1] = indexes[0];
        while (indexes[1] == indexes[0]) {
            indexes[1] = getRandomIndex(account);
        }

        indexes[2] = indexes[1];
        while ((indexes[2] == indexes[0]) || (indexes[2] == indexes[1])) {
            indexes[2] = getRandomIndex(account);
        }

        return indexes;
    }

    // Returns array of three non-duplicating integers from 0-9
    function getRandomIndex(address account) internal returns (uint8)
    {
        uint8 maxValue = 10;

        // Pseudo random number...the incrementing nonce adds variation
        uint8 random = uint8(uint256(keccak256(abi.encodePacked(blockhash(block.number - nonce++), account))) % maxValue);

        if (nonce > 250) {
            nonce = 0;
            // Can only fetch blockhashes for last 256 blocks so we adapt
        }

        return random;
    }

    // endregion

}   
